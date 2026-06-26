/**
 * Admin.jsx – Slirus Holdings Applications Dashboard
 *
 * Features:
 *  - Firebase Auth login / logout (email + password)
 *  - Realtime listener on applications collection and settings/applicationStatus
 *  - Toggle open/closed status per career track
 *  - Filter applications by track, status, and free-text search
 *  - Inline status update (Shortlist / Reject) — calls POST /api/send-email
 *    (server.js → Nodemailer + Mailtrap API) to notify the applicant by email
 *  - Detail modal with full applicant data + status actions + PDF download
 *  - Admin-copy PDF generation (jsPDF, lazy-loaded)
 *
 * No prop drilling issues — state lives at Admin level and is passed explicitly.
 * All Firebase calls are try/catch with user-friendly error feedback.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, updateDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';
import { CAREER_TRACKS } from './careerTracks';

// ─── API Base URL ─────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || '';

// ─── PDF Generator (Admin Copy) ───────────────────────────────────────────────
const generateAdminPDF = async (app) => {
  const { jsPDF } = await import('jspdf');
  const track    = CAREER_TRACKS.find(t => t.key === app.trackKey);
  const hexColor = app.trackColor || track?.color || '#1A3C5E';
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, M = 20, CW = PW - M * 2;
  let y = 20;

  const newPage = () => { pdf.addPage(); y = 20; };
  const checkY  = (n = 10) => { if (y + n > 275) newPage(); };

  const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [26, 60, 94];
  };

  // Header
  pdf.setFillColor(26, 60, 94);
  pdf.rect(0, 0, PW, 28, 'F');
  pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
  pdf.text('SLIRUS HOLDINGS LIMITED', M, 12);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  pdf.text('Employment Application — Admin Copy', M, 19);
  pdf.text(`Position: ${app.program || '—'}`, PW - M, 12, { align: 'right' });
  const submittedDate = app.submittedAt?.toDate
    ? app.submittedAt.toDate().toLocaleDateString('en-UG') : '—';
  pdf.text(`Submitted: ${submittedDate}`, PW - M, 19, { align: 'right' });
  y = 36;

  const [cr, cg, cb] = hexToRgb(hexColor);
  pdf.setDrawColor(cr, cg, cb); pdf.setLineWidth(0.8);
  pdf.line(M, y, PW - M, y); y += 6;

  // Status badge
  const statusMap = { Shortlisted: [16, 185, 129], Unqualified: [239, 68, 68], Pending: [245, 158, 11] };
  const [sr, sg, sb] = statusMap[app.status] || statusMap.Pending;
  pdf.setFillColor(sr, sg, sb);
  pdf.roundedRect(M, y, 38, 7, 2, 2, 'F');
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
  pdf.text((app.status || 'Pending').toUpperCase(), M + 19, y + 5, { align: 'center' });
  y += 14;

  const section = (title) => {
    checkY(14);
    pdf.setFillColor(240, 244, 248);
    pdf.rect(M, y, CW, 7, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(title.toUpperCase(), M + 3, y + 5); y += 10;
  };
  const row = (label, value) => {
    if (!value) return;
    checkY(7);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
    pdf.text(label + ':', M, y);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
    const lines = pdf.splitTextToSize(String(value), CW - 45);
    pdf.text(lines, M + 44, y); y += lines.length * 5 + 2;
  };
  const multiRow = (label, value) => {
    if (!value) return;
    checkY(10);
    if (label) {
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
      pdf.text(label + ':', M, y); y += 5;
    }
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
    pdf.splitTextToSize(String(value), CW).forEach(l => { checkY(5); pdf.text(l, M, y); y += 5; });
    y += 2;
  };

  section('1. Personal Information');
  row('Full Name', app.fullName); row('Date of Birth', app.dob);
  row('Age', app.age); row('Gender', app.gender); y += 2;

  section('2. Contact Information');
  row('Phone', app.phone); row('Email', app.email);
  row('Address', app.physicalAddress); row('District', app.district); y += 2;

  if (app.coverNote?.trim()) { section('3. Cover Note'); multiRow('', app.coverNote); y += 2; }

  section('4. Education History');
  (app.education || []).forEach((e, i) => {
    if (!e.institution) return;
    checkY(18);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(`${i + 1}. ${e.institution}`, M + 2, y); y += 5;
    row('  Year', e.year); row('  Level', e.level); row('  Award', e.award); y += 1;
  });

  section('5. Work Experience');
  const hasExp = (app.experience || []).some(e => e.employer);
  if (hasExp) {
    (app.experience || []).forEach((e, i) => {
      if (!e.employer) return;
      checkY(20);
      pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
      pdf.text(`${i + 1}. ${e.employer} — ${e.role}`, M + 2, y); y += 5;
      row('  Period', e.period);
      if (e.duties) multiRow('  Duties', e.duties); y += 1;
    });
  } else {
    pdf.setFontSize(9); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(150, 150, 150);
    pdf.text('No work experience provided.', M + 2, y); y += 7;
  }

  const hobbies = (app.hobbies || []).filter(Boolean);
  if (hobbies.length) { section('6. Hobbies & Interests'); multiRow('', hobbies.join(', ')); y += 2; }

  section('7. Professional Referees');
  (app.referees || []).forEach((r, i) => {
    if (!r.name) return;
    checkY(18);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(`${i + 1}. ${r.name}`, M + 2, y); y += 5;
    row('  Title', r.title); row('  Contact', r.contact); y += 1;
  });

  const total = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(160, 160, 160);
    pdf.line(M, 285, PW - M, 285);
    pdf.text(`Slirus Holdings · Admin Copy · Confidential · Page ${p} of ${total}`, PW / 2, 290, { align: 'center' });
  }

  const safe = (app.fullName || 'applicant').replace(/\s+/g, '_');
  pdf.save(`Slirus_Admin_${safe}_${app.trackKey || 'app'}.pdf`);
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:     { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  Shortlisted: { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  Unqualified: { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const Badge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status || 'Pending'}
    </span>
  );
};

// ─── Track Toggle Card ────────────────────────────────────────────────────────
const TrackToggle = ({ track, isOpen, onToggle, toggling, appCount }) => (
  <div style={{ ...tt.card, borderTop: `3px solid ${track.color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      {track.tag && <span style={{ ...tt.tag, background: track.lightBg || '#EFF6FF', color: track.color }}>{track.tag}</span>}
      <span style={{ fontSize: 12, color: '#7A8A9A', fontWeight: 600, marginLeft: 'auto' }}>{appCount} applied</span>
    </div>
    <h4 style={{ ...tt.title, color: track.color }}>{track.title}</h4>
    {track.description && <p style={tt.desc}>{track.description}</p>}
    <div style={tt.footer}>
      <span style={{ ...tt.status, color: isOpen ? '#065F46' : '#991B1B' }}>
        {isOpen ? '● Open' : '● Closed'}
      </span>
      <button
        style={{ ...tt.btn, background: isOpen ? '#FEE2E2' : '#D1FAE5', color: isOpen ? '#991B1B' : '#065F46' }}
        onClick={() => onToggle(track.key, isOpen)}
        disabled={toggling === track.key}
      >
        {toggling === track.key ? '…' : isOpen ? 'Close' : 'Open'}
      </button>
    </div>
  </div>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ app, onClose, onStatusChange, statusUpdating }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(app?.status);

  useEffect(() => { setLocalStatus(app?.status); }, [app?.status]);

  if (!app) return null;

  const track = CAREER_TRACKS.find(t => t.key === app.trackKey);
  const tc = app.trackColor || track?.color || '#2E6DA4';

  const handleStatusChange = async (newStatus) => {
    setLocalStatus(newStatus);
    await onStatusChange(app.id, newStatus);
  };

  const handlePDF = async () => {
    setPdfLoading(true);
    try { await generateAdminPDF({ ...app, status: localStatus }); }
    catch (err) { alert('PDF error: ' + err.message); }
    finally { setPdfLoading(false); }
  };

  const Sec = ({ title, children }) => (
    <div style={ms.section}>
      <h4 style={{ ...ms.secTitle, color: tc }}>{title}</h4>
      {children}
    </div>
  );
  const Row = ({ label, val }) => val
    ? <div style={ms.row}><span style={ms.label}>{label}</span><span style={ms.val}>{val}</span></div>
    : null;

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ ...ms.header, borderTop: `4px solid ${tc}` }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{app.fullName}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>
              {app.program}{app.type ? ` · ${app.type}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge status={localStatus} />
            <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* Action bar */}
        <div style={ms.actionBar}>
          <button
            style={{ ...ms.actionBtn, background: '#D1FAE5', color: '#065F46', opacity: localStatus === 'Shortlisted' ? 0.45 : 1 }}
            onClick={() => handleStatusChange('Shortlisted')}
            disabled={localStatus === 'Shortlisted' || statusUpdating}
          >
            ✅ Shortlist
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#FEE2E2', color: '#991B1B', opacity: localStatus === 'Unqualified' ? 0.45 : 1 }}
            onClick={() => handleStatusChange('Unqualified')}
            disabled={localStatus === 'Unqualified' || statusUpdating}
          >
            ✗ Reject
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#EFF6FF', color: '#1D4ED8' }}
            onClick={handlePDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? '⏳ Generating…' : '⬇ Download PDF'}
          </button>
        </div>

        {/* Scrollable body */}
        <div style={ms.body}>
          <Sec title="Personal">
            <Row label="Date of Birth" val={app.dob} />
            <Row label="Age"           val={app.age} />
            <Row label="Gender"        val={app.gender} />
          </Sec>
          <Sec title="Contact">
            <Row label="Phone"   val={app.phone} />
            <Row label="Email"   val={app.email} />
            <Row label="Address" val={app.physicalAddress} />
            <Row label="District" val={app.district} />
          </Sec>
          {app.coverNote?.trim() && (
            <Sec title="Cover Note">
              <p style={{ fontSize: 14, color: '#1A3C5E', lineHeight: 1.7, margin: 0 }}>{app.coverNote}</p>
            </Sec>
          )}
          {(app.education || []).some(e => e.institution) && (
            <Sec title="Education">
              {(app.education || []).map((e, i) =>
                e.institution ? <Row key={i} label={e.year || `#${i + 1}`} val={[e.institution, e.level, e.award].filter(Boolean).join(' · ')} /> : null
              )}
            </Sec>
          )}
          {(app.experience || []).some(e => e.employer) && (
            <Sec title="Experience">
              {(app.experience || []).map((e, i) => e.employer ? (
                <div key={i} style={{ marginBottom: 10 }}>
                  <Row label={e.period || `#${i + 1}`} val={[e.employer, e.role].filter(Boolean).join(' · ')} />
                  {e.duties && <p style={{ fontSize: 13, color: '#5A7A9A', margin: '3px 0 0 124px', lineHeight: 1.5 }}>{e.duties}</p>}
                </div>
              ) : null)}
            </Sec>
          )}
          {(app.hobbies || []).filter(Boolean).length > 0 && (
            <Sec title="Hobbies">
              <p style={{ fontSize: 14, color: '#1A3C5E', margin: 0 }}>{app.hobbies.filter(Boolean).join(', ')}</p>
            </Sec>
          )}
          {(app.referees || []).some(r => r.name) && (
            <Sec title="Referees">
              {(app.referees || []).map((r, i) => r.name
                ? <Row key={i} label={r.name} val={[r.title, r.contact].filter(Boolean).join(' · ')} />
                : null
              )}
            </Sec>
          )}
          <Sec title="Submission">
            <Row label="Reference" val={app.id?.slice(0, 12).toUpperCase()} />
            <Row label="Submitted" val={app.submittedAt?.toDate ? app.submittedAt.toDate().toLocaleString('en-UG') : '—'} />
            <Row label="Status"    val={localStatus} />
          </Sec>
        </div>
      </div>
    </div>
  );
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLogin?.();
    } catch (err) {
      const friendly = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(err.code);
      setError(friendly ? 'Invalid email or password. Please try again.' : 'Sign-in failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.loginBg}>
      <div style={s.loginCard}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
        <h2 style={s.loginTitle}>Admin Portal</h2>
        <p style={s.loginSub}>Enter your credentials to access the dashboard.</p>
        <form onSubmit={handleSubmit} noValidate>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8' }}
            disabled={loading}
            autoFocus
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8', marginTop: 10 }}
            disabled={loading}
            autoComplete="current-password"
          />
          {error && <p style={s.loginErr}>{error}</p>}
          <button type="submit" style={s.loginBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Main Admin Component ─────────────────────────────────────────────────────
const Admin = () => {
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [trackStatuses, setTrackStatuses] = useState({});
  const [toggling, setToggling]       = useState(null);
  const [selected, setSelected]       = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [loadingApps, setLoadingApps] = useState(true);
  const [trackFilter, setTrackFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch]           = useState('');
  const [appsError, setAppsError]     = useState(null);
  const [settingsError, setSettingsError] = useState(null);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // Firestore listeners — only when logged in
  useEffect(() => {
    if (!user) {
      setApplications([]);
      setTrackStatuses({});
      setAppsError(null);
      setSettingsError(null);
      return;
    }
    setLoadingApps(true);

    const unsubApps = onSnapshot(
      collection(db, 'applications'),
      (snap) => {
        setAppsError(null);
        setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingApps(false);
      },
      (err) => {
        console.error('Applications listen error:', err);
        setAppsError(err.code === 'permission-denied'
          ? 'Permission denied reading applications. Check your Firestore Security Rules.'
          : 'Could not load applications: ' + err.message);
        setLoadingApps(false);
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'applicationStatus'),
      async (snap) => {
        setSettingsError(null);
        const data = snap.exists() ? snap.data() : {};

        // Auto-seed: write false for any CAREER_TRACKS key missing from Firestore.
        // Fixes the case where Firestore only has a subset of keys
        // (e.g. softwareDev + accounts but not sales or internship).
        const missing = {};
        CAREER_TRACKS.forEach(t => { if (!(t.key in data)) missing[t.key] = false; });
        if (Object.keys(missing).length > 0) {
          console.log('[Admin] Seeding missing track keys:', missing);
          try {
            await setDoc(
              doc(db, 'settings', 'applicationStatus'),
              missing,
              { merge: true }
            );
          } catch (seedErr) {
            console.warn('[Admin] Could not seed track keys:', seedErr.message);
          }
          // onSnapshot will fire again with the full data — skip setTrackStatuses here
          return;
        }

        setTrackStatuses(data);
      },
      (err) => {
        console.error('Settings listen error:', err);
        setSettingsError(err.code === 'permission-denied'
          ? 'Permission denied reading settings. Check your Firestore Security Rules.'
          : 'Could not load track settings: ' + err.message);
      }
    );

    return () => { unsubApps(); unsubSettings(); };
  }, [user]);

  const handleLogout = async () => {
    try { await signOut(auth); }
    catch (err) { console.error('Logout error:', err); }
  };

  const toggleTrackStatus = async (trackKey, currentStatus) => {
    setToggling(trackKey);
    try {
      // Re-read the current Firebase Auth user at call time — never rely on
      // a stale closure. If auth.currentUser is null here the rules will block
      // the write with permission-denied even though the user "appears" logged in.
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('Session expired — please sign out and sign in again.');
        setToggling(null);
        return;
      }

      const newValue = !currentStatus;
      console.log(`[Toggle] ${trackKey}: ${currentStatus} → ${newValue} | uid: ${currentUser.uid} | email: ${currentUser.email}`);

      await setDoc(
        doc(db, 'settings', 'applicationStatus'),
        { [trackKey]: newValue },
        { merge: true }
      );

      console.log(`[Toggle] Firestore write success for ${trackKey}`);
    } catch (err) {
      console.error('toggleTrackStatus error:', err.code, err.message);
      if (err.code === 'permission-denied') {
        alert(`Permission denied.\n\nFirebase rejected the write for "${trackKey}".\n\nMake sure:\n1. You are logged in as kaayamosesawal@gmail.com\n2. Your Firestore rules allow this email to write to settings/applicationStatus`);
      } else {
        alert('Toggle failed: ' + err.message);
      }
    } finally {
      setToggling(null);
    }
  };

  const updateStatus = useCallback(async (id, status) => {
    setStatusUpdating(true);
    try {
      // 1. Update status in Firestore. onSnapshot keeps the table in sync.
      await updateDoc(doc(db, 'applications', id), { status });

      // Optimistic update so the modal badge flips instantly.
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);

      // 2. Send the appropriate email via server (Nodemailer + Mailtrap).
      //    Uses in-memory applications array — no extra Firestore read required.
      const app = applications.find(a => a.id === id);
      if (app && (status === 'Shortlisted' || status === 'Unqualified')) {
        const emailType = status === 'Shortlisted' ? 'shortlisted' : 'unqualified';
        fetch(`${API_URL}/api/send-email`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:    emailType,
            to:      app.email,
            name:    app.fullName,
            program: app.program,
          }),
        }).catch(err => console.warn('[Email] Status email failed:', err));
      }
    } catch (err) {
      console.error('updateStatus error:', err);
      alert('Status update failed: ' + err.message);
    } finally {
      setStatusUpdating(false);
    }
  }, [applications]);

  // ── Loading auth ──
  if (authLoading) {
    return (
      <div style={s.loginBg}>
        <div style={{ color: '#1A3C5E', fontWeight: 600, fontSize: 15 }}>Loading Portal…</div>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!user) return <LoginScreen />;

  // ── Derived data ──
  const countForTrack = (key) => applications.filter(a => a.trackKey === key).length;

  const displayed = applications
    .filter(a => trackFilter  === 'All' || a.trackKey === trackFilter)
    .filter(a => statusFilter === 'All' || a.status   === statusFilter)
    .filter(a => {
      const q = search.trim().toLowerCase();
      return !q || a.fullName?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.submittedAt?.toDate?.() || 0) - (a.submittedAt?.toDate?.() || 0));

  const counts = {
    All:         applications.length,
    Pending:     applications.filter(a => a.status === 'Pending').length,
    Shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
    Unqualified: applications.filter(a => a.status === 'Unqualified').length,
  };

  return (
    <Layout>
      <div style={s.page}>
        {/* Permission / connection error banners */}
        {settingsError && (
          <div style={s.errorBanner}>⚠️ Track Settings: {settingsError}</div>
        )}
        {appsError && (
          <div style={s.errorBanner}>⚠️ Applications: {appsError}</div>
        )}

        {/* Top bar */}
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Applications Dashboard</h1>
            <p style={s.pageSub}>
              {counts.All} total · {counts.Shortlisted} shortlisted · {counts.Pending} pending · {counts.Unqualified} unqualified
            </p>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>Sign Out ⎋</button>
        </div>

        {/* Intake control */}
        <h2 style={s.sectionHead}>Position Intake Control</h2>
        <div style={s.trackGrid}>
          {CAREER_TRACKS.map(track => (
            <TrackToggle
              key={track.key}
              track={track}
              isOpen={trackStatuses[track.key] === true}
              onToggle={toggleTrackStatus}
              toggling={toggling}
              appCount={countForTrack(track.key)}
            />
          ))}
        </div>

        {/* Applications table */}
        <h2 style={{ ...s.sectionHead, marginTop: 36 }}>Received Applications</h2>

        {/* Filters toolbar */}
        <div style={s.toolbar}>
          <div style={s.tabs}>
            <button
              style={{ ...s.tab, ...(trackFilter === 'All' ? s.tabActive : {}) }}
              onClick={() => setTrackFilter('All')}
            >
              All Tracks <span style={s.tabCount}>{counts.All}</span>
            </button>
            {CAREER_TRACKS.map(t => (
              <button
                key={t.key}
                style={{ ...s.tab, ...(trackFilter === t.key ? { ...s.tabActive, background: t.color, borderColor: t.color } : {}) }}
                onClick={() => setTrackFilter(t.key)}
              >
                {t.title.split(' ')[0]}
                <span style={s.tabCount}>{countForTrack(t.key)}</span>
              </button>
            ))}
          </div>

          <div style={s.tabs}>
            {['All', 'Pending', 'Shortlisted', 'Unqualified'].map(st => {
              const cfg = STATUS_CONFIG[st];
              return (
                <button
                  key={st}
                  style={{ ...s.tab, ...(statusFilter === st ? (cfg ? { background: cfg.bg, color: cfg.color, borderColor: cfg.dot } : s.tabActive) : {}) }}
                  onClick={() => setStatusFilter(st)}
                >
                  {st} <span style={s.tabCount}>{counts[st]}</span>
                </button>
              );
            })}
          </div>

          <input
            style={s.searchInput}
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div style={s.tableWrap}>
          {loadingApps ? (
            <div style={s.tableMsg}>Loading applications…</div>
          ) : displayed.length === 0 ? (
            <div style={s.tableMsg}>No applications match your filters.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Applicant</th>
                  <th style={s.th}>Track</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Submitted</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(app => {
                  const appTrack = CAREER_TRACKS.find(t => t.key === app.trackKey);
                  return (
                    <tr key={app.id} style={s.tr}>
                      <td style={s.td}>
                        <button style={s.nameBtn} onClick={() => setSelected(app)}>
                          {app.fullName}
                        </button>
                        <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{app.email}</div>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 13, color: appTrack?.color || '#1A3C5E', fontWeight: 600 }}>
                          {appTrack?.title || app.program || '—'}
                        </span>
                      </td>
                      <td style={s.td}><Badge status={app.status} /></td>
                      <td style={{ ...s.td, fontSize: 12, color: '#7A8A9A', whiteSpace: 'nowrap' }}>
                        {app.submittedAt?.toDate ? app.submittedAt.toDate().toLocaleDateString('en-UG') : '—'}
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            style={{ ...s.btnShortlist, opacity: app.status === 'Shortlisted' ? 0.45 : 1 }}
                            onClick={() => updateStatus(app.id, 'Shortlisted')}
                            disabled={app.status === 'Shortlisted' || statusUpdating}
                          >
                            Shortlist
                          </button>
                          <button
                            style={{ ...s.btnReject, opacity: app.status === 'Unqualified' ? 0.45 : 1 }}
                            onClick={() => updateStatus(app.id, 'Unqualified')}
                            disabled={app.status === 'Unqualified' || statusUpdating}
                          >
                            Reject
                          </button>
                          <button style={s.btnView} onClick={() => setSelected(app)}>View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <DetailModal
        app={selected}
        onClose={() => setSelected(null)}
        onStatusChange={updateStatus}
        statusUpdating={statusUpdating}
      />
    </Layout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  errorBanner: { background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E', fontWeight: 600 },

  loginBg:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' },
  loginCard:  { background: '#fff', borderRadius: 14, padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', textAlign: 'center', width: '100%', maxWidth: 380, border: '1px solid #E2E8F0', borderTop: '4px solid #1A3C5E' },
  loginTitle: { fontSize: 22, fontWeight: 700, color: '#1A3C5E', margin: '0 0 8px' },
  loginSub:   { color: '#5A7A9A', fontSize: 14, margin: '0 0 28px' },
  loginInput: { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  loginErr:   { color: '#EF4444', fontSize: 13, margin: '10px 0 0', textAlign: 'left' },
  loginBtn:   { width: '100%', background: '#1A3C5E', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },

  page:        { padding: '36px 5%', maxWidth: 1280, margin: '0 auto' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle:   { fontSize: 26, fontWeight: 700, color: '#1A3C5E', margin: 0 },
  pageSub:     { color: '#5A7A9A', margin: '4px 0 0', fontSize: 14 },
  logoutBtn:   { padding: '8px 16px', background: '#fff', border: '1.5px solid #C5CDD6', color: '#4A6B8A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  sectionHead: { fontSize: 15, fontWeight: 700, color: '#1A3C5E', margin: '0 0 14px' },
  trackGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },

  toolbar:     { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' },
  tabs:        { display: 'flex', gap: 4, flexWrap: 'wrap' },
  tab:         { background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 7, padding: '7px 12px', fontSize: 13, color: '#5A7A9A', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 },
  tabActive:   { background: '#1A3C5E', color: '#fff', borderColor: '#1A3C5E' },
  tabCount:    { background: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: '1px 7px', fontSize: 11 },
  searchInput: { flex: 1, minWidth: 200, padding: '9px 14px', border: '1.5px solid #D0DCE8', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },

  tableWrap:   { background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'auto' },
  tableMsg:    { padding: 56, textAlign: 'center', color: '#5A7A9A', fontSize: 14 },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead:       { background: '#F7F9FC' },
  th:          { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' },
  tr:          { borderBottom: '1px solid #F0F4F8' },
  td:          { padding: '11px 14px', verticalAlign: 'middle', color: '#1A3C5E' },
  nameBtn:     { background: 'none', border: 'none', color: '#2E6DA4', fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' },
  btnShortlist:{ background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnReject:   { background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnView:     { background: '#EFF6FF', color: '#1D4ED8', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
};

const tt = {
  card:   { background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  tag:    { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '3px 8px', letterSpacing: 0.4, textTransform: 'uppercase' },
  title:  { fontSize: 15, fontWeight: 700, margin: '6px 0 4px' },
  desc:   { fontSize: 12, color: '#5A7A9A', lineHeight: 1.5, margin: '0 0 14px' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  status: { fontSize: 12, fontWeight: 700 },
  btn:    { border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
};

const ms = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal:     { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
  header:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F7F9FC', borderRadius: '12px 12px 0 0', flexShrink: 0 },
  actionBar: { display: 'flex', gap: 8, padding: '12px 24px', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', flexShrink: 0 },
  actionBtn: { border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  body:      { overflowY: 'auto', padding: '20px 24px', flex: 1 },
  closeBtn:  { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7A8A9A', lineHeight: 1, padding: 4 },
  section:   { marginBottom: 18 },
  secTitle:  { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px', borderBottom: '1px solid #E8F0F8', paddingBottom: 5 },
  row:       { display: 'flex', gap: 10, padding: '4px 0', fontSize: 14 },
  label:     { minWidth: 120, color: '#7A8A9A', fontWeight: 600, fontSize: 13, flexShrink: 0 },
  val:       { color: '#1A3C5E', flex: 1, wordBreak: 'break-word' },
};

export default Admin;