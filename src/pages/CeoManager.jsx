/**
 * CeoManager.jsx – Slirus Global Limited CEO Control Center
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
 *  - Contracts & Agreements: create SLAs, Service Contract Agreements, and
 *    other professional agreements for contractual work across all Slirus
 *    services (Software Development, Network & Infrastructure, IT Consultancy,
 *    Cybersecurity, Slirus Fashions, Slirus AgriSolutions, Slirus General Trade).
 *    Terms are entered as a bulleted, add/remove list of conditions. Saves
 *    to the `contracts` Firestore collection (also read by Admin.jsx) and
 *    downloads a Client Copy + Company Copy PDF via utils/contractPdf.js.
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
import {
  CONTRACT_TYPES, SERVICE_CATEGORIES, CONTRACT_STATUSES, CONTRACT_STATUS_CONFIG,
  CONTRACT_TYPE_FIELDS, emptyContractForm, generateContractPDF, generateBothContractCopies,
} from '../utils/contractPdf';

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
  { key: 'documents',  label: 'Documents & Notices' },
  { key: 'contracts',  label: 'Contracts & Agreements' },
];

const PERMISSIONS = ['read', 'write', 'edit', 'delete', 'approve'];
const PERMISSION_LABELS = { read: 'Read', write: 'Write', edit: 'Edit', delete: 'Delete', approve: 'Approve' };

const DEPARTMENTS = ['Sales', 'HR', 'Finance', 'Operations', 'Engineering', 'Marketing', 'Executive', 'Administration'];
const ROLES = ['Staff', 'Team Lead', 'Manager', 'Director']; // seniority levels (see LEVEL_ACTIONS)

const IDLE_LIMIT_MS = 20 * 60 * 1000;   // auto sign-out after 20 idle minutes
const IDLE_WARN_MS  = 18 * 60 * 1000;   // warn at 18 minutes

// ─── Helpers ────────────────────────────────────────────────────────────────
const emptyPermissions = () =>
  FEATURES.reduce((acc, f) => {
    acc[f.key] = PERMISSIONS.reduce((p, perm) => { p[perm] = false; return p; }, {});
    return acc;
  }, {});

// ─── Role-based provisioning ────────────────────────────────────────────────
// A job role decides WHERE a person works (department) and WHICH modules they
// get; their seniority level decides WHAT they can do inside those modules.
// The department / role values below are exactly what the portals and the
// Firestore rules check:
//   • Secretary  → role 'Secretary' / department 'Administration' (SecretaryManager + isSecretary())
//   • Accountant → department 'Finance'  (AccountsManager)
//   • HR Officer → department 'HR'       (HrManager)
const JOB_ROLES = [
  {
    key: 'Secretary', department: 'Administration', portal: 'Secretary Workspace', path: '/secretary-manager',
    modules: ['documents'],
    blurb: 'Company records, notices, memos, appointments and broadcasts.',
  },
  {
    key: 'Accountant', department: 'Finance', portal: 'Accounts', path: '/accounts-manager',
    modules: ['finance'],
    blurb: 'Ledger, invoices, payroll posting, tax and compliance.',
  },
  {
    key: 'HR Officer', department: 'HR', portal: 'Human Resource', path: '/hr-manager',
    modules: ['hr', 'recruiting'],
    blurb: 'Employees, contracts, leave, payroll runs and recruitment.',
  },
  {
    key: 'Sales Officer', department: 'Sales', portal: 'Sales', path: '/sales-manager',
    modules: ['sales'],
    blurb: 'Leads, clients, campaigns, proposals and targets.',
  },
  {
    key: 'Marketing Officer', department: 'Marketing', portal: 'Sales', path: '/sales-manager',
    modules: ['sales'],
    blurb: 'Campaigns, leads and client feedback.',
  },
  {
    key: 'Operations Officer', department: 'Operations', portal: "Worker's Log", path: '/worker-log',
    modules: ['projects'],
    blurb: 'Project requests and day-to-day operations.',
  },
  {
    key: 'Technical Staff', department: 'Engineering', portal: "Worker's Log", path: '/worker-log',
    modules: ['projects'], actions: ['read'],
    blurb: 'Read access to project requests; logs work in the Worker\'s Log.',
  },
  {
    key: 'Executive', department: 'Executive', portal: 'Read-only overview', path: '/portals',
    modules: ['sales', 'hr', 'finance', 'recruiting', 'projects', 'documents', 'contracts'], actions: ['read'],
    blurb: 'Read-only visibility across the business.',
  },
];
const JOB_ROLE_MAP = JOB_ROLES.reduce((acc, r) => { acc[r.key] = r; return acc; }, {});

// What each seniority level may do inside the modules its role grants.
const LEVEL_ACTIONS = {
  'Staff':     ['read', 'write', 'edit'],
  'Team Lead': ['read', 'write', 'edit', 'approve'],
  'Manager':   ['read', 'write', 'edit', 'approve', 'delete'],
  'Director':  ['read', 'write', 'edit', 'approve', 'delete'],
};

// Builds the full permission matrix for a job role at a given level.
const permissionsForRole = (roleKey, level = 'Staff') => {
  const perms = emptyPermissions();
  const role = JOB_ROLE_MAP[roleKey];
  if (!role) return perms;
  const allowed = (LEVEL_ACTIONS[level] || LEVEL_ACTIONS.Staff)
    .filter(a => !role.actions || role.actions.includes(a));
  role.modules.forEach(m => allowed.forEach(a => { perms[m][a] = true; }));
  return perms;
};

// Human-readable summary, e.g. ['Documents & Notices (Read, Write, Edit)'].
const describePermissions = (perms) =>
  FEATURES
    .filter(f => Object.values(perms?.[f.key] || {}).some(Boolean))
    .map(f => `${f.label} (${PERMISSIONS.filter(p => perms[f.key][p]).map(p => PERMISSION_LABELS[p]).join(', ')})`);

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

const ContractStatusBadge = ({ status }) => {
  const cfg = CONTRACT_STATUS_CONFIG[status] || CONTRACT_STATUS_CONFIG.Draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status || 'Draft'}
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
          {JOB_ROLE_MAP[targetUser.role] && (
            <div style={{ background: '#F0F4F8', border: '1px solid #DCE4EC', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#1A3C5E' }}>
                <strong>{targetUser.role}</strong> · {targetUser.level || ROLES[0]} · {targetUser.department}
              </span>
              <button
                type="button"
                style={rm.miniBtn}
                onClick={() => setPermissions(permissionsForRole(targetUser.role, targetUser.level || ROLES[0]))}
              >
                Apply role defaults
              </button>
            </div>
          )}
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
  const [form, setForm] = useState({ name: '', email: '', department: JOB_ROLES[0].department, role: JOB_ROLES[0].key, level: ROLES[0] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { password, emailSent, emailError }
  const [copied, setCopied] = useState(false);

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  // Picking a job role also sets its department, so the two can never disagree.
  const selectJobRole = (key) => setForm(prev => ({ ...prev, role: key, department: JOB_ROLE_MAP[key].department }));
  const selectedRole = JOB_ROLE_MAP[form.role];
  const previewGranted = describePermissions(permissionsForRole(form.role, form.level));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
    setSubmitting(true); setError('');
    const outcome = await onCreate(form);
    setSubmitting(false);
    if (outcome.success) {
      setResult({ password: outcome.password, emailSent: outcome.emailSent, emailError: outcome.emailError, granted: outcome.granted || [], portalPath: outcome.portalPath });
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
              {result ? 'Share these credentials securely.' : 'Provisions a login with the access that goes with the chosen role.'}
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
                <span style={cu.credLabel}>Sign-in link</span>
                <span style={cu.credVal}>{window.location.origin}{result.portalPath}</span>
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
              </p>
              <div style={{ background: '#F0F4F8', border: '1px solid #DCE4EC', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A3C5E', marginBottom: 4 }}>
                  Access granted automatically · {form.role} ({form.level}) · {form.department}
                </div>
                {result.granted.length ? (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>
                    {result.granted.map(g => <li key={g}>{g}</li>)}
                  </ul>
                ) : (
                  <div style={{ fontSize: 12.5, color: '#475569' }}>No module permissions for this role.</div>
                )}
                <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 6 }}>
                  Fine-tune anytime from <strong>Roles &amp; Permissions</strong> in the user table.
                </div>
              </div>
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
                <div style={{ flex: 1.4 }}>
                  <label style={cu.label}>Role</label>
                  <select style={cu.select} value={form.role} onChange={e => selectJobRole(e.target.value)} disabled={submitting}>
                    {JOB_ROLES.map(r => <option key={r.key} value={r.key}>{r.key} — {r.department}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={cu.label}>Level</label>
                  <select style={cu.select} value={form.level} onChange={e => update('level', e.target.value)} disabled={submitting}>
                    {ROLES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ background: '#F0F4F8', border: '1px solid #DCE4EC', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
                <div style={{ fontSize: 12.5, color: '#1A3C5E', fontWeight: 700 }}>
                  Department: {form.department} · Portal: {selectedRole.portal}
                </div>
                <div style={{ fontSize: 12, color: '#5A7A9A', margin: '3px 0 6px' }}>{selectedRole.blurb}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A3C5E' }}>Access this account will receive:</div>
                <ul style={{ margin: '3px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>
                  {previewGranted.map(g => <li key={g}>{g}</li>)}
                </ul>
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

// Example contract titles shown as a placeholder, matched to the selected service category.
const CONTRACT_TITLE_EXAMPLES = {
  'Software Development':       'e.g. Web Platform Development Contract – Q3 2026',
  'Network & Infrastructure':   'e.g. Network Monitoring SLA – Q3 2026',
  'IT Consultancy':             'e.g. Digital Transformation Advisory Agreement – 2026',
  'Other / IT Cybersecurity':   'e.g. Security Audit Statement of Work – Q3 2026',
  'Slirus Fashions':            'e.g. Staff Uniform Supply Agreement – Q3 2026',
  'Slirus AgriSolutions':       'e.g. Seed & Fertilizer Supply Agreement – 2026',
  'Slirus General Trade':       'e.g. Goods Distribution Agreement – 2026',
};

// ─── Contract / Agreement Form Modal ────────────────────────────────────────
// Covers SLAs, Service Contract Agreements, and other professional
// agreements for every contractual-job category (Software Development,
// Network & Infrastructure, IT Consultancy, Cybersecurity, Slirus Fashions,
// Slirus AgriSolutions, Slirus General Trade).
// Terms & conditions are entered as a bulleted, add/remove list of text
// fields rather than a single free-text box, so each clause stays a
// distinct, addressable item both on screen and in the generated PDFs.
const ContractFormModal = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState(initial || emptyContractForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  // Generic handlers for any bulleted 'list' field — used by the catch-all
  // `conditions` list and by whichever per-type list field the current
  // contractType calls for (deliverables, milestones, …).
  const updateListItem = (key, idx, val) => setForm(prev => {
    const arr = [...(prev[key] || [''])];
    arr[idx] = val;
    return { ...prev, [key]: arr };
  });
  const addListItem = (key) => setForm(prev => ({ ...prev, [key]: [...(prev[key] || ['']), ''] }));
  const removeListItem = (key, idx) => setForm(prev => {
    const arr = prev[key] || [''];
    return { ...prev, [key]: arr.length > 1 ? arr.filter((_, i) => i !== idx) : [''] };
  });

  const typeFields = CONTRACT_TYPE_FIELDS[form.contractType] || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contractTitle.trim() || !form.clientCompanyName.trim()) {
      setError('Contract title and client company name are required.');
      return;
    }
    if (!form.conditions.some(c => c.trim())) {
      setError('Add at least one contract condition / clause.');
      return;
    }
    setSaving(true); setError('');
    try {
      const cleaned = { ...form, conditions: form.conditions.filter(c => c.trim()) };
      typeFields.forEach(f => {
        if (f.type === 'list') cleaned[f.key] = (form[f.key] || []).filter(v => v && v.trim());
      });
      await onSave(cleaned);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the contract.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>
              {initial ? 'Edit Contract / Agreement' : 'New Contract / Agreement'}
            </h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>
              SLA, Service Contract Agreement, or other professional IT-services agreement.
            </p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ ...ms.body, overflowY: 'auto', minHeight: 0 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Agreement type</label>
                <select style={cu.select} value={form.contractType} onChange={e => update('contractType', e.target.value)} disabled={saving}>
                  {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Service category</label>
                <select style={cu.select} value={form.serviceCategory} onChange={e => update('serviceCategory', e.target.value)} disabled={saving}>
                  {SERVICE_CATEGORIES.map(c => <option key={c.key} value={c.label}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <label style={{ ...cu.label, marginTop: 12 }}>Contract title / reference</label>
            <input style={s.loginInput} value={form.contractTitle} onChange={e => update('contractTitle', e.target.value)} disabled={saving} placeholder={CONTRACT_TITLE_EXAMPLES[form.serviceCategory] || 'e.g. Network Monitoring SLA – Q3 2026'} />

            <h4 style={{ ...ms.secTitle, marginTop: 18, color: '#2E6DA4' }}>Client</h4>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Client company</label>
                <input style={s.loginInput} value={form.clientCompanyName} onChange={e => update('clientCompanyName', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Contact name</label>
                <input style={s.loginInput} value={form.clientContactName} onChange={e => update('clientContactName', e.target.value)} disabled={saving} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Contact email</label>
                <input type="email" style={s.loginInput} value={form.clientEmail} onChange={e => update('clientEmail', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Contact phone</label>
                <input style={s.loginInput} value={form.clientPhone} onChange={e => update('clientPhone', e.target.value)} disabled={saving} />
              </div>
            </div>
            <label style={{ ...cu.label, marginTop: 12 }}>Client address</label>
            <input style={s.loginInput} value={form.clientAddress} onChange={e => update('clientAddress', e.target.value)} disabled={saving} />

            <h4 style={{ ...ms.secTitle, marginTop: 18, color: '#2E6DA4' }}>Signatories</h4>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Company signatory</label>
                <input style={s.loginInput} value={form.companySignatoryName} onChange={e => update('companySignatoryName', e.target.value)} disabled={saving} />
                <input style={{ ...s.loginInput, marginTop: 8 }} placeholder="Title" value={form.companySignatoryTitle} onChange={e => update('companySignatoryTitle', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Client signatory</label>
                <input style={s.loginInput} value={form.clientSignatoryName} onChange={e => update('clientSignatoryName', e.target.value)} disabled={saving} />
                <input style={{ ...s.loginInput, marginTop: 8 }} placeholder="Title" value={form.clientSignatoryTitle} onChange={e => update('clientSignatoryTitle', e.target.value)} disabled={saving} />
              </div>
            </div>

            <h4 style={{ ...ms.secTitle, marginTop: 18, color: '#2E6DA4' }}>Term & Value</h4>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Effective date</label>
                <input type="date" style={s.loginInput} value={form.effectiveDate} onChange={e => update('effectiveDate', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Expiry / renewal date</label>
                <input type="date" style={s.loginInput} value={form.expiryDate} onChange={e => update('expiryDate', e.target.value)} disabled={saving} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Contract value</label>
                <input style={s.loginInput} placeholder="e.g. UGX 12,000,000 / year" value={form.contractValue} onChange={e => update('contractValue', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Payment terms</label>
                <input style={s.loginInput} placeholder="e.g. Net 30, quarterly in advance" value={form.paymentTerms} onChange={e => update('paymentTerms', e.target.value)} disabled={saving} />
              </div>
            </div>

            {typeFields.length > 0 && (
              <>
                <h4 style={{ ...ms.secTitle, marginTop: 18, color: '#2E6DA4' }}>{form.contractType} — Specific Terms</h4>
                {typeFields.map(f => (
                  <div key={f.key} style={{ marginBottom: 14 }}>
                    <label style={cu.label}>{f.label}</label>
                    {f.type === 'list' ? (
                      <>
                        {(form[f.key] || ['']).map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                            <span style={{ fontSize: 15, color: '#7A8A9A', marginTop: 10 }}>•</span>
                            <textarea
                              style={{ ...s.loginInput, flex: 1, minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }}
                              value={item}
                              onChange={e => updateListItem(f.key, idx, e.target.value)}
                              disabled={saving}
                              placeholder={f.placeholder}
                            />
                            <button
                              type="button"
                              style={bulletDeleteBtn}
                              onClick={() => removeListItem(f.key, idx)}
                              disabled={saving}
                              title={`Remove ${f.label.toLowerCase()}`}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button type="button" style={s.tab} onClick={() => addListItem(f.key)} disabled={saving}>
                          ➕ Add {f.label.toLowerCase().replace(/s$/, '')}
                        </button>
                      </>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        style={{ ...s.loginInput, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                        value={form[f.key] || ''}
                        onChange={e => update(f.key, e.target.value)}
                        disabled={saving}
                        placeholder={f.placeholder}
                      />
                    ) : (
                      <input
                        style={s.loginInput}
                        value={form[f.key] || ''}
                        onChange={e => update(f.key, e.target.value)}
                        disabled={saving}
                        placeholder={f.placeholder}
                      />
                    )}
                  </div>
                ))}
              </>
            )}

            <label style={{ ...cu.label, marginTop: 12 }}>Scope of work / purpose</label>
            <textarea
              style={{ ...s.loginInput, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
              value={form.scopeSummary}
              onChange={e => update('scopeSummary', e.target.value)}
              disabled={saving}
              placeholder="Brief summary of what this agreement covers…"
            />

            <h4 style={{ ...ms.secTitle, marginTop: 18, color: '#2E6DA4' }}>Terms & Conditions</h4>
            <p style={{ fontSize: 12.5, color: '#7A8A9A', margin: '0 0 10px' }}>
              Catch-all clauses not already covered above. Add each clause as its own bullet point — these render as the bulleted terms in the generated PDF.
            </p>
            {form.conditions.map((cond, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 15, color: '#7A8A9A', marginTop: 10 }}>•</span>
                <textarea
                  style={{ ...s.loginInput, flex: 1, minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }}
                  value={cond}
                  onChange={e => updateListItem('conditions', idx, e.target.value)}
                  disabled={saving}
                  placeholder={`Condition ${idx + 1} (e.g. "Provider guarantees 99.5% uptime, measured monthly.")`}
                />
                <button
                  type="button"
                  style={bulletDeleteBtn}
                  onClick={() => removeListItem('conditions', idx)}
                  disabled={saving}
                  title="Remove condition"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" style={{ ...s.tab, marginTop: 4 }} onClick={() => addListItem('conditions')} disabled={saving}>
              ➕ Add condition
            </button>

            <label style={{ ...cu.label, marginTop: 18 }}>Status</label>
            <select style={cu.select} value={form.status} onChange={e => update('status', e.target.value)} disabled={saving}>
              {CONTRACT_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
            </select>

            {error && <p style={s.loginErr}>{error}</p>}
          </div>

          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff' }} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const CeoManager = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | users | contracts | audit

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

  // Contracts & Agreements (SLA / Service Contract / other professional agreements)
  const [contracts, setContracts] = useState([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [contractsError, setContractsError] = useState(null);
  const [contractSearch, setContractSearch] = useState('');
  const [contractCategoryFilter, setContractCategoryFilter] = useState('All');
  const [contractStatusFilter, setContractStatusFilter] = useState('All');
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [busyContractId, setBusyContractId] = useState(null);

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

  // ── Contracts listener ─────────────────────────────────────────────────
  // Stored in the same `contracts` collection that Admin.jsx reads from,
  // so every agreement created here is immediately visible/downloadable
  // there too — same collection, same PDF-generation logic.
  useEffect(() => {
    if (!isCeo) { setContracts([]); setContractsError(null); return; }
    setLoadingContracts(true);
    const q = query(collection(db, 'contracts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => { setContractsError(null); setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingContracts(false); },
      (err) => {
        console.error('contracts listen error:', err);
        setContractsError(err.code === 'permission-denied' ? 'Permission denied reading contracts.' : 'Could not load contracts: ' + err.message);
        setLoadingContracts(false);
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
      setContracts([]); setShowContractForm(false); setEditingContract(null);
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
  // The three user-management endpoints below are CEO-gated server-side
  // (server.js verifies the ID token's email against CEO_EMAIL) — this
  // helper attaches that token so the server can actually enforce it.
  // The client-side CEO_EMAIL check earlier in this file is a UX gate only.
  const authFetch = useCallback(async (path, body) => {
    const idToken = await auth.currentUser?.getIdToken();
    return fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
  }, []);

  const handleCreateUser = useCallback(async ({ name, email, department: requestedDepartment, role, level = ROLES[0] }) => {
    // The role is the source of truth: its department and permissions are applied here, not trusted from the form.
    const department = JOB_ROLE_MAP[role]?.department || requestedDepartment;
    const permissions = permissionsForRole(role, level);
    try {
      const password = generatePassword();
      const res = await authFetch('/api/create-user', {
        name, email, department, role, password, createdBy: auth.currentUser?.email,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Server responded ${res.status}`);
      }
      const { uid } = await res.json();

      await setDoc(doc(db, 'teamUsers', uid), {
        name, email, department, role, level,
        status: 'active',
        permissions,
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
            level,
            access: describePermissions(permissions),
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
        `Department: ${department} · Role: ${role} (${level}) · Access: ${describePermissions(permissions).join('; ') || 'none'} · Welcome email: ${emailSent ? 'sent' : 'failed'}`
      );
      return { success: true, password, emailSent, emailError, granted: describePermissions(permissions), portalPath: JOB_ROLE_MAP[role]?.path || '/portals' };
    } catch (err) {
      console.error('Create user error:', err);
      return { success: false, error: err.message };
    }
  }, [logAudit, authFetch]);

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
      authFetch('/api/set-user-disabled', { uid: target.id, disabled: newStatus === 'suspended' })
        .catch(err => console.warn('Auth disable sync failed (non-fatal):', err.message));
    } catch (err) {
      alert('Could not update user status: ' + err.message);
    } finally {
      setBusyUserId(null);
    }
  }, [logAudit, authFetch]);

  const handleDeleteUser = useCallback(async (target) => {
    const confirmed = window.confirm(`Permanently delete ${target.name} (${target.email})? This cannot be undone.`);
    if (!confirmed) return;
    setBusyUserId(target.id);
    try {
      await deleteDoc(doc(db, 'teamUsers', target.id));
      authFetch('/api/delete-user', { uid: target.id })
        .catch(err => console.warn('Auth delete sync failed (non-fatal):', err.message));
      await logAudit('Deleted user account', target.email);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setBusyUserId(null);
    }
  }, [logAudit, authFetch]);

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

  // ── Contracts: save (create or edit) ───────────────────────────────────
  const saveContract = useCallback(async (form) => {
    if (editingContract) {
      await updateDoc(doc(db, 'contracts', editingContract.id), {
        ...form,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || 'unknown',
      });
      await logAudit('Updated contract', form.clientCompanyName, `${form.contractType} · ${form.serviceCategory}`);
    } else {
      await addDoc(collection(db, 'contracts'), {
        ...form,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || 'unknown',
      });
      await logAudit('Created contract', form.clientCompanyName, `${form.contractType} · ${form.serviceCategory}`);
    }
  }, [editingContract, logAudit]);

  const updateContractStatus = useCallback(async (contract, status) => {
    setBusyContractId(contract.id);
    try {
      await updateDoc(doc(db, 'contracts', contract.id), { status });
      await logAudit('Changed contract status', contract.clientCompanyName, `${contract.contractType} → ${status}`);
    } catch (err) {
      alert('Could not update contract status: ' + err.message);
    } finally {
      setBusyContractId(null);
    }
  }, [logAudit]);

  const deleteContract = useCallback(async (contract) => {
    if (!window.confirm(`Permanently delete the ${contract.contractType} for "${contract.clientCompanyName}"? This cannot be undone.`)) return;
    setBusyContractId(contract.id);
    try {
      await deleteDoc(doc(db, 'contracts', contract.id));
      await logAudit('Deleted contract', contract.clientCompanyName, contract.contractType);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setBusyContractId(null);
    }
  }, [logAudit]);

  // Downloads both the Client Copy and the Company Copy PDFs.
  const downloadContractCopies = useCallback(async (contract) => {
    setBusyContractId(contract.id);
    try {
      await generateBothContractCopies(contract);
      await logAudit('Downloaded contract PDFs', contract.clientCompanyName, `${contract.contractType} · Client + Company copies`);
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally {
      setBusyContractId(null);
    }
  }, [logAudit]);

  const downloadSingleContractCopy = useCallback(async (contract, copyLabel) => {
    setBusyContractId(contract.id);
    try {
      await generateContractPDF(contract, copyLabel);
    } catch (err) {
      alert('PDF generation failed: ' + err.message);
    } finally {
      setBusyContractId(null);
    }
  }, []);

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

  const filteredContracts = useMemo(() => {
    const q = contractSearch.trim().toLowerCase();
    return contracts
      .filter(c => contractCategoryFilter === 'All' || c.serviceCategory === contractCategoryFilter)
      .filter(c => contractStatusFilter === 'All' || c.status === contractStatusFilter)
      .filter(c => !q
        || c.clientCompanyName?.toLowerCase().includes(q)
        || c.contractTitle?.toLowerCase().includes(q)
        || c.clientContactName?.toLowerCase().includes(q)
      );
  }, [contracts, contractSearch, contractCategoryFilter, contractStatusFilter]);

  const contractCounts = useMemo(() => ({
    All: contracts.length,
    Draft: contracts.filter(c => c.status === 'Draft').length,
    Active: contracts.filter(c => c.status === 'Active').length,
    Expired: contracts.filter(c => c.status === 'Expired').length,
    Terminated: contracts.filter(c => c.status === 'Terminated').length,
  }), [contracts]);

  const exportContractsCSV = () => downloadCSV('slirus_contracts.csv', toCSV(filteredContracts, [
    { label: 'Client',   get: c => c.clientCompanyName },
    { label: 'Title',    get: c => c.contractTitle },
    { label: 'Type',     get: c => c.contractType },
    { label: 'Category', get: c => c.serviceCategory },
    { label: 'Value',    get: c => c.contractValue },
    { label: 'Status',   get: c => c.status },
    { label: 'Effective', get: c => c.effectiveDate },
    { label: 'Expiry',    get: c => c.expiryDate },
  ]));

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
        {contractsError && activeTab === 'contracts' && <div style={s.errorBanner}>⚠️ {contractsError}</div>}
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
          <button style={{ ...s.dashTab, ...(activeTab === 'contracts' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('contracts')}>
            📄 Contracts & Agreements <span style={s.tabCount}>{contracts.length}</span>
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
                        <td style={s.td}>
                          {u.role || '—'}
                          {u.level && <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{u.level}</div>}
                        </td>
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

        {/* ── Contracts & Agreements tab ── */}
        {activeTab === 'contracts' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>Contracts & Professional Agreements</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>
                  SLAs, Service Contract Agreements, and other agreements for contractual work — Software Development,
                  Network & Infrastructure, IT Consultancy, Cybersecurity, Fashions, AgriSolutions, and General Trade.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportContractsCSV}>⬇ Export CSV</button>
                <button
                  style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }}
                  onClick={() => { setEditingContract(null); setShowContractForm(true); }}
                >
                  ➕ New Contract
                </button>
              </div>
            </div>

            <div style={s.toolbar}>
              <div style={s.tabs}>
                {['All', 'Draft', 'Active', 'Expired', 'Terminated'].map(st => {
                  const cfg = CONTRACT_STATUS_CONFIG[st];
                  return (
                    <button
                      key={st}
                      style={{ ...s.tab, ...(contractStatusFilter === st ? (cfg ? { background: cfg.bg, color: cfg.color, borderColor: cfg.dot } : s.tabActive) : {}) }}
                      onClick={() => setContractStatusFilter(st)}
                    >
                      {st} <span style={s.tabCount}>{st === 'All' ? contractCounts.All : contractCounts[st]}</span>
                    </button>
                  );
                })}
              </div>
              <select style={{ ...cu.select, width: 'auto' }} value={contractCategoryFilter} onChange={e => setContractCategoryFilter(e.target.value)}>
                <option value="All">All Categories</option>
                {SERVICE_CATEGORIES.map(c => <option key={c.key} value={c.label}>{c.label}</option>)}
              </select>
              <input style={s.searchInput} placeholder="Search client, title, or contact…" value={contractSearch} onChange={e => setContractSearch(e.target.value)} />
            </div>

            <div style={s.tableWrap}>
              {loadingContracts ? (
                <div style={s.tableMsg}>Loading contracts…</div>
              ) : filteredContracts.length === 0 ? (
                <div style={s.tableMsg}>No contracts match your filters. Click "New Contract" to create one.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Client / Title</th>
                      <th style={s.th}>Type</th>
                      <th style={s.th}>Category</th>
                      <th style={s.th}>Value</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map(c => (
                      <tr key={c.id} style={s.tr}>
                        <td style={s.td}>
                          <span style={{ fontWeight: 700, color: '#1A3C5E' }}>{c.clientCompanyName}</span>
                          <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{c.contractTitle}</div>
                        </td>
                        <td style={{ ...s.td, fontSize: 13 }}>{c.contractType}</td>
                        <td style={{ ...s.td, fontSize: 13 }}>{c.serviceCategory}</td>
                        <td style={{ ...s.td, fontSize: 13, whiteSpace: 'nowrap' }}>{c.contractValue || '—'}</td>
                        <td style={s.td}><ContractStatusBadge status={c.status} /></td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button style={s.btnView} onClick={() => { setEditingContract(c); setShowContractForm(true); }}>Edit</button>
                            <button
                              style={{ ...s.btnShortlist, opacity: busyContractId === c.id ? 0.5 : 1 }}
                              onClick={() => downloadContractCopies(c)}
                              disabled={busyContractId === c.id}
                              title="Download both the Client Copy and the Company Copy"
                            >
                              {busyContractId === c.id ? '⏳' : '⬇ Both Copies'}
                            </button>
                            <button
                              style={s.tab}
                              onClick={() => downloadSingleContractCopy(c, 'Client Copy')}
                              disabled={busyContractId === c.id}
                            >
                              Client PDF
                            </button>
                            <button
                              style={s.tab}
                              onClick={() => downloadSingleContractCopy(c, 'Company Copy')}
                              disabled={busyContractId === c.id}
                            >
                              Company PDF
                            </button>
                            {c.status !== 'Active' && (
                              <button style={s.btnShortlist} onClick={() => updateContractStatus(c, 'Active')} disabled={busyContractId === c.id}>Activate</button>
                            )}
                            {c.status !== 'Terminated' && (
                              <button style={s.btnReject} onClick={() => updateContractStatus(c, 'Terminated')} disabled={busyContractId === c.id}>Terminate</button>
                            )}
                            <button style={s.btnDelete} onClick={() => deleteContract(c)} disabled={busyContractId === c.id}>Delete</button>
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
      {showContractForm && (
        <ContractFormModal
          key={editingContract?.id || 'new'}
          initial={editingContract}
          onClose={() => { setShowContractForm(false); setEditingContract(null); }}
          onSave={saveContract}
        />
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
  secTitle:  { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 8px', borderBottom: '1px solid #F0F4F8', paddingBottom: 6 },
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

// Small, fixed-size "✕" button for bulleted list rows (conditions,
// deliverables, milestones, …) — stays compact regardless of how tall the
// textarea next to it grows, instead of stretching to match its height.
const bulletDeleteBtn = {
  flexShrink: 0, width: 26, height: 26, marginTop: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5',
  borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0,
};

const cu = {
  label:  { display: 'block', fontSize: 12, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, textAlign: 'left' },
  select: { width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
  credRow:{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 0', borderBottom: '1px solid #F0F4F8' },
  credLabel: { fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4 },
  credVal:   { fontSize: 15, fontWeight: 600, color: '#1A3C5E' },
};

export default CeoManager;