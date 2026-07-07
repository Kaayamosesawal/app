/**
 * CeoManager.jsx – Slirus Holdings CEO Control Center
 *
 * Super Admin dashboard restricted to the CEO account. Sits alongside
 * Admin.jsx and reuses the same auth/session conventions.
 *
 * Features:
 *  - Firebase Auth login / logout (email + password), CEO-only gate
 *  - User Provisioning: create, suspend, reactivate, delete team accounts.
 *    New accounts get an auto-generated password (shown once, copyable) —
 *    account creation itself is delegated to a trusted server endpoint
 *    (POST /api/create-user) since the client SDK cannot create Firebase
 *    Auth users without hijacking the current session.
 *  - Dynamic Role Assignment: per-feature Read / Write / Edit / Delete /
 *    Approve toggles, stored on each user's Firestore profile.
 *  - Audit Logging: append-only log of who changed what and when. Writes
 *    go to Firestore; Security Rules (server-side) should allow `create`
 *    but deny `update`/`delete` on this collection to keep it tamper-proof.
 *  - Global Dashboard: real-time, read-only view over Sales / HR / Finance
 *    summary documents, plus live counts pulled from existing collections.
 *  - Extra professional tooling: search/filter, CSV export, bulk-safe
 *    confirmations, and an idle-session auto-sign-out.
 *
 * State lives at the top level and is passed down explicitly — no prop
 * drilling helpers, no context. All Firebase calls are try/catch with
 * user-facing error feedback.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db, auth } from '../firebase/firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';

// ─── Config ─────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || '';
// NOTE: This is a UX gate only. The real authorization boundary must live in
// Firestore Security Rules / a custom auth claim on the server — never trust
// a client-side email check alone for a super-admin surface like this.
const CEO_EMAIL = (import.meta.env.VITE_CEO_EMAIL || 'kaayamosesawal@gmail.com').toLowerCase();

const FEATURES = [
  { key: 'sales',      label: 'Sales Pipeline' },
  { key: 'hr',         label: 'HR Records' },
  { key: 'finance',    label: 'Finance & Payroll' },
  { key: 'recruiting', label: 'Recruitment' },
  { key: 'projects',   label: 'Project Requests' },
  { key: 'users',      label: 'User Management' },
  { key: 'audit',      label: 'Audit Log' },
];

const PERMISSIONS = ['read', 'write', 'edit', 'delete', 'approve'];
const PERMISSION_LABELS = { read: 'Read', write: 'Write', edit: 'Edit', delete: 'Delete', approve: 'Approve' };

const DEPARTMENTS = ['Sales', 'HR', 'Finance', 'Operations', 'Engineering', 'Marketing', 'Executive'];
const ROLES = ['Staff', 'Team Lead', 'Manager', 'Director'];

const IDLE_LIMIT_MS = 20 * 60 * 1000;   // auto sign-out after 20 idle minutes
const IDLE_WARN_MS  = 18 * 60 * 1000;   // warn at 18 minutes

// ─── Helpers ────────────────────────────────────────────────────────────────
const emptyPermissions = () =>
  FEATURES.reduce((acc, f) => {
    acc[f.key] = PERMISSIONS.reduce((p, perm) => { p[perm] = false; return p; }, {});
    return acc;
  }, {});

const generatePassword = (length = 14) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = new Uint32Array(length);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
};

const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-UG') : '—');

const permissionCount = (permissions) => {
  if (!permissions) return 0;
  return Object.values(permissions).reduce(
    (sum, perms) => sum + Object.values(perms || {}).filter(Boolean).length, 0
  );
};

const toCSV = (rows, columns) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = columns.map(c => esc(c.label)).join(',');
  const body = rows.map(r => columns.map(c => esc(c.get(r))).join(',')).join('\n');
  return `${header}\n${body}`;
};

const downloadCSV = (filename, csv) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ─── Status Badge ───────────────────────────────────────────────────────────
const USER_STATUS_CONFIG = {
  active:    { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  suspended: { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};
const StatusBadge = ({ status }) => {
  const cfg = USER_STATUS_CONFIG[status] || USER_STATUS_CONFIG.active;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status === 'suspended' ? 'Suspended' : 'Active'}
    </span>
  );
};

// ─── Login Screen ───────────────────────────────────────────────────────────
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
        <div style={{ fontSize: 40, marginBottom: 14 }}>👑</div>
        <h2 style={s.loginTitle}>CEO Control Center</h2>
        <p style={s.loginSub}>Restricted access. Sign in with your executive credentials.</p>
        <form onSubmit={handleSubmit} noValidate>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8' }}
            disabled={loading} autoFocus autoComplete="username"
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8', marginTop: 10 }}
            disabled={loading} autoComplete="current-password"
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

// ─── Access Denied ──────────────────────────────────────────────────────────
const AccessDenied = ({ email, onLogout }) => (
  <div style={s.loginBg}>
    <div style={s.loginCard}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
      <h2 style={s.loginTitle}>Access Restricted</h2>
      <p style={s.loginSub}>
        {email} is signed in but isn't authorized for the CEO Control Center.
        This area is limited to the company's designated super-admin account.
      </p>
      <button style={s.loginBtn} onClick={onLogout}>Sign Out</button>
    </div>
  </div>
);

// ─── Stat Card (Global Dashboard) ───────────────────────────────────────────
const StatCard = ({ label, value, accent, sub }) => (
  <div style={{ ...gd.card, borderTop: `3px solid ${accent}` }}>
    <p style={gd.cardLabel}>{label}</p>
    <p style={{ ...gd.cardValue, color: accent }}>{value}</p>
    {sub && <p style={gd.cardSub}>{sub}</p>}
  </div>
);

// ─── Simple metric bar (no chart library — plain CSS) ───────────────────────
const MetricBar = ({ label, value, max, accent }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#5A7A9A', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: '#1A3C5E' }}>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#EEF2F7', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 4, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
};

// ─── Panel showing one department's metrics doc ─────────────────────────────
const MetricsPanel = ({ title, accent, data, loading, error }) => {
  const entries = data ? Object.entries(data).filter(([k]) => k !== 'updatedAt') : [];
  const numericEntries = entries.filter(([, v]) => typeof v === 'number');
  const max = numericEntries.length ? Math.max(...numericEntries.map(([, v]) => v), 1) : 1;

  return (
    <div style={{ ...gd.card, borderTop: `3px solid ${accent}`, textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: accent }}>{title}</h4>
        {data?.updatedAt && <span style={{ fontSize: 11, color: '#9AAAB8' }}>Synced {fmtDate(data.updatedAt)}</span>}
      </div>
      {loading ? (
        <p style={gd.cardSub}>Loading…</p>
      ) : error ? (
        <p style={{ ...gd.cardSub, color: '#B91C1C' }}>⚠️ {error}</p>
      ) : numericEntries.length === 0 ? (
        <p style={gd.cardSub}>No data synced yet. Populate the <code>analytics/{title.toLowerCase()}</code> document to feed this panel.</p>
      ) : (
        numericEntries.map(([k, v]) => (
          <MetricBar
            key={k}
            label={k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}
            value={v}
            max={max}
            accent={accent}
          />
        ))
      )}
    </div>
  );
};

// ─── Role Matrix Modal ───────────────────────────────────────────────────────
const RoleMatrixModal = ({ targetUser, onClose, onSave }) => {
  const [permissions, setPermissions] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (targetUser) setPermissions(targetUser.permissions || emptyPermissions());
  }, [targetUser]);

  if (!targetUser || !permissions) return null;

  const toggle = (featureKey, perm) => {
    setPermissions(prev => ({
      ...prev,
      [featureKey]: { ...prev[featureKey], [perm]: !prev[featureKey]?.[perm] },
    }));
  };

  const setAllForFeature = (featureKey, value) => {
    setPermissions(prev => ({
      ...prev,
      [featureKey]: PERMISSIONS.reduce((p, perm) => { p[perm] = value; return p; }, {}),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(targetUser.id, permissions);
      onClose();
    } catch (err) {
      alert('Could not save permissions: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Roles & Permissions</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{targetUser.name} · {targetUser.email}</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        <div style={ms.body}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr>
                  <th style={rm.th}>Feature</th>
                  {PERMISSIONS.map(p => <th key={p} style={{ ...rm.th, textAlign: 'center' }}>{PERMISSION_LABELS[p]}</th>)}
                  <th style={{ ...rm.th, textAlign: 'center' }}>Quick set</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map(f => (
                  <tr key={f.key} style={{ borderBottom: '1px solid #F0F4F8' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1A3C5E' }}>{f.label}</td>
                    {PERMISSIONS.map(p => (
                      <td key={p} style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!permissions[f.key]?.[p]}
                          onChange={() => toggle(f.key, p)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button style={rm.miniBtn} onClick={() => setAllForFeature(f.key, true)}>All</button>
                      <button style={{ ...rm.miniBtn, marginLeft: 6 }} onClick={() => setAllForFeature(f.key, false)}>None</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Create User Modal ───────────────────────────────────────────────────────
const CreateUserModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({ name: '', email: '', department: DEPARTMENTS[0], role: ROLES[0] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { password, emailSent, emailError }
  const [copied, setCopied] = useState(false);

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    setSubmitting(true); setError('');
    const outcome = await onCreate(form);
    setSubmitting(false);
    if (outcome.success) {
      setResult({ password: outcome.password, emailSent: outcome.emailSent, emailError: outcome.emailError });
    } else {
      setError(outcome.error || 'Could not create the account.');
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(result.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be unavailable — user can still select the text */ }
  };

  return (
    <div style={ms.overlay} onClick={result ? undefined : onClose}>
      <div style={{ ...ms.modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>
              {result ? 'Account Created' : 'New Team Account'}
            </h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>
              {result ? 'Share these credentials securely.' : 'Provisions a login and an empty permission set.'}
            </p>
          </div>
          {!result && <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>}
        </div>

        <div style={ms.body}>
          {result ? (
            <>
              {result.emailSent ? (
                <div style={{ background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                  ✓ Login email sent to {form.email}
                </div>
              ) : (
                <div style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
                  ⚠ Could not email the login details automatically{result.emailError ? ` (${result.emailError})` : ''}.
                  Copy the password below and share it with {form.name.split(' ')[0] || 'the user'} manually.
                </div>
              )}
              <div style={cu.credRow}>
                <span style={cu.credLabel}>Email</span>
                <span style={cu.credVal}>{form.email}</span>
              </div>
              <div style={cu.credRow}>
                <span style={cu.credLabel}>Temporary password</span>
                <span style={{ ...cu.credVal, fontFamily: 'monospace', fontSize: 15 }}>{result.password}</span>
              </div>
              <button style={{ ...s.loginBtn, marginTop: 16 }} onClick={copyPassword}>
                {copied ? '✓ Copied' : '📋 Copy Password'}
              </button>
              <p style={{ fontSize: 12, color: '#7A8A9A', marginTop: 14, lineHeight: 1.6 }}>
                This password is shown only once{result.emailSent ? ' here, though it has also been emailed to them' : ''}.
                {result.emailSent ? ' Ask them to change it on first sign-in.' : ' Send it to them through a secure, private channel and ask them to change it on first sign-in.'}
                {' '}No roles have been granted yet — open <strong>Roles &amp; Permissions</strong> from the user table to configure access.
              </p>
              <button style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff', marginTop: 16, width: '100%' }} onClick={onClose}>
                Done
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <label style={cu.label}>Full name</label>
              <input style={s.loginInput} value={form.name} onChange={e => update('name', e.target.value)} disabled={submitting} autoFocus />

              <label style={{ ...cu.label, marginTop: 12 }}>Work email</label>
              <input type="email" style={s.loginInput} value={form.email} onChange={e => update('email', e.target.value)} disabled={submitting} />

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={cu.label}>Department</label>
                  <select style={cu.select} value={form.department} onChange={e => update('department', e.target.value)} disabled={submitting}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={cu.label}>Role</label>
                  <select style={cu.select} value={form.role} onChange={e => update('role', e.target.value)} disabled={submitting}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {error && <p style={s.loginErr}>{error}</p>}
              <button type="submit" style={{ ...s.loginBtn, marginTop: 18 }} disabled={submitting}>
                {submitting ? 'Creating…' : '➕ Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const CeoManager = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | users | audit

  // Team users
  const [teamUsers, setTeamUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);

  // Audit log
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [auditError, setAuditError] = useState(null);
  const [auditSearch, setAuditSearch] = useState('');

  // Global dashboard metrics
  const [salesData, setSalesData] = useState(null);
  const [hrData, setHrData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState({ sales: true, hr: true, finance: true });
  const [metricsError, setMetricsError] = useState({ sales: null, hr: null, finance: null });

  // Idle session
  const [idleWarning, setIdleWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());

  const isCeo = !!user && user.email?.toLowerCase() === CEO_EMAIL;

  // ── Auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // ── Team users listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!isCeo) { setTeamUsers([]); setUsersError(null); return; }
    setLoadingUsers(true);
    const unsub = onSnapshot(
      collection(db, 'teamUsers'),
      (snap) => { setUsersError(null); setTeamUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingUsers(false); },
      (err) => {
        console.error('teamUsers listen error:', err);
        setUsersError(err.code === 'permission-denied' ? 'Permission denied reading team accounts.' : 'Could not load team accounts: ' + err.message);
        setLoadingUsers(false);
      }
    );
    return unsub;
  }, [isCeo]);

  // ── Audit log listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isCeo) { setAuditLogs([]); setAuditError(null); return; }
    setLoadingAudit(true);
    const q = query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc'), limit(200));
    const unsub = onSnapshot(
      q,
      (snap) => { setAuditError(null); setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingAudit(false); },
      (err) => {
        console.error('auditLogs listen error:', err);
        setAuditError(err.code === 'permission-denied' ? 'Permission denied reading the audit log.' : 'Could not load audit log: ' + err.message);
        setLoadingAudit(false);
      }
    );
    return unsub;
  }, [isCeo]);

  // ── Global dashboard metrics listeners ─────────────────────────────────
  useEffect(() => {
    if (!isCeo) return;
    const subs = [
      ['sales', 'sales', setSalesData],
      ['hr', 'hr', setHrData],
      ['finance', 'finance', setFinanceData],
    ].map(([label, docId, setter]) =>
      onSnapshot(
        doc(db, 'analytics', docId),
        (snap) => {
          setter(snap.exists() ? snap.data() : {});
          setMetricsLoading(prev => ({ ...prev, [label]: false }));
          setMetricsError(prev => ({ ...prev, [label]: null }));
        },
        (err) => {
          console.error(`analytics/${docId} listen error:`, err);
          setMetricsLoading(prev => ({ ...prev, [label]: false }));
          setMetricsError(prev => ({ ...prev, [label]: err.code === 'permission-denied' ? 'Permission denied.' : err.message }));
        }
      )
    );
    return () => subs.forEach(u => u());
  }, [isCeo]);

  // ── Idle auto sign-out ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isCeo) return;
    const bump = () => { lastActivityRef.current = Date.now(); if (idleWarning) setIdleWarning(false); };
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => window.addEventListener(evt, bump));
    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_LIMIT_MS) {
        signOut(auth).catch(() => {});
      } else if (idleFor >= IDLE_WARN_MS) {
        setIdleWarning(true);
      }
    }, 30000);
    return () => {
      ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => window.removeEventListener(evt, bump));
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCeo]);

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    const confirmed = window.confirm('Sign out of the CEO Control Center?');
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      setTeamUsers([]); setAuditLogs([]); setSalesData(null); setHrData(null); setFinanceData(null);
      setRoleTarget(null); setShowCreateUser(false);
      await signOut(auth);
    } catch (err) {
      alert('Sign out failed: ' + err.message);
    } finally {
      setLoggingOut(false);
    }
  }, []);

  // ── Audit helper ───────────────────────────────────────────────────────
  const logAudit = useCallback(async (action, target, details = '') => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        actorEmail: auth.currentUser?.email || 'unknown',
        actorUid: auth.currentUser?.uid || 'unknown',
        action, target, details,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error('Audit log write failed:', err);
    }
  }, []);

  // ── User provisioning ──────────────────────────────────────────────────
  const handleCreateUser = useCallback(async ({ name, email, department, role }) => {
    try {
      const password = generatePassword();
      const res = await fetch(`${API_URL}/api/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, department, role, password, createdBy: auth.currentUser?.email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server responded ${res.status}`);
      }
      const { uid } = await res.json();

      await setDoc(doc(db, 'teamUsers', uid), {
        name, email, department, role,
        status: 'active',
        permissions: emptyPermissions(),
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown',
      });

      // Email the new hire their temporary password + portal link, the
      // same way Admin.jsx emails applicants via POST /api/send-email.
      // Awaited (unlike Admin.jsx's fire-and-forget) because this password
      // is shown to the CEO only once — if delivery fails, the modal needs
      // to say so immediately so it can be copied and shared manually.
      let emailSent = false;
      let emailError = null;
      try {
        const emailRes = await fetch(`${API_URL}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'account_created',
            to: email,
            name,
            password,
            department,
            role,
          }),
        });
        if (emailRes.ok) {
          emailSent = true;
        } else {
          const body = await emailRes.json().catch(() => ({}));
          emailError = body.message || `Server responded ${emailRes.status}`;
        }
      } catch (err) {
        emailError = err.message;
      }
      if (!emailSent) console.warn('[Email] Account-created email failed:', emailError);

      await logAudit(
        'Created user account',
        email,
        `Department: ${department} · Role: ${role} · Welcome email: ${emailSent ? 'sent' : 'failed'}`
      );
      return { success: true, password, emailSent, emailError };
    } catch (err) {
      console.error('Create user error:', err);
      return { success: false, error: err.message };
    }
  }, [logAudit]);

  const toggleUserStatus = useCallback(async (target) => {
    const newStatus = target.status === 'suspended' ? 'active' : 'suspended';
    const confirmed = window.confirm(
      newStatus === 'suspended'
        ? `Suspend ${target.name}? They will immediately lose access.`
        : `Reactivate ${target.name}?`
    );
    if (!confirmed) return;
    setBusyUserId(target.id);
    try {
      await updateDoc(doc(db, 'teamUsers', target.id), { status: newStatus });
      await logAudit(newStatus === 'suspended' ? 'Suspended user' : 'Reactivated user', target.email);
      fetch(`${API_URL}/api/set-user-disabled`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: target.id, disabled: newStatus === 'suspended' }),
      }).catch(err => console.warn('Auth disable sync failed (non-fatal):', err.message));
    } catch (err) {
      alert('Could not update user status: ' + err.message);
    } finally {
      setBusyUserId(null);
    }
  }, [logAudit]);

  const handleDeleteUser = useCallback(async (target) => {
    const confirmed = window.confirm(`Permanently delete ${target.name} (${target.email})? This cannot be undone.`);
    if (!confirmed) return;
    setBusyUserId(target.id);
    try {
      await deleteDoc(doc(db, 'teamUsers', target.id));
      fetch(`${API_URL}/api/delete-user`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: target.id }),
      }).catch(err => console.warn('Auth delete sync failed (non-fatal):', err.message));
      await logAudit('Deleted user account', target.email);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setBusyUserId(null);
    }
  }, [logAudit]);

  const savePermissions = useCallback(async (userId, permissions) => {
    await updateDoc(doc(db, 'teamUsers', userId), { permissions });
    const target = teamUsers.find(u => u.id === userId);
    const grantedFeatures = FEATURES
      .filter(f => Object.values(permissions[f.key] || {}).some(Boolean))
      .map(f => f.label);
    await logAudit(
      'Updated permissions',
      target?.email || userId,
      grantedFeatures.length ? `Access granted: ${grantedFeatures.join(', ')}` : 'All access revoked'
    );
  }, [logAudit, teamUsers]);

  // ── Derived data ────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return teamUsers
      .filter(u => deptFilter === 'All' || u.department === deptFilter)
      .filter(u => statusFilter === 'All' || u.status === statusFilter)
      .filter(u => !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [teamUsers, userSearch, deptFilter, statusFilter]);

  const userCounts = useMemo(() => ({
    All: teamUsers.length,
    active: teamUsers.filter(u => u.status !== 'suspended').length,
    suspended: teamUsers.filter(u => u.status === 'suspended').length,
  }), [teamUsers]);

  const filteredAudit = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(l =>
      l.actorEmail?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.target?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  const exportUsersCSV = () => downloadCSV('slirus_team_accounts.csv', toCSV(filteredUsers, [
    { label: 'Name', get: u => u.name },
    { label: 'Email', get: u => u.email },
    { label: 'Department', get: u => u.department },
    { label: 'Role', get: u => u.role },
    { label: 'Status', get: u => u.status },
    { label: 'Permissions Granted', get: u => permissionCount(u.permissions) },
  ]));

  const exportAuditCSV = () => downloadCSV('slirus_audit_log.csv', toCSV(filteredAudit, [
    { label: 'Timestamp', get: l => fmtDate(l.timestamp) },
    { label: 'Actor', get: l => l.actorEmail },
    { label: 'Action', get: l => l.action },
    { label: 'Target', get: l => l.target },
    { label: 'Details', get: l => l.details },
  ]));

  // ── Render gates ────────────────────────────────────────────────────────
  if (authLoading) {
    return <div style={s.loginBg}><p style={{ color: '#5A7A9A' }}>Loading…</p></div>;
  }
  if (!user) return <LoginScreen />;
  if (!isCeo) return <AccessDenied email={user.email} onLogout={() => signOut(auth)} />;

  return (
    <Layout>
      <div style={s.page}>
        {idleWarning && (
          <div style={s.errorBanner}>
            ⏳ You've been idle a while — you'll be signed out automatically in a couple of minutes for security.
          </div>
        )}
        {usersError && activeTab === 'users' && <div style={s.errorBanner}>⚠️ {usersError}</div>}
        {auditError && activeTab === 'audit' && <div style={s.errorBanner}>⚠️ {auditError}</div>}

        {/* Top bar */}
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>CEO Control Center</h1>
            <p style={s.pageSub}>{teamUsers.length} team accounts · {userCounts.suspended} suspended · signed in as {user.email}</p>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Sign Out ⎋'}
          </button>
        </div>

        {/* Tab switcher */}
        <div style={s.dashSwitcher}>
          <button style={{ ...s.dashTab, ...(activeTab === 'dashboard' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('dashboard')}>
            📊 Global Dashboard
          </button>
          <button style={{ ...s.dashTab, ...(activeTab === 'users' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('users')}>
            👥 User Provisioning <span style={s.tabCount}>{teamUsers.length}</span>
          </button>
          <button style={{ ...s.dashTab, ...(activeTab === 'audit' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('audit')}>
            📜 Audit Log <span style={s.tabCount}>{auditLogs.length}</span>
          </button>
        </div>

        {/* ── Global Dashboard tab ── */}
        {activeTab === 'dashboard' && (
          <>
            <h2 style={s.sectionHead}>Company-Wide Snapshot</h2>
            <div style={{ ...s.trackGrid, marginBottom: 28 }}>
              <StatCard label="Team Accounts" value={teamUsers.length} accent="#1A3C5E" sub={`${userCounts.active} active`} />
              <StatCard label="Suspended" value={userCounts.suspended} accent="#EF4444" sub="Access revoked" />
              <StatCard label="Audit Entries" value={auditLogs.length} accent="#2E6DA4" sub="Last 200 shown" />
              <StatCard label="Permissions Granted" value={teamUsers.reduce((sum, u) => sum + permissionCount(u.permissions), 0)} accent="#10B981" sub="Across all features" />
            </div>

            <h2 style={s.sectionHead}>Sales · HR · Finance (Read-Only)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <MetricsPanel title="Sales" accent="#2E6DA4" data={salesData} loading={metricsLoading.sales} error={metricsError.sales} />
              <MetricsPanel title="Hr" accent="#7C3AED" data={hrData} loading={metricsLoading.hr} error={metricsError.hr} />
              <MetricsPanel title="Finance" accent="#059669" data={financeData} loading={metricsLoading.finance} error={metricsError.finance} />
            </div>
          </>
        )}

        {/* ── User Provisioning tab ── */}
        {activeTab === 'users' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Team Accounts</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...s.tab }} onClick={exportUsersCSV}>⬇ Export CSV</button>
                <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowCreateUser(true)}>
                  ➕ New Account
                </button>
              </div>
            </div>

            <div style={s.toolbar}>
              <div style={s.tabs}>
                {['All', 'active', 'suspended'].map(st => (
                  <button
                    key={st}
                    style={{ ...s.tab, ...(statusFilter === st ? s.tabActive : {}) }}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st === 'All' ? 'All' : st === 'active' ? 'Active' : 'Suspended'}
                    <span style={s.tabCount}>{st === 'All' ? userCounts.All : userCounts[st]}</span>
                  </button>
                ))}
              </div>
              <select style={{ ...cu.select, width: 'auto' }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input style={s.searchInput} placeholder="Search name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            </div>

            <div style={s.tableWrap}>
              {loadingUsers ? (
                <div style={s.tableMsg}>Loading team accounts…</div>
              ) : filteredUsers.length === 0 ? (
                <div style={s.tableMsg}>No accounts match your filters.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Name</th>
                      <th style={s.th}>Department</th>
                      <th style={s.th}>Role</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Permissions</th>
                      <th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} style={s.tr}>
                        <td style={s.td}>
                          <span style={{ fontWeight: 700, color: '#1A3C5E' }}>{u.name}</span>
                          <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{u.email}</div>
                        </td>
                        <td style={s.td}>{u.department || '—'}</td>
                        <td style={s.td}>{u.role || '—'}</td>
                        <td style={s.td}><StatusBadge status={u.status} /></td>
                        <td style={s.td}>{permissionCount(u.permissions)} granted</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button style={s.btnView} onClick={() => setRoleTarget(u)}>Roles</button>
                            <button
                              style={u.status === 'suspended' ? s.btnShortlist : s.btnReject}
                              onClick={() => toggleUserStatus(u)}
                              disabled={busyUserId === u.id}
                            >
                              {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                            </button>
                            <button style={s.btnDelete} onClick={() => handleDeleteUser(u)} disabled={busyUserId === u.id}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Audit Log tab ── */}
        {activeTab === 'audit' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>Audit Log</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>Append-only. Enforce via Security Rules for tamper resistance.</p>
              </div>
              <button style={s.tab} onClick={exportAuditCSV}>⬇ Export CSV</button>
            </div>

            <div style={s.toolbar}>
              <input style={s.searchInput} placeholder="Search actor, action, or target…" value={auditSearch} onChange={e => setAuditSearch(e.target.value)} />
            </div>

            <div style={s.tableWrap}>
              {loadingAudit ? (
                <div style={s.tableMsg}>Loading audit log…</div>
              ) : filteredAudit.length === 0 ? (
                <div style={s.tableMsg}>No matching entries.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Timestamp</th>
                      <th style={s.th}>Actor</th>
                      <th style={s.th}>Action</th>
                      <th style={s.th}>Target</th>
                      <th style={s.th}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAudit.map(l => (
                      <tr key={l.id} style={s.tr}>
                        <td style={{ ...s.td, whiteSpace: 'nowrap', fontSize: 12.5, color: '#7A8A9A' }}>{fmtDate(l.timestamp)}</td>
                        <td style={{ ...s.td, fontWeight: 600 }}>{l.actorEmail}</td>
                        <td style={s.td}>{l.action}</td>
                        <td style={s.td}>{l.target}</td>
                        <td style={{ ...s.td, color: '#5A7A9A', fontSize: 13 }}>{l.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {showCreateUser && (
        <CreateUserModal onClose={() => setShowCreateUser(false)} onCreate={handleCreateUser} />
      )}
      {roleTarget && (
        <RoleMatrixModal targetUser={roleTarget} onClose={() => setRoleTarget(null)} onSave={savePermissions} />
      )}
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

  dashSwitcher: { display: 'flex', gap: 8, marginBottom: 28, borderBottom: '2px solid #E2E8F0', paddingBottom: 0 },
  dashTab:      { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '10px 4px 12px', fontSize: 14, fontWeight: 700, color: '#7A8A9A', cursor: 'pointer', marginBottom: -2 },
  dashTabActive:{ color: '#1A3C5E', borderBottomColor: '#1A3C5E' },

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
  btnShortlist:{ background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnReject:   { background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnView:     { background: '#EFF6FF', color: '#1D4ED8', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnDelete:   { background: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
};

const ms = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal:     { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
  header:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F7F9FC', borderRadius: '12px 12px 0 0', flexShrink: 0 },
  actionBar: { display: 'flex', gap: 8, padding: '12px 24px', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', flexShrink: 0 },
  actionBtn: { border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  body:      { overflowY: 'auto', padding: '20px 24px', flex: 1 },
  closeBtn:  { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7A8A9A', lineHeight: 1, padding: 4 },
};

const gd = {
  card:      { background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', textAlign: 'center' },
  cardLabel: { fontSize: 12, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 6px' },
  cardValue: { fontSize: 28, fontWeight: 800, margin: 0 },
  cardSub:   { fontSize: 12, color: '#9AAAB8', margin: '4px 0 0' },
};

const rm = {
  th:      { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #E2E8F0' },
  miniBtn: { background: '#F0F4F8', border: '1px solid #E2E8F0', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#5A7A9A', cursor: 'pointer' },
};

const cu = {
  label:  { display: 'block', fontSize: 12, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, textAlign: 'left' },
  select: { width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
  credRow:{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 0', borderBottom: '1px solid #F0F4F8' },
  credLabel: { fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4 },
  credVal:   { fontSize: 15, fontWeight: 600, color: '#1A3C5E' },
};

export default CeoManager;