/**
 * SecretaryManager.jsx – Slirus Holdings Secretary Workspace
 *
 * Administrative-core dashboard for the Secretary role. Sits alongside
 * CeoManager.jsx and Admin.jsx and reuses the same auth/session/style
 * conventions (Firebase Auth + Firestore, inline style dictionaries,
 * Layout wrapper, tamper-resistant audit log).
 *
 * Access: the CEO always has full access (see CeoManager's User
 * Provisioning + Roles & Permissions to create the Secretary's account —
 * email + auto-generated one-time password, same flow as every other
 * team account). Any other signed-in user gets in here if their
 * `teamUsers/{uid}` profile has role === 'Secretary', department ===
 * 'Administration', OR has been granted access to the 'documents'
 * feature via the CEO's Roles & Permissions matrix. For that last path
 * to show up as a named feature in the matrix, add:
 *   { key: 'documents', label: 'Secretary / Documents' }
 * to the FEATURES array in CeoManager.jsx (optional — the module works
 * without it, it just makes fine-grained delegation visible there too).
 *
 * Features:
 *  - Enterprise Document Management System (EDMS): centralized repo to
 *    draft, store, and categorize Memos / Letters / Notices / Proposals /
 *    Contracts, with full version control (every save writes an
 *    immutable version snapshot to a `versions` subcollection).
 *  - Corporate Communication Hub: broadcast memos/notices company-wide
 *    or to a specific department, with live Read Receipt tracking
 *    (subcollection `receipts`, watched company-wide via a
 *    collectionGroup listener so hub cards show real-time read %).
 *  - Template Engine: pre-built standard corporate formats for letters,
 *    memos, notices, proposals, and contracts; "Use template" seeds a
 *    new document's content instantly.
 *  - Personal Issuance: Letters and Contracts (e.g. job appointment
 *    letters, employment contracts) can optionally be assigned to one
 *    employee via `recipientEmail`. "Issue to Employee" publishes it
 *    straight to that person — WorkerLog.jsx's "My Documents" tab reads
 *    the same `documents` collection filtered by `recipientEmail` and
 *    offers a PDF download, with the same `receipts` subcollection this
 *    file already uses for read tracking.
 *
 * State lives at the top level and is passed down explicitly — no prop
 * drilling helpers, no context, matching CeoManager.jsx.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db, auth } from '../firebase/firebase';
import {
  collection, collectionGroup, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, limit, serverTimestamp,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';

// ─── Config ─────────────────────────────────────────────────────────────────
const CEO_EMAIL = (import.meta.env.VITE_CEO_EMAIL || 'kaayamosesawal@gmail.com').toLowerCase();

const DOC_TYPES = [
  { key: 'memo', label: 'Memo', icon: '🗒️' },
  { key: 'letter', label: 'Letter', icon: '✉️' },
  { key: 'notice', label: 'Notice', icon: '📢' },
  { key: 'proposal', label: 'Proposal', icon: '📝' },
  { key: 'contract', label: 'Contract', icon: '📄' },
];
const DOC_TYPE_MAP = DOC_TYPES.reduce((a, t) => { a[t.key] = t; return a; }, {});

const DEPARTMENTS = ['Company-Wide', 'Sales', 'HR', 'Finance', 'Operations', 'Engineering', 'Marketing', 'Executive'];

const STATUS_CONFIG = {
  draft: { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B', label: 'Draft' },
  published: { bg: '#D1FAE5', color: '#065F46', dot: '#10B981', label: 'Published' },
  archived: { bg: '#F0F4F8', color: '#5A7A9A', dot: '#9AAAB8', label: 'Archived' },
};

const DEFAULT_TEMPLATES = [
  { type: 'letter', name: 'Standard Business Letter', content: '[Company Letterhead]\n\nDate: {{date}}\n\nTo: {{recipient}}\n\nDear {{recipient}},\n\n{{body}}\n\nYours sincerely,\n{{sender}}\n{{title}}' },
  { type: 'memo', name: 'Internal Memo', content: 'MEMORANDUM\n\nTo: {{to}}\nFrom: {{from}}\nDate: {{date}}\nSubject: {{subject}}\n\n{{body}}' },
  { type: 'notice', name: 'Company Notice', content: 'NOTICE\n\nDate: {{date}}\n\n{{body}}\n\nBy order of Management.' },
  { type: 'proposal', name: 'Sales Proposal', content: 'PROPOSAL\n\nPrepared for: {{client}}\nPrepared by: {{sender}}\nDate: {{date}}\n\nScope of Work:\n{{body}}\n\nPricing:\n{{pricing}}' },
  { type: 'contract', name: 'Company Proposal / Contract', content: 'CONTRACT AGREEMENT\n\nBetween {{company}} and {{client}}\nEffective Date: {{date}}\n\nTerms:\n{{body}}\n\nSigned: ______________' },
];

const IDLE_LIMIT_MS = 20 * 60 * 1000;
const IDLE_WARN_MS = 18 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-UG') : '—');

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

// ─── Badges ─────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const t = DOC_TYPE_MAP[type] || { icon: '📄', label: type };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#1A3C5E' }}>
      <span>{t.icon}</span>{t.label}
    </span>
  );
};

// ─── Login Screen ───────────────────────────────────────────────────────────
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.loginBg}>
      <div style={s.loginCard}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🗂️</div>
        <h2 style={s.loginTitle}>Secretary Workspace</h2>
        <p style={s.loginSub}>Sign in with your administrative credentials.</p>
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
        {email} is signed in but isn't authorized for the Secretary Workspace.
        Ask the CEO to grant Secretary access from the CEO Control Center.
      </p>
      <button style={s.loginBtn} onClick={onLogout}>Sign Out</button>
    </div>
  </div>
);

// ─── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, accent, sub }) => (
  <div style={{ ...gd.card, borderTop: `3px solid ${accent}` }}>
    <p style={gd.cardLabel}>{label}</p>
    <p style={{ ...gd.cardValue, color: accent }}>{value}</p>
    {sub && <p style={gd.cardSub}>{sub}</p>}
  </div>
);

// ─── Document Editor Modal (create / edit) ─────────────────────────────────
const DocumentModal = ({ initial, templates, onClose, onSave }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState(() => ({
    type: initial?.type || 'memo',
    title: initial?.title || '',
    category: initial?.category || '',
    department: initial?.department || 'Company-Wide',
    content: initial?.content || '',
    recipientEmail: initial?.recipientEmail || '',
  }));
  const [templateId, setTemplateId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const applyTemplate = (id) => {
    setTemplateId(id);
    const tpl = templates.find(t => t.id === id);
    if (tpl) setForm(prev => ({ ...prev, type: tpl.type, content: tpl.content }));
  };

  const relevantTemplates = templates.filter(t => t.type === form.type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content are required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave(form, initial);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{isEdit ? `Edit Document — v${(initial.version || 1) + 1} on save` : 'New Document'}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>
              {isEdit ? 'Saving creates a new version; history is preserved.' : 'Draft a Memo, Letter, Notice, Proposal, or Contract.'}
            </p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Document type</label>
                <select style={cu.select} value={form.type} onChange={e => update('type', e.target.value)} disabled={saving || isEdit}>
                  {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Target department</label>
                <select style={cu.select} value={form.department} onChange={e => update('department', e.target.value)} disabled={saving}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {(form.type === 'letter' || form.type === 'contract') && (
              <>
                <label style={{ ...cu.label, marginTop: 12 }}>Assign to employee (optional)</label>
                <input
                  type="email" style={s.loginInput} placeholder="employee@company.com — leave blank for a general template/reference copy"
                  value={form.recipientEmail} onChange={e => update('recipientEmail', e.target.value)} disabled={saving}
                />
                <p style={{ fontSize: 11.5, color: '#9AAAB8', margin: '6px 0 0' }}>
                  Personal documents like a job appointment letter or employment contract. Once issued,
                  this shows up in that employee's Worker Workspace with a PDF download.
                </p>
              </>
            )}

            {relevantTemplates.length > 0 && (
              <>
                <label style={{ ...cu.label, marginTop: 12 }}>Start from template (optional)</label>
                <select style={cu.select} value={templateId} onChange={e => applyTemplate(e.target.value)} disabled={saving}>
                  <option value="">— Blank —</option>
                  {relevantTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </>
            )}

            <label style={{ ...cu.label, marginTop: 12 }}>Title</label>
            <input style={s.loginInput} value={form.title} onChange={e => update('title', e.target.value)} disabled={saving} />

            <label style={{ ...cu.label, marginTop: 12 }}>Category</label>
            <input style={s.loginInput} placeholder="e.g. Internal Policy, Client Contract" value={form.category} onChange={e => update('category', e.target.value)} disabled={saving} />

            <label style={{ ...cu.label, marginTop: 12 }}>Content</label>
            <textarea
              style={{ ...s.loginInput, minHeight: 220, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
              value={form.content} onChange={e => update('content', e.target.value)} disabled={saving}
            />

            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, marginTop: 18 }} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? '💾 Save New Version' : '➕ Create Document'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Version History Modal ──────────────────────────────────────────────────
const VersionHistoryModal = ({ docItem, onClose }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'documents', docItem.id, 'versions'), orderBy('version', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setVersions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [docItem.id]);

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #2E6DA4' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Version History</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{docItem.title}</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          {loading ? (
            <p style={gd.cardSub}>Loading versions…</p>
          ) : viewing ? (
            <>
              <button style={rm.miniBtn} onClick={() => setViewing(null)}>← Back to list</button>
              <p style={{ fontSize: 12, color: '#7A8A9A', margin: '12px 0 4px' }}>
                Version {viewing.version} · {fmtDate(viewing.updatedAt)} · {viewing.updatedBy}
              </p>
              <pre style={dm.contentBox}>{viewing.content}</pre>
            </>
          ) : versions.length === 0 ? (
            <p style={gd.cardSub}>No version history yet.</p>
          ) : (
            versions.map(v => (
              <div key={v.id} style={dm.versionRow}>
                <div>
                  <span style={{ fontWeight: 700, color: '#1A3C5E' }}>Version {v.version}</span>
                  <div style={{ fontSize: 12, color: '#7A8A9A' }}>{fmtDate(v.updatedAt)} · {v.updatedBy}</div>
                </div>
                <button style={rm.miniBtn} onClick={() => setViewing(v)}>View</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Read Receipts Modal ────────────────────────────────────────────────────
const ReceiptsModal = ({ docItem, audienceCount, onClose, onMarkReadForMe, canMarkRead }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'documents', docItem.id, 'receipts'), (snap) => {
      setReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.readAt?.seconds || 0) - (a.readAt?.seconds || 0)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [docItem.id]);

  const pct = audienceCount > 0 ? Math.min(100, Math.round((receipts.length / audienceCount) * 100)) : 0;

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #10B981' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Read Receipts</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{docItem.title} · {docItem.department}</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#5A7A9A', marginBottom: 4 }}>
              <span>{receipts.length} of {audienceCount || '—'} read</span>
              <span style={{ fontWeight: 700, color: '#10B981' }}>{pct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: '#EEF2F7', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#10B981', borderRadius: 4, transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {canMarkRead && (
            <button style={{ ...rm.miniBtn, marginBottom: 14 }} onClick={onMarkReadForMe}>✓ Mark as read (my account)</button>
          )}

          {loading ? (
            <p style={gd.cardSub}>Loading receipts…</p>
          ) : receipts.length === 0 ? (
            <p style={gd.cardSub}>No one has opened this document yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr><th style={rm.th}>Name</th><th style={rm.th}>Department</th><th style={rm.th}>Read at</th></tr>
              </thead>
              <tbody>
                {receipts.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
                    <td style={{ padding: '9px 12px' }}>{r.name}</td>
                    <td style={{ padding: '9px 12px' }}>{r.department || '—'}</td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#7A8A9A' }}>{fmtDate(r.readAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Broadcast Modal ─────────────────────────────────────────────────────────
const BroadcastModal = ({ docItem, onClose, onBroadcast }) => {
  const [scope, setScope] = useState(docItem.department || 'Company-Wide');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await onBroadcast(docItem, scope);
      onClose();
    } catch (err) {
      alert('Broadcast failed: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Broadcast {DOC_TYPE_MAP[docItem.type]?.label}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{docItem.title}</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <label style={cu.label}>Send to</label>
          <select style={cu.select} value={scope} onChange={e => setScope(e.target.value)} disabled={sending}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d === 'Company-Wide' ? 'Company-Wide (everyone)' : d}</option>)}
          </select>
          <p style={{ fontSize: 12, color: '#7A8A9A', marginTop: 12, lineHeight: 1.6 }}>
            Publishing makes this document visible in recipients' inboxes and starts read-receipt
            tracking. This action is logged to the audit trail.
          </p>
          <button style={{ ...s.loginBtn, marginTop: 6 }} onClick={handleSend} disabled={sending}>
            {sending ? 'Sending…' : '📢 Broadcast Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Template Modal (create / edit) ─────────────────────────────────────────
const TemplateModal = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState(() => ({
    type: initial?.type || 'letter',
    name: initial?.name || '',
    content: initial?.content || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) { setError('Name and content are required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave(form, initial);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save the template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #7C3AED' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{initial ? 'Edit Template' : 'New Template'}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Use <code>{'{{placeholders}}'}</code> for fields filled in per document.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Applies to</label>
                <select style={cu.select} value={form.type} onChange={e => update('type', e.target.value)} disabled={saving}>
                  {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <label style={cu.label}>Template name</label>
                <input style={s.loginInput} value={form.name} onChange={e => update('name', e.target.value)} disabled={saving} />
              </div>
            </div>
            <label style={{ ...cu.label, marginTop: 12 }}>Content</label>
            <textarea
              style={{ ...s.loginInput, minHeight: 220, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }}
              value={form.content} onChange={e => update('content', e.target.value)} disabled={saving}
            />
            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, marginTop: 18 }} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Template'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const SecretaryManager = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('documents'); // documents | hub | templates

  // Documents (EDMS)
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docsError, setDocsError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [docSearch, setDocSearch] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [broadcastTarget, setBroadcastTarget] = useState(null);
  const [receiptsTarget, setReceiptsTarget] = useState(null);
  const [busyDocId, setBusyDocId] = useState(null);

  // Receipts (all, for hub read% + audience) and team roster (audience size)
  const [allReceipts, setAllReceipts] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Idle session
  const [idleWarning, setIdleWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());

  const isCeo = !!user && user.email?.toLowerCase() === CEO_EMAIL;
  const isSecretary = !!profile && (
    (profile.role || '').toLowerCase() === 'secretary' ||
    (profile.department || '').toLowerCase() === 'administration'
  );
  const docPerms = profile?.permissions?.documents || {};
  const hasAccess = isCeo || isSecretary;
  const can = {
    write: isCeo || isSecretary || !!docPerms.write,
    edit: isCeo || isSecretary || !!docPerms.edit,
    delete: isCeo || isSecretary || !!docPerms.delete,
    approve: isCeo || isSecretary || !!docPerms.approve, // approve = broadcast
  };

  // ── Auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // ── Own profile listener (role / department / permissions) ────────────
  useEffect(() => {
    if (!user) { setProfile(null); setProfileLoading(false); return; }
    setProfileLoading(true);
    const unsub = onSnapshot(
      doc(db, 'teamUsers', user.uid),
      (snap) => { setProfile(snap.exists() ? snap.data() : null); setProfileLoading(false); },
      () => setProfileLoading(false)
    );
    return unsub;
  }, [user]);

  // ── Documents listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) { setDocuments([]); return; }
    setLoadingDocs(true);
    const q = query(collection(db, 'documents'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setDocsError(null);
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingDocs(false);
    }, (err) => {
      setDocsError(err.code === 'permission-denied' ? 'Permission denied reading documents.' : err.message);
      setLoadingDocs(false);
    });
    return unsub;
  }, [hasAccess]);

  // ── Templates listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) { setTemplates([]); return; }
    setLoadingTemplates(true);
    const unsub = onSnapshot(collection(db, 'templates'), (snap) => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingTemplates(false);
    }, () => setLoadingTemplates(false));
    return unsub;
  }, [hasAccess]);

  // ── All receipts (collectionGroup) for hub read% + team roster for audience size ──
  useEffect(() => {
    if (!hasAccess) { setAllReceipts([]); setTeamUsers([]); return; }
    const unsubReceipts = onSnapshot(collectionGroup(db, 'receipts'), (snap) => {
      setAllReceipts(snap.docs.map(d => ({ id: d.id, docId: d.ref.parent.parent.id, ...d.data() })));
    }, () => {});
    const unsubUsers = onSnapshot(collection(db, 'teamUsers'), (snap) => {
      setTeamUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => { unsubReceipts(); unsubUsers(); };
  }, [hasAccess]);

  // ── Idle auto sign-out ─────────────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) return;
    const bump = () => { lastActivityRef.current = Date.now(); if (idleWarning) setIdleWarning(false); };
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => window.addEventListener(evt, bump));
    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_LIMIT_MS) signOut(auth).catch(() => {});
      else if (idleFor >= IDLE_WARN_MS) setIdleWarning(true);
    }, 30000);
    return () => {
      ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt => window.removeEventListener(evt, bump));
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess]);

  const handleLogout = useCallback(async () => {
    if (!window.confirm('Sign out of the Secretary Workspace?')) return;
    setLoggingOut(true);
    try {
      setDocuments([]); setTemplates([]);
      setShowDocModal(false); setShowTemplateModal(false);
      await signOut(auth);
    } catch (err) {
      alert('Sign out failed: ' + err.message);
    } finally {
      setLoggingOut(false);
    }
  }, []);

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

  // ── Document CRUD (EDMS with version control) ──────────────────────────
  const saveDocument = useCallback(async (form, existingDoc) => {
    if (existingDoc) {
      const nextVersion = (existingDoc.version || 1) + 1;
      await updateDoc(doc(db, 'documents', existingDoc.id), {
        title: form.title, content: form.content, category: form.category,
        department: form.department, recipientEmail: form.recipientEmail || null, version: nextVersion,
        updatedAt: serverTimestamp(), updatedBy: auth.currentUser?.email,
      });
      await addDoc(collection(db, 'documents', existingDoc.id, 'versions'), {
        version: nextVersion, content: form.content, title: form.title,
        updatedBy: auth.currentUser?.email, updatedAt: serverTimestamp(),
      });
      await logAudit('Updated document', form.title, `Version ${nextVersion}`);
    } else {
      const ref = await addDoc(collection(db, 'documents'), {
        type: form.type, title: form.title, content: form.content,
        category: form.category || '', department: form.department || 'Company-Wide',
        recipientEmail: form.recipientEmail || null,
        status: 'draft', version: 1,
        createdBy: auth.currentUser?.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'documents', ref.id, 'versions'), {
        version: 1, content: form.content, title: form.title,
        updatedBy: auth.currentUser?.email, updatedAt: serverTimestamp(),
      });
      await logAudit('Created document', form.title, `Type: ${form.type}`);
    }
  }, [logAudit]);

  const archiveDocument = useCallback(async (docItem) => {
    if (!window.confirm(`Archive "${docItem.title}"?`)) return;
    setBusyDocId(docItem.id);
    try {
      await updateDoc(doc(db, 'documents', docItem.id), { status: 'archived', updatedAt: serverTimestamp() });
      await logAudit('Archived document', docItem.title);
    } catch (err) {
      alert('Could not archive: ' + err.message);
    } finally {
      setBusyDocId(null);
    }
  }, [logAudit]);

  const deleteDocument = useCallback(async (docItem) => {
    if (!window.confirm(`Permanently delete "${docItem.title}"? This cannot be undone.`)) return;
    setBusyDocId(docItem.id);
    try {
      await deleteDoc(doc(db, 'documents', docItem.id));
      await logAudit('Deleted document', docItem.title);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setBusyDocId(null);
    }
  }, [logAudit]);

  const broadcastDocument = useCallback(async (docItem, scope) => {
    await updateDoc(doc(db, 'documents', docItem.id), {
      status: 'published', department: scope, publishedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await logAudit('Broadcast document', docItem.title, `Scope: ${scope}`);
  }, [logAudit]);

  const publishToEmployee = useCallback(async (docItem) => {
    if (!docItem.recipientEmail) { alert('Assign an employee email to this document first (Edit → Assign to employee).'); return; }
    if (!window.confirm(`Issue "${docItem.title}" to ${docItem.recipientEmail}? They'll be able to view and download it immediately.`)) return;
    await updateDoc(doc(db, 'documents', docItem.id), {
      status: 'published', publishedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await logAudit('Issued document to employee', docItem.title, docItem.recipientEmail);
  }, [logAudit]);

  const markReadForMe = useCallback(async (docItem) => {
    await setDoc(doc(db, 'documents', docItem.id, 'receipts', auth.currentUser.uid), {
      name: profile?.name || auth.currentUser.email,
      email: auth.currentUser.email,
      department: profile?.department || '—',
      readAt: serverTimestamp(),
    });
  }, [profile]);

  // ── Templates CRUD ──────────────────────────────────────────────────────
  const saveTemplate = useCallback(async (form, existing) => {
    if (existing) {
      await updateDoc(doc(db, 'templates', existing.id), { ...form, updatedAt: serverTimestamp() });
      await logAudit('Updated template', form.name);
    } else {
      await addDoc(collection(db, 'templates'), { ...form, createdAt: serverTimestamp() });
      await logAudit('Created template', form.name);
    }
  }, [logAudit]);

  const deleteTemplate = useCallback(async (tpl) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return;
    await deleteDoc(doc(db, 'templates', tpl.id));
    await logAudit('Deleted template', tpl.name);
  }, [logAudit]);

  const loadStandardTemplates = useCallback(async () => {
    for (const t of DEFAULT_TEMPLATES) {
      await addDoc(collection(db, 'templates'), { ...t, createdAt: serverTimestamp() });
    }
    await logAudit('Loaded standard template pack', 'Templates', `${DEFAULT_TEMPLATES.length} templates`);
  }, [logAudit]);

  // ── Derived data ────────────────────────────────────────────────────────
  const receiptCountByDoc = useMemo(() => {
    const map = {};
    allReceipts.forEach(r => { map[r.docId] = (map[r.docId] || 0) + 1; });
    return map;
  }, [allReceipts]);

  const audienceForScope = useCallback((scope) => {
    if (scope === 'Company-Wide') return teamUsers.length || 1;
    return teamUsers.filter(u => u.department === scope).length || 1;
  }, [teamUsers]);

  const filteredDocuments = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    return documents
      .filter(d => typeFilter === 'All' || d.type === typeFilter)
      .filter(d => statusFilter === 'All' || d.status === statusFilter)
      .filter(d => deptFilter === 'All' || d.department === deptFilter)
      .filter(d => !q || d.title?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q));
  }, [documents, typeFilter, statusFilter, deptFilter, docSearch]);

  const hubDocuments = useMemo(
    () => documents.filter(d => d.type === 'memo' || d.type === 'notice'),
    [documents]
  );

  const typeCounts = useMemo(() => {
    const counts = { All: documents.length };
    DOC_TYPES.forEach(t => { counts[t.key] = documents.filter(d => d.type === t.key).length; });
    return counts;
  }, [documents]);

  const exportDocsCSV = () => downloadCSV('slirus_documents.csv', toCSV(filteredDocuments, [
    { label: 'Title', get: d => d.title },
    { label: 'Type', get: d => DOC_TYPE_MAP[d.type]?.label || d.type },
    { label: 'Category', get: d => d.category },
    { label: 'Department', get: d => d.department },
    { label: 'Status', get: d => d.status },
    { label: 'Version', get: d => d.version },
    { label: 'Updated', get: d => fmtDate(d.updatedAt) },
  ]));

  // ── Render gates ────────────────────────────────────────────────────────
  if (authLoading || (user && profileLoading)) {
    return <div style={s.loginBg}><p style={{ color: '#5A7A9A' }}>Loading…</p></div>;
  }
  if (!user) return <LoginScreen />;
  if (!hasAccess) return <AccessDenied email={user.email} onLogout={() => signOut(auth)} />;

  return (
    <Layout>
      <div style={s.page}>
        {idleWarning && (
          <div style={s.errorBanner}>⏳ You've been idle a while — you'll be signed out automatically for security.</div>
        )}
        {docsError && activeTab === 'documents' && <div style={s.errorBanner}>⚠️ {docsError}</div>}

        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Secretary Workspace</h1>
            <p style={s.pageSub}>{documents.length} documents · {templates.length} templates · signed in as {user.email}</p>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Sign Out ⎋'}
          </button>
        </div>

        <div style={s.dashSwitcher}>
          <button style={{ ...s.dashTab, ...(activeTab === 'documents' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('documents')}>
            🗄️ EDMS <span style={s.tabCount}>{documents.length}</span>
          </button>
          <button style={{ ...s.dashTab, ...(activeTab === 'hub' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('hub')}>
            📢 Communication Hub <span style={s.tabCount}>{hubDocuments.length}</span>
          </button>
          <button style={{ ...s.dashTab, ...(activeTab === 'templates' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('templates')}>
            📐 Template Engine <span style={s.tabCount}>{templates.length}</span>
          </button>
        </div>

        {/* ── EDMS tab ── */}
        {activeTab === 'documents' && (
          <>
            <div style={{ ...s.trackGrid, marginBottom: 22 }}>
              <StatCard label="Total Documents" value={documents.length} accent="#1A3C5E" />
              <StatCard label="Drafts" value={documents.filter(d => d.status === 'draft').length} accent="#F59E0B" />
              <StatCard label="Published" value={documents.filter(d => d.status === 'published').length} accent="#10B981" />
              <StatCard label="Archived" value={documents.filter(d => d.status === 'archived').length} accent="#9AAAB8" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Document Repository</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportDocsCSV}>⬇ Export CSV</button>
                {can.write && (
                  <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => { setEditingDoc(null); setShowDocModal(true); }}>
                    ➕ New Document
                  </button>
                )}
              </div>
            </div>

            <div style={s.toolbar}>
              <div style={s.tabs}>
                {['All', ...DOC_TYPES.map(t => t.key)].map(k => (
                  <button key={k} style={{ ...s.tab, ...(typeFilter === k ? s.tabActive : {}) }} onClick={() => setTypeFilter(k)}>
                    {k === 'All' ? 'All' : DOC_TYPE_MAP[k].icon + ' ' + DOC_TYPE_MAP[k].label}
                    <span style={s.tabCount}>{typeCounts[k]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={s.toolbar}>
              <select style={{ ...cu.select, width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                {Object.keys(STATUS_CONFIG).map(st => <option key={st} value={st}>{STATUS_CONFIG[st].label}</option>)}
              </select>
              <select style={{ ...cu.select, width: 'auto' }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input style={s.searchInput} placeholder="Search title or category…" value={docSearch} onChange={e => setDocSearch(e.target.value)} />
            </div>

            <div style={s.tableWrap}>
              {loadingDocs ? (
                <div style={s.tableMsg}>Loading documents…</div>
              ) : filteredDocuments.length === 0 ? (
                <div style={s.tableMsg}>No documents match your filters.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Title</th>
                      <th style={s.th}>Type</th>
                      <th style={s.th}>Department</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Version</th>
                      <th style={s.th}>Updated</th>
                      <th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map(d => (
                      <tr key={d.id} style={s.tr}>
                        <td style={s.td}>
                          <span style={{ fontWeight: 700, color: '#1A3C5E' }}>{d.title}</span>
                          {d.category && <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{d.category}</div>}
                          {d.recipientEmail && <div style={{ fontSize: 11, color: '#7C3AED', marginTop: 2 }}>👤 {d.recipientEmail}</div>}
                        </td>
                        <td style={s.td}><TypeBadge type={d.type} /></td>
                        <td style={s.td}>{d.department}</td>
                        <td style={s.td}><StatusBadge status={d.status} /></td>
                        <td style={s.td}>v{d.version || 1}</td>
                        <td style={{ ...s.td, fontSize: 12, color: '#7A8A9A' }}>{fmtDate(d.updatedAt)}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {can.edit && <button style={s.btnView} onClick={() => { setEditingDoc(d); setShowDocModal(true); }}>Edit</button>}
                            <button style={s.btnView} onClick={() => setHistoryTarget(d)}>History</button>
                            {(d.type === 'memo' || d.type === 'notice') && can.approve && d.status !== 'published' && (
                              <button style={s.btnShortlist} onClick={() => setBroadcastTarget(d)}>Broadcast</button>
                            )}
                            {(d.type === 'letter' || d.type === 'contract') && d.recipientEmail && can.approve && d.status !== 'published' && (
                              <button style={s.btnShortlist} onClick={() => publishToEmployee(d)}>Issue to Employee</button>
                            )}
                            {((d.type === 'memo' || d.type === 'notice') || (d.recipientEmail && (d.type === 'letter' || d.type === 'contract'))) && d.status === 'published' && (
                              <button style={s.tab} onClick={() => setReceiptsTarget(d)}>Receipts ({receiptCountByDoc[d.id] || 0})</button>
                            )}
                            {can.edit && d.status !== 'archived' && (
                              <button style={s.tab} onClick={() => archiveDocument(d)} disabled={busyDocId === d.id}>Archive</button>
                            )}
                            {can.delete && <button style={s.btnDelete} onClick={() => deleteDocument(d)} disabled={busyDocId === d.id}>Delete</button>}
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

        {/* ── Communication Hub tab ── */}
        {activeTab === 'hub' && (
          <>
            <h2 style={s.sectionHead}>Broadcast Memos & Notices</h2>
            <p style={{ ...s.pageSub, margin: '0 0 18px' }}>
              Publish a Memo or Notice from the EDMS to send it company-wide or to a department, and
              track who has opened it in real time.
            </p>
            {hubDocuments.length === 0 ? (
              <div style={s.tableWrap}><div style={s.tableMsg}>No memos or notices yet. Create one from the EDMS tab.</div></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {hubDocuments.map(d => {
                  const audience = audienceForScope(d.department);
                  const read = receiptCountByDoc[d.id] || 0;
                  const pct = d.status === 'published' ? Math.min(100, Math.round((read / audience) * 100)) : 0;
                  return (
                    <div key={d.id} style={{ ...gd.card, textAlign: 'left', borderTop: `3px solid ${d.status === 'published' ? '#10B981' : '#F59E0B'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <TypeBadge type={d.type} />
                        <StatusBadge status={d.status} />
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: 15, color: '#1A3C5E' }}>{d.title}</h4>
                      <p style={{ fontSize: 12, color: '#7A8A9A', margin: '0 0 12px' }}>{d.department} · v{d.version || 1}</p>

                      {d.status === 'published' ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#5A7A9A', marginBottom: 4 }}>
                            <span>{read} of {audience} read</span><span style={{ fontWeight: 700, color: '#10B981' }}>{pct}%</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 4, background: '#EEF2F7', overflow: 'hidden', marginBottom: 12 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: '#10B981', borderRadius: 4 }} />
                          </div>
                          <button style={{ ...s.tab, width: '100%' }} onClick={() => setReceiptsTarget(d)}>View Receipts</button>
                        </>
                      ) : (
                        can.approve && (
                          <button style={{ ...s.loginBtn, marginTop: 0 }} onClick={() => setBroadcastTarget(d)}>📢 Broadcast</button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Template Engine tab ── */}
        {activeTab === 'templates' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>Standard Corporate Formats</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>Pre-built formats used when drafting new documents.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {templates.length === 0 && (
                  <button style={s.tab} onClick={loadStandardTemplates}>📥 Load Standard Pack</button>
                )}
                {can.write && (
                  <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => { setEditingTemplate(null); setShowTemplateModal(true); }}>
                    ➕ New Template
                  </button>
                )}
              </div>
            </div>

            {loadingTemplates ? (
              <div style={s.tableWrap}><div style={s.tableMsg}>Loading templates…</div></div>
            ) : templates.length === 0 ? (
              <div style={s.tableWrap}><div style={s.tableMsg}>No templates yet. Load the standard pack or create your own.</div></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {templates.map(t => (
                  <div key={t.id} style={{ ...gd.card, textAlign: 'left' }}>
                    <TypeBadge type={t.type} />
                    <h4 style={{ margin: '8px 0 8px', fontSize: 15, color: '#1A3C5E' }}>{t.name}</h4>
                    <pre style={dm.previewBox}>{t.content}</pre>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      {can.edit && <button style={s.btnView} onClick={() => { setEditingTemplate(t); setShowTemplateModal(true); }}>Edit</button>}
                      {can.write && (
                        <button style={s.btnShortlist} onClick={() => { setEditingDoc(null); setShowDocModal(true); setActiveTab('documents'); }}>
                          Use in New Doc
                        </button>
                      )}
                      {can.delete && <button style={s.btnDelete} onClick={() => deleteTemplate(t)}>Delete</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showDocModal && (
        <DocumentModal
          initial={editingDoc}
          templates={templates}
          onClose={() => setShowDocModal(false)}
          onSave={saveDocument}
        />
      )}
      {historyTarget && <VersionHistoryModal docItem={historyTarget} onClose={() => setHistoryTarget(null)} />}
      {broadcastTarget && (
        <BroadcastModal docItem={broadcastTarget} onClose={() => setBroadcastTarget(null)} onBroadcast={broadcastDocument} />
      )}
      {receiptsTarget && (
        <ReceiptsModal
          docItem={receiptsTarget}
          audienceCount={receiptsTarget.recipientEmail ? 1 : audienceForScope(receiptsTarget.department)}
          onClose={() => setReceiptsTarget(null)}
          onMarkReadForMe={() => markReadForMe(receiptsTarget)}
          canMarkRead={true}
        />
      )}
      {showTemplateModal && (
        <TemplateModal
          initial={editingTemplate}
          onClose={() => setShowTemplateModal(false)}
          onSave={saveTemplate}
        />
      )}
    </Layout>
  );
};

// ─── Styles (mirrors CeoManager.jsx for visual consistency) ────────────────
const s = {
  errorBanner: { background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E', fontWeight: 600 },

  loginBg: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' },
  loginCard: { background: '#fff', borderRadius: 14, padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', textAlign: 'center', width: '100%', maxWidth: 380, border: '1px solid #E2E8F0', borderTop: '4px solid #1A3C5E' },
  loginTitle: { fontSize: 22, fontWeight: 700, color: '#1A3C5E', margin: '0 0 8px' },
  loginSub: { color: '#5A7A9A', fontSize: 14, margin: '0 0 28px' },
  loginInput: { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  loginErr: { color: '#EF4444', fontSize: 13, margin: '10px 0 0', textAlign: 'left' },
  loginBtn: { width: '100%', background: '#1A3C5E', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },

  page: { padding: '36px 5%', maxWidth: 1280, margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle: { fontSize: 26, fontWeight: 700, color: '#1A3C5E', margin: 0 },
  pageSub: { color: '#5A7A9A', margin: '4px 0 0', fontSize: 14 },
  logoutBtn: { padding: '8px 16px', background: '#fff', border: '1.5px solid #C5CDD6', color: '#4A6B8A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  dashSwitcher: { display: 'flex', gap: 8, marginBottom: 28, borderBottom: '2px solid #E2E8F0', paddingBottom: 0 },
  dashTab: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '10px 4px 12px', fontSize: 14, fontWeight: 700, color: '#7A8A9A', cursor: 'pointer', marginBottom: -2 },
  dashTabActive: { color: '#1A3C5E', borderBottomColor: '#1A3C5E' },

  sectionHead: { fontSize: 15, fontWeight: 700, color: '#1A3C5E', margin: '0 0 14px' },
  trackGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },

  toolbar: { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' },
  tabs: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  tab: { background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 7, padding: '7px 12px', fontSize: 13, color: '#5A7A9A', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 },
  tabActive: { background: '#1A3C5E', color: '#fff', borderColor: '#1A3C5E' },
  tabCount: { background: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: '1px 7px', fontSize: 11 },
  searchInput: { flex: 1, minWidth: 200, padding: '9px 14px', border: '1.5px solid #D0DCE8', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },

  tableWrap: { background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'auto' },
  tableMsg: { padding: 56, textAlign: 'center', color: '#5A7A9A', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#F7F9FC' },
  th: { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #F0F4F8' },
  td: { padding: '11px 14px', verticalAlign: 'middle', color: '#1A3C5E' },
  btnShortlist: { background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
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

const rm = {
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #E2E8F0' },
  miniBtn: { background: '#F0F4F8', border: '1px solid #E2E8F0', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#5A7A9A', cursor: 'pointer' },
};

const cu = {
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, textAlign: 'left' },
  select: { width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
};

// document-module-specific styles
const dm = {
  contentBox: { background: '#F7F9FC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 14, fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#1A3C5E', maxHeight: 360, overflow: 'auto' },
  previewBox: { background: '#F7F9FC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 10, fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: '#5A7A9A', maxHeight: 120, overflow: 'hidden', margin: 0 },
  versionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F0F4F8' },
};

export default SecretaryManager;