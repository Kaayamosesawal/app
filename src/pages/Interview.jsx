/**
 * Interview.jsx – Slirus Global Limited Online Interview (applicant-facing)
 *
 * Route:  /interview?t=<private token>      (add to your router, OUTSIDE <Layout>)
 *
 * How access is controlled (all enforced by server.js, not by this file):
 *  - The link carries a 256-bit random token that only exists for a shortlisted
 *    applicant after an Admin presses "Online" in Admin.jsx.
 *  - The applicant must also type the email address they applied with. Someone
 *    who copies the link but doesn't know that email cannot open the questions;
 *    5 wrong attempts lock the link.
 *  - One attempt only. The 30-minute clock lives on the server, so refreshing
 *    or changing the device clock gives no extra time.
 *  - The answer key and the marking live in server.js. This page never receives
 *    the answers and never sees the score.
 *
 * Exam-room rules enforced in the browser (best effort — see note below):
 *  - Questions render ONLY while the page is full-screen / maximised, focused
 *    and visible. Otherwise the content is removed from the DOM and replaced
 *    by a cover.
 *  - Copy / cut / paste / select / drag / right-click / print / save / view-
 *    source / DevTools shortcuts are blocked. Text selection is disabled.
 *  - PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5 are intercepted, the clipboard
 *    is wiped and the content is covered. A per-applicant watermark is tiled
 *    over the page so any photographed/leaked image is traceable.
 *  - Leaving full-screen, switching tab/window or losing focus is a recorded
 *    warning. After MAX warnings the interview is submitted automatically.
 *
 * NOTE: a normal web page cannot technically switch off the operating system's
 * screenshot or screen-recording features (that needs a native app with
 * FLAG_SECURE / content-protection APIs). The measures above deter, detect and
 * make leaks traceable; they cannot make capture impossible.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const API_URL     = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY   = 'slirus_iv_token';
const LETTERS     = ['A', 'B', 'C', 'D', 'E'];
const WARN_DEDUPE = 1500; // ms – blur + visibilitychange fire together; count once

// ─── helpers ──────────────────────────────────────────────────────────────────
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const fsSupported = () => {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
};
const enterFullscreen = async () => {
  const el = document.documentElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } catch { /* user declined */ }
};
const leaveFullscreen = () => {
  try {
    if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
    else if (document.webkitExitFullscreen && document.webkitFullscreenElement) document.webkitExitFullscreen();
  } catch { /* ignore */ }
};
const isMaximised = () =>
  window.innerWidth >= screen.availWidth * 0.9 && window.innerHeight >= screen.availHeight * 0.78;

const post = async (path, body) => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON error */ }
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed.');
    err.status = res.status; err.code = data.code;
    throw err;
  }
  return data;
};

const escXml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const mmss = (ms) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

// ─── component ────────────────────────────────────────────────────────────────
const Interview = () => {
  const [phase, setPhase]       = useState('gate');         // gate | running | done | error
  const [email, setEmail]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [gateError, setGateError] = useState('');
  const [fatal, setFatal]       = useState(null);           // { title, message }
  const [paper, setPaper]       = useState(null);           // { name, questions }
  const [answers, setAnswers]   = useState({});
  const [current, setCurrent]   = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [totalMs, setTotalMs]   = useState(30 * 60 * 1000);
  const [violations, setViolations] = useState(0);
  const [maxViolations, setMaxViolations] = useState(3);
  const [fsOk, setFsOk]         = useState(true);
  const [sizeOk, setSizeOk]     = useState(true);
  const [blurred, setBlurred]   = useState(false);
  const [shotCover, setShotCover] = useState(false);
  const [lastWarning, setLastWarning] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const tokenRef      = useRef(null);
  const sessionRef    = useRef(null);
  const deadlineRef   = useRef(0);        // performance.now() based
  const answersRef    = useRef({});
  const violationsRef = useRef(0);
  const maxVioRef     = useRef(3);
  const submittedRef  = useRef(false);
  const lastVioAt     = useRef(0);
  const fsRequired    = useRef(false);
  const submitRef     = useRef(() => {});
  const shotTimer     = useRef(null);

  answersRef.current = answers;

  // ── read token once, then hide it from the address bar ──
  useEffect(() => {
    document.title = 'Online Interview · Slirus Global Limited';
    let robots = document.querySelector('meta[name="robots"]');
    const created = !robots;
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
    const prevRobots = robots.content;
    robots.content = 'noindex,nofollow';

    const params = new URLSearchParams(window.location.search);
    let t = params.get('t');
    if (t) {
      try { sessionStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ }
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      try { t = sessionStorage.getItem(TOKEN_KEY); } catch { t = null; }
    }
    tokenRef.current = t;
    if (!t) setFatal({ title: 'Invalid link', message: 'This interview link is not valid. Please use the link from your invitation email.' });
    setPhase(t ? 'gate' : 'error');

    return () => { if (created) robots.remove(); else robots.content = prevRobots; };
  }, []);

  // ── register a warning (deduped) and auto-submit at the limit ──
  const registerViolation = useCallback((reason) => {
    const now = Date.now();
    if (now - lastVioAt.current < WARN_DEDUPE || submittedRef.current) return;
    lastVioAt.current = now;
    violationsRef.current += 1;
    setViolations(violationsRef.current);
    setLastWarning(reason);
    if (violationsRef.current >= maxVioRef.current) submitRef.current('violations');
  }, []);

  // ── submit (manual, timeout, or violations) ──
  const submit = useCallback(async (reason = 'manual', attempt = 0) => {
    if (submittedRef.current && attempt === 0) return;
    submittedRef.current = true;
    setSubmitting(true); setConfirming(false); setSubmitError('');
    try {
      await post('/api/interview/submit', {
        token: tokenRef.current, sessionKey: sessionRef.current,
        answers: answersRef.current, violations: violationsRef.current, reason,
      });
      finish();
    } catch (err) {
      if (err.status === 410) { finish(); return; }                 // already closed server-side
      if (err.status === 409) { fail('Session ended', err.message); return; }
      if (attempt < 5) { setTimeout(() => submitRef.current(reason, attempt + 1), 3000); return; }
      submittedRef.current = false; setSubmitting(false);
      setSubmitError('We could not reach the server. Check your connection and press Submit again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  submitRef.current = submit;

  const finish = () => {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    leaveFullscreen();
    setPhase('done'); setSubmitting(false);
  };
  const fail = (title, message) => { leaveFullscreen(); setFatal({ title, message }); setPhase('error'); setSubmitting(false); };

  // ── begin: verify email, enter full-screen, start/resume ──
  const begin = async (e) => {
    e.preventDefault();
    if (busy) return;
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { setGateError('Enter the email address you applied with.'); return; }
    setBusy(true); setGateError('');

    fsRequired.current = fsSupported();
    if (fsRequired.current) {
      await enterFullscreen();                    // must run inside the click gesture
      if (!fsElement()) {
        setBusy(false);
        setGateError('Full-screen is required to take this interview. Please allow it and try again.');
        return;
      }
    }
    try {
      const r = await post('/api/interview/start', { token: tokenRef.current, email: clean });
      sessionRef.current = r.sessionKey;
      deadlineRef.current = performance.now() + r.remainingMs;
      maxVioRef.current = r.maxViolations; setMaxViolations(r.maxViolations);
      violationsRef.current = r.violations || 0; setViolations(violationsRef.current);
      setTotalMs(r.totalMs); setRemaining(r.remainingMs);
      setAnswers(r.answers || {}); answersRef.current = r.answers || {};
      setPaper({ name: r.name, questions: r.questions });
      setCurrent(0); setFsOk(true); setSizeOk(true);
      submittedRef.current = false;
      lastVioAt.current = Date.now();             // don't count the entry itself
      setPhase('running');
    } catch (err) {
      leaveFullscreen();
      setBusy(false);
      if (['completed', 'expired', 'locked', 'invalid'].includes(err.code) || err.status === 404) {
        fail(err.code === 'completed' ? 'Interview closed' : err.code === 'expired' ? 'Link expired' : err.code === 'locked' ? 'Link locked' : 'Invalid link', err.message);
      } else {
        setGateError(err.message || 'Something went wrong. Please try again.');
      }
    }
  };

  // ── countdown (anchored to server-provided remaining time) ──
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const id = setInterval(() => {
      const r = Math.max(0, deadlineRef.current - performance.now());
      setRemaining(r);
      if (r <= 0) submitRef.current('timeout');
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  // ── autosave (debounced on change + heartbeat) ──
  const save = useCallback(async () => {
    if (submittedRef.current || !sessionRef.current) return;
    try {
      const r = await post('/api/interview/save', {
        token: tokenRef.current, sessionKey: sessionRef.current,
        answers: answersRef.current, violations: violationsRef.current,
      });
      if (r.done) { finish(); return; }
      if (typeof r.remainingMs === 'number') deadlineRef.current = performance.now() + r.remainingMs;
    } catch (err) {
      if (err.status === 409) fail('Session ended', err.message);
      else if (err.status === 410) finish();
      /* transient network errors are ignored; the next save retries */
    }
  }, []);
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const t = setTimeout(save, 700);
    return () => clearTimeout(t);
  }, [answers, violations, phase, save]);
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const id = setInterval(save, 30000);
    return () => clearInterval(id);
  }, [phase, save]);

  // ── exam-room guards ──
  useEffect(() => {
    if (phase !== 'running') return undefined;

    const wipeClipboard = () => { try { navigator.clipboard?.writeText(''); } catch { /* ignore */ } };
    const coverNow = (ms = 4000) => {
      setShotCover(true);
      clearTimeout(shotTimer.current);
      shotTimer.current = setTimeout(() => setShotCover(false), ms);
    };

    const stop = (e) => { e.preventDefault(); e.stopPropagation(); return false; };

    const onKeyDown = (e) => {
      const k = (e.key || '').toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      // screenshot shortcuts
      const isShot =
        k === 'printscreen' ||
        (e.metaKey && e.shiftKey && (e.code === 'Digit3' || e.code === 'Digit4' || e.code === 'Digit5' || e.code === 'KeyS')) ||
        (e.metaKey && e.shiftKey && k === 's');
      if (isShot) { stop(e); wipeClipboard(); coverNow(); registerViolation('Screenshot attempt detected'); return; }

      // copy / paste / save / print / view-source / select-all / devtools
      const blockedCombo =
        (mod && ['c', 'v', 'x', 'a', 's', 'p', 'u', 'insert'].includes(k)) ||
        (e.shiftKey && k === 'insert') || (e.shiftKey && k === 'delete') ||
        k === 'f12' ||
        (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
        (e.metaKey && e.altKey && ['i', 'j', 'u', 'c'].includes(k));
      if (blockedCombo) stop(e);
    };
    const onKeyUp = (e) => {
      if ((e.key || '').toLowerCase() === 'printscreen') {
        wipeClipboard(); coverNow(); registerViolation('Screenshot attempt detected');
      }
    };
    const onBlur = () => { setBlurred(true); registerViolation('You left the interview window'); };
    const onFocus = () => setBlurred(false);
    const onVisibility = () => {
      if (document.hidden) { setBlurred(true); registerViolation('You switched to another tab or app'); }
      else setBlurred(!document.hasFocus());
    };
    const onFsChange = () => {
      const ok = !!fsElement();
      setFsOk(ok);
      if (!ok && fsRequired.current) registerViolation('You exited full-screen');
    };
    const onResize = () => setSizeOk(fsRequired.current ? true : isMaximised());
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; return ''; };
    const onPop = () => window.history.pushState(null, '', window.location.href);
    const onBeforePrint = () => { setShotCover(true); registerViolation('Print attempt detected'); };
    const onAfterPrint = () => setShotCover(false);

    window.history.pushState(null, '', window.location.href);
    onResize();

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    ['copy', 'cut', 'paste', 'contextmenu', 'dragstart', 'selectstart', 'drop'].forEach((ev) => document.addEventListener(ev, stop, true));
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    window.addEventListener('resize', onResize);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPop);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      ['copy', 'cut', 'paste', 'contextmenu', 'dragstart', 'selectstart', 'drop'].forEach((ev) => document.removeEventListener(ev, stop, true));
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      clearTimeout(shotTimer.current);
    };
  }, [phase, registerViolation]);

  // ── per-applicant watermark (traceability if an image ever leaks) ──
  const watermark = useMemo(() => {
    const label = escXml(`${paper?.name || ''} · ${email.trim().toLowerCase()}`);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='220'><text x='24' y='120' transform='rotate(-22 210 110)' font-family='Arial,sans-serif' font-size='14' fill='rgba(26,60,94,0.10)'>${label}</text></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, [paper, email]);

  const setAnswer = (qid, optionId) => setAnswers((a) => ({ ...a, [qid]: optionId }));

  const locked = phase === 'running' && (!fsOk || !sizeOk || blurred || shotCover);
  const questions = paper?.questions || [];
  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const lowTime = remaining <= 5 * 60 * 1000;
  const pct = Math.max(0, Math.min(100, (remaining / totalMs) * 100));

  // ─── render: error / done ───
  if (phase === 'error') {
    return (
      <div style={S.center}>
        <div style={S.card}>
          <div style={{ ...S.mark, background: '#FEE2E2', color: '#991B1B' }}>!</div>
          <h1 style={S.h1}>{fatal?.title || 'Unavailable'}</h1>
          <p style={S.p}>{fatal?.message}</p>
          <p style={S.small}>Need help? Email hr@slirus.com</p>
        </div>
      </div>
    );
  }
  if (phase === 'done') {
    return (
      <div style={S.center}>
        <div style={S.card}>
          <div style={{ ...S.mark, background: '#D1FAE5', color: '#065F46' }}>✓</div>
          <h1 style={S.h1}>Interview completed</h1>
          <p style={S.p}>Thank you{paper?.name ? `, ${paper.name.split(' ')[0]}` : ''}. Your answers have been recorded and marked.
            Our HR team will review the results and contact you about the next stage.</p>
          <p style={S.small}>You may now close this window.</p>
        </div>
      </div>
    );
  }

  // ─── render: gate (instructions + identity check) ───
  if (phase === 'gate') {
    return (
      <div style={S.center}>
        <form style={{ ...S.card, maxWidth: 560, textAlign: 'left' }} onSubmit={begin}>
          <h1 style={{ ...S.h1, textAlign: 'left' }}>Slirus online interview</h1>
          <p style={S.p}>A short, auto-marked test of logical reasoning, workplace compliance and basic entry requirements.</p>
          <ul style={S.rules}>
            <li><b>30 minutes</b>, 25 multiple-choice questions. The clock cannot be paused and one attempt is allowed.</li>
            <li>The test opens <b>full-screen</b>. Leaving full-screen, switching tabs or windows is a warning; <b>{3} warnings end the test</b>.</li>
            <li>Copying, pasting, printing and screenshots are blocked. Your name and email are watermarked on screen.</li>
            <li>Use a laptop or desktop with a stable connection. Your answers are saved as you go.</li>
          </ul>
          <label style={S.label} htmlFor="iv-email">Confirm the email address you applied with</label>
          <input
            id="iv-email" type="email" autoComplete="off" required value={email}
            onChange={(e) => setEmail(e.target.value)} style={S.input} placeholder="name@example.com"
          />
          {gateError && <p style={S.err}>{gateError}</p>}
          <button type="submit" style={{ ...S.primary, opacity: busy ? 0.6 : 1 }} disabled={busy}>
            {busy ? 'Verifying…' : 'Enter full-screen and begin'}
          </button>
        </form>
      </div>
    );
  }

  // ─── render: running ───
  return (
    <div style={S.root} onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()} onPaste={(e) => e.preventDefault()}>
      <style>{`
        @media print { html, body, #root, body * { display: none !important; visibility: hidden !important; } }
        .iv-opt:focus-visible, .iv-btn:focus-visible, .iv-nav:focus-visible { outline: 3px solid #2E6DA4; outline-offset: 2px; }
        .iv-opt { transition: background-color .12s, border-color .12s; }
        @media (prefers-reduced-motion: reduce) { .iv-opt { transition: none; } }
        ::selection { background: transparent; }
      `}</style>

      {locked ? (
        <div style={S.cover} role="alertdialog" aria-live="assertive">
          <div style={{ ...S.card, maxWidth: 480 }}>
            <div style={{ ...S.mark, background: '#FEF3C7', color: '#92400E' }}>⏸</div>
            <h1 style={S.h1}>Interview content hidden</h1>
            <p style={S.p}>
              {!fsOk ? 'Full-screen was closed.' : !sizeOk ? 'Maximise this window to continue.' : 'The page lost focus.'}
              {' '}The timer is still running. Return to the interview to continue.
            </p>
            {lastWarning && <p style={S.err}>Warning {Math.min(violations, maxViolations)} of {maxViolations}: {lastWarning}.</p>}
            {!fsOk && fsRequired.current && (
              <button type="button" className="iv-btn" style={S.primary} onClick={enterFullscreen}>Return to full-screen</button>
            )}
            <p style={S.timeNote}>Time left: {mmss(remaining)}</p>
          </div>
        </div>
      ) : (
        <>
          {/* top bar */}
          <header style={S.bar}>
            <div style={{ minWidth: 0 }}>
              <div style={S.barTitle}>Slirus Global Limited · Online interview</div>
              <div style={S.barSub}>{answeredCount} of {questions.length} answered</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...S.timer, color: lowTime ? '#B91C1C' : '#1A3C5E' }} aria-live="off">{mmss(remaining)}</div>
              <div style={S.warnChip}>Warnings {violations}/{maxViolations}</div>
            </div>
            <div style={S.track}><div style={{ ...S.fill, width: `${pct}%`, background: lowTime ? '#DC2626' : '#2E6DA4' }} /></div>
          </header>

          <div style={{ ...S.body, backgroundImage: watermark }}>
            {/* question */}
            <main style={S.main}>
              {q && (
                <>
                  <div style={S.qCount}>Question {current + 1} of {questions.length}</div>
                  <h2 style={S.question}>{q.q}</h2>
                  <div role="radiogroup" aria-label={`Question ${current + 1}`} style={{ display: 'grid', gap: 10 }}>
                    {q.options.map((o, i) => {
                      const on = answers[q.id] === o.id;
                      return (
                        <button
                          key={o.id} type="button" role="radio" aria-checked={on}
                          className="iv-opt"
                          style={{ ...S.opt, ...(on ? S.optOn : null) }}
                          onClick={() => setAnswer(q.id, o.id)}
                        >
                          <span style={{ ...S.letter, ...(on ? S.letterOn : null) }}>{LETTERS[i]}</span>
                          <span style={{ flex: 1 }}>{o.text}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div style={S.navRow}>
                    <button type="button" className="iv-btn" style={S.ghost} onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>← Previous</button>
                    {current < questions.length - 1
                      ? <button type="button" className="iv-btn" style={S.primarySm} onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>Next →</button>
                      : <button type="button" className="iv-btn" style={S.primarySm} onClick={() => setConfirming(true)}>Finish interview</button>}
                  </div>
                </>
              )}
            </main>

            {/* navigator */}
            <aside style={S.aside} aria-label="Question navigator">
              <div style={S.asideTitle}>Questions</div>
              <div style={S.grid}>
                {questions.map((qq, i) => {
                  const done = answers[qq.id] !== undefined;
                  const here = i === current;
                  return (
                    <button
                      key={qq.id} type="button" className="iv-nav"
                      aria-label={`Question ${i + 1}${done ? ', answered' : ', not answered'}`}
                      aria-current={here ? 'true' : undefined}
                      style={{ ...S.cell, ...(done ? S.cellDone : null), ...(here ? S.cellHere : null) }}
                      onClick={() => setCurrent(i)}
                    >{i + 1}</button>
                  );
                })}
              </div>
              <button type="button" className="iv-btn" style={{ ...S.primary, marginTop: 18 }} onClick={() => setConfirming(true)}>Submit interview</button>
            </aside>
          </div>
        </>
      )}

      {confirming && !locked && (
        <div style={S.modalBg}>
          <div style={{ ...S.card, maxWidth: 440 }} role="dialog" aria-modal="true">
            <h1 style={S.h1}>Submit your interview?</h1>
            <p style={S.p}>
              You have answered {answeredCount} of {questions.length} questions
              {answeredCount < questions.length ? ` — ${questions.length - answeredCount} unanswered will score zero` : ''}.
              You cannot return after submitting.
            </p>
            {submitError && <p style={S.err}>{submitError}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8 }}>
              <button type="button" className="iv-btn" style={S.ghost} onClick={() => setConfirming(false)} disabled={submitting}>Keep working</button>
              <button type="button" className="iv-btn" style={{ ...S.primarySm, opacity: submitting ? 0.6 : 1 }} onClick={() => submit('manual')} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Yes, submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitting && !confirming && (
        <div style={S.modalBg}><div style={{ ...S.card, maxWidth: 360 }}><p style={S.p}>Submitting your answers…</p>{submitError && <p style={S.err}>{submitError}</p>}</div></div>
      )}
    </div>
  );
};

// ─── styles ───────────────────────────────────────────────────────────────────
const SANS  = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const NO_SELECT = { userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none', WebkitTouchCallout: 'none', WebkitUserDrag: 'none' };

const S = {
  center:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8', padding: 20, fontFamily: SANS },
  card:    { background: '#fff', borderRadius: 14, padding: '36px 34px', boxShadow: '0 6px 30px rgba(26,60,94,0.14)', width: '100%', maxWidth: 460, textAlign: 'center', boxSizing: 'border-box' },
  mark:    { width: 52, height: 52, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, marginBottom: 14 },
  h1:      { fontSize: 22, margin: '0 0 10px', color: '#1A3C5E', textAlign: 'center', fontWeight: 800, letterSpacing: -0.2 },
  p:       { fontSize: 15, lineHeight: 1.65, color: '#475569', margin: '0 0 14px' },
  small:   { fontSize: 13, color: '#7A8A9A', margin: 0 },
  rules:   { margin: '0 0 20px', paddingLeft: 20, color: '#334155', fontSize: 14, lineHeight: 1.7 },
  label:   { display: 'block', fontSize: 13, fontWeight: 700, color: '#1A3C5E', marginBottom: 6 },
  input:   { width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 15, border: '1.5px solid #CBD5E1', borderRadius: 8, marginBottom: 12, fontFamily: SANS },
  err:     { fontSize: 13, color: '#991B1B', background: '#FEE2E2', borderRadius: 8, padding: '9px 12px', margin: '0 0 12px', lineHeight: 1.5 },
  primary: { width: '100%', background: '#1A3C5E', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 18px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: SANS },
  primarySm: { background: '#1A3C5E', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: SANS },
  ghost:   { background: '#fff', color: '#1A3C5E', border: '1.5px solid #CBD5E1', borderRadius: 9, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: SANS },
  timeNote:{ fontSize: 13, color: '#7A8A9A', margin: '14px 0 0' },

  root:    { position: 'fixed', inset: 0, background: '#F0F4F8', fontFamily: SANS, overflow: 'hidden', display: 'flex', flexDirection: 'column', ...NO_SELECT },
  cover:   { position: 'absolute', inset: 0, background: '#E8EEF5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 },
  modalBg: { position: 'absolute', inset: 0, background: 'rgba(15,30,48,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 },

  bar:     { position: 'relative', background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '12px 24px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0 },
  barTitle:{ fontSize: 15, fontWeight: 800, color: '#1A3C5E' },
  barSub:  { fontSize: 12, color: '#7A8A9A', marginTop: 2 },
  timer:   { fontSize: 34, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: 0.5 },
  warnChip:{ fontSize: 11, fontWeight: 700, color: '#92400E', marginTop: 4 },
  track:   { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: '#E2E8F0' },
  fill:    { height: '100%', transition: 'width .5s linear' },

  body:    { flex: 1, display: 'flex', gap: 24, padding: 24, overflow: 'auto', backgroundRepeat: 'repeat', alignItems: 'flex-start' },
  main:    { flex: 1, minWidth: 0, maxWidth: 820, background: 'rgba(255,255,255,0.94)', borderRadius: 12, border: '1px solid #E2E8F0', padding: '28px 30px', boxSizing: 'border-box' },
  qCount:  { fontSize: 13, fontWeight: 700, color: '#2E6DA4', marginBottom: 10 },
  question:{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.5, color: '#1A3C5E', fontWeight: 600, margin: '0 0 22px' },
  opt:     { display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left', width: '100%', background: '#fff', border: '1.5px solid #D5DEE8', borderRadius: 10, padding: '14px 16px', fontSize: 15, lineHeight: 1.5, color: '#1E293B', cursor: 'pointer', fontFamily: SANS },
  optOn:   { background: '#EAF2FB', borderColor: '#1A3C5E' },
  letter:  { flexShrink: 0, width: 28, height: 28, borderRadius: 7, background: '#F0F4F8', color: '#1A3C5E', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 },
  letterOn:{ background: '#1A3C5E', color: '#fff' },
  navRow:  { display: 'flex', justifyContent: 'space-between', marginTop: 26, gap: 10 },

  aside:   { width: 232, flexShrink: 0, background: 'rgba(255,255,255,0.94)', borderRadius: 12, border: '1px solid #E2E8F0', padding: 18, boxSizing: 'border-box', position: 'sticky', top: 0 },
  asideTitle: { fontSize: 13, fontWeight: 800, color: '#1A3C5E', marginBottom: 12 },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 7 },
  cell:    { aspectRatio: '1 / 1', border: '1.5px solid #D5DEE8', background: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#64748B', cursor: 'pointer', fontFamily: SANS, padding: 0 },
  cellDone:{ background: '#1A3C5E', borderColor: '#1A3C5E', color: '#fff' },
  cellHere:{ boxShadow: '0 0 0 3px #9CC3EA' },
};

// Narrow screens: stack the navigator under the question.
if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 820px)').matches) {
  S.body = { ...S.body, flexDirection: 'column', padding: 12, gap: 12 };
  S.main = { ...S.main, maxWidth: '100%', width: '100%', padding: '20px 18px' };
  S.aside = { ...S.aside, width: '100%', position: 'static' };
  S.question = { ...S.question, fontSize: 19 };
  S.bar = { ...S.bar, padding: '10px 14px 12px' };
  S.timer = { ...S.timer, fontSize: 28 };
}

export default Interview;