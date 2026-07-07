/**
 * AccountsManager.jsx – Slirus Holdings CFO Control Center
 *
 * Finance dashboard covering the full "Financial Management" module:
 *   Accounts Payable · Accounts Receivable · Financial Statements ·
 *   Billing & Invoicing (print invoices/receipts) · Records · Tax Filing ·
 *   Double-Entry Book / Cash Book.
 *
 * Sits alongside Admin.jsx and CeoManager.jsx and reuses the same
 * auth/session, styling, and Firestore conventions.
 *
 * Access model:
 *  - The designated admin/CEO account (ADMIN_UID) always has full access.
 *  - Any other signed-in team member is granted access based on the
 *    `permissions.finance.*` flags on their `teamUsers/{uid}` document
 *    (the same Roles & Permissions matrix configured from CeoManager.jsx).
 *    read → view only. write → create entries/invoices/tax records.
 *    edit → modify drafts. delete → void/delete records.
 *    approve → confirm invoice payments & file tax returns.
 *
 * Features:
 *  - Automated Double-Entry Ledger: every transaction is posted as a
 *    balanced set of debit/credit lines (client-side validation blocks
 *    unbalanced entries). Account balances, the Cash Book, Accounts
 *    Payable, and Accounts Receivable are all derived live from the same
 *    ledger — nothing is double-maintained.
 *  - Billing & Invoicing Engine: create, "email", and track customer
 *    invoices; one-click receipt printing on payment confirmation, which
 *    also auto-posts the settling journal entry (Dr Cash / Cr Accounts
 *    Receivable) so the books stay in sync automatically.
 *  - Tax Compliance Engine: computes URA PAYE and NSSF (employee +
 *    employer) on payroll runs, and structures corporate tax estimates
 *    for year-end filing, with a filed/unfiled compliance tracker.
 *  - Automated Financial Statements: real-time Balance Sheet, Income
 *    Statement (P&L), and Cash Flow Statement generated straight from the
 *    ledger, with CSV export and print-ready output.
 *  - Records: searchable, filterable, CSV-exportable tables everywhere;
 *    an append-only audit trail (shared with CeoManager.jsx's `auditLogs`
 *    collection) for every create/edit/void/approve action.
 *
 * NOTE ON TAX FIGURES: the PAYE bands and NSSF/corporate tax rates below
 * are configured as constants for Uganda (URA / NSSF) but tax law changes
 * — confirm current rates with URA / NSSF before relying on this for an
 * actual filing. Nothing here is legal or tax advice.
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
// Same super-admin account used across Admin.jsx / CeoManager.jsx.
// NOTE: this is a UX gate only — the real authorization boundary lives in
// Firestore Security Rules, never trust a client-side check alone.
const ADMIN_UID = 'NmW09jvv9Wbdvs0h6QEh2HRH8On1';

const CURRENCY = import.meta.env.VITE_CURRENCY || 'UGX';

// ── Chart of accounts starter set (only written to Firestore if the user
//    clicks "Seed default chart" from an empty Chart of Accounts) ─────────
const DEFAULT_CHART_OF_ACCOUNTS = [
  { code: '1000', name: 'Cash and Bank',        type: 'Asset',     cashFlowCategory: 'operating' },
  { code: '1100', name: 'Accounts Receivable',  type: 'Asset',     cashFlowCategory: 'operating' },
  { code: '1200', name: 'Inventory',            type: 'Asset',     cashFlowCategory: 'operating' },
  { code: '1500', name: 'Fixed Assets',         type: 'Asset',     cashFlowCategory: 'investing' },
  { code: '2000', name: 'Accounts Payable',     type: 'Liability', cashFlowCategory: 'operating' },
  { code: '2100', name: 'PAYE Payable (URA)',   type: 'Liability', cashFlowCategory: 'operating' },
  { code: '2200', name: 'NSSF Payable',         type: 'Liability', cashFlowCategory: 'operating' },
  { code: '2300', name: 'Corporate Tax Payable',type: 'Liability', cashFlowCategory: 'operating' },
  { code: '2500', name: 'Loans Payable',        type: 'Liability', cashFlowCategory: 'financing' },
  { code: '3000', name: "Owner's Equity",       type: 'Equity',    cashFlowCategory: 'financing' },
  { code: '3100', name: 'Retained Earnings',    type: 'Equity',    cashFlowCategory: 'financing' },
  { code: '4000', name: 'Sales Revenue',        type: 'Revenue',   cashFlowCategory: 'operating' },
  { code: '4100', name: 'Service Revenue',      type: 'Revenue',   cashFlowCategory: 'operating' },
  { code: '5000', name: 'Cost of Goods Sold',   type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5100', name: 'Salaries & Wages',     type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5200', name: 'Rent Expense',         type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5300', name: 'Utilities Expense',    type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5400', name: 'Office Supplies',      type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5900', name: 'Tax Expense',          type: 'Expense',   cashFlowCategory: 'operating' },
];

const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
const DEBIT_NORMAL_TYPES = new Set(['Asset', 'Expense']);
const CASH_FLOW_CATEGORIES = ['operating', 'investing', 'financing'];

const ENTRY_TYPES = [
  { key: 'general',    label: 'General Journal' },
  { key: 'cash',        label: 'Cash Book' },
  { key: 'payable',    label: 'Accounts Payable' },
  { key: 'receivable', label: 'Accounts Receivable' },
];

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void'];

// Uganda PAYE monthly bands — verify against the current URA schedule.
const PAYE_BANDS = [
  { upTo: 235000,      rate: 0,    base: 0 },
  { upTo: 335000,      rate: 0.10, base: 0 },
  { upTo: 410000,      rate: 0.20, base: 10000 },
  { upTo: 10000000,    rate: 0.30, base: 25000 },
  { upTo: Infinity,    rate: 0.40, base: 2902000 }, // 30% band + 10% surcharge above 10M
];
const NSSF_EMPLOYEE_RATE = 0.05;
const NSSF_EMPLOYER_RATE = 0.10;
const CORPORATE_TAX_RATE = 0.30;

const IDLE_LIMIT_MS = 20 * 60 * 1000;
const IDLE_WARN_MS  = 18 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────────────────────────
const money = (n) => {
  const v = Number(n) || 0;
  return `${CURRENCY} ${v.toLocaleString('en-UG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  if (ts?.toDate) return ts.toDate().toLocaleDateString('en-UG');
  const d = new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-UG');
};
const fmtDateTime = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-UG') : '—');

const todayISO = () => new Date().toISOString().slice(0, 10);

const uid4 = () => Math.random().toString(36).slice(2, 6).toUpperCase();

const genInvoiceNo = () => `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
const genReceiptNo = () => `RCT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
const genRef = (prefix) => `${prefix}-${Date.now().toString().slice(-8)}-${uid4()}`;

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

const openPrintWindow = (title, bodyHtml) => {
  const win = window.open('', '_blank', 'width=820,height=1000');
  if (!win) { alert('Please allow pop-ups to print.'); return; }
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
          .headRow { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1A3C5E; padding-bottom: 16px; margin-bottom: 16px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <div class="no-print" style="margin-top:30px;">
          <button onclick="window.print()" style="padding:10px 18px;background:#1A3C5E;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">Print</button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
};

// ── Double-entry helpers ────────────────────────────────────────────────
const lineTotals = (lines) => lines.reduce(
  (acc, l) => ({ debit: acc.debit + (Number(l.debit) || 0), credit: acc.credit + (Number(l.credit) || 0) }),
  { debit: 0, credit: 0 }
);
const isBalanced = (lines) => {
  const { debit, credit } = lineTotals(lines);
  return debit > 0 && Math.abs(debit - credit) < 0.5;
};

// Balance per account code from posted (non-void) ledger entries.
const computeAccountBalances = (entries, accounts) => {
  const typeByCode = Object.fromEntries(accounts.map(a => [a.code, a.type]));
  const balances = {};
  entries.filter(e => e.status !== 'void').forEach(e => {
    (e.lines || []).forEach(l => {
      const type = typeByCode[l.accountCode] || 'Asset';
      const delta = DEBIT_NORMAL_TYPES.has(type)
        ? (Number(l.debit) || 0) - (Number(l.credit) || 0)
        : (Number(l.credit) || 0) - (Number(l.debit) || 0);
      balances[l.accountCode] = (balances[l.accountCode] || 0) + delta;
    });
  });
  return balances;
};

// ── Tax helpers ──────────────────────────────────────────────────────────
const computePAYE = (grossPay) => {
  const g = Number(grossPay) || 0;
  let band = PAYE_BANDS[0];
  for (const b of PAYE_BANDS) { if (g <= b.upTo) { band = b; break; } }
  const prevCeiling = PAYE_BANDS[PAYE_BANDS.indexOf(band) - 1]?.upTo || 0;
  const taxable = Math.max(0, g - prevCeiling);
  return Math.round(band.base + taxable * band.rate);
};
const computeNSSF = (grossPay) => {
  const g = Number(grossPay) || 0;
  return {
    employee: Math.round(g * NSSF_EMPLOYEE_RATE),
    employer: Math.round(g * NSSF_EMPLOYER_RATE),
  };
};
const computeCorporateTax = (taxableIncome) => Math.round((Number(taxableIncome) || 0) * CORPORATE_TAX_RATE);

// ─── Small shared UI bits ───────────────────────────────────────────────────
const Badge = ({ text, tone }) => {
  const TONES = {
    green:  { bg: '#D1FAE5', color: '#065F46' },
    red:    { bg: '#FEE2E2', color: '#991B1B' },
    amber:  { bg: '#FEF3C7', color: '#92400E' },
    blue:   { bg: '#DBEAFE', color: '#1D4ED8' },
    gray:   { bg: '#F0F4F8', color: '#5A7A9A' },
  };
  const t = TONES[tone] || TONES.gray;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: t.bg, color: t.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      {text}
    </span>
  );
};
const invoiceStatusTone = (st) => ({ draft: 'gray', sent: 'blue', paid: 'green', overdue: 'red', void: 'gray' }[st] || 'gray');

const StatCard = ({ label, value, accent, sub }) => (
  <div style={{ ...gd.card, borderTop: `3px solid ${accent}` }}>
    <p style={gd.cardLabel}>{label}</p>
    <p style={{ ...gd.cardValue, color: accent }}>{value}</p>
    {sub && <p style={gd.cardSub}>{sub}</p>}
  </div>
);

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
        <div style={{ fontSize: 40, marginBottom: 14 }}>💼</div>
        <h2 style={s.loginTitle}>CFO Control Center</h2>
        <p style={s.loginSub}>Restricted access. Sign in with your finance credentials.</p>
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
        {email} is signed in but doesn't have Finance access. Ask the CEO to grant
        Finance permissions from the CEO Control Center's Roles &amp; Permissions matrix.
      </p>
      <button style={s.loginBtn} onClick={onLogout}>Sign Out</button>
    </div>
  </div>
);

// ─── Journal Entry Modal (double-entry) ─────────────────────────────────────
const JournalEntryModal = ({ accounts, entryTypeDefault, onClose, onSave }) => {
  const blankLine = () => ({ id: uid4(), accountCode: accounts[0]?.code || '', debit: '', credit: '' });
  const [date, setDate] = useState(todayISO());
  const [reference, setReference] = useState(genRef('JE'));
  const [memo, setMemo] = useState('');
  const [entryType, setEntryType] = useState(entryTypeDefault || 'general');
  const [lines, setLines] = useState([blankLine(), blankLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totals = lineTotals(lines);
  const balanced = isBalanced(lines);

  const updateLine = (id, field, value) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };
  const addLine = () => setLines(prev => [...prev, blankLine()]);
  const removeLine = (id) => setLines(prev => prev.length > 2 ? prev.filter(l => l.id !== id) : prev);

  const handleSave = async () => {
    if (!memo.trim()) { setError('Add a short description for this entry.'); return; }
    if (!balanced) { setError('Debits must equal credits before this entry can be posted.'); return; }
    setSaving(true); setError('');
    try {
      const accByCode = Object.fromEntries(accounts.map(a => [a.code, a]));
      const cleanLines = lines
        .filter(l => (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0)
        .map(l => ({
          accountCode: l.accountCode,
          accountName: accByCode[l.accountCode]?.name || l.accountCode,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        }));
      await onSave({ date, reference, memo, entryType, lines: cleanLines });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save this entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Journal Entry</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Double-entry — every line must balance.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        <div style={ms.body}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={cu.label}>Date</label>
              <input type="date" style={s.loginInput} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={cu.label}>Reference</label>
              <input style={s.loginInput} value={reference} onChange={e => setReference(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={cu.label}>Book</label>
              <select style={cu.select} value={entryType} onChange={e => setEntryType(e.target.value)}>
                {ENTRY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <label style={{ ...cu.label, marginTop: 12 }}>Description</label>
          <input style={s.loginInput} value={memo} onChange={e => setMemo(e.target.value)} placeholder="e.g. Office rent for July" />

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr>
                  <th style={rm.th}>Account</th>
                  <th style={{ ...rm.th, textAlign: 'right' }}>Debit</th>
                  <th style={{ ...rm.th, textAlign: 'right' }}>Credit</th>
                  <th style={rm.th}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <select style={cu.select} value={l.accountCode} onChange={e => updateLine(l.id, 'accountCode', e.target.value)}>
                        {accounts.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input type="number" min="0" style={{ ...s.loginInput, textAlign: 'right' }} value={l.debit}
                        onChange={e => updateLine(l.id, 'debit', e.target.value)} placeholder="0" />
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <input type="number" min="0" style={{ ...s.loginInput, textAlign: 'right' }} value={l.credit}
                        onChange={e => updateLine(l.id, 'credit', e.target.value)} placeholder="0" />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button style={rm.miniBtn} onClick={() => removeLine(l.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ padding: '10px', fontWeight: 700, color: '#1A3C5E' }}>Totals</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{money(totals.debit)}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{money(totals.credit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <button style={{ ...rm.miniBtn, marginTop: 8 }} onClick={addLine}>+ Add line</button>

          <div style={{ marginTop: 14 }}>
            {balanced
              ? <Badge text="✓ Balanced" tone="green" />
              : <Badge text={`Out of balance by ${money(Math.abs(totals.debit - totals.credit))}`} tone="red" />}
          </div>

          {error && <p style={s.loginErr}>{error}</p>}
        </div>

        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff' }} onClick={handleSave} disabled={saving || !balanced}>
            {saving ? 'Posting…' : '📘 Post Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Invoice Modal (create / edit) ──────────────────────────────────────────
const InvoiceModal = ({ onClose, onSave }) => {
  const blankItem = () => ({ id: uid4(), description: '', qty: 1, rate: '' });
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(todayISO());
  const [taxRate, setTaxRate] = useState(18); // VAT default
  const [items, setItems] = useState([blankItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (id, field, val) => setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  const addItem = () => setItems(prev => [...prev, blankItem()]);
  const removeItem = (id) => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);

  const subtotal = items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const taxAmount = Math.round(subtotal * (Number(taxRate) || 0) / 100);
  const total = subtotal + taxAmount;

  const handleSave = async () => {
    if (!customerName.trim()) { setError('Customer name is required.'); return; }
    if (!items.some(i => i.description.trim() && Number(i.rate) > 0)) { setError('Add at least one line item.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({
        invoiceNo: genInvoiceNo(),
        customerName, customerEmail, issueDate, dueDate,
        items: items.filter(i => i.description.trim()).map(({ id, ...rest }) => ({
          description: rest.description, qty: Number(rest.qty) || 0, rate: Number(rest.rate) || 0,
          amount: (Number(rest.qty) || 0) * (Number(rest.rate) || 0),
        })),
        taxRate: Number(taxRate) || 0, subtotal, taxAmount, total,
        status: 'draft',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save this invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Invoice</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Saved as a draft — send it once it looks right.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        <div style={ms.body}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={cu.label}>Customer name</label>
              <input style={s.loginInput} value={customerName} onChange={e => setCustomerName(e.target.value)} autoFocus />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={cu.label}>Customer email</label>
              <input type="email" style={s.loginInput} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={cu.label}>Issue date</label>
              <input type="date" style={s.loginInput} value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={cu.label}>Due date</label>
              <input type="date" style={s.loginInput} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={cu.label}>Tax rate (%)</label>
              <input type="number" min="0" style={s.loginInput} value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr>
                  <th style={rm.th}>Description</th>
                  <th style={{ ...rm.th, textAlign: 'right' }}>Qty</th>
                  <th style={{ ...rm.th, textAlign: 'right' }}>Rate</th>
                  <th style={{ ...rm.th, textAlign: 'right' }}>Amount</th>
                  <th style={rm.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map(i => (
                  <tr key={i.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <input style={s.loginInput} value={i.description} onChange={e => updateItem(i.id, 'description', e.target.value)} placeholder="Item or service" />
                    </td>
                    <td style={{ padding: '8px 10px', width: 80 }}>
                      <input type="number" min="0" style={{ ...s.loginInput, textAlign: 'right' }} value={i.qty} onChange={e => updateItem(i.id, 'qty', e.target.value)} />
                    </td>
                    <td style={{ padding: '8px 10px', width: 130 }}>
                      <input type="number" min="0" style={{ ...s.loginInput, textAlign: 'right' }} value={i.rate} onChange={e => updateItem(i.id, 'rate', e.target.value)} />
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {money((Number(i.qty) || 0) * (Number(i.rate) || 0))}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button style={rm.miniBtn} onClick={() => removeItem(i.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button style={{ ...rm.miniBtn, marginTop: 8 }} onClick={addItem}>+ Add line item</button>

          <div style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 260 }}>
            <div style={cu.credRow}><span style={cu.credLabel}>Subtotal</span><span style={cu.credVal}>{money(subtotal)}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Tax ({taxRate || 0}%)</span><span style={cu.credVal}>{money(taxAmount)}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Total due</span><span style={{ ...cu.credVal, fontSize: 18, color: '#1A3C5E' }}>{money(total)}</span></div>
          </div>

          {error && <p style={s.loginErr}>{error}</p>}
        </div>

        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '🧾 Save Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Confirm Payment Modal (creates receipt + settling journal entry) ──────
const ConfirmPaymentModal = ({ invoice, cashAccounts, receivableAccount, onClose, onConfirm }) => {
  const [amount, setAmount] = useState(invoice.total);
  const [method, setMethod] = useState('Mobile Money');
  const [cashAccountCode, setCashAccountCode] = useState(cashAccounts[0]?.code || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!cashAccountCode) { setError('Choose which cash/bank account received the payment.'); return; }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    try {
      await onConfirm({ amount: Number(amount), method, cashAccountCode });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not confirm this payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #10B981' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Confirm Payment</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{invoice.invoiceNo} · {invoice.customerName}</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <label style={cu.label}>Amount received</label>
          <input type="number" style={s.loginInput} value={amount} onChange={e => setAmount(e.target.value)} />

          <label style={{ ...cu.label, marginTop: 12 }}>Payment method</label>
          <select style={cu.select} value={method} onChange={e => setMethod(e.target.value)}>
            {['Mobile Money', 'Bank Transfer', 'Cash', 'Cheque', 'Card'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <label style={{ ...cu.label, marginTop: 12 }}>Deposited into</label>
          <select style={cu.select} value={cashAccountCode} onChange={e => setCashAccountCode(e.target.value)}>
            {cashAccounts.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
          </select>

          <p style={{ fontSize: 12, color: '#7A8A9A', marginTop: 14, lineHeight: 1.6 }}>
            This will mark the invoice paid, generate a printable receipt, and automatically post
            a balanced journal entry (Debit {cashAccounts.find(a => a.code === cashAccountCode)?.name || 'Cash'},
            Credit {receivableAccount?.name || 'Accounts Receivable'}) to the ledger.
          </p>

          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#10B981', color: '#fff' }} onClick={handleConfirm} disabled={saving}>
            {saving ? 'Confirming…' : '✓ Confirm & Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Payroll Tax Modal (URA PAYE + NSSF) ────────────────────────────────────
const PayrollTaxModal = ({ onClose, onSave }) => {
  const [employeeName, setEmployeeName] = useState('');
  const [period, setPeriod] = useState(todayISO().slice(0, 7)); // YYYY-MM
  const [grossPay, setGrossPay] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const g = Number(grossPay) || 0;
  const paye = computePAYE(g);
  const nssf = computeNSSF(g);
  const netPay = g - paye - nssf.employee;

  const handleSave = async () => {
    if (!employeeName.trim() || g <= 0) { setError('Enter an employee name and gross pay.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ employeeName, period, grossPay: g, paye, nssfEmployee: nssf.employee, nssfEmployer: nssf.employer, netPay, status: 'computed' });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save this payroll record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Payroll Tax Calculator</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>URA PAYE + NSSF, per employee per period.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <label style={cu.label}>Employee name</label>
          <input style={s.loginInput} value={employeeName} onChange={e => setEmployeeName(e.target.value)} autoFocus />

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={cu.label}>Period</label>
              <input type="month" style={s.loginInput} value={period} onChange={e => setPeriod(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={cu.label}>Gross pay</label>
              <input type="number" style={s.loginInput} value={grossPay} onChange={e => setGrossPay(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={cu.credRow}><span style={cu.credLabel}>PAYE (URA)</span><span style={cu.credVal}>{money(paye)}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>NSSF — employee (5%)</span><span style={cu.credVal}>{money(nssf.employee)}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>NSSF — employer (10%)</span><span style={cu.credVal}>{money(nssf.employer)}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Net pay</span><span style={{ ...cu.credVal, fontSize: 17, color: '#1A3C5E' }}>{money(netPay)}</span></div>
          </div>
          <p style={{ fontSize: 11, color: '#9AAAB8', marginTop: 10 }}>
            Verify current URA bands and NSSF rates before relying on this for an actual filing.
          </p>

          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Corporate Tax Modal ─────────────────────────────────────────────────────
const CorporateTaxModal = ({ onClose, onSave }) => {
  const [period, setPeriod] = useState(new Date().getFullYear().toString());
  const [taxableIncome, setTaxableIncome] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const income = Number(taxableIncome) || 0;
  const taxDue = computeCorporateTax(income);

  const handleSave = async () => {
    if (!period.trim() || income <= 0) { setError('Enter a filing period and taxable income.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ period, taxableIncome: income, taxRate: CORPORATE_TAX_RATE, taxDue, status: 'estimated' });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Corporate Tax Estimate</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Structured for year-end filing.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <label style={cu.label}>Filing period (year)</label>
          <input style={s.loginInput} value={period} onChange={e => setPeriod(e.target.value)} autoFocus />

          <label style={{ ...cu.label, marginTop: 12 }}>Taxable income</label>
          <input type="number" style={s.loginInput} value={taxableIncome} onChange={e => setTaxableIncome(e.target.value)} />

          <div style={{ marginTop: 16 }}>
            <div style={cu.credRow}><span style={cu.credLabel}>Rate</span><span style={cu.credVal}>{(CORPORATE_TAX_RATE * 100).toFixed(0)}%</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Tax due</span><span style={{ ...cu.credVal, fontSize: 17, color: '#1A3C5E' }}>{money(taxDue)}</span></div>
          </div>

          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Estimate'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Chart of Accounts Modal ─────────────────────────────────────────────────
const AccountModal = ({ onClose, onSave }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState(ACCOUNT_TYPES[0]);
  const [cashFlowCategory, setCashFlowCategory] = useState('operating');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) { setError('Account code and name are required.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ code: code.trim(), name: name.trim(), type, cashFlowCategory });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save this account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #1A3C5E' }}>
          <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Account</h3>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={cu.label}>Code</label>
              <input style={s.loginInput} value={code} onChange={e => setCode(e.target.value)} autoFocus />
            </div>
            <div style={{ flex: 2 }}>
              <label style={cu.label}>Name</label>
              <input style={s.loginInput} value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={cu.label}>Type</label>
              <select style={cu.select} value={type} onChange={e => setType(e.target.value)}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={cu.label}>Cash flow category</label>
              <select style={cu.select} value={cashFlowCategory} onChange={e => setCashFlowCategory(e.target.value)}>
                {CASH_FLOW_CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#1A3C5E', color: '#fff' }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : '➕ Add Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
function AccountsManager() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [myProfile, setMyProfile] = useState(null);   // teamUsers/{uid} of current user
  const [profileLoading, setProfileLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [ledgerFilter, setLedgerFilter] = useState('general');

  const [accounts, setAccounts] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [payrollTax, setPayrollTax] = useState([]);
  const [corporateTax, setCorporateTax] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showCorpTaxModal, setShowCorpTaxModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null); // invoice being confirmed

  const [ledgerSearch, setLedgerSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('All');
  const [statementsTab, setStatementsTab] = useState('balance'); // balance | income | cashflow

  const [idleWarning, setIdleWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());

  const isAdmin = !!user && user.uid === ADMIN_UID;
  const perms = myProfile?.permissions?.finance || {};
  const canRead = isAdmin || !!perms.read || !!perms.write; // write implies read
  const canWrite = isAdmin || !!perms.write;
  const canEdit = isAdmin || !!perms.edit;
  const canDelete = isAdmin || !!perms.delete;
  const canApprove = isAdmin || !!perms.approve;
  const hasAccess = canRead;

  // ── Auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // ── My profile listener (for non-admin permission checks) ──────────────
  useEffect(() => {
    if (!user || isAdmin) { setMyProfile(null); setProfileLoading(false); return; }
    setProfileLoading(true);
    const unsub = onSnapshot(
      doc(db, 'teamUsers', user.uid),
      (snap) => { setMyProfile(snap.exists() ? snap.data() : null); setProfileLoading(false); },
      () => { setMyProfile(null); setProfileLoading(false); }
    );
    return unsub;
  }, [user, isAdmin]);

  // ── Core finance data listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!hasAccess) { setLoadingData(false); return; }
    setLoadingData(true);
    const unsubs = [
      onSnapshot(collection(db, 'accounts'), snap => setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.code.localeCompare(b.code))),
        err => setDataError('Accounts: ' + err.message)),
      onSnapshot(query(collection(db, 'ledgerEntries'), orderBy('createdAt', 'desc'), limit(500)), snap => setLedgerEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => setDataError('Ledger: ' + err.message)),
      onSnapshot(query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(500)), snap => setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => setDataError('Invoices: ' + err.message)),
      onSnapshot(query(collection(db, 'receipts'), orderBy('createdAt', 'desc'), limit(500)), snap => setReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => setDataError('Receipts: ' + err.message)),
      onSnapshot(query(collection(db, 'payrollTax'), orderBy('createdAt', 'desc'), limit(500)), snap => setPayrollTax(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => setDataError('Payroll tax: ' + err.message)),
      onSnapshot(query(collection(db, 'corporateTax'), orderBy('createdAt', 'desc'), limit(200)), snap => setCorporateTax(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => setDataError('Corporate tax: ' + err.message)),
    ];
    setLoadingData(false);
    return () => unsubs.forEach(u => u());
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
    if (!window.confirm('Sign out of the CFO Control Center?')) return;
    setLoggingOut(true);
    try { await signOut(auth); }
    catch (err) { alert('Sign out failed: ' + err.message); }
    finally { setLoggingOut(false); }
  }, []);

  // ── Audit helper (shared collection with CeoManager.jsx) ────────────────
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

  // ── Derived: chart of accounts lookups ──────────────────────────────────
  const cashAccounts = useMemo(() => accounts.filter(a => a.type === 'Asset' && /cash|bank/i.test(a.name)), [accounts]);
  const receivableAccount = useMemo(() => accounts.find(a => /accounts receivable/i.test(a.name)), [accounts]);
  const payableAccount = useMemo(() => accounts.find(a => /accounts payable/i.test(a.name)), [accounts]);
  const accountBalances = useMemo(() => computeAccountBalances(ledgerEntries, accounts), [ledgerEntries, accounts]);

  // ── Derived: financial statements ────────────────────────────────────────
  const incomeStatement = useMemo(() => {
    const revenue = accounts.filter(a => a.type === 'Revenue').map(a => ({ ...a, balance: accountBalances[a.code] || 0 }));
    const expenses = accounts.filter(a => a.type === 'Expense').map(a => ({ ...a, balance: accountBalances[a.code] || 0 }));
    const totalRevenue = revenue.reduce((s, a) => s + a.balance, 0);
    const totalExpenses = expenses.reduce((s, a) => s + a.balance, 0);
    return { revenue, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses };
  }, [accounts, accountBalances]);

  const balanceSheet = useMemo(() => {
    const assets = accounts.filter(a => a.type === 'Asset').map(a => ({ ...a, balance: accountBalances[a.code] || 0 }));
    const liabilities = accounts.filter(a => a.type === 'Liability').map(a => ({ ...a, balance: accountBalances[a.code] || 0 }));
    const equity = accounts.filter(a => a.type === 'Equity').map(a => ({ ...a, balance: accountBalances[a.code] || 0 }));
    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquityRaw = equity.reduce((s, a) => s + a.balance, 0);
    const totalEquity = totalEquityRaw + incomeStatement.netIncome; // fold in current-period earnings
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balances: totalAssets - (totalLiabilities + totalEquity) };
  }, [accounts, accountBalances, incomeStatement.netIncome]);

  const cashFlowStatement = useMemo(() => {
    const cashCodes = new Set(cashAccounts.map(a => a.code));
    const byCategory = { operating: 0, investing: 0, financing: 0 };
    const accByCode = Object.fromEntries(accounts.map(a => [a.code, a]));
    ledgerEntries.filter(e => e.status !== 'void').forEach(e => {
      (e.lines || []).forEach(l => {
        if (!cashCodes.has(l.accountCode)) return;
        const net = (Number(l.debit) || 0) - (Number(l.credit) || 0);
        // Find the offsetting line(s) in the same entry to classify the flow.
        const others = (e.lines || []).filter(o => o !== l && !cashCodes.has(o.accountCode));
        const category = others[0] ? (accByCode[others[0].accountCode]?.cashFlowCategory || 'operating') : 'operating';
        byCategory[category] = (byCategory[category] || 0) + net;
      });
    });
    const net = byCategory.operating + byCategory.investing + byCategory.financing;
    return { ...byCategory, net };
  }, [ledgerEntries, cashAccounts, accounts]);

  const totalCash = useMemo(() => cashAccounts.reduce((s, a) => s + (accountBalances[a.code] || 0), 0), [cashAccounts, accountBalances]);
  const totalReceivable = useMemo(() => receivableAccount ? (accountBalances[receivableAccount.code] || 0) : 0, [receivableAccount, accountBalances]);
  const totalPayable = useMemo(() => payableAccount ? (accountBalances[payableAccount.code] || 0) : 0, [payableAccount, accountBalances]);

  // ── Chart of accounts CRUD ──────────────────────────────────────────────
  const seedChartOfAccounts = useCallback(async () => {
    if (!window.confirm(`Create ${DEFAULT_CHART_OF_ACCOUNTS.length} standard accounts?`)) return;
    for (const a of DEFAULT_CHART_OF_ACCOUNTS) {
      await setDoc(doc(db, 'accounts', a.code), a);
    }
    await logAudit('Seeded chart of accounts', 'accounts', `${DEFAULT_CHART_OF_ACCOUNTS.length} accounts`);
  }, [logAudit]);

  const handleAddAccount = useCallback(async (account) => {
    await setDoc(doc(db, 'accounts', account.code), account);
    await logAudit('Created account', account.code, account.name);
  }, [logAudit]);

  const handleDeleteAccount = useCallback(async (account) => {
    if (!window.confirm(`Delete account ${account.code} · ${account.name}? This does not delete past ledger entries.`)) return;
    await deleteDoc(doc(db, 'accounts', account.id || account.code));
    await logAudit('Deleted account', account.code, account.name);
  }, [logAudit]);

  // ── Ledger CRUD ──────────────────────────────────────────────────────────
  const handlePostEntry = useCallback(async (entry) => {
    await addDoc(collection(db, 'ledgerEntries'), {
      ...entry,
      status: 'posted',
      createdBy: auth.currentUser?.uid || 'unknown',
      createdByEmail: auth.currentUser?.email || 'unknown',
      createdAt: serverTimestamp(),
    });
    await logAudit('Posted journal entry', entry.reference, entry.memo);
  }, [logAudit]);

  const handleVoidEntry = useCallback(async (entry) => {
    if (!window.confirm(`Void entry ${entry.reference}? It will be excluded from balances but kept for the audit trail.`)) return;
    await updateDoc(doc(db, 'ledgerEntries', entry.id), { status: 'void' });
    await logAudit('Voided journal entry', entry.reference, entry.memo);
  }, [logAudit]);

  // ── Invoicing ────────────────────────────────────────────────────────────
  const handleCreateInvoice = useCallback(async (invoice) => {
    const ref = await addDoc(collection(db, 'invoices'), {
      ...invoice,
      createdBy: auth.currentUser?.uid || 'unknown',
      createdByEmail: auth.currentUser?.email || 'unknown',
      createdAt: serverTimestamp(),
    });
    await logAudit('Created invoice', invoice.invoiceNo, `${invoice.customerName} · ${money(invoice.total)}`);
    return ref;
  }, [logAudit]);

  const handleSendInvoice = useCallback(async (invoice) => {
    await updateDoc(doc(db, 'invoices', invoice.id), { status: 'sent', sentAt: serverTimestamp() });
    fetch(`${API_URL}/api/send-invoice-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: invoice.id, to: invoice.customerEmail }),
    }).catch(err => console.warn('Invoice email send failed (non-fatal):', err.message));
    await logAudit('Sent invoice', invoice.invoiceNo, invoice.customerEmail || 'no email on file');
  }, [logAudit]);

  const handleVoidInvoice = useCallback(async (invoice) => {
    if (!window.confirm(`Void invoice ${invoice.invoiceNo}?`)) return;
    await updateDoc(doc(db, 'invoices', invoice.id), { status: 'void' });
    await logAudit('Voided invoice', invoice.invoiceNo);
  }, [logAudit]);

  const handleDeleteInvoice = useCallback(async (invoice) => {
    if (!window.confirm(`Permanently delete draft invoice ${invoice.invoiceNo}?`)) return;
    await deleteDoc(doc(db, 'invoices', invoice.id));
    await logAudit('Deleted invoice', invoice.invoiceNo);
  }, [logAudit]);

  const handleConfirmPayment = useCallback(async (invoice, { amount, method, cashAccountCode }) => {
    const receiptNo = genReceiptNo();
    // 1. Auto-post the settling journal entry — Dr Cash / Cr Accounts Receivable.
    const cashAcc = accounts.find(a => a.code === cashAccountCode);
    await addDoc(collection(db, 'ledgerEntries'), {
      date: todayISO(),
      reference: genRef('PMT'),
      memo: `Payment received — ${invoice.invoiceNo} (${invoice.customerName})`,
      entryType: 'receivable',
      lines: [
        { accountCode: cashAccountCode, accountName: cashAcc?.name || 'Cash', debit: amount, credit: 0 },
        { accountCode: receivableAccount?.code || '1100', accountName: receivableAccount?.name || 'Accounts Receivable', debit: 0, credit: amount },
      ],
      status: 'posted',
      createdBy: auth.currentUser?.uid || 'unknown',
      createdByEmail: auth.currentUser?.email || 'unknown',
      createdAt: serverTimestamp(),
    });
    // 2. Record the receipt.
    await addDoc(collection(db, 'receipts'), {
      receiptNo, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo,
      customerName: invoice.customerName, amount, method,
      date: todayISO(), issuedBy: auth.currentUser?.email || 'unknown',
      createdAt: serverTimestamp(),
    });
    // 3. Mark the invoice paid.
    await updateDoc(doc(db, 'invoices', invoice.id), { status: 'paid', paidAt: serverTimestamp(), receiptNo });
    await logAudit('Confirmed payment', invoice.invoiceNo, `${money(amount)} via ${method} · Receipt ${receiptNo}`);
  }, [accounts, receivableAccount, logAudit]);

  const printInvoice = useCallback((invoice) => {
    const itemRows = (invoice.items || []).map(i => `
      <tr><td>${i.description}</td><td class="right">${i.qty}</td><td class="right">${money(i.rate)}</td><td class="right">${money(i.amount)}</td></tr>
    `).join('');
    openPrintWindow(`Invoice ${invoice.invoiceNo}`, `
      <div class="headRow">
        <div><h1>Slirus Holdings</h1><p class="muted">Invoice ${invoice.invoiceNo}</p></div>
        <div style="text-align:right;">
          <p class="muted">Issue date: ${fmtDate(invoice.issueDate)}</p>
          <p class="muted">Due date: ${fmtDate(invoice.dueDate)}</p>
        </div>
      </div>
      <p><strong>Bill to:</strong> ${invoice.customerName}${invoice.customerEmail ? ' · ' + invoice.customerEmail : ''}</p>
      <table>
        <thead><tr><th>Description</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr class="totals"><td colspan="3" class="right">Subtotal</td><td class="right">${money(invoice.subtotal)}</td></tr>
          <tr class="totals"><td colspan="3" class="right">Tax (${invoice.taxRate}%)</td><td class="right">${money(invoice.taxAmount)}</td></tr>
          <tr class="totals"><td colspan="3" class="right">Total due</td><td class="right">${money(invoice.total)}</td></tr>
        </tfoot>
      </table>
    `);
  }, []);

  const printReceipt = useCallback((receipt) => {
    openPrintWindow(`Receipt ${receipt.receiptNo}`, `
      <div class="headRow">
        <div><h1>Slirus Holdings</h1><p class="muted">Receipt ${receipt.receiptNo}</p></div>
        <p class="muted">${fmtDate(receipt.date)}</p>
      </div>
      <table>
        <tbody>
          <tr><td>Received from</td><td class="right">${receipt.customerName}</td></tr>
          <tr><td>Against invoice</td><td class="right">${receipt.invoiceNo}</td></tr>
          <tr><td>Payment method</td><td class="right">${receipt.method}</td></tr>
          <tr class="totals"><td>Amount received</td><td class="right">${money(receipt.amount)}</td></tr>
        </tbody>
      </table>
    `);
  }, []);

  // ── Tax records ──────────────────────────────────────────────────────────
  const handleSavePayroll = useCallback(async (record) => {
    await addDoc(collection(db, 'payrollTax'), { ...record, createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' });
    await logAudit('Computed payroll tax', record.employeeName, `${record.period} · PAYE ${money(record.paye)} · NSSF ${money(record.nssfEmployee)}`);
  }, [logAudit]);

  const handleSaveCorporateTax = useCallback(async (record) => {
    await addDoc(collection(db, 'corporateTax'), { ...record, createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' });
    await logAudit('Estimated corporate tax', record.period, money(record.taxDue));
  }, [logAudit]);

  const handleFileTax = useCallback(async (kind, record) => {
    if (!window.confirm(`Mark this ${kind === 'payroll' ? 'payroll' : 'corporate tax'} record as filed with the relevant authority?`)) return;
    await updateDoc(doc(db, kind === 'payroll' ? 'payrollTax' : 'corporateTax', record.id), { status: 'filed', filedAt: serverTimestamp(), filedBy: auth.currentUser?.email || 'unknown' });
    await logAudit('Filed tax record', record.employeeName || record.period, kind);
  }, [logAudit]);

  // ── Derived: filters ─────────────────────────────────────────────────────
  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return ledgerEntries
      .filter(e => ledgerFilter === 'all' || e.entryType === ledgerFilter)
      .filter(e => !q || e.memo?.toLowerCase().includes(q) || e.reference?.toLowerCase().includes(q) ||
        (e.lines || []).some(l => l.accountName?.toLowerCase().includes(q)));
  }, [ledgerEntries, ledgerFilter, ledgerSearch]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return invoices
      .filter(i => invoiceStatusFilter === 'All' || i.status === invoiceStatusFilter)
      .filter(i => !q || i.customerName?.toLowerCase().includes(q) || i.invoiceNo?.toLowerCase().includes(q));
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  const invoiceCounts = useMemo(() => {
    const c = { All: invoices.length };
    INVOICE_STATUSES.forEach(st => { c[st] = invoices.filter(i => i.status === st).length; });
    return c;
  }, [invoices]);

  // ── Exports ───────────────────────────────────────────────────────────────
  const exportLedgerCSV = () => downloadCSV('slirus_general_ledger.csv', toCSV(filteredLedger, [
    { label: 'Date', get: e => fmtDate(e.date) },
    { label: 'Reference', get: e => e.reference },
    { label: 'Book', get: e => e.entryType },
    { label: 'Description', get: e => e.memo },
    { label: 'Debit', get: e => lineTotals(e.lines || []).debit },
    { label: 'Credit', get: e => lineTotals(e.lines || []).credit },
    { label: 'Status', get: e => e.status },
  ]));

  const exportInvoicesCSV = () => downloadCSV('slirus_invoices.csv', toCSV(filteredInvoices, [
    { label: 'Invoice No', get: i => i.invoiceNo },
    { label: 'Customer', get: i => i.customerName },
    { label: 'Issue Date', get: i => fmtDate(i.issueDate) },
    { label: 'Due Date', get: i => fmtDate(i.dueDate) },
    { label: 'Total', get: i => i.total },
    { label: 'Status', get: i => i.status },
  ]));

  const exportStatementCSV = (label, rows) => downloadCSV(`slirus_${label}.csv`, toCSV(rows, [
    { label: 'Code', get: a => a.code },
    { label: 'Account', get: a => a.name },
    { label: 'Balance', get: a => a.balance },
  ]));

  // ── Render gates ─────────────────────────────────────────────────────────
  if (authLoading || (user && !isAdmin && profileLoading)) {
    return <div style={s.loginBg}><p style={{ color: '#5A7A9A' }}>Loading…</p></div>;
  }
  if (!user) return <LoginScreen />;
  if (!hasAccess) return <AccessDenied email={user.email} onLogout={() => signOut(auth)} />;

  return (
    <Layout>
      <div style={s.page}>
        {idleWarning && (
          <div style={s.errorBanner}>⏳ You've been idle a while — you'll be signed out automatically in a couple of minutes for security.</div>
        )}
        {dataError && <div style={s.errorBanner}>⚠️ {dataError}</div>}

        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>CFO Control Center</h1>
            <p style={s.pageSub}>
              Cash {money(totalCash)} · Receivable {money(totalReceivable)} · Payable {money(totalPayable)} · signed in as {user.email}
            </p>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Sign Out ⎋'}
          </button>
        </div>

        <div style={s.dashSwitcher}>
          <button style={{ ...s.dashTab, ...(activeTab === 'dashboard' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'ledger' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('ledger')}>📘 Ledger & Cash Book</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'invoicing' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('invoicing')}>🧾 Invoicing</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'tax' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('tax')}>🏛️ Tax Compliance</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'statements' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('statements')}>📑 Financial Statements</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'accounts' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('accounts')}>⚙️ Chart of Accounts</button>
        </div>

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <>
            <h2 style={s.sectionHead}>Company-Wide Financial Snapshot</h2>
            <div style={{ ...s.trackGrid, marginBottom: 28 }}>
              <StatCard label="Cash & Bank" value={money(totalCash)} accent="#1A3C5E" />
              <StatCard label="Accounts Receivable" value={money(totalReceivable)} accent="#2E6DA4" sub={`${invoiceCounts.sent || 0} unpaid invoices`} />
              <StatCard label="Accounts Payable" value={money(totalPayable)} accent="#EF4444" />
              <StatCard label="Net Income (to date)" value={money(incomeStatement.netIncome)} accent={incomeStatement.netIncome >= 0 ? '#10B981' : '#EF4444'} />
            </div>
            <div style={{ ...s.trackGrid, marginBottom: 28 }}>
              <StatCard label="Revenue" value={money(incomeStatement.totalRevenue)} accent="#059669" />
              <StatCard label="Expenses" value={money(incomeStatement.totalExpenses)} accent="#B91C1C" />
              <StatCard label="Ledger Entries" value={ledgerEntries.filter(e => e.status !== 'void').length} accent="#7C3AED" sub="Posted, last 500 shown" />
              <StatCard label="Invoices Outstanding" value={invoiceCounts.sent || 0} accent="#F59E0B" sub={`${invoiceCounts.overdue || 0} overdue`} />
            </div>
            {!balanceSheet.assets.length && !balanceSheet.liabilities.length && (
              <div style={s.tableMsg}>
                No chart of accounts yet. Head to <strong>Chart of Accounts</strong> to seed the defaults and start posting entries.
              </div>
            )}
          </>
        )}

        {/* ── Ledger & Cash Book ── */}
        {activeTab === 'ledger' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Double-Entry Ledger</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportLedgerCSV}>⬇ Export CSV</button>
                {canWrite && (
                  <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowJournalModal(true)}>
                    ➕ New Entry
                  </button>
                )}
              </div>
            </div>

            <div style={s.toolbar}>
              <div style={s.tabs}>
                {[{ key: 'all', label: 'All' }, ...ENTRY_TYPES].map(t => (
                  <button key={t.key} style={{ ...s.tab, ...(ledgerFilter === t.key ? s.tabActive : {}) }} onClick={() => setLedgerFilter(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <input style={s.searchInput} placeholder="Search reference, memo, or account…" value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)} />
            </div>

            <div style={s.tableWrap}>
              {loadingData ? (
                <div style={s.tableMsg}>Loading ledger…</div>
              ) : filteredLedger.length === 0 ? (
                <div style={s.tableMsg}>No entries yet{canWrite ? ' — post your first journal entry above.' : '.'}</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Date</th>
                      <th style={s.th}>Reference</th>
                      <th style={s.th}>Description</th>
                      <th style={s.th}>Lines</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Debit</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Credit</th>
                      <th style={s.th}>Status</th>
                      {canDelete && <th style={s.th}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.map(e => {
                      const t = lineTotals(e.lines || []);
                      return (
                        <tr key={e.id} style={s.tr}>
                          <td style={s.td}>{fmtDate(e.date)}</td>
                          <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12.5 }}>{e.reference}</td>
                          <td style={s.td}>{e.memo}</td>
                          <td style={{ ...s.td, fontSize: 12.5, color: '#5A7A9A' }}>
                            {(e.lines || []).map(l => `${l.accountName} ${l.debit ? 'Dr ' + money(l.debit) : 'Cr ' + money(l.credit)}`).join(' · ')}
                          </td>
                          <td style={{ ...s.td, textAlign: 'right' }}>{money(t.debit)}</td>
                          <td style={{ ...s.td, textAlign: 'right' }}>{money(t.credit)}</td>
                          <td style={s.td}>
                            {e.status === 'void' ? <Badge text="Void" tone="gray" /> : <Badge text="Posted" tone="green" />}
                          </td>
                          {canDelete && (
                            <td style={s.td}>
                              {e.status !== 'void' && <button style={s.btnDelete} onClick={() => handleVoidEntry(e)}>Void</button>}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Invoicing ── */}
        {activeTab === 'invoicing' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Billing &amp; Invoicing</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportInvoicesCSV}>⬇ Export CSV</button>
                {canWrite && (
                  <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowInvoiceModal(true)}>
                    ➕ New Invoice
                  </button>
                )}
              </div>
            </div>

            <div style={s.toolbar}>
              <div style={s.tabs}>
                {['All', ...INVOICE_STATUSES].map(st => (
                  <button key={st} style={{ ...s.tab, ...(invoiceStatusFilter === st ? s.tabActive : {}) }} onClick={() => setInvoiceStatusFilter(st)}>
                    {st === 'All' ? 'All' : st[0].toUpperCase() + st.slice(1)} <span style={s.tabCount}>{invoiceCounts[st] || 0}</span>
                  </button>
                ))}
              </div>
              <input style={s.searchInput} placeholder="Search customer or invoice #…" value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} />
            </div>

            <div style={s.tableWrap}>
              {loadingData ? (
                <div style={s.tableMsg}>Loading invoices…</div>
              ) : filteredInvoices.length === 0 ? (
                <div style={s.tableMsg}>No invoices match your filters.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Invoice</th>
                      <th style={s.th}>Customer</th>
                      <th style={s.th}>Due</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                      <th style={s.th}>Status</th>
                      <th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} style={s.tr}>
                        <td style={s.td}>
                          <span style={{ fontWeight: 700, color: '#1A3C5E' }}>{inv.invoiceNo}</span>
                          <div style={{ fontSize: 12, color: '#7A8A9A' }}>Issued {fmtDate(inv.issueDate)}</div>
                        </td>
                        <td style={s.td}>{inv.customerName}</td>
                        <td style={s.td}>{fmtDate(inv.dueDate)}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{money(inv.total)}</td>
                        <td style={s.td}><Badge text={inv.status} tone={invoiceStatusTone(inv.status)} /></td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button style={s.btnView} onClick={() => printInvoice(inv)}>🖨 Print</button>
                            {canWrite && inv.status === 'draft' && (
                              <button style={s.btnShortlist} onClick={() => handleSendInvoice(inv)}>Send</button>
                            )}
                            {canApprove && ['sent', 'overdue'].includes(inv.status) && (
                              <button style={s.btnShortlist} onClick={() => setPaymentTarget(inv)}>Confirm Payment</button>
                            )}
                            {canEdit && inv.status !== 'void' && inv.status !== 'paid' && (
                              <button style={s.btnReject} onClick={() => handleVoidInvoice(inv)}>Void</button>
                            )}
                            {canDelete && inv.status === 'draft' && (
                              <button style={s.btnDelete} onClick={() => handleDeleteInvoice(inv)}>Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <h2 style={{ ...s.sectionHead, marginTop: 28 }}>Receipts</h2>
            <div style={s.tableWrap}>
              {receipts.length === 0 ? (
                <div style={s.tableMsg}>No receipts issued yet — receipts are created automatically when you confirm an invoice payment.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Receipt</th>
                      <th style={s.th}>Invoice</th>
                      <th style={s.th}>Customer</th>
                      <th style={s.th}>Method</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                      <th style={s.th}>Date</th>
                      <th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map(r => (
                      <tr key={r.id} style={s.tr}>
                        <td style={{ ...s.td, fontWeight: 700, color: '#1A3C5E' }}>{r.receiptNo}</td>
                        <td style={s.td}>{r.invoiceNo}</td>
                        <td style={s.td}>{r.customerName}</td>
                        <td style={s.td}>{r.method}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{money(r.amount)}</td>
                        <td style={s.td}>{fmtDate(r.date)}</td>
                        <td style={s.td}><button style={s.btnView} onClick={() => printReceipt(r)}>🖨 Print</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Tax Compliance ── */}
        {activeTab === 'tax' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>Payroll Tax — URA PAYE &amp; NSSF</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>Verify current rates with URA/NSSF before filing.</p>
              </div>
              {canWrite && (
                <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowPayrollModal(true)}>
                  🧮 Compute Payroll Tax
                </button>
              )}
            </div>
            <div style={s.tableWrap}>
              {payrollTax.length === 0 ? (
                <div style={s.tableMsg}>No payroll tax records yet.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Employee</th>
                      <th style={s.th}>Period</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Gross Pay</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>PAYE</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>NSSF (Emp.)</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Net Pay</th>
                      <th style={s.th}>Status</th>
                      {canApprove && <th style={s.th}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {payrollTax.map(p => (
                      <tr key={p.id} style={s.tr}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{p.employeeName}</td>
                        <td style={s.td}>{p.period}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{money(p.grossPay)}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{money(p.paye)}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{money(p.nssfEmployee)}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{money(p.netPay)}</td>
                        <td style={s.td}><Badge text={p.status} tone={p.status === 'filed' ? 'green' : 'amber'} /></td>
                        {canApprove && (
                          <td style={s.td}>
                            {p.status !== 'filed' && <button style={s.btnShortlist} onClick={() => handleFileTax('payroll', p)}>Mark Filed</button>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 14px', flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Corporate Tax</h2>
              {canWrite && (
                <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowCorpTaxModal(true)}>
                  🧮 Estimate Corporate Tax
                </button>
              )}
            </div>
            <div style={s.tableWrap}>
              {corporateTax.length === 0 ? (
                <div style={s.tableMsg}>No corporate tax estimates yet.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Period</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Taxable Income</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Rate</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Tax Due</th>
                      <th style={s.th}>Status</th>
                      {canApprove && <th style={s.th}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {corporateTax.map(c => (
                      <tr key={c.id} style={s.tr}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{c.period}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{money(c.taxableIncome)}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{(c.taxRate * 100).toFixed(0)}%</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{money(c.taxDue)}</td>
                        <td style={s.td}><Badge text={c.status} tone={c.status === 'filed' ? 'green' : 'amber'} /></td>
                        {canApprove && (
                          <td style={s.td}>
                            {c.status !== 'filed' && <button style={s.btnShortlist} onClick={() => handleFileTax('corporate', c)}>Mark Filed</button>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Financial Statements ── */}
        {activeTab === 'statements' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Financial Statements</h2>
              <div style={s.tabs}>
                {[{ key: 'balance', label: 'Balance Sheet' }, { key: 'income', label: 'Income Statement' }, { key: 'cashflow', label: 'Cash Flow' }].map(t => (
                  <button key={t.key} style={{ ...s.tab, ...(statementsTab === t.key ? s.tabActive : {}) }} onClick={() => setStatementsTab(t.key)}>{t.label}</button>
                ))}
              </div>
            </div>

            {statementsTab === 'balance' && (
              <div style={s.tableWrap}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ ...s.sectionHead, margin: 0 }}>Assets</h3>
                    <button style={s.tab} onClick={() => exportStatementCSV('balance_sheet_assets', balanceSheet.assets)}>⬇ Export</button>
                  </div>
                  {balanceSheet.assets.map(a => (
                    <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}>
                      <span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{money(a.balance)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, color: '#1A3C5E' }}>
                    <span>Total Assets</span><span>{money(balanceSheet.totalAssets)}</span>
                  </div>

                  <h3 style={{ ...s.sectionHead, marginTop: 20 }}>Liabilities</h3>
                  {balanceSheet.liabilities.map(a => (
                    <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}>
                      <span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{money(a.balance)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, color: '#1A3C5E' }}>
                    <span>Total Liabilities</span><span>{money(balanceSheet.totalLiabilities)}</span>
                  </div>

                  <h3 style={{ ...s.sectionHead, marginTop: 20 }}>Equity</h3>
                  {balanceSheet.equity.map(a => (
                    <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}>
                      <span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{money(a.balance)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8', fontStyle: 'italic', color: '#5A7A9A' }}>
                    <span>Current-period earnings</span><span>{money(incomeStatement.netIncome)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, color: '#1A3C5E' }}>
                    <span>Total Equity</span><span>{money(balanceSheet.totalEquity)}</span>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    {Math.abs(balanceSheet.balances) < 1
                      ? <Badge text="✓ Balance sheet balances (Assets = Liabilities + Equity)" tone="green" />
                      : <Badge text={`Out of balance by ${money(Math.abs(balanceSheet.balances))} — check for unposted or misclassified entries`} tone="red" />}
                  </div>
                </div>
              </div>
            )}

            {statementsTab === 'income' && (
              <div style={s.tableWrap}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ ...s.sectionHead, margin: 0 }}>Revenue</h3>
                    <button style={s.tab} onClick={() => exportStatementCSV('income_statement', [...incomeStatement.revenue, ...incomeStatement.expenses])}>⬇ Export</button>
                  </div>
                  {incomeStatement.revenue.map(a => (
                    <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}>
                      <span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{money(a.balance)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800 }}>
                    <span>Total Revenue</span><span>{money(incomeStatement.totalRevenue)}</span>
                  </div>

                  <h3 style={{ ...s.sectionHead, marginTop: 20 }}>Expenses</h3>
                  {incomeStatement.expenses.map(a => (
                    <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}>
                      <span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{money(a.balance)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800 }}>
                    <span>Total Expenses</span><span>{money(incomeStatement.totalExpenses)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', marginTop: 10, borderTop: '2px solid #1A3C5E', fontWeight: 800, fontSize: 16, color: incomeStatement.netIncome >= 0 ? '#059669' : '#B91C1C' }}>
                    <span>Net Income</span><span>{money(incomeStatement.netIncome)}</span>
                  </div>
                </div>
              </div>
            )}

            {statementsTab === 'cashflow' && (
              <div style={s.tableWrap}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}>
                    <span>Operating activities</span><span style={{ fontWeight: 600 }}>{money(cashFlowStatement.operating)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}>
                    <span>Investing activities</span><span style={{ fontWeight: 600 }}>{money(cashFlowStatement.investing)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}>
                    <span>Financing activities</span><span style={{ fontWeight: 600 }}>{money(cashFlowStatement.financing)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', marginTop: 10, borderTop: '2px solid #1A3C5E', fontWeight: 800, fontSize: 16 }}>
                    <span>Net Change in Cash</span><span>{money(cashFlowStatement.net)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#9AAAB8', marginTop: 14 }}>
                    Categorized automatically from the offsetting account on each ledger entry that touches Cash and Bank.
                    Tag accounts with the right cash-flow category in Chart of Accounts to keep this accurate.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Chart of Accounts ── */}
        {activeTab === 'accounts' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Chart of Accounts</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {accounts.length === 0 && canWrite && (
                  <button style={s.tab} onClick={seedChartOfAccounts}>🌱 Seed default chart</button>
                )}
                {canWrite && (
                  <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0 }} onClick={() => setShowAccountModal(true)}>
                    ➕ New Account
                  </button>
                )}
              </div>
            </div>
            <div style={s.tableWrap}>
              {accounts.length === 0 ? (
                <div style={s.tableMsg}>No accounts yet. Seed the default chart or add your own.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Code</th>
                      <th style={s.th}>Name</th>
                      <th style={s.th}>Type</th>
                      <th style={s.th}>Cash Flow Category</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Balance</th>
                      {canDelete && <th style={s.th}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(a => (
                      <tr key={a.code} style={s.tr}>
                        <td style={{ ...s.td, fontFamily: 'monospace' }}>{a.code}</td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{a.name}</td>
                        <td style={s.td}>{a.type}</td>
                        <td style={s.td}>{a.cashFlowCategory}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{money(accountBalances[a.code] || 0)}</td>
                        {canDelete && (
                          <td style={s.td}><button style={s.btnDelete} onClick={() => handleDeleteAccount(a)}>Delete</button></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {showJournalModal && (
        <JournalEntryModal accounts={accounts} entryTypeDefault={ledgerFilter === 'all' ? 'general' : ledgerFilter} onClose={() => setShowJournalModal(false)} onSave={handlePostEntry} />
      )}
      {showInvoiceModal && (
        <InvoiceModal onClose={() => setShowInvoiceModal(false)} onSave={handleCreateInvoice} />
      )}
      {showAccountModal && (
        <AccountModal onClose={() => setShowAccountModal(false)} onSave={handleAddAccount} />
      )}
      {showPayrollModal && (
        <PayrollTaxModal onClose={() => setShowPayrollModal(false)} onSave={handleSavePayroll} />
      )}
      {showCorpTaxModal && (
        <CorporateTaxModal onClose={() => setShowCorpTaxModal(false)} onSave={handleSaveCorporateTax} />
      )}
      {paymentTarget && (
        <ConfirmPaymentModal
          invoice={paymentTarget}
          cashAccounts={cashAccounts.length ? cashAccounts : accounts.filter(a => a.type === 'Asset')}
          receivableAccount={receivableAccount}
          onClose={() => setPaymentTarget(null)}
          onConfirm={(payload) => handleConfirmPayment(paymentTarget, payload)}
        />
      )}
    </Layout>
  );
}

// ─── Styles (matches CeoManager.jsx's palette for a consistent admin suite) ─
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
  th:      { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #E2E8F0' },
  miniBtn: { background: '#F0F4F8', border: '1px solid #E2E8F0', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: '#5A7A9A', cursor: 'pointer' },
};

const cu = {
  label:  { display: 'block', fontSize: 12, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, textAlign: 'left' },
  select: { width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
  credRow:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #F0F4F8' },
  credLabel: { fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4 },
  credVal:   { fontSize: 15, fontWeight: 600, color: '#1A3C5E' },
};

export default AccountsManager;