/**
 * WorkerLog.jsx – Slirus Global Limited Worker Workspace
 *
 * Self-service portal open to every registered team member (any active
 * `teamUsers/{uid}` profile — no department restriction), following the
 * same auth/session/style conventions as CeoManager.jsx, HrManager.jsx,
 * SalesManager.jsx, AccountsManager.jsx and SecretaryManager.jsx.
 *
 * "Accessible to all, maximum view controlled" means: every worker gets
 * full read/write on their OWN records (work log, appointments, routines,
 * goals, performance submissions), but only narrow, read-only slices of
 * other modules' data — their own pay slips, a company-wide notices feed
 * scoped to their department, and an aggregate (non-financial-detail)
 * market-trends snapshot. There is no cross-worker visibility here.
 *
 * Collections owned by this file (new):
 *  - workLogs          { employeeEmail, employeeName, date, task, category,
 *                         hoursSpent, status, notes, createdAt }
 *  - appointments       { requestedByEmail, requestedByName, department,
 *                         subject, proposedDate, proposedTime, notes,
 *                         status: pending|confirmed|declined|cancelled|completed,
 *                         createdAt } — department heads action these from
 *                         their own modules (future integration point: each
 *                         manager file can subscribe to
 *                         `where('department','==','<Dept>')`).
 *  - routines           { employeeEmail, title, frequency, timeOfDay, note,
 *                         active, createdAt }
 *  - goals              { employeeEmail, title, description, targetDate,
 *                         progressPct, status: active|achieved|missed,
 *                         createdAt, updatedAt }
 *  - workerOutputs       { employeeId, employeeEmail, employeeName, period,
 *                         summary, tasksLogged, hoursLogged, goalsAchieved,
 *                         submittedAt } — self-reported output snapshots.
 *                         HrManager.jsx's Performance & Appraisal tab is the
 *                         natural place to surface these alongside HR-authored
 *                         `performanceReviews` (not wired in this file, since
 *                         that's HrManager's own review-of-record surface).
 *
 * Collections read only:
 *  - employees (HR)     — matched to the signed-in user by email, to link
 *                         pay slips and (if present) attendance.
 *  - payslips (HR)      — filtered to the worker's own employeeId.
 *  - payrollTax (Accounts) — best-effort matched by employee full name
 *                         (that collection stores a free-text name, not an
 *                         id — flagged in the UI when no match is found).
 *  - leads, campaigns (Sales) — aggregated into a read-only trends snapshot,
 *                         no client names or per-deal detail shown.
 *  - documents + `receipts` subcollection (Secretary) — published Memos and
 *                         Notices scoped to the worker's department or
 *                         Company-Wide; "Mark as read" writes into the same
 *                         `documents/{id}/receipts/{uid}` shape SecretaryManager
 *                         already tracks, so its Read Receipt view lights up.
 *  - documents (Secretary), personal — Letters/Contracts (job appointment
 *                         letters, employment contracts) the Secretary has
 *                         issued directly to this worker via `recipientEmail`
 *                         on the same `documents` collection. Shown under
 *                         "My Documents" with a PDF download (print window,
 *                         same pattern as My Payments) and the same read
 *                         receipt write-back as notices.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db, auth } from '../firebase/firebase';
import {
  collection, collectionGroup, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';

// ─── Config ─────────────────────────────────────────────────────────────────
const CEO_EMAIL = (import.meta.env.VITE_CEO_EMAIL || 'kaayamosesawal@gmail.com').toLowerCase();
const CURRENCY = 'UGX';

const TASK_CATEGORIES = ['Operations', 'Sales Support', 'Client Service', 'Admin', 'Field Work', 'Projects', 'Other'];
const WORKLOG_STATUSES = { 'in-progress': { bg: '#FEF3C7', color: '#92400E', label: 'In Progress' }, completed: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' }, blocked: { bg: '#FEE2E2', color: '#991B1B', label: 'Blocked' } };

const APPOINTMENT_DEPARTMENTS = [
  { key: 'HR', label: 'HR Manager', icon: '🧑\u200d💼' },
  { key: 'Sales', label: 'Sales Officer', icon: '📈' },
  { key: 'Finance', label: 'CFO / Accounts', icon: '💰' },
  { key: 'Administration', label: 'Secretary', icon: '🗂️' },
  { key: 'Executive', label: 'CEO', icon: '👑' },
];
const APPT_STATUS = {
  pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  confirmed: { bg: '#D1FAE5', color: '#065F46', label: 'Confirmed' },
  declined: { bg: '#FEE2E2', color: '#991B1B', label: 'Declined' },
  cancelled: { bg: '#F0F4F8', color: '#5A7A9A', label: 'Cancelled' },
  completed: { bg: '#DBEAFE', color: '#1E40AF', label: 'Completed' },
};

const ROUTINE_FREQUENCIES = ['Daily', 'Weekly', 'Monthly'];
const GOAL_STATUS = { active: { bg: '#DBEAFE', color: '#1E40AF', label: 'Active' }, achieved: { bg: '#D1FAE5', color: '#065F46', label: 'Achieved' }, missed: { bg: '#FEE2E2', color: '#991B1B', label: 'Missed' } };

const DOC_TYPE_MAP = {
  memo: { icon: '🗒️', label: 'Memo' }, notice: { icon: '📢', label: 'Notice' },
  letter: { icon: '✉️', label: 'Letter' }, contract: { icon: '📄', label: 'Contract' },
};

const IDLE_LIMIT_MS = 20 * 60 * 1000;
const IDLE_WARN_MS = 18 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return '—';
  if (ts?.toDate) return ts.toDate().toLocaleDateString('en-UG');
  const d = new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-UG');
};
const fmtDateTime = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-UG') : '—');
const money = (n) => `${CURRENCY} ${Math.round(Number(n) || 0).toLocaleString('en-UG')}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const currentPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

const openPrintWindow = (title, bodyHtml) => {
  const win = window.open('', '_blank', 'width=820,height=1000');
  if (!win) { alert('Please allow pop-ups to download/print.'); return; }
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #1A3C5E; padding: 40px; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          .muted { color: #5A7A9A; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { padding: 8px 10px; text-align: left; font-size: 13px; border-bottom: 1px solid #E2E8F0; }
          th { background: #F7F9FC; text-transform: uppercase; font-size: 11px; letter-spacing: 0.4px; color: #7A8A9A; }
          .totals td { border: none; font-weight: 700; }
          .right { text-align: right; }
          .headRow { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0D9488; padding-bottom: 16px; margin-bottom: 16px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <div class="no-print" style="margin-top:30px;">
          <button onclick="window.print()" style="padding:10px 18px;background:#0D9488;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Print / Save as PDF</button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
};

// ─── Badges ─────────────────────────────────────────────────────────────────
const Pill = ({ cfg, fallback }) => {
  const c = cfg || fallback;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, color: c.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{c.label}</span>;
};

// ─── Login / Access Denied ──────────────────────────────────────────────────
const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      const friendly = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(err.code);
      setError(friendly ? 'Invalid email or password. Please try again.' : 'Sign-in failed. Please check your connection.');
    } finally { setLoading(false); }
  };
  return (
    <div style={s.loginBg}>
      <div style={s.loginCard}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🧰</div>
        <h2 style={s.loginTitle}>Worker Workspace</h2>
        <p style={s.loginSub}>Sign in with your work credentials.</p>
        <form onSubmit={handleSubmit} noValidate>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8' }} disabled={loading} autoFocus autoComplete="username" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8', marginTop: 10 }} disabled={loading} autoComplete="current-password" />
          {error && <p style={s.loginErr}>{error}</p>}
          <button type="submit" style={s.loginBtn} disabled={loading}>{loading ? 'Signing in…' : 'Sign In →'}</button>
        </form>
      </div>
    </div>
  );
};

const AccessDenied = ({ email, reason, onLogout }) => (
  <div style={s.loginBg}>
    <div style={s.loginCard}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
      <h2 style={s.loginTitle}>Access Restricted</h2>
      <p style={s.loginSub}>
        {reason === 'suspended'
          ? `${email} is signed in, but this account has been suspended by the CEO. Contact your administrator to restore access.`
          : `${email} is signed in, but no team profile was found. Ask the CEO to provision your account from the CEO Control Center.`}
      </p>
      <button style={s.loginBtn} onClick={onLogout}>Sign Out</button>
    </div>
  </div>
);

// ─── Small building blocks ──────────────────────────────────────────────────
const StatCard = ({ label, value, accent, sub }) => (
  <div style={{ ...gd.card, borderTop: `3px solid ${accent}` }}>
    <p style={gd.cardLabel}>{label}</p>
    <p style={{ ...gd.cardValue, color: accent }}>{value}</p>
    {sub && <p style={gd.cardSub}>{sub}</p>}
  </div>
);

const MetricBar = ({ label, value, max, accent }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#5A7A9A', marginBottom: 4 }}>
        <span>{label}</span><span style={{ fontWeight: 700, color: '#1A3C5E' }}>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#EEF2F7', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 4, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
};

// ─── Work Log Modal ──────────────────────────────────────────────────────────
const WorkLogModal = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState(() => ({
    date: initial?.date || todayISO(), task: initial?.task || '', category: initial?.category || TASK_CATEGORIES[0],
    hoursSpent: initial?.hoursSpent ?? '', status: initial?.status || 'completed', notes: initial?.notes || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.task.trim() || !form.hoursSpent) { setError('Task and hours spent are required.'); return; }
    setSaving(true); setError('');
    try { await onSave({ ...form, hoursSpent: Number(form.hoursSpent) }, initial); onClose(); }
    catch (err) { setError(err.message || 'Could not save the entry.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div><h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{initial ? 'Edit Log Entry' : 'Log Today\'s Work'}</h3></div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Date</label>
                <input type="date" style={s.loginInput} value={form.date} onChange={e => update('date', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Hours spent</label>
                <input type="number" min="0" step="0.5" style={s.loginInput} value={form.hoursSpent} onChange={e => update('hoursSpent', e.target.value)} disabled={saving} />
              </div>
            </div>
            <label style={{ ...cu.label, marginTop: 12 }}>Task</label>
            <input style={s.loginInput} value={form.task} onChange={e => update('task', e.target.value)} disabled={saving} autoFocus />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Category</label>
                <select style={cu.select} value={form.category} onChange={e => update('category', e.target.value)} disabled={saving}>
                  {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Status</label>
                <select style={cu.select} value={form.status} onChange={e => update('status', e.target.value)} disabled={saving}>
                  {Object.keys(WORKLOG_STATUSES).map(k => <option key={k} value={k}>{WORKLOG_STATUSES[k].label}</option>)}
                </select>
              </div>
            </div>
            <label style={{ ...cu.label, marginTop: 12 }}>Notes (optional)</label>
            <textarea style={{ ...s.loginInput, minHeight: 80, resize: 'vertical' }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />
            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, background: '#0D9488', marginTop: 18 }} disabled={saving}>{saving ? 'Saving…' : '💾 Save Entry'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Appointment Modal ───────────────────────────────────────────────────────
const AppointmentModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ department: APPOINTMENT_DEPARTMENTS[0].key, subject: '', proposedDate: todayISO(), proposedTime: '09:00', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) { setError('Subject is required.'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.message || 'Could not book the appointment.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div><h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Book an Appointment</h3></div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <label style={cu.label}>Department head</label>
            <select style={cu.select} value={form.department} onChange={e => update('department', e.target.value)} disabled={saving}>
              {APPOINTMENT_DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
            </select>
            <label style={{ ...cu.label, marginTop: 12 }}>Subject</label>
            <input style={s.loginInput} value={form.subject} onChange={e => update('subject', e.target.value)} disabled={saving} autoFocus />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Proposed date</label>
                <input type="date" style={s.loginInput} value={form.proposedDate} onChange={e => update('proposedDate', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Proposed time</label>
                <input type="time" style={s.loginInput} value={form.proposedTime} onChange={e => update('proposedTime', e.target.value)} disabled={saving} />
              </div>
            </div>
            <label style={{ ...cu.label, marginTop: 12 }}>Notes (optional)</label>
            <textarea style={{ ...s.loginInput, minHeight: 70, resize: 'vertical' }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />
            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, background: '#0D9488', marginTop: 18 }} disabled={saving}>{saving ? 'Booking…' : '📅 Request Appointment'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Routine Modal ───────────────────────────────────────────────────────────
const RoutineModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ title: '', frequency: 'Daily', timeOfDay: '09:00', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.message || 'Could not save the routine.'); }
    finally { setSaving(false); }
  };
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div><h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Routine</h3></div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <label style={cu.label}>Title</label>
            <input style={s.loginInput} value={form.title} onChange={e => update('title', e.target.value)} disabled={saving} autoFocus />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Frequency</label>
                <select style={cu.select} value={form.frequency} onChange={e => update('frequency', e.target.value)} disabled={saving}>
                  {ROUTINE_FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Time of day</label>
                <input type="time" style={s.loginInput} value={form.timeOfDay} onChange={e => update('timeOfDay', e.target.value)} disabled={saving} />
              </div>
            </div>
            <label style={{ ...cu.label, marginTop: 12 }}>Note (optional)</label>
            <input style={s.loginInput} placeholder="e.g. Mon / Wed / Fri" value={form.note} onChange={e => update('note', e.target.value)} disabled={saving} />
            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, background: '#0D9488', marginTop: 18 }} disabled={saving}>{saving ? 'Saving…' : '💾 Save Routine'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Goal Modal ───────────────────────────────────────────────────────────────
const GoalModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ title: '', description: '', targetDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true); setError('');
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.message || 'Could not save the goal.'); }
    finally { setSaving(false); }
  };
  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div><h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Goal</h3></div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <label style={cu.label}>Title</label>
            <input style={s.loginInput} value={form.title} onChange={e => update('title', e.target.value)} disabled={saving} autoFocus />
            <label style={{ ...cu.label, marginTop: 12 }}>Description (optional)</label>
            <textarea style={{ ...s.loginInput, minHeight: 70, resize: 'vertical' }} value={form.description} onChange={e => update('description', e.target.value)} disabled={saving} />
            <label style={{ ...cu.label, marginTop: 12 }}>Target date (optional)</label>
            <input type="date" style={s.loginInput} value={form.targetDate} onChange={e => update('targetDate', e.target.value)} disabled={saving} />
            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, background: '#0D9488', marginTop: 18 }} disabled={saving}>{saving ? 'Saving…' : '🎯 Save Goal'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main Component ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const WorkerLog = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');

  // Own linked employee record (HR)
  const [matchedEmployee, setMatchedEmployee] = useState(null);

  // Work log
  const [workLogs, setWorkLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [logDateFilter, setLogDateFilter] = useState('');

  // Appointments
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [showApptModal, setShowApptModal] = useState(false);

  // Routines & Goals
  const [routines, setRoutines] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalDraftPct, setGoalDraftPct] = useState({});

  // Performance output
  const [outputs, setOutputs] = useState([]);
  const [outputPeriod, setOutputPeriod] = useState(currentPeriod());
  const [outputSummary, setOutputSummary] = useState('');
  const [submittingOutput, setSubmittingOutput] = useState(false);

  // Payments
  const [payslips, setPayslips] = useState([]);
  const [payrollTax, setPayrollTax] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);

  // Market trends
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingTrends, setLoadingTrends] = useState(true);

  // Notices
  const [notices, setNotices] = useState([]);
  const [myReadDocIds, setMyReadDocIds] = useState(new Set());
  const [loadingNotices, setLoadingNotices] = useState(true);
  const [expandedNoticeId, setExpandedNoticeId] = useState(null);

  // My Documents (personal letters / contracts issued by Secretary) — derived
  // from the same `documents` listener as Notices, no extra query needed.
  const [expandedPersonalDocId, setExpandedPersonalDocId] = useState(null);

  // Idle session
  const [idleWarning, setIdleWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());

  const isCeo = !!user && user.email?.toLowerCase() === CEO_EMAIL;
  const isAuthorized = isCeo || (!!profile && profile.status !== 'suspended');
  const userEmail = user?.email || '';
  const userName = profile?.name || user?.displayName || userEmail;
  const employeeFullName = matchedEmployee ? `${matchedEmployee.firstName || ''} ${matchedEmployee.lastName || ''}`.trim() : userName;

  // ── Auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // ── Own profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setProfile(null); setProfileLoaded(true); return; }
    setProfileLoaded(false);
    const unsub = onSnapshot(doc(db, 'teamUsers', user.uid),
      (snap) => { setProfile(snap.exists() ? snap.data() : null); setProfileLoaded(true); },
      () => { setProfile(null); setProfileLoaded(true); });
    return unsub;
  }, [user]);

  // ── Linked HR employee record (by email) ────────────────────────────────
  useEffect(() => {
    if (!isAuthorized || !userEmail) { setMatchedEmployee(null); return; }
    const q = query(collection(db, 'employees'), where('email', '==', userEmail), limit(1));
    const unsub = onSnapshot(q, (snap) => setMatchedEmployee(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }), () => setMatchedEmployee(null));
    return unsub;
  }, [isAuthorized, userEmail]);

  // ── Work log listener (own entries only) ────────────────────────────────
  useEffect(() => {
    if (!isAuthorized || !userEmail) { setWorkLogs([]); return; }
    setLoadingLogs(true);
    const q = query(collection(db, 'workLogs'), where('employeeEmail', '==', userEmail), orderBy('date', 'desc'), limit(200));
    const unsub = onSnapshot(q, (snap) => { setWorkLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingLogs(false); }, () => setLoadingLogs(false));
    return unsub;
  }, [isAuthorized, userEmail]);

  // ── Appointments listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized || !userEmail) { setAppointments([]); return; }
    setLoadingAppts(true);
    const q = query(collection(db, 'appointments'), where('requestedByEmail', '==', userEmail), orderBy('createdAt', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => { setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingAppts(false); }, () => setLoadingAppts(false));
    return unsub;
  }, [isAuthorized, userEmail]);

  // ── Routines + Goals listeners ───────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized || !userEmail) { setRoutines([]); setGoals([]); return; }
    const unsub1 = onSnapshot(query(collection(db, 'routines'), where('employeeEmail', '==', userEmail), orderBy('createdAt', 'desc')),
      (snap) => setRoutines(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    const unsub2 = onSnapshot(query(collection(db, 'goals'), where('employeeEmail', '==', userEmail), orderBy('createdAt', 'desc')),
      (snap) => setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => { unsub1(); unsub2(); };
  }, [isAuthorized, userEmail]);

  // ── Performance output history ───────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized || !userEmail) { setOutputs([]); return; }
    const q = query(collection(db, 'workerOutputs'), where('employeeEmail', '==', userEmail), orderBy('submittedAt', 'desc'), limit(24));
    const unsub = onSnapshot(q, (snap) => setOutputs(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return unsub;
  }, [isAuthorized, userEmail]);

  // ── Payments: own pay slips + best-effort tax filing match ─────────────
  useEffect(() => {
    if (!isAuthorized || !matchedEmployee) { setPayslips([]); setPayrollTax([]); setLoadingPayments(false); return; }
    setLoadingPayments(true);
    const unsub1 = onSnapshot(query(collection(db, 'payslips'), where('employeeId', '==', matchedEmployee.id), orderBy('generatedAt', 'desc')),
      (snap) => { setPayslips(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingPayments(false); }, () => setLoadingPayments(false));
    const unsub2 = onSnapshot(query(collection(db, 'payrollTax'), where('employeeName', '==', employeeFullName), orderBy('createdAt', 'desc')),
      (snap) => setPayrollTax(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setPayrollTax([]));
    return () => { unsub1(); unsub2(); };
  }, [isAuthorized, matchedEmployee, employeeFullName]);

  // ── Market trends (read-only aggregate) ─────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) { setLeads([]); setCampaigns([]); return; }
    setLoadingTrends(true);
    const unsub1 = onSnapshot(collection(db, 'leads'), (snap) => { setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingTrends(false); }, () => setLoadingTrends(false));
    const unsub2 = onSnapshot(collection(db, 'campaigns'), (snap) => setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => { unsub1(); unsub2(); };
  }, [isAuthorized]);

  // ── Notices/Memos feed + own read receipts ──────────────────────────────
  useEffect(() => {
    if (!isAuthorized) { setNotices([]); return; }
    setLoadingNotices(true);
    const q = query(collection(db, 'documents'), orderBy('updatedAt', 'desc'), limit(150));
    const unsub = onSnapshot(q, (snap) => { setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingNotices(false); }, () => setLoadingNotices(false));
    return unsub;
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || !userEmail) { setMyReadDocIds(new Set()); return; }
    const q = query(collectionGroup(db, 'receipts'), where('email', '==', userEmail));
    const unsub = onSnapshot(q, (snap) => setMyReadDocIds(new Set(snap.docs.map(d => d.ref.parent.parent.id))), () => {});
    return unsub;
  }, [isAuthorized, userEmail]);

  // ── Idle auto sign-out ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) return;
    const bump = () => { lastActivityRef.current = Date.now(); if (idleWarning) setIdleWarning(false); };
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => window.addEventListener(evt, bump));
    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_LIMIT_MS) signOut(auth).catch(() => {});
      else if (idleFor >= IDLE_WARN_MS) setIdleWarning(true);
    }, 30000);
    return () => { ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => window.removeEventListener(evt, bump)); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  const handleLogout = useCallback(async () => {
    if (!window.confirm('Sign out of the Worker Workspace?')) return;
    setLoggingOut(true);
    try {
      setWorkLogs([]); setAppointments([]); setRoutines([]); setGoals([]); setOutputs([]); setPayslips([]); setNotices([]);
      await signOut(auth);
    } catch (err) { alert('Sign out failed: ' + err.message); }
    finally { setLoggingOut(false); }
  }, []);

  const logAudit = useCallback(async (action, target, details = '') => {
    try {
      await addDoc(collection(db, 'auditLogs'), { actorEmail: userEmail || 'unknown', actorUid: user?.uid || 'unknown', action, target, details, timestamp: serverTimestamp() });
    } catch (err) { console.error('Audit log write failed:', err); }
  }, [userEmail, user]);

  // ── Work log actions ─────────────────────────────────────────────────────
  const saveWorkLog = useCallback(async (form, existing) => {
    if (existing) {
      await updateDoc(doc(db, 'workLogs', existing.id), { ...form, updatedAt: serverTimestamp() });
      await logAudit('Updated work log entry', form.task);
    } else {
      await addDoc(collection(db, 'workLogs'), { ...form, employeeEmail: userEmail, employeeName: userName, createdAt: serverTimestamp() });
      await logAudit('Logged work entry', form.task, `${form.hoursSpent}h · ${form.category}`);
    }
  }, [userEmail, userName, logAudit]);

  const deleteWorkLog = useCallback(async (entry) => {
    if (!window.confirm(`Delete log entry "${entry.task}"?`)) return;
    await deleteDoc(doc(db, 'workLogs', entry.id));
    await logAudit('Deleted work log entry', entry.task);
  }, [logAudit]);

  // ── Appointment actions ──────────────────────────────────────────────────
  const bookAppointment = useCallback(async (form) => {
    await addDoc(collection(db, 'appointments'), {
      ...form, requestedByEmail: userEmail, requestedByName: userName, status: 'pending', createdAt: serverTimestamp(),
    });
    const dept = APPOINTMENT_DEPARTMENTS.find(d => d.key === form.department);
    await logAudit('Requested appointment', dept?.label || form.department, form.subject);
  }, [userEmail, userName, logAudit]);

  const cancelAppointment = useCallback(async (appt) => {
    if (!window.confirm('Cancel this appointment request?')) return;
    await updateDoc(doc(db, 'appointments', appt.id), { status: 'cancelled' });
    await logAudit('Cancelled appointment', appt.subject);
  }, [logAudit]);

  // ── Routine / Goal actions ───────────────────────────────────────────────
  const saveRoutine = useCallback(async (form) => {
    await addDoc(collection(db, 'routines'), { ...form, employeeEmail: userEmail, active: true, createdAt: serverTimestamp() });
    await logAudit('Created routine', form.title);
  }, [userEmail, logAudit]);

  const toggleRoutine = useCallback(async (routine) => {
    await updateDoc(doc(db, 'routines', routine.id), { active: !routine.active });
  }, []);

  const deleteRoutine = useCallback(async (routine) => {
    if (!window.confirm(`Delete routine "${routine.title}"?`)) return;
    await deleteDoc(doc(db, 'routines', routine.id));
  }, []);

  const saveGoal = useCallback(async (form) => {
    await addDoc(collection(db, 'goals'), { ...form, employeeEmail: userEmail, progressPct: 0, status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await logAudit('Set new goal', form.title);
  }, [userEmail, logAudit]);

  const updateGoalProgress = useCallback(async (goal) => {
    const pct = Math.max(0, Math.min(100, Number(goalDraftPct[goal.id] ?? goal.progressPct)));
    await updateDoc(doc(db, 'goals', goal.id), { progressPct: pct, status: pct >= 100 ? 'achieved' : 'active', updatedAt: serverTimestamp() });
    if (pct >= 100) await logAudit('Achieved goal', goal.title);
  }, [goalDraftPct, logAudit]);

  const markGoalMissed = useCallback(async (goal) => {
    if (!window.confirm(`Mark goal "${goal.title}" as missed?`)) return;
    await updateDoc(doc(db, 'goals', goal.id), { status: 'missed', updatedAt: serverTimestamp() });
  }, []);

  // ── Performance output ───────────────────────────────────────────────────
  const periodLogs = useMemo(() => workLogs.filter(l => (l.date || '').startsWith(outputPeriod)), [workLogs, outputPeriod]);
  const periodHours = useMemo(() => periodLogs.reduce((sum, l) => sum + (Number(l.hoursSpent) || 0), 0), [periodLogs]);
  const periodGoalsAchieved = useMemo(() => goals.filter(g => g.status === 'achieved' && (g.updatedAt?.toDate?.() || new Date(0)).toISOString().slice(0, 7) === outputPeriod).length, [goals, outputPeriod]);

  const submitOutput = useCallback(async () => {
    if (!outputSummary.trim()) { alert('Add a short summary of your output for this period.'); return; }
    setSubmittingOutput(true);
    try {
      await addDoc(collection(db, 'workerOutputs'), {
        employeeId: matchedEmployee?.id || null, employeeEmail: userEmail, employeeName: employeeFullName,
        period: outputPeriod, summary: outputSummary.trim(),
        tasksLogged: periodLogs.length, hoursLogged: periodHours, goalsAchieved: periodGoalsAchieved,
        submittedAt: serverTimestamp(),
      });
      await logAudit('Submitted performance output', employeeFullName, outputPeriod);
      setOutputSummary('');
    } catch (err) { alert('Could not submit: ' + err.message); }
    finally { setSubmittingOutput(false); }
  }, [outputSummary, outputPeriod, matchedEmployee, userEmail, employeeFullName, periodLogs, periodHours, periodGoalsAchieved, logAudit]);

  // ── Notices & Personal Documents ────────────────────────────────────────
  const markDocumentRead = useCallback(async (docItem) => {
    await setDoc(doc(db, 'documents', docItem.id, 'receipts', user.uid), {
      name: userName, email: userEmail, department: profile?.department || '—', readAt: serverTimestamp(),
    });
  }, [user, userName, userEmail, profile]);

  // ── Payment PDF export ───────────────────────────────────────────────────
  const downloadPayslip = useCallback((p) => {
    openPrintWindow(`Pay Slip — ${p.period}`, `
      <div class="headRow">
        <div><h1>Slirus Global Limited</h1><p class="muted">Official Pay Slip · ${p.period}</p></div>
        <p class="muted">Issued ${fmtDate(p.generatedAt)}</p>
      </div>
      <p><strong>Employee:</strong> ${p.employeeName} · Grade ${p.jobGradeCode || '—'}</p>
      <table>
        <tbody>
          <tr><td>Gross pay</td><td class="right">${money(p.grossPay)}</td></tr>
          <tr><td>Allowances</td><td class="right">${money(p.allowances)}</td></tr>
          <tr><td>Tax (PAYE)</td><td class="right">-${money(p.taxAmount)}</td></tr>
          <tr><td>Other deductions</td><td class="right">-${money(p.otherDeductions)}</td></tr>
          <tr class="totals"><td>Net pay received</td><td class="right">${money(p.netPay)}</td></tr>
        </tbody>
      </table>
    `);
  }, []);

  const downloadPaymentHistory = useCallback(() => {
    const rows = payslips.map(p => `<tr><td>${p.period}</td><td>Pay Slip</td><td class="right">${money(p.netPay)}</td><td>${fmtDate(p.generatedAt)}</td></tr>`).join('');
    const totalReceived = payslips.reduce((sum, p) => sum + (Number(p.netPay) || 0), 0);
    openPrintWindow('Full Payment History', `
      <div class="headRow"><div><h1>Slirus Global Limited</h1><p class="muted">Payment History — ${employeeFullName}</p></div></div>
      <table>
        <thead><tr><th>Period</th><th>Type</th><th class="right">Net Amount</th><th>Issued</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4">No payments on record.</td></tr>'}</tbody>
        <tfoot><tr class="totals"><td colspan="2" class="right">Total received</td><td class="right">${money(totalReceived)}</td><td></td></tr></tfoot>
      </table>
    `);
  }, [payslips, employeeFullName]);

  const downloadPersonalDocument = useCallback((d) => {
    openPrintWindow(d.title, `
      <div class="headRow">
        <div><h1>Slirus Global Limited</h1><p class="muted">${DOC_TYPE_MAP[d.type]?.label || 'Document'} · Version ${d.version || 1}</p></div>
        <p class="muted">Issued ${fmtDate(d.publishedAt || d.updatedAt)}</p>
      </div>
      <p><strong>Issued to:</strong> ${employeeFullName} (${d.recipientEmail})</p>
      <pre style="white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;margin-top:20px;">${(d.content || '').replace(/</g, '&lt;')}</pre>
    `);
  }, [employeeFullName]);

  // ── Derived: dashboard + trends ──────────────────────────────────────────
  const todayLogged = useMemo(() => workLogs.some(l => l.date === todayISO()), [workLogs]);
  const activeGoalsCount = useMemo(() => goals.filter(g => g.status === 'active').length, [goals]);
  const pendingApptCount = useMemo(() => appointments.filter(a => a.status === 'pending').length, [appointments]);
  const unreadNoticesCount = useMemo(() => notices.filter(d => d.status === 'published' && (d.type === 'memo' || d.type === 'notice') && (d.department === 'Company-Wide' || d.department === profile?.department) && !myReadDocIds.has(d.id)).length, [notices, profile, myReadDocIds]);
  const totalReceived = useMemo(() => payslips.reduce((sum, p) => sum + (Number(p.netPay) || 0), 0), [payslips]);

  const scopedNotices = useMemo(() => notices.filter(d => d.status === 'published' && (d.type === 'memo' || d.type === 'notice') && (d.department === 'Company-Wide' || d.department === profile?.department)), [notices, profile]);
  const personalDocuments = useMemo(() => notices.filter(d => d.status === 'published' && (d.type === 'letter' || d.type === 'contract') && d.recipientEmail === userEmail), [notices, userEmail]);
  const unreadPersonalDocsCount = useMemo(() => personalDocuments.filter(d => !myReadDocIds.has(d.id)).length, [personalDocuments, myReadDocIds]);

  const leadsByStage = useMemo(() => {
    const map = {};
    leads.forEach(l => { map[l.stage] = (map[l.stage] || 0) + 1; });
    return map;
  }, [leads]);
  const totalPipelineValue = useMemo(() => leads.filter(l => !['won', 'lost'].includes(l.stage)).reduce((sum, l) => sum + (Number(l.value) || 0), 0), [leads]);
  const totalWonValue = useMemo(() => leads.filter(l => l.stage === 'won').reduce((sum, l) => sum + (Number(l.value) || 0), 0), [leads]);
  const topCampaigns = useMemo(() => [...campaigns].sort((a, b) => {
    const roiA = a.spend > 0 ? (a.revenue - a.spend) / a.spend : 0;
    const roiB = b.spend > 0 ? (b.revenue - b.spend) / b.spend : 0;
    return roiB - roiA;
  }).slice(0, 5), [campaigns]);

  const filteredLogs = useMemo(() => workLogs.filter(l => !logDateFilter || l.date === logDateFilter), [workLogs, logDateFilter]);

  // ── Render gates ────────────────────────────────────────────────────────
  if (authLoading || (user && !profileLoaded)) return <div style={s.loginBg}><p style={{ color: '#5A7A9A' }}>Loading…</p></div>;
  if (!user) return <LoginScreen />;
  if (!isAuthorized) return <AccessDenied email={user.email} reason={profile?.status === 'suspended' ? 'suspended' : 'none'} onLogout={() => signOut(auth)} />;

  return (
    <Layout>
      <div style={s.page}>
        {idleWarning && <div style={s.errorBanner}>⏳ You've been idle a while — you'll be signed out automatically for security.</div>}
        {!matchedEmployee && (
          <div style={{ ...s.errorBanner, background: '#EFF6FF', border: '1px solid #93C5FD', color: '#1E40AF' }}>
            ℹ️ No HR employee profile is linked to {userEmail} yet, so pay slips can't be shown. Ask HR to add your record with this email address.
          </div>
        )}

        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Worker Workspace</h1>
            <p style={s.pageSub}>{userName} · {profile?.department || 'Unassigned'} · signed in as {user.email}</p>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} disabled={loggingOut}>{loggingOut ? 'Signing out…' : 'Sign Out ⎋'}</button>
        </div>

        <div style={s.dashSwitcher}>
          {[
            ['dashboard', '📊 Dashboard'], ['worklog', '🗒️ Work Log'], ['appointments', `📅 Appointments`],
            ['routines', '🎯 Routine & Goals'], ['output', '📈 Performance Output'], ['payments', '💵 My Payments'],
            ['documents', '📁 My Documents'], ['trends', '📉 Market Trends'], ['notices', `📢 Notices`],
          ].map(([key, label]) => (
            <button key={key} style={{ ...s.dashTab, ...(activeTab === key ? s.dashTabActive : {}) }} onClick={() => setActiveTab(key)}>
              {label}
              {key === 'appointments' && pendingApptCount > 0 && <span style={s.tabCount}>{pendingApptCount}</span>}
              {key === 'documents' && unreadPersonalDocsCount > 0 && <span style={s.tabCount}>{unreadPersonalDocsCount}</span>}
              {key === 'notices' && unreadNoticesCount > 0 && <span style={s.tabCount}>{unreadNoticesCount}</span>}
            </button>
          ))}
        </div>

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <>
            <div style={{ ...s.trackGrid, marginBottom: 22 }}>
              <StatCard label="Today's Log" value={todayLogged ? '✓ Logged' : 'Not yet'} accent={todayLogged ? '#10B981' : '#F59E0B'} sub={todayISO()} />
              <StatCard label="Active Goals" value={activeGoalsCount} accent="#0D9488" />
              <StatCard label="Pending Appointments" value={pendingApptCount} accent="#7C3AED" />
              <StatCard label="Unread Notices" value={unreadNoticesCount} accent="#EF4444" />
            </div>
            <div style={{ ...s.trackGrid, marginBottom: 22 }}>
              <StatCard label="Lifetime Pay Received" value={money(totalReceived)} accent="#1A3C5E" sub={`${payslips.length} pay slip(s)`} />
              <StatCard label="My Documents" value={personalDocuments.length} accent="#7C3AED" sub={unreadPersonalDocsCount > 0 ? `${unreadPersonalDocsCount} unread` : 'All read'} />
              <StatCard label="Hours Logged (this month)" value={periodHours} accent="#2E6DA4" sub={`${periodLogs.length} entries`} />
              <StatCard label="Company Pipeline" value={money(totalPipelineValue)} accent="#059669" sub="Open deals, all officers" />
            </div>
            <h2 style={s.sectionHead}>Recent Work Log</h2>
            <div style={s.tableWrap}>
              {workLogs.length === 0 ? <div style={s.tableMsg}>No entries yet — log today's work from the Work Log tab.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Date</th><th style={s.th}>Task</th><th style={s.th}>Hours</th><th style={s.th}>Status</th></tr></thead>
                  <tbody>{workLogs.slice(0, 5).map(l => (
                    <tr key={l.id} style={s.tr}><td style={s.td}>{l.date}</td><td style={s.td}>{l.task}</td><td style={s.td}>{l.hoursSpent}h</td><td style={s.td}><Pill cfg={WORKLOG_STATUSES[l.status]} fallback={WORKLOG_STATUSES.completed} /></td></tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Work Log ── */}
        {activeTab === 'worklog' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Daily Work Log</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" style={{ ...s.loginInput, width: 'auto', padding: '8px 12px' }} value={logDateFilter} onChange={e => setLogDateFilter(e.target.value)} />
                {logDateFilter && <button style={s.tab} onClick={() => setLogDateFilter('')}>Clear</button>}
                <button style={{ ...s.loginBtn, background: '#0D9488', width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => { setEditingLog(null); setShowLogModal(true); }}>➕ Log Work</button>
              </div>
            </div>
            <div style={s.tableWrap}>
              {loadingLogs ? <div style={s.tableMsg}>Loading…</div> : filteredLogs.length === 0 ? <div style={s.tableMsg}>No entries for this filter.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Date</th><th style={s.th}>Task</th><th style={s.th}>Category</th><th style={s.th}>Hours</th><th style={s.th}>Status</th><th style={s.th}>Actions</th></tr></thead>
                  <tbody>{filteredLogs.map(l => (
                    <tr key={l.id} style={s.tr}>
                      <td style={s.td}>{l.date}</td>
                      <td style={s.td}><span style={{ fontWeight: 700, color: '#1A3C5E' }}>{l.task}</span>{l.notes && <div style={{ fontSize: 12, color: '#7A8A9A' }}>{l.notes}</div>}</td>
                      <td style={s.td}>{l.category}</td>
                      <td style={s.td}>{l.hoursSpent}h</td>
                      <td style={s.td}><Pill cfg={WORKLOG_STATUSES[l.status]} fallback={WORKLOG_STATUSES.completed} /></td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={s.btnView} onClick={() => { setEditingLog(l); setShowLogModal(true); }}>Edit</button>
                          <button style={s.btnDelete} onClick={() => deleteWorkLog(l)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Appointments ── */}
        {activeTab === 'appointments' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div><h2 style={{ ...s.sectionHead, margin: 0 }}>Appointments with Department Heads</h2><p style={{ ...s.pageSub, margin: '4px 0 0' }}>Requests are actioned by the relevant manager; status updates here in real time.</p></div>
              <button style={{ ...s.loginBtn, background: '#0D9488', width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowApptModal(true)}>➕ Book Appointment</button>
            </div>
            <div style={s.tableWrap}>
              {loadingAppts ? <div style={s.tableMsg}>Loading…</div> : appointments.length === 0 ? <div style={s.tableMsg}>No appointments booked yet.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Department</th><th style={s.th}>Subject</th><th style={s.th}>Proposed</th><th style={s.th}>Status</th><th style={s.th}>Actions</th></tr></thead>
                  <tbody>{appointments.map(a => (
                    <tr key={a.id} style={s.tr}>
                      <td style={s.td}>{APPOINTMENT_DEPARTMENTS.find(d => d.key === a.department)?.icon} {APPOINTMENT_DEPARTMENTS.find(d => d.key === a.department)?.label || a.department}</td>
                      <td style={s.td}>{a.subject}</td>
                      <td style={s.td}>{a.proposedDate} · {a.proposedTime}</td>
                      <td style={s.td}><Pill cfg={APPT_STATUS[a.status]} fallback={APPT_STATUS.pending} /></td>
                      <td style={s.td}>{a.status === 'pending' && <button style={s.btnDelete} onClick={() => cancelAppointment(a)}>Cancel</button>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Routine & Goals ── */}
        {activeTab === 'routines' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Routine</h2>
              <button style={{ ...s.loginBtn, background: '#0D9488', width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowRoutineModal(true)}>➕ New Routine</button>
            </div>
            {routines.length === 0 ? <div style={s.tableWrap}><div style={s.tableMsg}>No routines set yet.</div></div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 30 }}>
                {routines.map(r => (
                  <div key={r.id} style={{ ...gd.card, textAlign: 'left', opacity: r.active ? 1 : 0.55 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0D9488' }}>{r.frequency}</span>
                      <span style={{ fontSize: 12, color: '#7A8A9A' }}>{r.timeOfDay}</span>
                    </div>
                    <h4 style={{ margin: '8px 0 4px', fontSize: 15, color: '#1A3C5E' }}>{r.title}</h4>
                    {r.note && <p style={{ fontSize: 12, color: '#7A8A9A', margin: 0 }}>{r.note}</p>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      <button style={s.tab} onClick={() => toggleRoutine(r)}>{r.active ? 'Pause' : 'Resume'}</button>
                      <button style={s.btnDelete} onClick={() => deleteRoutine(r)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Goals</h2>
              <button style={{ ...s.loginBtn, background: '#0D9488', width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowGoalModal(true)}>🎯 New Goal</button>
            </div>
            {goals.length === 0 ? <div style={s.tableWrap}><div style={s.tableMsg}>No goals set yet.</div></div> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {goals.map(g => (
                  <div key={g.id} style={{ ...gd.card, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, fontSize: 15, color: '#1A3C5E' }}>{g.title}</h4>
                      <Pill cfg={GOAL_STATUS[g.status]} fallback={GOAL_STATUS.active} />
                    </div>
                    {g.description && <p style={{ fontSize: 12, color: '#7A8A9A', margin: '6px 0' }}>{g.description}</p>}
                    {g.targetDate && <p style={{ fontSize: 11, color: '#9AAAB8', margin: '0 0 8px' }}>Target: {g.targetDate}</p>}
                    <MetricBar label="Progress" value={g.progressPct || 0} max={100} accent="#0D9488" />
                    {g.status === 'active' && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                        <input type="number" min="0" max="100" style={{ ...s.loginInput, padding: '7px 10px', width: 70 }} defaultValue={g.progressPct || 0} onChange={e => setGoalDraftPct(prev => ({ ...prev, [g.id]: e.target.value }))} />
                        <button style={s.tab} onClick={() => updateGoalProgress(g)}>Update %</button>
                        <button style={s.btnReject} onClick={() => markGoalMissed(g)}>Missed</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Performance Output ── */}
        {activeTab === 'output' && (
          <>
            <h2 style={s.sectionHead}>Send Output to HR Performance Review</h2>
            <p style={{ ...s.pageSub, margin: '0 0 18px' }}>A short self-reported summary plus auto-computed activity metrics for the period. HR reviews this alongside their own appraisal in the HR Control Center.</p>
            <div style={{ ...gd.card, textAlign: 'left', maxWidth: 640, marginBottom: 24 }}>
              <label style={cu.label}>Period</label>
              <input type="month" style={s.loginInput} value={outputPeriod} onChange={e => setOutputPeriod(e.target.value)} />
              <div style={{ display: 'flex', gap: 14, margin: '14px 0' }}>
                <div><p style={gd.cardLabel}>Tasks Logged</p><p style={{ ...gd.cardValue, fontSize: 20, color: '#0D9488' }}>{periodLogs.length}</p></div>
                <div><p style={gd.cardLabel}>Hours Logged</p><p style={{ ...gd.cardValue, fontSize: 20, color: '#2E6DA4' }}>{periodHours}</p></div>
                <div><p style={gd.cardLabel}>Goals Achieved</p><p style={{ ...gd.cardValue, fontSize: 20, color: '#059669' }}>{periodGoalsAchieved}</p></div>
              </div>
              <label style={cu.label}>Summary of your output this period</label>
              <textarea style={{ ...s.loginInput, minHeight: 110, resize: 'vertical' }} placeholder="Key deliverables, wins, and challenges…" value={outputSummary} onChange={e => setOutputSummary(e.target.value)} />
              <button style={{ ...s.loginBtn, background: '#0D9488', marginTop: 14 }} onClick={submitOutput} disabled={submittingOutput}>{submittingOutput ? 'Submitting…' : '📤 Submit to HR'}</button>
            </div>

            <h2 style={s.sectionHead}>Submission History</h2>
            <div style={s.tableWrap}>
              {outputs.length === 0 ? <div style={s.tableMsg}>No submissions yet.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Period</th><th style={s.th}>Tasks</th><th style={s.th}>Hours</th><th style={s.th}>Goals</th><th style={s.th}>Summary</th><th style={s.th}>Submitted</th></tr></thead>
                  <tbody>{outputs.map(o => (
                    <tr key={o.id} style={s.tr}><td style={s.td}>{o.period}</td><td style={s.td}>{o.tasksLogged}</td><td style={s.td}>{o.hoursLogged}h</td><td style={s.td}>{o.goalsAchieved}</td><td style={{ ...s.td, maxWidth: 300, fontSize: 12.5, color: '#5A7A9A' }}>{o.summary}</td><td style={{ ...s.td, fontSize: 12, color: '#7A8A9A' }}>{fmtDateTime(o.submittedAt)}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── My Payments ── */}
        {activeTab === 'payments' && (
          <>
            <div style={{ ...s.trackGrid, marginBottom: 22 }}>
              <StatCard label="Lifetime Received" value={money(totalReceived)} accent="#1A3C5E" />
              <StatCard label="Pay Slips on File" value={payslips.length} accent="#0D9488" />
              <StatCard label="Last Payment" value={payslips[0] ? fmtDate(payslips[0].generatedAt) : '—'} accent="#2E6DA4" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Official Pay Slips</h2>
              {payslips.length > 0 && <button style={s.tab} onClick={downloadPaymentHistory}>⬇ Download Full History (PDF)</button>}
            </div>
            <div style={s.tableWrap}>
              {!matchedEmployee ? <div style={s.tableMsg}>No linked HR employee record — payments can't be shown yet.</div>
                : loadingPayments ? <div style={s.tableMsg}>Loading…</div>
                : payslips.length === 0 ? <div style={s.tableMsg}>No pay slips on record yet.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Period</th><th style={s.th}>Gross</th><th style={s.th}>Deductions</th><th style={s.th}>Net Pay</th><th style={s.th}>Issued</th><th style={s.th}>Actions</th></tr></thead>
                  <tbody>{payslips.map(p => (
                    <tr key={p.id} style={s.tr}>
                      <td style={s.td}>{p.period}</td><td style={s.td}>{money(p.grossPay)}</td>
                      <td style={s.td}>{money((p.taxAmount || 0) + (p.otherDeductions || 0))}</td>
                      <td style={{ ...s.td, fontWeight: 700 }}>{money(p.netPay)}</td>
                      <td style={{ ...s.td, fontSize: 12, color: '#7A8A9A' }}>{fmtDate(p.generatedAt)}</td>
                      <td style={s.td}><button style={s.btnView} onClick={() => downloadPayslip(p)}>⬇ PDF</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>

            {payrollTax.length > 0 && (
              <>
                <h2 style={{ ...s.sectionHead, marginTop: 26 }}>Tax Filing Records (CFO)</h2>
                <p style={{ ...s.pageSub, margin: '0 0 12px' }}>Matched by name from the Accounts payroll-tax register.</p>
                <div style={s.tableWrap}>
                  <table style={s.table}>
                    <thead><tr style={s.thead}><th style={s.th}>Period</th><th style={s.th}>PAYE</th><th style={s.th}>NSSF (Employee)</th><th style={s.th}>Net Pay</th><th style={s.th}>Status</th></tr></thead>
                    <tbody>{payrollTax.map(t => (
                      <tr key={t.id} style={s.tr}><td style={s.td}>{t.period}</td><td style={s.td}>{money(t.paye)}</td><td style={s.td}>{money(t.nssfEmployee)}</td><td style={s.td}>{money(t.netPay)}</td><td style={s.td}>{t.status}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ── My Documents (job appointment letter, contract, etc.) ── */}
        {activeTab === 'documents' && (
          <>
            <h2 style={s.sectionHead}>My Letters & Contracts</h2>
            <p style={{ ...s.pageSub, margin: '0 0 18px' }}>
              Personal documents issued to you by the Secretary — job appointment letters, employment contracts,
              and any other official correspondence. View or download a PDF copy any time.
            </p>
            {personalDocuments.length === 0 ? (
              <div style={s.tableWrap}><div style={s.tableMsg}>No letters or contracts have been issued to you yet.</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {personalDocuments.map(d => {
                  const isRead = myReadDocIds.has(d.id);
                  const expanded = expandedPersonalDocId === d.id;
                  return (
                    <div key={d.id} style={{ ...gd.card, textAlign: 'left', borderTop: `3px solid ${isRead ? '#10B981' : '#F59E0B'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1A3C5E' }}>{DOC_TYPE_MAP[d.type]?.icon} {DOC_TYPE_MAP[d.type]?.label}</span>
                          <h4 style={{ margin: '4px 0', fontSize: 15, color: '#1A3C5E' }}>{d.title}</h4>
                          <p style={{ fontSize: 11, color: '#9AAAB8', margin: 0 }}>Version {d.version || 1} · Issued {fmtDate(d.publishedAt || d.updatedAt)}</p>
                        </div>
                        <Pill cfg={isRead ? { bg: '#D1FAE5', color: '#065F46', label: 'Read' } : { bg: '#FEF3C7', color: '#92400E', label: 'Unread' }} fallback={{ bg: '#F0F4F8', color: '#5A7A9A', label: '—' }} />
                      </div>
                      {expanded && <pre style={{ background: '#F7F9FC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap', color: '#1A3C5E', margin: '10px 0' }}>{d.content}</pre>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button style={s.tab} onClick={() => { setExpandedPersonalDocId(expanded ? null : d.id); if (!isRead) markDocumentRead(d); }}>{expanded ? 'Collapse' : 'View'}</button>
                        <button style={s.btnShortlist} onClick={() => downloadPersonalDocument(d)}>⬇ Download PDF</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Market Trends (read-only) ── */}
        {activeTab === 'trends' && (
          <>
            <h2 style={s.sectionHead}>Company Sales & Market Snapshot</h2>
            <p style={{ ...s.pageSub, margin: '0 0 18px' }}>Read-only, aggregated — no client names or individual deal detail.</p>
            <div style={{ ...s.trackGrid, marginBottom: 22 }}>
              <StatCard label="Open Pipeline Value" value={money(totalPipelineValue)} accent="#2E6DA4" />
              <StatCard label="Won Revenue" value={money(totalWonValue)} accent="#10B981" />
              <StatCard label="Active Campaigns" value={campaigns.length} accent="#7C3AED" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ ...gd.card, textAlign: 'left' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#1A3C5E' }}>Leads by Stage</h4>
                {loadingTrends ? <p style={gd.cardSub}>Loading…</p> : Object.keys(leadsByStage).length === 0 ? <p style={gd.cardSub}>No lead data yet.</p> : (
                  Object.entries(leadsByStage).map(([stage, count]) => (
                    <MetricBar key={stage} label={stage} value={count} max={Math.max(...Object.values(leadsByStage), 1)} accent="#2E6DA4" />
                  ))
                )}
              </div>
              <div style={{ ...gd.card, textAlign: 'left' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#1A3C5E' }}>Top Campaigns by ROI</h4>
                {topCampaigns.length === 0 ? <p style={gd.cardSub}>No campaign data yet.</p> : topCampaigns.map(c => {
                  const roiPct = c.spend > 0 ? Math.round(((c.revenue - c.spend) / c.spend) * 100) : 0;
                  return (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0F4F8' }}>
                      <span style={{ fontSize: 13, color: '#1A3C5E', fontWeight: 600 }}>{c.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: roiPct >= 0 ? '#059669' : '#B91C1C' }}>{roiPct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Notices & Memos ── */}
        {activeTab === 'notices' && (
          <>
            <h2 style={s.sectionHead}>Notices & Memos</h2>
            <p style={{ ...s.pageSub, margin: '0 0 18px' }}>Company-wide and {profile?.department || 'your department'}-scoped, published by the Secretary.</p>
            {loadingNotices ? <div style={s.tableWrap}><div style={s.tableMsg}>Loading…</div></div>
              : scopedNotices.length === 0 ? <div style={s.tableWrap}><div style={s.tableMsg}>No notices or memos yet.</div></div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {scopedNotices.map(d => {
                  const isRead = myReadDocIds.has(d.id);
                  const expanded = expandedNoticeId === d.id;
                  return (
                    <div key={d.id} style={{ ...gd.card, textAlign: 'left', borderTop: `3px solid ${isRead ? '#10B981' : '#F59E0B'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1A3C5E' }}>{DOC_TYPE_MAP[d.type]?.icon} {DOC_TYPE_MAP[d.type]?.label}</span>
                          <h4 style={{ margin: '4px 0', fontSize: 15, color: '#1A3C5E' }}>{d.title}</h4>
                          <p style={{ fontSize: 11, color: '#9AAAB8', margin: 0 }}>{d.department} · {fmtDateTime(d.updatedAt)}</p>
                        </div>
                        <Pill cfg={isRead ? { bg: '#D1FAE5', color: '#065F46', label: 'Read' } : { bg: '#FEF3C7', color: '#92400E', label: 'Unread' }} fallback={{ bg: '#F0F4F8', color: '#5A7A9A', label: '—' }} />
                      </div>
                      {expanded && <pre style={{ background: '#F7F9FC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 12, fontSize: 13, whiteSpace: 'pre-wrap', color: '#1A3C5E', margin: '10px 0' }}>{d.content}</pre>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button style={s.tab} onClick={() => setExpandedNoticeId(expanded ? null : d.id)}>{expanded ? 'Collapse' : 'Read'}</button>
                        {!isRead && <button style={s.btnShortlist} onClick={() => markDocumentRead(d)}>✓ Mark as read</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showLogModal && <WorkLogModal initial={editingLog} onClose={() => { setShowLogModal(false); setEditingLog(null); }} onSave={saveWorkLog} />}
      {showApptModal && <AppointmentModal onClose={() => setShowApptModal(false)} onSave={bookAppointment} />}
      {showRoutineModal && <RoutineModal onClose={() => setShowRoutineModal(false)} onSave={saveRoutine} />}
      {showGoalModal && <GoalModal onClose={() => setShowGoalModal(false)} onSave={saveGoal} />}
    </Layout>
  );
};

// ─── Styles (mirrors the other manager files for visual consistency) ───────
const s = {
  errorBanner: { background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E', fontWeight: 600 },

  loginBg: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' },
  loginCard: { background: '#fff', borderRadius: 14, padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', textAlign: 'center', width: '100%', maxWidth: 380, border: '1px solid #E2E8F0', borderTop: '4px solid #0D9488' },
  loginTitle: { fontSize: 22, fontWeight: 700, color: '#1A3C5E', margin: '0 0 8px' },
  loginSub: { color: '#5A7A9A', fontSize: 14, margin: '0 0 28px' },
  loginInput: { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  loginErr: { color: '#EF4444', fontSize: 13, margin: '10px 0 0', textAlign: 'left' },
  loginBtn: { width: '100%', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },

  page: { padding: '36px 5%', maxWidth: 1280, margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: '#1A3C5E', margin: 0 },
  pageSub: { color: '#5A7A9A', margin: '4px 0 0', fontSize: 14 },
  logoutBtn: { padding: '8px 16px', background: '#fff', border: '1.5px solid #C5CDD6', color: '#4A6B8A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  dashSwitcher: { display: 'flex', gap: 8, marginBottom: 28, borderBottom: '2px solid #E2E8F0', paddingBottom: 0, flexWrap: 'wrap' },
  dashTab: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '10px 4px 12px', fontSize: 14, fontWeight: 700, color: '#7A8A9A', cursor: 'pointer', marginBottom: -2 },
  dashTabActive: { color: '#0D9488', borderBottomColor: '#0D9488' },

  sectionHead: { fontSize: 15, fontWeight: 700, color: '#1A3C5E', margin: '0 0 14px' },
  trackGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },

  toolbar: { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' },
  tab: { background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 7, padding: '7px 12px', fontSize: 13, color: '#5A7A9A', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 },
  tabCount: { background: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 4 },

  tableWrap: { background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'auto' },
  tableMsg: { padding: 56, textAlign: 'center', color: '#5A7A9A', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#F7F9FC' },
  th: { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #F0F4F8' },
  td: { padding: '11px 14px', verticalAlign: 'middle', color: '#1A3C5E' },
  btnShortlist: { background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnReject: { background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnView: { background: '#EFF6FF', color: '#1D4ED8', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnDelete: { background: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
};

const ms = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F7F9FC', borderRadius: '12px 12px 0 0', flexShrink: 0 },
  body: { overflowY: 'auto', padding: '20px 24px', flex: 1 },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7A8A9A', lineHeight: 1, padding: 4 },
};

const gd = {
  card: { background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', textAlign: 'center' },
  cardLabel: { fontSize: 12, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 6px' },
  cardValue: { fontSize: 28, fontWeight: 800, margin: 0 },
  cardSub: { fontSize: 12, color: '#9AAAB8', margin: '4px 0 0' },
};

const cu = {
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, textAlign: 'left' },
  select: { width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
};

export default WorkerLog;