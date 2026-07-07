/**
 * SalesManager.jsx – Slirus Holdings Sales Officer Workspace
 *
 * CRM & Revenue Operations dashboard for Sales Officers. Sits alongside
 * CeoManager.jsx / Admin.jsx and reuses the same auth/session conventions.
 *
 * Diagram coverage: Marketing/Advertising, Targets, Proposals, Feedback.
 *
 * Features:
 *  - Firebase Auth login / logout (email + password). Access is further
 *    gated to accounts provisioned by the CEO: on sign-in the app looks up
 *    the user's profile in `teamUsers` (the same collection CeoManager.jsx
 *    writes to via its User Provisioning flow, keyed by Firebase Auth uid).
 *    No profile, or a profile marked "suspended", blocks entry — a
 *    self-signed-up or unrelated Firebase account cannot reach this module.
 *  - Pipeline & Target Tracker: Kanban board (New → Contacted → Proposal →
 *    Negotiation → Won/Lost) for leads, plus quota/target progress tracking
 *    against revenue targets set by management.
 *  - Campaign & Marketing Analytics: log marketing activities/ad spend and
 *    auto-calculate ROI per campaign.
 *  - Client Relationship Management (CRM): client directory, interaction
 *    log with follow-up scheduling, and a feedback/complaints archive.
 *  - Sales Proposal Generator: links to Secretary-module proposal templates
 *    (read-only reference collection) to issue binding proposals directly
 *    to prospects, with status tracking (draft → sent → accepted/rejected).
 *  - Extra professional tooling: overview dashboard, search/filter, CSV
 *    export, activity log, overdue follow-up alerts, bulk-safe
 *    confirmations.
 *
 * State lives at the top level and is passed down explicitly — no prop
 * drilling helpers, no context. All Firebase calls are try/catch with
 * user-facing error feedback.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, auth } from '../firebase/firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';

// ─── Config ─────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || '';
// NOTE: This is a UX gate only. The real authorization boundary must live in
// Firestore Security Rules (e.g. allow read/write only if a `teamUsers/{uid}`
// doc exists for request.auth.uid and its status == 'active') — never trust
// a client-side profile check alone.

const STAGES = [
  { key: 'new',         label: 'New Lead',      color: '#64748B' },
  { key: 'contacted',   label: 'Contacted',     color: '#2E6DA4' },
  { key: 'proposal',    label: 'Proposal Sent', color: '#7C3AED' },
  { key: 'negotiation', label: 'Negotiation',   color: '#F59E0B' },
  { key: 'won',         label: 'Won',           color: '#10B981' },
  { key: 'lost',        label: 'Lost',          color: '#EF4444' },
];
const STAGE_ORDER = STAGES.map(s => s.key);
const stageInfo = (key) => STAGES.find(s => s.key === key) || STAGES[0];

const CHANNELS = ['Social Media', 'Search / PPC', 'Email', 'Print', 'Referral', 'Events', 'Other'];

const CLIENT_STATUSES = ['Prospect', 'Active', 'Dormant'];
const CLIENT_SOURCES  = ['Campaign', 'Referral', 'Cold Outreach', 'Inbound', 'Event', 'Other'];

const INTERACTION_TYPES = [
  { key: 'call',    label: '📞 Call' },
  { key: 'email',   label: '✉️ Email' },
  { key: 'meeting', label: '🤝 Meeting' },
  { key: 'note',    label: '📝 Note' },
];

const FEEDBACK_TYPES = { feedback: { label: 'Feedback', bg: '#DBEAFE', color: '#1E40AF' }, complaint: { label: 'Complaint', bg: '#FEE2E2', color: '#991B1B' } };

const PROPOSAL_STATUS_CONFIG = {
  draft:     { bg: '#F1F5F9', color: '#475569', dot: '#94A3B8', label: 'Draft' },
  sent:      { bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6', label: 'Sent' },
  accepted:  { bg: '#D1FAE5', color: '#065F46', dot: '#10B981', label: 'Accepted' },
  rejected:  { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444', label: 'Rejected' },
};

const PERIOD_TYPES = ['monthly', 'quarterly'];

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-UG') : (ts ? new Date(ts).toLocaleDateString('en-UG') : '—'));
const fmtDateShort = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString('en-UG') : (ts ? new Date(ts).toLocaleDateString('en-UG') : '—'));
const fmtMoney = (n) => `UGX ${Number(n || 0).toLocaleString('en-UG')}`;

const currentPeriodLabel = (type = 'monthly') => {
  const d = new Date();
  if (type === 'quarterly') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const isOverdue = (followUpDate, done) => {
  if (!followUpDate || done) return false;
  const d = followUpDate?.toDate ? followUpDate.toDate() : new Date(followUpDate);
  return d.getTime() < Date.now();
};

const roi = (revenue, spend) => (spend > 0 ? ((Number(revenue || 0) - Number(spend || 0)) / Number(spend)) * 100 : 0);

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
const Dot = ({ color }) => <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />;

const StageBadge = ({ stageKey }) => {
  const info = stageInfo(stageKey);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${info.color}20`, color: info.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      <Dot color={info.color} />{info.label}
    </span>
  );
};

const ProposalStatusBadge = ({ status }) => {
  const cfg = PROPOSAL_STATUS_CONFIG[status] || PROPOSAL_STATUS_CONFIG.draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      <Dot color={cfg.dot} />{cfg.label}
    </span>
  );
};

const ClientStatusBadge = ({ status }) => {
  const map = { Active: '#10B981', Prospect: '#F59E0B', Dormant: '#94A3B8' };
  const color = map[status] || '#94A3B8';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${color}20`, color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      <Dot color={color} />{status || 'Prospect'}
    </span>
  );
};

// ─── Login Screen ───────────────────────────────────────────────────────────
const LoginScreen = () => {
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
        <div style={{ fontSize: 40, marginBottom: 14 }}>📈</div>
        <h2 style={s.loginTitle}>Sales Officer Workspace</h2>
        <p style={s.loginSub}>Sign in with your Slirus credentials.</p>
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
const AccessDenied = ({ email, reason, onLogout }) => (
  <div style={s.loginBg}>
    <div style={s.loginCard}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
      <h2 style={s.loginTitle}>Access Restricted</h2>
      <p style={s.loginSub}>
        {reason === 'suspended'
          ? `${email} is signed in, but this account has been suspended by the CEO. Contact your administrator to restore access.`
          : `${email} is signed in, but no Sales Officer account was provisioned for it. Accounts for this workspace are created by the CEO through User Provisioning — ask your CEO to create your account first.`}
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

const MetricBar = ({ label, value, max, accent }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#5A7A9A', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: '#1A3C5E' }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#EEF2F7', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: accent, borderRadius: 4, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
};

// ─── Lead Modal (create / edit) ─────────────────────────────────────────────
const LeadModal = ({ lead, userEmail, onClose, onSave, onDelete }) => {
  const isEdit = !!lead;
  const [form, setForm] = useState(() => lead ? { ...lead } : {
    name: '', company: '', contactEmail: '', contactPhone: '',
    value: '', stage: 'new', expectedCloseDate: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.company.trim()) { setError('Lead name and company are required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ ...form, value: Number(form.value) || 0, assignedTo: form.assignedTo || userEmail });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{isEdit ? 'Edit Lead' : 'New Lead'}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Track this opportunity through the pipeline.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Contact name</label>
                <input style={s.loginInput} value={form.name} onChange={e => update('name', e.target.value)} disabled={saving} autoFocus />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Company</label>
                <input style={s.loginInput} value={form.company} onChange={e => update('company', e.target.value)} disabled={saving} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Contact email</label>
                <input type="email" style={s.loginInput} value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Contact phone</label>
                <input style={s.loginInput} value={form.contactPhone} onChange={e => update('contactPhone', e.target.value)} disabled={saving} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Deal value (UGX)</label>
                <input type="number" min="0" style={s.loginInput} value={form.value} onChange={e => update('value', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Expected close date</label>
                <input type="date" style={s.loginInput} value={form.expectedCloseDate || ''} onChange={e => update('expectedCloseDate', e.target.value)} disabled={saving} />
              </div>
            </div>
            <label style={{ ...cu.label, marginTop: 12 }}>Stage</label>
            <select style={cu.select} value={form.stage} onChange={e => update('stage', e.target.value)} disabled={saving}>
              {STAGES.map(st => <option key={st.key} value={st.key}>{st.label}</option>)}
            </select>
            <label style={{ ...cu.label, marginTop: 12 }}>Notes</label>
            <textarea style={{ ...s.loginInput, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />

            {error && <p style={s.loginErr}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              {isEdit && (
                <button type="button" style={{ ...ms.actionBtn, background: '#FEE2E2', color: '#991B1B' }} onClick={() => onDelete(lead)} disabled={saving}>
                  🗑 Delete
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose} disabled={saving}>Cancel</button>
              <button type="submit" style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff' }} disabled={saving}>
                {saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Kanban ─────────────────────────────────────────────────────────────────
const LeadCard = ({ lead, onOpen, onMove }) => {
  const idx = STAGE_ORDER.indexOf(lead.stage);
  const canBack = idx > 0 && idx < 4; // don't shuffle out of won/lost via arrows
  const canFwd = idx >= 0 && idx < 3;
  return (
    <div style={kb.card} onClick={() => onOpen(lead)}>
      <div style={{ fontWeight: 700, color: '#1A3C5E', fontSize: 13.5 }}>{lead.name}</div>
      <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{lead.company}</div>
      <div style={{ fontWeight: 700, color: '#2E6DA4', fontSize: 13, marginTop: 8 }}>{fmtMoney(lead.value)}</div>
      {lead.expectedCloseDate && (
        <div style={{ fontSize: 11, color: '#9AAAB8', marginTop: 4 }}>Close: {lead.expectedCloseDate}</div>
      )}
      {(canBack || canFwd) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }} onClick={e => e.stopPropagation()}>
          <button style={kb.moveBtn} disabled={!canBack} onClick={() => onMove(lead, STAGE_ORDER[idx - 1])}>◀ Back</button>
          <button style={kb.moveBtn} disabled={!canFwd} onClick={() => onMove(lead, STAGE_ORDER[idx + 1])}>Next ▶</button>
        </div>
      )}
    </div>
  );
};

const KanbanBoard = ({ leads, onOpen, onMove }) => (
  <div style={kb.board}>
    {STAGES.map(stage => {
      const stageLeads = leads.filter(l => l.stage === stage.key);
      const stageTotal = stageLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
      return (
        <div key={stage.key} style={kb.column}>
          <div style={{ ...kb.columnHead, borderTop: `3px solid ${stage.color}` }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: stage.color }}>{stage.label}</span>
            <span style={kb.columnCount}>{stageLeads.length}</span>
          </div>
          <div style={{ fontSize: 11, color: '#9AAAB8', padding: '0 10px 8px' }}>{fmtMoney(stageTotal)}</div>
          <div style={kb.columnBody}>
            {stageLeads.length === 0 ? (
              <div style={kb.emptyCol}>No leads</div>
            ) : (
              stageLeads.map(l => <LeadCard key={l.id} lead={l} onOpen={onOpen} onMove={onMove} />)
            )}
          </div>
        </div>
      );
    })}
  </div>
);

// ─── Target Card ────────────────────────────────────────────────────────────
const TargetCard = ({ target, achieved }) => {
  const pct = target.targetAmount > 0 ? Math.min(100, Math.round((achieved / target.targetAmount) * 100)) : 0;
  const accent = pct >= 100 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ ...gd.card, textAlign: 'left', borderTop: `3px solid ${accent}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1A3C5E' }}>{target.period}</h4>
        <span style={{ fontSize: 11, color: '#9AAAB8', textTransform: 'capitalize' }}>{target.periodType}</span>
      </div>
      <p style={{ fontSize: 12, color: '#7A8A9A', margin: '4px 0 10px' }}>
        Target set by {target.setBy || 'management'} · {fmtMoney(target.targetAmount)}
      </p>
      <MetricBar label={`${fmtMoney(achieved)} achieved`} value={pct} max={100} accent={accent} />
      <p style={{ fontSize: 12, fontWeight: 700, color: accent, margin: 0 }}>{pct}% of quota</p>
    </div>
  );
};

// ─── New Target request note (officers view targets set by management) ─────
const TargetRequestModal = ({ onClose, onSubmit, userEmail }) => {
  const [form, setForm] = useState({ periodType: 'monthly', period: currentPeriodLabel('monthly'), targetAmount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val, ...(field === 'periodType' ? { period: currentPeriodLabel(val) } : {}) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.targetAmount || Number(form.targetAmount) <= 0) { setError('Enter a proposed target amount.'); return; }
    setSaving(true); setError('');
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not submit request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Propose a Target</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Submitted for management review and approval.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <label style={cu.label}>Period type</label>
            <select style={cu.select} value={form.periodType} onChange={e => update('periodType', e.target.value)} disabled={saving}>
              {PERIOD_TYPES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
            <label style={{ ...cu.label, marginTop: 12 }}>Period</label>
            <input style={s.loginInput} value={form.period} onChange={e => update('period', e.target.value)} disabled={saving} />
            <label style={{ ...cu.label, marginTop: 12 }}>Proposed target (UGX)</label>
            <input type="number" min="0" style={s.loginInput} value={form.targetAmount} onChange={e => update('targetAmount', e.target.value)} disabled={saving} />
            <label style={{ ...cu.label, marginTop: 12 }}>Notes for management</label>
            <textarea style={{ ...s.loginInput, minHeight: 60, fontFamily: 'inherit' }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />
            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, marginTop: 16 }} disabled={saving}>{saving ? 'Submitting…' : '📤 Submit Proposal'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Campaign Modal ─────────────────────────────────────────────────────────
const CampaignModal = ({ onClose, onSave, userEmail }) => {
  const [form, setForm] = useState({ name: '', channel: CHANNELS[0], spend: '', leadsGenerated: '', revenue: '', startDate: '', endDate: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Campaign name is required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({
        ...form,
        spend: Number(form.spend) || 0,
        leadsGenerated: Number(form.leadsGenerated) || 0,
        revenue: Number(form.revenue) || 0,
        createdBy: userEmail,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save campaign.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Log Marketing Campaign</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Track spend and results to calculate ROI.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <label style={cu.label}>Campaign name</label>
            <input style={s.loginInput} value={form.name} onChange={e => update('name', e.target.value)} disabled={saving} autoFocus />
            <label style={{ ...cu.label, marginTop: 12 }}>Channel</label>
            <select style={cu.select} value={form.channel} onChange={e => update('channel', e.target.value)} disabled={saving}>
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Start date</label>
                <input type="date" style={s.loginInput} value={form.startDate} onChange={e => update('startDate', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>End date</label>
                <input type="date" style={s.loginInput} value={form.endDate} onChange={e => update('endDate', e.target.value)} disabled={saving} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Ad spend (UGX)</label>
                <input type="number" min="0" style={s.loginInput} value={form.spend} onChange={e => update('spend', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Leads generated</label>
                <input type="number" min="0" style={s.loginInput} value={form.leadsGenerated} onChange={e => update('leadsGenerated', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Revenue attributed (UGX)</label>
                <input type="number" min="0" style={s.loginInput} value={form.revenue} onChange={e => update('revenue', e.target.value)} disabled={saving} />
              </div>
            </div>
            <label style={{ ...cu.label, marginTop: 12 }}>Notes</label>
            <textarea style={{ ...s.loginInput, minHeight: 60, fontFamily: 'inherit' }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />
            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, marginTop: 16 }} disabled={saving}>{saving ? 'Saving…' : '📊 Log Campaign'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Add Client Modal ───────────────────────────────────────────────────────
const AddClientModal = ({ onClose, onSave, userEmail }) => {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', status: 'Prospect', source: CLIENT_SOURCES[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Client name is required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ ...form, createdBy: userEmail });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save client.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Client</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Add a contact to the CRM directory.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <label style={cu.label}>Name</label>
            <input style={s.loginInput} value={form.name} onChange={e => update('name', e.target.value)} disabled={saving} autoFocus />
            <label style={{ ...cu.label, marginTop: 12 }}>Company</label>
            <input style={s.loginInput} value={form.company} onChange={e => update('company', e.target.value)} disabled={saving} />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Email</label>
                <input type="email" style={s.loginInput} value={form.email} onChange={e => update('email', e.target.value)} disabled={saving} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Phone</label>
                <input style={s.loginInput} value={form.phone} onChange={e => update('phone', e.target.value)} disabled={saving} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Status</label>
                <select style={cu.select} value={form.status} onChange={e => update('status', e.target.value)} disabled={saving}>
                  {CLIENT_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Source</label>
                <select style={cu.select} value={form.source} onChange={e => update('source', e.target.value)} disabled={saving}>
                  {CLIENT_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                </select>
              </div>
            </div>
            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, marginTop: 16 }} disabled={saving}>{saving ? 'Saving…' : '➕ Add Client'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Client Detail Modal (interactions + feedback) ─────────────────────────
const ClientDetailModal = ({ client, interactions, feedbackItems, onClose, onLogInteraction, onToggleFollowUp, onLogFeedback, onToggleResolved }) => {
  const [tab, setTab] = useState('interactions'); // interactions | feedback
  const [intForm, setIntForm] = useState({ type: 'call', notes: '', followUpDate: '' });
  const [fbForm, setFbForm] = useState({ type: 'feedback', message: '' });
  const [busy, setBusy] = useState(false);

  const submitInteraction = async (e) => {
    e.preventDefault();
    if (!intForm.notes.trim()) return;
    setBusy(true);
    try {
      await onLogInteraction(client, intForm);
      setIntForm({ type: 'call', notes: '', followUpDate: '' });
    } finally { setBusy(false); }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!fbForm.message.trim()) return;
    setBusy(true);
    try {
      await onLogFeedback(client, fbForm);
      setFbForm({ type: 'feedback', message: '' });
    } finally { setBusy(false); }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{client.name}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{client.company} · {client.email || 'no email'} · {client.phone || 'no phone'}</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{ ...ms.actionBar, borderBottom: '1px solid #E2E8F0' }}>
          <button style={{ ...s.tab, ...(tab === 'interactions' ? s.tabActive : {}) }} onClick={() => setTab('interactions')}>🗓 Interactions <span style={s.tabCount}>{interactions.length}</span></button>
          <button style={{ ...s.tab, ...(tab === 'feedback' ? s.tabActive : {}) }} onClick={() => setTab('feedback')}>💬 Feedback <span style={s.tabCount}>{feedbackItems.length}</span></button>
        </div>
        <div style={ms.body}>
          {tab === 'interactions' ? (
            <>
              <form onSubmit={submitInteraction} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #F0F4F8' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select style={{ ...cu.select, width: 140 }} value={intForm.type} onChange={e => setIntForm(p => ({ ...p, type: e.target.value }))} disabled={busy}>
                    {INTERACTION_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <input style={{ ...s.loginInput, flex: 1 }} placeholder="What happened?" value={intForm.notes} onChange={e => setIntForm(p => ({ ...p, notes: e.target.value }))} disabled={busy} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 12, color: '#7A8A9A', fontWeight: 600 }}>Follow-up on:</label>
                  <input type="date" style={{ ...s.loginInput, width: 170 }} value={intForm.followUpDate} onChange={e => setIntForm(p => ({ ...p, followUpDate: e.target.value }))} disabled={busy} />
                  <button type="submit" style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff', marginLeft: 'auto' }} disabled={busy}>Log</button>
                </div>
              </form>
              {interactions.length === 0 ? (
                <p style={{ color: '#9AAAB8', fontSize: 13 }}>No interactions logged yet.</p>
              ) : (
                interactions.map(i => (
                  <div key={i.id} style={{ padding: '10px 0', borderBottom: '1px solid #F0F4F8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1A3C5E' }}>{INTERACTION_TYPES.find(t => t.key === i.type)?.label || i.type}</span>
                      <span style={{ fontSize: 11, color: '#9AAAB8' }}>{fmtDate(i.createdAt)}</span>
                    </div>
                    <p style={{ margin: '4px 0', fontSize: 13, color: '#4A6B8A' }}>{i.notes}</p>
                    {i.followUpDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isOverdue(i.followUpDate, i.followUpDone) ? '#EF4444' : '#9AAAB8' }}>
                          {isOverdue(i.followUpDate, i.followUpDone) ? '⚠ Overdue follow-up: ' : 'Follow-up: '}{i.followUpDate}
                        </span>
                        {!i.followUpDone && (
                          <button style={rm.miniBtn} onClick={() => onToggleFollowUp(i)}>Mark done</button>
                        )}
                        {i.followUpDone && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>✓ Done</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <form onSubmit={submitFeedback} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #F0F4F8' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <select style={{ ...cu.select, width: 140 }} value={fbForm.type} onChange={e => setFbForm(p => ({ ...p, type: e.target.value }))} disabled={busy}>
                    <option value="feedback">Feedback</option>
                    <option value="complaint">Complaint</option>
                  </select>
                  <input style={{ ...s.loginInput, flex: 1 }} placeholder="What did the client say?" value={fbForm.message} onChange={e => setFbForm(p => ({ ...p, message: e.target.value }))} disabled={busy} />
                  <button type="submit" style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff' }} disabled={busy}>Log</button>
                </div>
              </form>
              {feedbackItems.length === 0 ? (
                <p style={{ color: '#9AAAB8', fontSize: 13 }}>No feedback or complaints on file.</p>
              ) : (
                feedbackItems.map(f => {
                  const cfg = FEEDBACK_TYPES[f.type] || FEEDBACK_TYPES.feedback;
                  return (
                    <div key={f.id} style={{ padding: '10px 0', borderBottom: '1px solid #F0F4F8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
                        <span style={{ fontSize: 11, color: '#9AAAB8' }}>{fmtDate(f.createdAt)}</span>
                      </div>
                      <p style={{ margin: '4px 0', fontSize: 13, color: '#4A6B8A' }}>{f.message}</p>
                      {f.type === 'complaint' && (
                        f.resolved
                          ? <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>✓ Resolved</span>
                          : <button style={rm.miniBtn} onClick={() => onToggleResolved(f)}>Mark resolved</button>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── New Proposal Modal ─────────────────────────────────────────────────────
const NewProposalModal = ({ clients, templates, onClose, onSave, userEmail }) => {
  const [form, setForm] = useState({ clientId: '', templateId: '', amount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const client = clients.find(c => c.id === form.clientId);
    if (!client) { setError('Select a client for this proposal.'); return; }
    setSaving(true); setError('');
    try {
      const template = templates.find(t => t.id === form.templateId);
      await onSave({
        clientId: client.id, clientName: client.name, clientEmail: client.email || '',
        templateId: template?.id || '', templateName: template?.name || 'Custom',
        amount: Number(form.amount) || 0, notes: form.notes, createdBy: userEmail,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not create proposal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Sales Proposal</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Pulls binding templates from the Secretary module.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={ms.body}>
          <form onSubmit={handleSubmit}>
            <label style={cu.label}>Client / prospect</label>
            <select style={cu.select} value={form.clientId} onChange={e => update('clientId', e.target.value)} disabled={saving} autoFocus>
              <option value="">Select a client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
            </select>

            <label style={{ ...cu.label, marginTop: 12 }}>Proposal template</label>
            <select style={cu.select} value={form.templateId} onChange={e => update('templateId', e.target.value)} disabled={saving}>
              <option value="">Custom (no template)</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {templates.length === 0 && (
              <p style={{ fontSize: 11.5, color: '#9AAAB8', marginTop: 4 }}>No templates published by the Secretary module yet — proceeding will create a custom proposal.</p>
            )}

            <label style={{ ...cu.label, marginTop: 12 }}>Proposed amount (UGX)</label>
            <input type="number" min="0" style={s.loginInput} value={form.amount} onChange={e => update('amount', e.target.value)} disabled={saving} />

            <label style={{ ...cu.label, marginTop: 12 }}>Notes</label>
            <textarea style={{ ...s.loginInput, minHeight: 60, fontFamily: 'inherit' }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />

            {error && <p style={s.loginErr}>{error}</p>}
            <button type="submit" style={{ ...s.loginBtn, marginTop: 16 }} disabled={saving}>{saving ? 'Creating…' : '📄 Create Draft Proposal'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const SalesManager = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | pipeline | targets | campaigns | crm | proposals

  // CEO-provisioned profile gate
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Pipeline
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState(null);
  const [pipelineScope, setPipelineScope] = useState('mine'); // mine | all
  const [editingLead, setEditingLead] = useState(null);
  const [showNewLead, setShowNewLead] = useState(false);

  // Targets
  const [targets, setTargets] = useState([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [targetsError, setTargetsError] = useState(null);
  const [showTargetRequest, setShowTargetRequest] = useState(false);

  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignsError, setCampaignsError] = useState(null);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState('');

  // CRM
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [clientsError, setClientsError] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientStatusFilter, setClientStatusFilter] = useState('All');
  const [showNewClient, setShowNewClient] = useState(false);
  const [detailClient, setDetailClient] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [feedbackItems, setFeedbackItems] = useState([]);

  // Proposals
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [proposalsError, setProposalsError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [showNewProposal, setShowNewProposal] = useState(false);
  const [busyProposalId, setBusyProposalId] = useState(null);

  const userEmail = user?.email || '';
  const isProvisioned = !!profile && profile.status !== 'suspended';

  // ── Auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // ── CEO-provisioned profile listener ───────────────────────────────────
  // Only accounts the CEO created via User Provisioning (CeoManager.jsx)
  // have a doc here, keyed by Firebase Auth uid. No doc = no access.
  useEffect(() => {
    if (!user) { setProfile(null); setProfileLoading(false); return; }
    setProfileLoading(true);
    const unsub = onSnapshot(
      doc(db, 'teamUsers', user.uid),
      (snap) => { setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null); setProfileLoading(false); },
      (err) => { console.error('teamUsers profile listen error:', err); setProfile(null); setProfileLoading(false); }
    );
    return unsub;
  }, [user]);

  // ── Leads listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !isProvisioned) { setLeads([]); return; }
    setLoadingLeads(true);
    const unsub = onSnapshot(
      collection(db, 'leads'),
      (snap) => { setLeadsError(null); setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingLeads(false); },
      (err) => { setLeadsError(err.code === 'permission-denied' ? 'Permission denied reading the pipeline.' : 'Could not load leads: ' + err.message); setLoadingLeads(false); }
    );
    return unsub;
  }, [user, isProvisioned]);

  // ── Targets listener (own targets, set by management) ─────────────────
  useEffect(() => {
    if (!user || !isProvisioned) { setTargets([]); return; }
    setLoadingTargets(true);
    const q = query(collection(db, 'targets'), where('officerEmail', '==', userEmail), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => { setTargetsError(null); setTargets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingTargets(false); },
      (err) => { setTargetsError(err.code === 'permission-denied' ? 'Permission denied reading targets.' : 'Could not load targets: ' + err.message); setLoadingTargets(false); }
    );
    return unsub;
  }, [user, userEmail, isProvisioned]);

  // ── Campaigns listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !isProvisioned) { setCampaigns([]); return; }
    setLoadingCampaigns(true);
    const unsub = onSnapshot(
      collection(db, 'campaigns'),
      (snap) => { setCampaignsError(null); setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingCampaigns(false); },
      (err) => { setCampaignsError(err.code === 'permission-denied' ? 'Permission denied reading campaigns.' : 'Could not load campaigns: ' + err.message); setLoadingCampaigns(false); }
    );
    return unsub;
  }, [user, isProvisioned]);

  // ── Clients listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !isProvisioned) { setClients([]); return; }
    setLoadingClients(true);
    const unsub = onSnapshot(
      collection(db, 'clients'),
      (snap) => { setClientsError(null); setClients(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingClients(false); },
      (err) => { setClientsError(err.code === 'permission-denied' ? 'Permission denied reading clients.' : 'Could not load clients: ' + err.message); setLoadingClients(false); }
    );
    return unsub;
  }, [user, isProvisioned]);

  // ── Proposals + templates listeners ────────────────────────────────────
  useEffect(() => {
    if (!user || !isProvisioned) { setProposals([]); return; }
    setLoadingProposals(true);
    const unsub = onSnapshot(
      collection(db, 'proposals'),
      (snap) => { setProposalsError(null); setProposals(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingProposals(false); },
      (err) => { setProposalsError(err.code === 'permission-denied' ? 'Permission denied reading proposals.' : 'Could not load proposals: ' + err.message); setLoadingProposals(false); }
    );
    return unsub;
  }, [user, isProvisioned]);

  useEffect(() => {
    if (!user || !isProvisioned) { setTemplates([]); return; }
    // Read-only reference to templates published by the Secretary module.
    const unsub = onSnapshot(
      collection(db, 'proposalTemplates'),
      (snap) => setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setTemplates([])
    );
    return unsub;
  }, [user, isProvisioned]);

  // ── Client detail sub-listeners (interactions + feedback) ─────────────
  useEffect(() => {
    if (!detailClient) { setInteractions([]); setFeedbackItems([]); return; }
    const q1 = query(collection(db, 'interactions'), where('clientId', '==', detailClient.id), orderBy('createdAt', 'desc'));
    const unsub1 = onSnapshot(q1, (snap) => setInteractions(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setInteractions([]));
    const q2 = query(collection(db, 'clientFeedback'), where('clientId', '==', detailClient.id), orderBy('createdAt', 'desc'));
    const unsub2 = onSnapshot(q2, (snap) => setFeedbackItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => setFeedbackItems([]));
    return () => { unsub1(); unsub2(); };
  }, [detailClient]);

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    const confirmed = window.confirm('Sign out of the Sales Officer Workspace?');
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      setLeads([]); setTargets([]); setCampaigns([]); setClients([]); setProposals([]);
      setDetailClient(null); setEditingLead(null);
      await signOut(auth);
    } catch (err) {
      alert('Sign out failed: ' + err.message);
    } finally {
      setLoggingOut(false);
    }
  }, []);

  const logActivity = useCallback(async (action, target, details = '') => {
    try {
      await addDoc(collection(db, 'salesActivityLog'), {
        actorEmail: userEmail, action, target, details, timestamp: serverTimestamp(),
      });
    } catch (err) { console.error('Activity log write failed:', err); }
  }, [userEmail]);

  // ── Lead handlers ──────────────────────────────────────────────────────
  const saveLead = useCallback(async (form) => {
    if (form.id) {
      const { id, ...rest } = form;
      await updateDoc(doc(db, 'leads', id), { ...rest, updatedAt: serverTimestamp() });
      await logActivity('Updated lead', form.name, `Stage: ${stageInfo(form.stage).label}`);
    } else {
      await addDoc(collection(db, 'leads'), { ...form, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await logActivity('Created lead', form.name, form.company);
    }
  }, [logActivity]);

  const deleteLead = useCallback(async (lead) => {
    const confirmed = window.confirm(`Delete lead "${lead.name}" (${lead.company})? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'leads', lead.id));
      await logActivity('Deleted lead', lead.name);
      setEditingLead(null);
    } catch (err) { alert('Delete failed: ' + err.message); }
  }, [logActivity]);

  const moveLead = useCallback(async (lead, newStage) => {
    try {
      await updateDoc(doc(db, 'leads', lead.id), { stage: newStage, updatedAt: serverTimestamp() });
      await logActivity('Moved lead stage', lead.name, `${stageInfo(lead.stage).label} → ${stageInfo(newStage).label}`);
    } catch (err) { alert('Could not move lead: ' + err.message); }
  }, [logActivity]);

  // ── Target handlers ────────────────────────────────────────────────────
  const submitTargetRequest = useCallback(async (form) => {
    await addDoc(collection(db, 'targetRequests'), {
      ...form, targetAmount: Number(form.targetAmount) || 0,
      officerEmail: userEmail, status: 'pending', createdAt: serverTimestamp(),
    });
    await logActivity('Proposed target', form.period, fmtMoney(form.targetAmount));
  }, [userEmail, logActivity]);

  // ── Campaign handlers ──────────────────────────────────────────────────
  const saveCampaign = useCallback(async (form) => {
    await addDoc(collection(db, 'campaigns'), { ...form, createdAt: serverTimestamp() });
    await logActivity('Logged campaign', form.name, form.channel);
  }, [logActivity]);

  // ── Client handlers ────────────────────────────────────────────────────
  const saveClient = useCallback(async (form) => {
    await addDoc(collection(db, 'clients'), { ...form, createdAt: serverTimestamp() });
    await logActivity('Added client', form.name, form.company);
  }, [logActivity]);

  const logInteraction = useCallback(async (client, form) => {
    await addDoc(collection(db, 'interactions'), {
      ...form, clientId: client.id, followUpDone: false, createdBy: userEmail, createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'clients', client.id), { lastContactAt: serverTimestamp() });
    await logActivity('Logged interaction', client.name, form.type);
  }, [userEmail, logActivity]);

  const toggleFollowUp = useCallback(async (interaction) => {
    await updateDoc(doc(db, 'interactions', interaction.id), { followUpDone: true });
  }, []);

  const logFeedback = useCallback(async (client, form) => {
    await addDoc(collection(db, 'clientFeedback'), {
      ...form, clientId: client.id, resolved: false, createdBy: userEmail, createdAt: serverTimestamp(),
    });
    await logActivity(form.type === 'complaint' ? 'Logged complaint' : 'Logged feedback', client.name);
  }, [userEmail, logActivity]);

  const toggleResolved = useCallback(async (feedbackItem) => {
    await updateDoc(doc(db, 'clientFeedback', feedbackItem.id), { resolved: true });
  }, []);

  // ── Proposal handlers ──────────────────────────────────────────────────
  const createProposal = useCallback(async (form) => {
    await addDoc(collection(db, 'proposals'), { ...form, status: 'draft', createdAt: serverTimestamp() });
    await logActivity('Drafted proposal', form.clientName, form.templateName);
  }, [logActivity]);

  const issueProposal = useCallback(async (proposal) => {
    const confirmed = window.confirm(`Issue this proposal to ${proposal.clientName}? This sends a binding offer.`);
    if (!confirmed) return;
    setBusyProposalId(proposal.id);
    try {
      await updateDoc(doc(db, 'proposals', proposal.id), { status: 'sent', sentAt: serverTimestamp() });
      fetch(`${API_URL}/api/send-proposal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: proposal.id, clientEmail: proposal.clientEmail, clientName: proposal.clientName, amount: proposal.amount, sentBy: userEmail }),
      }).catch(err => console.warn('Proposal email dispatch failed (non-fatal):', err.message));
      await logActivity('Issued proposal', proposal.clientName, fmtMoney(proposal.amount));
    } catch (err) {
      alert('Could not issue proposal: ' + err.message);
    } finally {
      setBusyProposalId(null);
    }
  }, [userEmail, logActivity]);

  const setProposalStatus = useCallback(async (proposal, status) => {
    setBusyProposalId(proposal.id);
    try {
      await updateDoc(doc(db, 'proposals', proposal.id), { status });
      await logActivity(`Marked proposal ${status}`, proposal.clientName);
    } catch (err) { alert('Could not update proposal: ' + err.message); } finally { setBusyProposalId(null); }
  }, [logActivity]);

  // ── Derived data ────────────────────────────────────────────────────────
  const visibleLeads = useMemo(
    () => pipelineScope === 'mine' ? leads.filter(l => l.assignedTo === userEmail) : leads,
    [leads, pipelineScope, userEmail]
  );

  const myWonTotal = useMemo(
    () => leads.filter(l => l.assignedTo === userEmail && l.stage === 'won').reduce((sum, l) => sum + (Number(l.value) || 0), 0),
    [leads, userEmail]
  );

  const pipelineValue = useMemo(
    () => visibleLeads.filter(l => !['won', 'lost'].includes(l.stage)).reduce((sum, l) => sum + (Number(l.value) || 0), 0),
    [visibleLeads]
  );

  const filteredCampaigns = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter(c => c.name?.toLowerCase().includes(q) || c.channel?.toLowerCase().includes(q));
  }, [campaigns, campaignSearch]);

  const avgROI = useMemo(() => {
    if (campaigns.length === 0) return 0;
    const total = campaigns.reduce((sum, c) => sum + roi(c.revenue, c.spend), 0);
    return Math.round(total / campaigns.length);
  }, [campaigns]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return clients
      .filter(c => clientStatusFilter === 'All' || c.status === clientStatusFilter)
      .filter(c => !q || c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [clients, clientSearch, clientStatusFilter]);

  const clientCounts = useMemo(() => ({
    All: clients.length,
    Active: clients.filter(c => c.status === 'Active').length,
    Prospect: clients.filter(c => c.status === 'Prospect').length,
    Dormant: clients.filter(c => c.status === 'Dormant').length,
  }), [clients]);

  const draftProposalCount = useMemo(() => proposals.filter(p => p.status === 'draft').length, [proposals]);

  const exportLeadsCSV = () => downloadCSV('sales_pipeline.csv', toCSV(visibleLeads, [
    { label: 'Name', get: l => l.name }, { label: 'Company', get: l => l.company },
    { label: 'Stage', get: l => stageInfo(l.stage).label }, { label: 'Value', get: l => l.value },
    { label: 'Assigned To', get: l => l.assignedTo }, { label: 'Expected Close', get: l => l.expectedCloseDate },
  ]));

  const exportCampaignsCSV = () => downloadCSV('marketing_campaigns.csv', toCSV(filteredCampaigns, [
    { label: 'Name', get: c => c.name }, { label: 'Channel', get: c => c.channel },
    { label: 'Spend', get: c => c.spend }, { label: 'Leads Generated', get: c => c.leadsGenerated },
    { label: 'Revenue', get: c => c.revenue }, { label: 'ROI %', get: c => roi(c.revenue, c.spend).toFixed(1) },
  ]));

  const exportClientsCSV = () => downloadCSV('crm_clients.csv', toCSV(filteredClients, [
    { label: 'Name', get: c => c.name }, { label: 'Company', get: c => c.company },
    { label: 'Email', get: c => c.email }, { label: 'Status', get: c => c.status }, { label: 'Source', get: c => c.source },
  ]));

  // ── Render gates ────────────────────────────────────────────────────────
  if (authLoading || (user && profileLoading)) return <div style={s.loginBg}><p style={{ color: '#5A7A9A' }}>Loading…</p></div>;
  if (!user) return <LoginScreen />;
  if (!profile) return <AccessDenied email={user.email} reason="not-provisioned" onLogout={() => signOut(auth)} />;
  if (profile.status === 'suspended') return <AccessDenied email={user.email} reason="suspended" onLogout={() => signOut(auth)} />;

  return (
    <Layout>
      <div style={s.page}>
        {leadsError && activeTab === 'pipeline' && <div style={s.errorBanner}>⚠️ {leadsError}</div>}
        {targetsError && activeTab === 'targets' && <div style={s.errorBanner}>⚠️ {targetsError}</div>}
        {campaignsError && activeTab === 'campaigns' && <div style={s.errorBanner}>⚠️ {campaignsError}</div>}
        {clientsError && activeTab === 'crm' && <div style={s.errorBanner}>⚠️ {clientsError}</div>}
        {proposalsError && activeTab === 'proposals' && <div style={s.errorBanner}>⚠️ {proposalsError}</div>}

        {/* Top bar */}
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Sales Officer Workspace</h1>
            <p style={s.pageSub}>
              {profile.name || user.email} · {profile.department || 'Sales'}{profile.role ? ` · ${profile.role}` : ''} · {visibleLeads.length} leads in view · {fmtMoney(pipelineValue)} open pipeline
            </p>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Sign Out ⎋'}
          </button>
        </div>

        {/* Tab switcher */}
        <div style={s.dashSwitcher}>
          <button style={{ ...s.dashTab, ...(activeTab === 'dashboard' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('dashboard')}>📊 Overview</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'pipeline' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('pipeline')}>🧭 Pipeline <span style={s.tabCount}>{visibleLeads.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'targets' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('targets')}>🎯 Targets</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'campaigns' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('campaigns')}>📣 Campaigns <span style={s.tabCount}>{campaigns.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'crm' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('crm')}>🧑‍🤝‍🧑 CRM <span style={s.tabCount}>{clients.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'proposals' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('proposals')}>📄 Proposals <span style={s.tabCount}>{proposals.length}</span></button>
        </div>

        {/* ── Overview ── */}
        {activeTab === 'dashboard' && (
          <>
            <h2 style={s.sectionHead}>My Revenue Snapshot</h2>
            <div style={{ ...s.trackGrid, marginBottom: 28 }}>
              <StatCard label="Open Pipeline" value={fmtMoney(pipelineValue)} accent="#2E6DA4" sub={`${visibleLeads.filter(l => !['won','lost'].includes(l.stage)).length} active leads`} />
              <StatCard label="Won (all-time)" value={fmtMoney(myWonTotal)} accent="#10B981" sub="Closed-won deal value" />
              <StatCard label="Avg Campaign ROI" value={`${avgROI}%`} accent="#7C3AED" sub={`${campaigns.length} campaigns tracked`} />
              <StatCard label="Draft Proposals" value={draftProposalCount} accent="#F59E0B" sub="Awaiting issue" />
            </div>

            <h2 style={s.sectionHead}>Latest Target</h2>
            {loadingTargets ? (
              <p style={{ color: '#9AAAB8', fontSize: 13 }}>Loading…</p>
            ) : targets.length === 0 ? (
              <div style={s.tableWrap}><div style={s.tableMsg}>No target has been set for you yet. Use the Targets tab to propose one.</div></div>
            ) : (
              <div style={{ maxWidth: 340 }}>
                <TargetCard target={targets[0]} achieved={myWonTotal} />
              </div>
            )}
          </>
        )}

        {/* ── Pipeline ── */}
        {activeTab === 'pipeline' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Pipeline & Target Tracker</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportLeadsCSV}>⬇ Export CSV</button>
                <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowNewLead(true)}>➕ New Lead</button>
              </div>
            </div>
            <div style={s.toolbar}>
              <div style={s.tabs}>
                <button style={{ ...s.tab, ...(pipelineScope === 'mine' ? s.tabActive : {}) }} onClick={() => setPipelineScope('mine')}>My Leads</button>
                <button style={{ ...s.tab, ...(pipelineScope === 'all' ? s.tabActive : {}) }} onClick={() => setPipelineScope('all')}>All Leads</button>
              </div>
            </div>
            {loadingLeads ? (
              <div style={s.tableWrap}><div style={s.tableMsg}>Loading pipeline…</div></div>
            ) : (
              <KanbanBoard leads={visibleLeads} onOpen={setEditingLead} onMove={moveLead} />
            )}
          </>
        )}

        {/* ── Targets ── */}
        {activeTab === 'targets' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>Revenue Targets</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>Quotas set by management, tracked against closed-won pipeline value.</p>
              </div>
              <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowTargetRequest(true)}>🎯 Propose Target</button>
            </div>
            {loadingTargets ? (
              <div style={s.tableWrap}><div style={s.tableMsg}>Loading targets…</div></div>
            ) : targets.length === 0 ? (
              <div style={s.tableWrap}><div style={s.tableMsg}>No targets on file yet.</div></div>
            ) : (
              <div style={s.trackGrid}>
                {targets.map(t => <TargetCard key={t.id} target={t} achieved={myWonTotal} />)}
              </div>
            )}
          </>
        )}

        {/* ── Campaigns ── */}
        {activeTab === 'campaigns' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Campaign & Marketing Analytics</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportCampaignsCSV}>⬇ Export CSV</button>
                <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowNewCampaign(true)}>➕ Log Campaign</button>
              </div>
            </div>
            <div style={s.toolbar}>
              <input style={s.searchInput} placeholder="Search campaign or channel…" value={campaignSearch} onChange={e => setCampaignSearch(e.target.value)} />
            </div>
            <div style={s.tableWrap}>
              {loadingCampaigns ? (
                <div style={s.tableMsg}>Loading campaigns…</div>
              ) : filteredCampaigns.length === 0 ? (
                <div style={s.tableMsg}>No campaigns logged yet.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Campaign</th><th style={s.th}>Channel</th><th style={s.th}>Spend</th>
                      <th style={s.th}>Leads</th><th style={s.th}>Revenue</th><th style={s.th}>ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map(c => {
                      const r = roi(c.revenue, c.spend);
                      return (
                        <tr key={c.id} style={s.tr}>
                          <td style={s.td}><span style={{ fontWeight: 700, color: '#1A3C5E' }}>{c.name}</span><div style={{ fontSize: 11.5, color: '#9AAAB8' }}>{c.startDate || '—'} → {c.endDate || '—'}</div></td>
                          <td style={s.td}>{c.channel}</td>
                          <td style={s.td}>{fmtMoney(c.spend)}</td>
                          <td style={s.td}>{c.leadsGenerated}</td>
                          <td style={s.td}>{fmtMoney(c.revenue)}</td>
                          <td style={{ ...s.td, fontWeight: 700, color: r >= 0 ? '#10B981' : '#EF4444' }}>{r.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── CRM ── */}
        {activeTab === 'crm' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Client Relationship Management</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportClientsCSV}>⬇ Export CSV</button>
                <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowNewClient(true)}>➕ New Client</button>
              </div>
            </div>
            <div style={s.toolbar}>
              <div style={s.tabs}>
                {['All', ...CLIENT_STATUSES].map(st => (
                  <button key={st} style={{ ...s.tab, ...(clientStatusFilter === st ? s.tabActive : {}) }} onClick={() => setClientStatusFilter(st)}>
                    {st} <span style={s.tabCount}>{clientCounts[st]}</span>
                  </button>
                ))}
              </div>
              <input style={s.searchInput} placeholder="Search name, company, or email…" value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
            </div>
            <div style={s.tableWrap}>
              {loadingClients ? (
                <div style={s.tableMsg}>Loading clients…</div>
              ) : filteredClients.length === 0 ? (
                <div style={s.tableMsg}>No clients match your filters.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Name</th><th style={s.th}>Company</th><th style={s.th}>Status</th>
                      <th style={s.th}>Source</th><th style={s.th}>Last Contact</th><th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map(c => (
                      <tr key={c.id} style={s.tr}>
                        <td style={s.td}><span style={{ fontWeight: 700, color: '#1A3C5E' }}>{c.name}</span><div style={{ fontSize: 12, color: '#7A8A9A' }}>{c.email || '—'}</div></td>
                        <td style={s.td}>{c.company || '—'}</td>
                        <td style={s.td}><ClientStatusBadge status={c.status} /></td>
                        <td style={s.td}>{c.source || '—'}</td>
                        <td style={{ ...s.td, fontSize: 12.5, color: '#7A8A9A' }}>{fmtDateShort(c.lastContactAt) === '—' ? 'No contact yet' : fmtDateShort(c.lastContactAt)}</td>
                        <td style={s.td}><button style={s.btnView} onClick={() => setDetailClient(c)}>Open</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Proposals ── */}
        {activeTab === 'proposals' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>Sales Proposal Generator</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>Templates published by the Secretary module: {templates.length} available.</p>
              </div>
              <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowNewProposal(true)} disabled={clients.length === 0}>
                📄 New Proposal
              </button>
            </div>
            <div style={s.tableWrap}>
              {loadingProposals ? (
                <div style={s.tableMsg}>Loading proposals…</div>
              ) : proposals.length === 0 ? (
                <div style={s.tableMsg}>No proposals yet — create one from a client record.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Client</th><th style={s.th}>Template</th><th style={s.th}>Amount</th>
                      <th style={s.th}>Status</th><th style={s.th}>Created</th><th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map(p => (
                      <tr key={p.id} style={s.tr}>
                        <td style={s.td}><span style={{ fontWeight: 700, color: '#1A3C5E' }}>{p.clientName}</span></td>
                        <td style={s.td}>{p.templateName || 'Custom'}</td>
                        <td style={s.td}>{fmtMoney(p.amount)}</td>
                        <td style={s.td}><ProposalStatusBadge status={p.status} /></td>
                        <td style={{ ...s.td, fontSize: 12.5, color: '#7A8A9A' }}>{fmtDateShort(p.createdAt)}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {p.status === 'draft' && (
                              <button style={s.btnShortlist} onClick={() => issueProposal(p)} disabled={busyProposalId === p.id}>Issue to Client</button>
                            )}
                            {p.status === 'sent' && (
                              <>
                                <button style={s.btnShortlist} onClick={() => setProposalStatus(p, 'accepted')} disabled={busyProposalId === p.id}>Accepted</button>
                                <button style={s.btnReject} onClick={() => setProposalStatus(p, 'rejected')} disabled={busyProposalId === p.id}>Rejected</button>
                              </>
                            )}
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
      </div>

      {(showNewLead || editingLead) && (
        <LeadModal
          lead={editingLead}
          userEmail={userEmail}
          onClose={() => { setShowNewLead(false); setEditingLead(null); }}
          onSave={saveLead}
          onDelete={deleteLead}
        />
      )}
      {showTargetRequest && (
        <TargetRequestModal userEmail={userEmail} onClose={() => setShowTargetRequest(false)} onSubmit={submitTargetRequest} />
      )}
      {showNewCampaign && (
        <CampaignModal userEmail={userEmail} onClose={() => setShowNewCampaign(false)} onSave={saveCampaign} />
      )}
      {showNewClient && (
        <AddClientModal userEmail={userEmail} onClose={() => setShowNewClient(false)} onSave={saveClient} />
      )}
      {detailClient && (
        <ClientDetailModal
          client={detailClient}
          interactions={interactions}
          feedbackItems={feedbackItems}
          onClose={() => setDetailClient(null)}
          onLogInteraction={logInteraction}
          onToggleFollowUp={toggleFollowUp}
          onLogFeedback={logFeedback}
          onToggleResolved={toggleResolved}
        />
      )}
      {showNewProposal && (
        <NewProposalModal
          clients={clients}
          templates={templates}
          userEmail={userEmail}
          onClose={() => setShowNewProposal(false)}
          onSave={createProposal}
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

  page:        { padding: '36px 5%', maxWidth: 1320, margin: '0 auto' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle:   { fontSize: 26, fontWeight: 700, color: '#1A3C5E', margin: 0 },
  pageSub:     { color: '#5A7A9A', margin: '4px 0 0', fontSize: 14 },
  logoutBtn:   { padding: '8px 16px', background: '#fff', border: '1.5px solid #C5CDD6', color: '#4A6B8A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  dashSwitcher: { display: 'flex', gap: 8, marginBottom: 28, borderBottom: '2px solid #E2E8F0', paddingBottom: 0, flexWrap: 'wrap' },
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
  cardValue: { fontSize: 24, fontWeight: 800, margin: 0 },
  cardSub:   { fontSize: 12, color: '#9AAAB8', margin: '4px 0 0' },
};

const rm = {
  miniBtn: { background: '#F0F4F8', border: '1px solid #E2E8F0', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#5A7A9A', cursor: 'pointer' },
};

const cu = {
  label:  { display: 'block', fontSize: 12, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, textAlign: 'left' },
  select: { width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
};

// ─── Kanban styles ────────────────────────────────────────────────────────────
const kb = {
  board:      { display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(200px, 1fr))`, gap: 12, overflowX: 'auto', paddingBottom: 8 },
  column:     { background: '#F7F9FC', borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', minHeight: 200 },
  columnHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 10px 4px', },
  columnCount:{ background: 'rgba(0,0,0,0.08)', borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700, color: '#5A7A9A' },
  columnBody: { padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
  emptyCol:   { textAlign: 'center', color: '#9AAAB8', fontSize: 12, padding: '18px 6px' },
  card:       { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  moveBtn:    { background: 'none', border: '1px solid #E2E8F0', borderRadius: 5, padding: '3px 7px', fontSize: 10.5, color: '#5A7A9A', cursor: 'pointer', fontWeight: 600 },
};

export default SalesManager;