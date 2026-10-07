/**
 * AccountsManager.jsx – Slirus Global Limited Accounts & Tax Compliance Center
 *
 * Finance dashboard. Access is provisioned by the CEO Control Center
 * (CeoManager.jsx): a `teamUsers/{uid}` profile with department `Finance`
 * or an explicit `permissions.finance.*` grant is required to enter. Sits
 * alongside HrManager.jsx, CeoManager.jsx and Admin.jsx and reuses the same
 * auth/session, Layout, and document-generation conventions.
 *
 * Built directly from the Slirus multi-sector tax-compliance framework
 * (ICT, Fintech, Fashion, Agriculture, Real Estate — one entity, one TIN,
 * one pooled 30% Corporate Income Tax on net profit):
 *
 *  - General Ledger: every income/expense transaction tagged by Business
 *    Object (cost-center only — URA taxes the pool, not each object),
 *    VAT treatment (Standard 18% / Zero-Rated / Exempt / N/A), and
 *    Withholding Tax status (6% professional-fee WHT collected by
 *    government/corporate payers, logged as a CIT credit).
 *  - Fixed Assets & Capital Allowances: Class 1 computers (40%), Class 2
 *    plant/machinery (30%), Class 3 vehicles (20%), Industrial Buildings
 *    (5% straight-line), and non-depreciable Land — reducing-balance
 *    depreciation computed automatically per fiscal year.
 *  - Loans Register: principal (non-taxable), interest (deductible),
 *    debenture/mortgage registration tracking (URSB), 0.5% security
 *    stamp duty reference.
 *  - Contractors & Vouchers: Saturday-weekly-token + month-end-balance
 *    disbursement schedule for engagementType === 'Independent Contractor'
 *    staff pulled from the shared `employees` collection (HrManager owns
 *    that record; this module only reads it), backed by signed Internal
 *    Payment Vouchers (name, NIN, amount, task, signature) instead of
 *    payslips. Formal employee PAYE/NSSF payroll stays in HrManager.jsx —
 *    this module only surfaces it for the consolidated tax computation.
 *  - Dividends: 15% final Withholding Tax on distributions to the
 *    resident shareholder, board-resolution log.
 *  - Corporate Income Tax Engine: pools all objects' income and allowable
 *    expenses, deducts capital allowances, applies cumulative loss
 *    carry-forward year over year, nets off WHT credits already
 *    collected, and produces the 30% CIT computation for any fiscal year.
 *  - Compliance Calendar: URSB Annual Return (42 days post-AGM), URA CIT/
 *    PAYE/VAT/WHT filing dates, auto-flagged when due soon.
 *
 * Branding on generated documents (Invoice, Payment Voucher, Dividend
 * Certificate, Loan Note, CIT Computation Sheet) uses the company logo at
 * `/Slirus.png` in the public folder, matching HrManager.jsx.
 *
 * IMPORTANT — this is a records/compliance-support tool, not a filing
 * system: it does not call the live URA EFRIS API. Every figure it
 * produces should be reviewed by a qualified accountant/tax advisor
 * before being relied on for an actual URA or URSB filing.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, auth } from '../firebase/firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';

// ─── Config ─────────────────────────────────────────────────────────────────
const CEO_EMAIL = (import.meta.env.VITE_CEO_EMAIL || 'kaayamosesawal@gmail.com').toLowerCase();

const COMPANY_INFO = {
  name: 'Slirus Global Limited',
  address: 'P.O Box 332485, Lira -Uganda',
  phone: '+256 776 079 495',
  email: 'accounts@slirus.com',
  website: 'https://slirus.com',
  logo: '/Slirus.png',
};

// Business objects (sectors) — internal cost-center tagging only. URA does
// not tax these separately; every object's income/expense pools into one
// consolidated 30% Corporate Income Tax computation. See module header.
const ACCOUNTING_OBJECTS = [
  'ICT & Software Services', 'Financial Technology (Fintech)', 'Fashion & Retail',
  'Agriculture', 'Real Estate', 'General / Corporate',
];

const TXN_TYPES = ['Income', 'Expense'];
const INCOME_CATEGORIES = ['Service Fees / Contracts', 'Product Sales', 'Rental Income', 'Interest Income', 'Other Income'];
const EXPENSE_CATEGORIES = [
  'Contractor / Service Fees', 'Salaries & Wages (PAYE, reference only)', 'Rent & Utilities',
  'Marketing & Advertising', 'Transport & Logistics', 'Professional & Legal Fees',
  'Raw Materials / Inputs', 'Office Supplies & Minor Equipment (<1M, immediate write-off)',
  'Bank & Loan Interest', 'Other Operating Expense',
];
const VAT_TREATMENTS = ['Standard-Rated (18%)', 'Zero-Rated', 'Exempt', 'Not Applicable'];
const PAYMENT_METHODS = ['Bank Transfer', 'Mobile Money', 'Cash', 'Cheque'];

const VAT_RATE = 0.18;
const CIT_RATE = 0.30;
const WHT_RATE_PROFESSIONAL = 0.06;
const WHT_RATE_DIVIDEND = 0.15;
const STAMP_DUTY_LAND_RATE = 0.01;
// General reference only — confirm the current figure with URA before relying
// on it; VAT registration thresholds are periodically revised by Parliament.
const VAT_REGISTRATION_THRESHOLD = 150000000;

// ─── Fixed Asset Classes (Capital Allowances / Wear & Tear) ────────────────
// General reference only, not a substitute for a qualified tax advisor.
// Confirm current rates against the Income Tax Act's Third Schedule before
// filing. Reducing-balance for Class 1–3; straight-line for buildings; Land
// is never depreciable.
const ASSET_CLASSES = [
  { code: 'land', label: 'Land (Non-Depreciable)', rate: 0, method: 'none' },
  { code: 'class1', label: 'Class 1 — Computers, Servers & IT Equipment (40% reducing balance)', rate: 0.40, method: 'reducing' },
  { code: 'class2', label: 'Class 2 — Plant & Machinery (30% reducing balance)', rate: 0.30, method: 'reducing' },
  { code: 'class3', label: 'Class 3 — Vehicles & Transport Equipment (20% reducing balance)', rate: 0.20, method: 'reducing' },
  { code: 'building', label: 'Industrial / Commercial Building (5% straight-line)', rate: 0.05, method: 'straight' },
];
const assetClassByCode = (code) => ASSET_CLASSES.find(c => c.code === code) || ASSET_CLASSES[0];

// Company's elected accounting period start month (1 = January, 7 = July —
// the government default). Kept as a simple in-app constant; wire to a
// Firestore `financeSettings/config` doc if this ever needs to be editable
// from the UI without a redeploy.
const FISCAL_YEAR_START_MONTH = 7;

const CONTRACTOR_VOUCHER_TYPES = ['Weekly Operational Token', 'Monthly Project Completion Balance'];

const COMPLIANCE_EVENT_TYPES = [
  'URSB Annual Return', 'URA Corporate Income Tax (CIT) Annual Return',
  'URA PAYE Monthly Remittance', 'URA VAT Monthly Return', 'URA WHT Monthly Return',
  'Other',
];

const LOAN_STATUSES = ['Active', 'Fully Repaid', 'Defaulted'];

// ─── Double-Entry Books, Invoicing & Financial Statements ──────────────────
// A second, formal bookkeeping layer that sits alongside the Tax Ledger
// above. The Tax Ledger drives the CIT engine (single-entry, VAT/WHT
// aware); this layer is a proper double-entry Chart of Accounts + General
// Journal that produces a real Balance Sheet, Income Statement, and Cash
// Flow Statement. Confirming an invoice payment posts a balanced journal
// entry here AND (see handleConfirmPayment) drops a matching entry into
// the Tax Ledger so the CIT computation never has to be reconciled by hand.
const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
const DEBIT_NORMAL_TYPES = new Set(['Asset', 'Expense']);
const CASH_FLOW_CATEGORIES = ['operating', 'investing', 'financing'];

const DEFAULT_CHART_OF_ACCOUNTS = [
  { code: '1000', name: 'Cash and Bank',              type: 'Asset',     cashFlowCategory: 'operating' },
  { code: '1100', name: 'Accounts Receivable',        type: 'Asset',     cashFlowCategory: 'operating' },
  { code: '1200', name: 'Inventory',                  type: 'Asset',     cashFlowCategory: 'operating' },
  { code: '1300', name: 'Withholding Tax Credits (URA)', type: 'Asset',  cashFlowCategory: 'operating' },
  { code: '1500', name: 'Fixed Assets',               type: 'Asset',     cashFlowCategory: 'investing' },
  { code: '2000', name: 'Accounts Payable',           type: 'Liability', cashFlowCategory: 'operating' },
  { code: '2100', name: 'PAYE Payable (URA)',         type: 'Liability', cashFlowCategory: 'operating' },
  { code: '2200', name: 'NSSF Payable',                type: 'Liability', cashFlowCategory: 'operating' },
  { code: '2300', name: 'Corporate Tax Payable',      type: 'Liability', cashFlowCategory: 'operating' },
  { code: '2400', name: 'VAT Payable (Output VAT)',   type: 'Liability', cashFlowCategory: 'operating' },
  { code: '2500', name: 'Loans Payable',              type: 'Liability', cashFlowCategory: 'financing' },
  { code: '3000', name: "Owner's Equity",             type: 'Equity',    cashFlowCategory: 'financing' },
  { code: '3100', name: 'Retained Earnings',          type: 'Equity',    cashFlowCategory: 'financing' },
  { code: '4000', name: 'Sales Revenue',              type: 'Revenue',   cashFlowCategory: 'operating' },
  { code: '4100', name: 'Service Revenue',            type: 'Revenue',   cashFlowCategory: 'operating' },
  { code: '5000', name: 'Cost of Goods Sold',         type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5100', name: 'Salaries & Contractor Fees', type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5200', name: 'Rent Expense',               type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5300', name: 'Utilities Expense',          type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5400', name: 'Office Supplies',            type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5900', name: 'Tax Expense',                type: 'Expense',   cashFlowCategory: 'operating' },
];

const ENTRY_TYPES = [
  { key: 'general', label: 'General Journal' },
  { key: 'cash', label: 'Cash Book' },
  { key: 'payable', label: 'Accounts Payable' },
  { key: 'receivable', label: 'Accounts Receivable' },
];

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void'];

const IDLE_LIMIT_MS = 20 * 60 * 1000;
const IDLE_WARN_MS = 18 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return '—';
  if (ts?.toDate) return ts.toDate().toLocaleDateString('en-UG');
  const d = new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-UG');
};
const fmtDateTime = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-UG') : (ts ? new Date(ts).toLocaleString('en-UG') : '—'));
const fmtMoney = (n) => 'UGX ' + Math.round(Number(n) || 0).toLocaleString('en-UG');
const fmtPct = (n) => `${(Number(n) * 100).toFixed(0)}%`;

const toDateObj = (v) => {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

const generateRef = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

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

const uid4 = () => Math.random().toString(36).slice(2, 6).toUpperCase();
const genInvoiceNo = () => `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
const genReceiptNo = () => `RCT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

// ── Double-entry helpers ────────────────────────────────────────────────
const lineTotals = (lines) => lines.reduce(
  (acc, l) => ({ debit: acc.debit + (Number(l.debit) || 0), credit: acc.credit + (Number(l.credit) || 0) }),
  { debit: 0, credit: 0 }
);
const isBalanced = (lines) => {
  const { debit, credit } = lineTotals(lines);
  return debit > 0 && Math.abs(debit - credit) < 0.5;
};
// Balance per account code from posted (non-void) journal entries.
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

// ─── Fiscal year helpers ────────────────────────────────────────────────────
// A fiscal year is identified by its *starting* calendar year (e.g. for a
// July start, startYear=2025 means 1 Jul 2025 – 30 Jun 2026).
const fiscalStartYearOf = (dateObj, startMonth = FISCAL_YEAR_START_MONTH) => {
  const y = dateObj.getFullYear(), m = dateObj.getMonth() + 1;
  return m >= startMonth ? y : y - 1;
};
const fiscalYearLabel = (startYear, startMonth = FISCAL_YEAR_START_MONTH) =>
  startMonth === 1 ? String(startYear) : `${startYear}/${startYear + 1}`;
const fiscalYearBounds = (startYear, startMonth = FISCAL_YEAR_START_MONTH) => {
  const start = new Date(startYear, startMonth - 1, 1);
  const end = new Date(startYear + 1, startMonth - 1, 0, 23, 59, 59);
  return { start, end };
};
const listFiscalYearOptions = (startMonth = FISCAL_YEAR_START_MONTH, span = 6) => {
  const cur = fiscalStartYearOf(new Date(), startMonth);
  const opts = [];
  for (let y = cur - span + 1; y <= cur; y++) opts.push({ startYear: y, label: fiscalYearLabel(y, startMonth) });
  return opts.reverse();
};

const inFiscalYear = (dateObj, startYear, startMonth = FISCAL_YEAR_START_MONTH) => {
  if (!dateObj) return false;
  const { start, end } = fiscalYearBounds(startYear, startMonth);
  return dateObj >= start && dateObj <= end;
};

// ─── Depreciation (Capital Allowances) ─────────────────────────────────────
// Reducing-balance for Class 1–3, straight-line (capped at cost) for
// buildings, zero for land. Does not prorate for mid-year acquisition —
// a simplification; confirm treatment with your accountant for assets
// acquired close to a fiscal year boundary.
const depreciationForAsset = (asset, targetStartYear, startMonth = FISCAL_YEAR_START_MONTH) => {
  const cls = assetClassByCode(asset.assetClass);
  const cost = Number(asset.cost) || 0;
  if (cls.rate <= 0 || cost <= 0) return { opening: 0, depreciation: 0, closing: cost, accumulated: 0, acquired: true };
  const acqDate = toDateObj(asset.acquisitionDate);
  if (!acqDate) return { opening: 0, depreciation: 0, closing: 0, accumulated: 0, acquired: false };
  const acqYear = fiscalStartYearOf(acqDate, startMonth);
  if (targetStartYear < acqYear) return { opening: 0, depreciation: 0, closing: 0, accumulated: 0, acquired: false };
  let book = cost, accumulated = 0;
  for (let y = acqYear; y < targetStartYear; y++) {
    const dep = cls.method === 'straight' ? Math.min(cost * cls.rate, book) : book * cls.rate;
    book -= dep; accumulated += dep;
  }
  const opening = book;
  const depreciation = cls.method === 'straight' ? Math.min(cost * cls.rate, opening) : opening * cls.rate;
  const closing = Math.max(0, opening - depreciation);
  return { opening, depreciation, closing, accumulated: accumulated + depreciation, acquired: true };
};

// ─── Corporate Income Tax engine ───────────────────────────────────────────
// Walks every fiscal year from the earliest transaction/asset on record up
// to (and including) targetStartYear, pooling all business-object income
// and allowable expenses, netting capital allowances, and carrying forward
// any unabsorbed loss — exactly the mechanism discussed for a multi-sector
// single entity taxed on one consolidated net profit.
const computeCITForYear = (transactions, fixedAssets, targetStartYear, startMonth = FISCAL_YEAR_START_MONTH) => {
  const withDates = transactions.map(t => ({ ...t, _date: toDateObj(t.date) })).filter(t => t._date);
  const earliestTxnYear = withDates.length ? Math.min(...withDates.map(t => fiscalStartYearOf(t._date, startMonth))) : targetStartYear;
  const earliestAssetYear = fixedAssets.length
    ? Math.min(...fixedAssets.map(a => { const d = toDateObj(a.acquisitionDate); return d ? fiscalStartYearOf(d, startMonth) : targetStartYear; }))
    : targetStartYear;
  const startYear = Math.min(earliestTxnYear, earliestAssetYear, targetStartYear);

  let lossPool = 0;
  let result = null;
  for (let y = startYear; y <= targetStartYear; y++) {
    const yearTxns = withDates.filter(t => inFiscalYear(t._date, y, startMonth));
    const totalIncome = yearTxns.filter(t => t.type === 'Income').reduce((s, t) => s + (Number(t.grossAmount) || 0), 0);
    const totalExpenses = yearTxns.filter(t => t.type === 'Expense').reduce((s, t) => s + (Number(t.grossAmount) || 0), 0);
    const totalDepreciation = fixedAssets.reduce((s, a) => s + depreciationForAsset(a, y, startMonth).depreciation, 0);
    const totalVatCollected = yearTxns.filter(t => t.type === 'Income' && t.vatTreatment === VAT_TREATMENTS[0]).reduce((s, t) => s + (Number(t.vatAmount) || 0), 0);
    const totalWhtCredits = yearTxns.filter(t => t.type === 'Income' && t.whtWithheld).reduce((s, t) => s + (Number(t.whtAmount) || 0), 0);

    const netBeforeLoss = totalIncome - totalExpenses - totalDepreciation;
    let chargeable, lossUtilised = 0, lossCarriedIn = lossPool;
    if (netBeforeLoss <= 0) {
      chargeable = 0;
      lossPool += -netBeforeLoss;
    } else {
      lossUtilised = Math.min(lossPool, netBeforeLoss);
      chargeable = netBeforeLoss - lossUtilised;
      lossPool -= lossUtilised;
    }
    const citGross = chargeable * CIT_RATE;
    const citPayable = Math.max(0, citGross - totalWhtCredits);

    result = {
      startYear: y, label: fiscalYearLabel(y, startMonth),
      totalIncome, totalExpenses, totalDepreciation, totalVatCollected, totalWhtCredits,
      netBeforeLoss, lossCarriedIn, lossUtilised, lossCarriedOut: lossPool,
      chargeable, citGross, citPayable,
      // Every transaction that fed the totals above, oldest first — lets the
      // CIT sheet show its working, not just the final numbers.
      transactions: [...yearTxns].sort((a, b) => (a._date || 0) - (b._date || 0)),
    };
  }
  return result;
};

// ─── Print / "download as PDF" window (browser Print → Save as PDF) ───────
// Most documents (ledger/journal/statement exports, the CIT sheet's
// transaction tables, loan/voucher/dividend notes) read better wide, so
// landscape is the default. The three document types meant to be handed to
// someone as a single compact page — the payment Receipt, the Annual
// Corporate Income Tax Computation, and both invoice prints (Tax Invoice +
// formal line-item Invoice) — stay portrait, matching how they're actually
// used (folded, filed, or attached to an email as a one-pager).
const openPrintWindow = (title, bodyHtml, orientation = 'landscape') => {
  const isLandscape = orientation === 'landscape';
  const win = window.open('', '_blank', isLandscape ? 'width=1100,height=850' : 'width=850,height=1100');
  if (!win) { alert('Please allow pop-ups to download this document.'); return; }
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4 ${orientation}; margin: 14mm; }
          * { box-sizing: border-box; }
          body { font-family: Georgia, 'Times New Roman', serif; color: #1A1A1A; padding: 48px 56px; line-height: 1.55; font-size: 13.5px; }
          h1 { font-size: 19px; margin: 0 0 2px; letter-spacing: 0.3px; }
          h2 { font-size: 14px; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 26px 0 18px; border-top: 2px solid #1A3C5E; border-bottom: 2px solid #1A3C5E; padding: 10px 0; }
          h3 { font-size: 13px; margin: 20px 0 6px; color: #1A3C5E; }
          .muted { color: #5A7A9A; font-size: 12px; font-family: Arial, Helvetica, sans-serif; }
          .headRow { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0D9488; padding-bottom: 14px; margin-bottom: 6px; font-family: Arial, Helvetica, sans-serif; }
          .logo { height: 52px; width: auto; margin-bottom: 6px; display: block; }
          .clause { margin: 0 0 12px; text-align: justify; }
          table.ref { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; }
          table.ref th, table.ref td { border: 1px solid #D0DCE8; padding: 6px 10px; text-align: left; }
          table.ref th { background: #F7F9FC; }
          .blank { display: inline-block; border-bottom: 1px solid #1A1A1A; min-width: 160px; }
          .sigblock { display: flex; justify-content: space-between; margin-top: 46px; font-family: Arial, Helvetica, sans-serif; }
          .sigcol { width: 46%; }
          .sigline { border-top: 1px solid #1A1A1A; margin-top: 46px; padding-top: 4px; font-size: 12px; }
          .footerNote { margin-top: 34px; font-size: 11px; color: #9AAAB8; font-family: Arial, Helvetica, sans-serif; border-top: 1px solid #E2E8F0; padding-top: 10px; }
          @media print { .no-print { display: none; } body { padding: 24px 32px; } }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <div class="no-print" style="margin-top:30px;">
          <button onclick="window.print()" style="padding:10px 18px;background:#0D9488;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:Arial,Helvetica,sans-serif;">Print / Save as PDF</button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
};

const logoImgTag = () => `<img class="logo" src="${window.location.origin}${COMPANY_INFO.logo}" alt="${COMPANY_INFO.name} logo" onerror="this.style.display='none'" />`;

// ─── Record exports: table → PDF (via the print window above) ──────────────
// Every "⬇ Export" button on a record list used to build a CSV file and
// trigger a browser download. They now render the same rows/columns as a
// branded HTML table and hand it to openPrintWindow, so the user gets a
// "Print / Save as PDF" document instead of a .csv file — same columns,
// same data, just a PDF export rather than a CSV one.
const escapeHtml = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const buildTablePdfHtml = (title, rows, columns) => `
  <div class="headRow">
    <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email} · ${COMPANY_INFO.website}</p></div>
    <p class="muted">Generated: ${fmtDate(new Date())}</p>
  </div>
  <h2>${escapeHtml(title)}</h2>
  <table class="ref">
    <thead><tr>${columns.map(c => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows.length
        ? rows.map(r => `<tr>${columns.map(c => `<td>${escapeHtml(c.get(r))}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${columns.length}" style="text-align:center;color:#9AAAB8;">No records</td></tr>`}
    </tbody>
  </table>
`;
const exportTablePDF = (title, rows, columns) => openPrintWindow(title, buildTablePdfHtml(title, rows, columns));

// ─── Document builders ──────────────────────────────────────────────────────

// Tax Invoice / Sales Record — EFRIS fields are left as manual-entry
// placeholders since this module doesn't call the live URA EFRIS API; fill
// the FDN / anti-fake code / QR after fiscalizing through the URA portal.
const buildInvoiceHtml = (txn) => {
  const vatOn = txn.vatTreatment === VAT_TREATMENTS[0];
  return `
    <div class="headRow">
      <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email} · ${COMPANY_INFO.website}</p></div>
      <p class="muted">Invoice Ref: ${txn.ref || '—'}<br/>Date: ${fmtDate(txn.date)}<br/>Business Object: ${txn.object || '—'}</p>
    </div>
    <h2>Tax Invoice / Sales Record</h2>
    <p class="clause"><strong>Billed To:</strong> ${txn.counterpartyName || '<span class="blank">&nbsp;</span>'} ${txn.counterpartyTIN ? `(TIN: ${txn.counterpartyTIN})` : ''}</p>
    <table class="ref">
      <thead><tr><th>Description</th><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr><td>${txn.description || '—'}</td><td>${txn.category || '—'}</td><td style="text-align:right">${fmtMoney(txn.grossAmount)}</td></tr>
        <tr><td colspan="2">VAT Treatment: ${txn.vatTreatment || '—'}</td><td style="text-align:right">${vatOn ? fmtMoney(txn.vatAmount) : '—'}</td></tr>
        <tr style="font-weight:700;"><td colspan="2">Total ${vatOn ? '(VAT-Inclusive)' : ''}</td><td style="text-align:right">${fmtMoney((Number(txn.grossAmount) || 0) + (vatOn ? Number(txn.vatAmount) || 0 : 0))}</td></tr>
      </tbody>
    </table>
    <h3>Withholding Tax</h3>
    <p class="clause">${txn.whtWithheld
      ? `The payer withheld 6% Withholding Tax of <strong>${fmtMoney(txn.whtAmount)}</strong> at source${txn.whtCertificateNo ? `, certificate no. <strong>${txn.whtCertificateNo}</strong>` : ''}. This amount is claimed as a credit against ${COMPANY_INFO.name}'s annual Corporate Income Tax.`
      : 'No Withholding Tax was deducted at source on this transaction (payer is not a designated government/corporate withholding agent). The full amount is declared as gross revenue for Corporate Income Tax purposes.'}</p>
    <h3>EFRIS Fiscalization</h3>
    <p class="clause">FDN: <span class="blank">&nbsp;</span> &nbsp;&nbsp; Anti-Fake Code: <span class="blank">&nbsp;</span> &nbsp;&nbsp; QR Ref: <span class="blank">&nbsp;</span></p>
    <p class="clause" style="font-size:11px;color:#9AAAB8;">To be completed after fiscalizing this sale through the URA EFRIS portal/device.</p>
    <div class="footerNote">Generated by the Slirus Accounts &amp; Tax Compliance Center. This record supports internal bookkeeping and EFRIS entry — it is not itself a fiscalized URA document.</div>
  `;
};

// Internal Payment Voucher for Independent Contractors — mirrors the
// Saturday-weekly-token / month-end-balance structure and NIN/signature
// paper trail discussed for the informal-but-compliant disbursement model.
const buildVoucherHtml = (voucher, contractorName) => `
  <div class="headRow">
    <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email}</p></div>
    <p class="muted">Voucher Ref: ${voucher.ref || '—'}<br/>Date: ${fmtDate(voucher.date)}</p>
  </div>
  <h2>Internal Payment Voucher</h2>
  <p class="clause"><strong>Service Provider:</strong> ${contractorName || '<span class="blank">&nbsp;</span>'} &nbsp;&nbsp; <strong>National ID (NIN):</strong> ${voucher.nin || '<span class="blank">&nbsp;</span>'}</p>
  <table class="ref">
    <tbody>
      <tr><td>Payment Type</td><td>${voucher.voucherType || '—'}</td></tr>
      <tr><td>Task / Deliverable Description</td><td>${voucher.taskDescription || '—'}</td></tr>
      <tr><td>Payment Method</td><td>${voucher.paymentMethod || '—'}</td></tr>
      <tr style="font-weight:700;"><td>Amount Paid</td><td>${fmtMoney(voucher.amount)}</td></tr>
      ${voucher.whtWithheld ? `<tr><td>Withholding Tax (6%) Deducted</td><td>${fmtMoney(voucher.whtAmount)}</td></tr>
      <tr style="font-weight:700;"><td>Net Amount Disbursed</td><td>${fmtMoney((Number(voucher.amount) || 0) - (Number(voucher.whtAmount) || 0))}</td></tr>` : ''}
    </tbody>
  </table>
  <p class="clause">I acknowledge receipt of the above amount in full settlement for the task/deliverable described, under the Independent Service and Task Execution Agreement between myself and ${COMPANY_INFO.name}.</p>
  <div class="sigblock">
    <div class="sigcol"><div class="sigline">Service Provider Signature / Thumbprint &nbsp;&nbsp; Date: __________</div></div>
    <div class="sigcol"><div class="sigline">Paid by (Company Representative) &nbsp;&nbsp; Date: __________</div></div>
  </div>
  <div class="footerNote">This voucher is an internal record supporting Slirus's Field Operations &amp; Project Labor expense ledger. Retain for at least 5 years alongside the corresponding Independent Service Agreement.</div>
`;

// Dividend Distribution & Withholding Tax Certificate
const buildDividendHtml = (dividend) => `
  <div class="headRow">
    <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email}</p></div>
    <p class="muted">Ref: ${dividend.ref || '—'}<br/>Date: ${fmtDate(dividend.date)}</p>
  </div>
  <h2>Dividend Distribution &amp; Withholding Tax Certificate</h2>
  <p class="clause">Pursuant to a resolution of the Director/Shareholder of ${COMPANY_INFO.name} dated <strong>${fmtDate(dividend.date)}</strong>${dividend.resolutionRef ? ` (Resolution Ref: <strong>${dividend.resolutionRef}</strong>)` : ''}, a dividend is declared and paid to <strong>${dividend.shareholder || '<span class="blank">&nbsp;</span>'}</strong> as follows:</p>
  <table class="ref">
    <tbody>
      <tr><td>Gross Dividend Declared</td><td style="text-align:right">${fmtMoney(dividend.amount)}</td></tr>
      <tr><td>Withholding Tax (15%, final tax)</td><td style="text-align:right">-${fmtMoney(dividend.whtAmount)}</td></tr>
      <tr style="font-weight:700;font-size:14px;"><td>Net Amount Paid to Shareholder</td><td style="text-align:right">${fmtMoney((Number(dividend.amount) || 0) - (Number(dividend.whtAmount) || 0))}</td></tr>
    </tbody>
  </table>
  <p class="clause" style="font-size:11px;color:#9AAAB8;">The 15% Withholding Tax above is remitted by ${COMPANY_INFO.name} to the URA as final tax on this dividend income and does not require further declaration by the recipient individual for this amount.</p>
  <div class="sigblock">
    <div class="sigcol"><div class="sigline">For ${COMPANY_INFO.name} &nbsp;&nbsp; Name: __________________ &nbsp; Date: __________</div></div>
    <div class="sigcol"><div class="sigline">Received by Shareholder &nbsp;&nbsp; Name: ${dividend.shareholder || ''} &nbsp; Date: __________</div></div>
  </div>
  <div class="footerNote">Retain alongside the board resolution for at least 5 years for URA audit purposes.</div>
`;

// Loan Facility & Debenture Summary Note
const buildLoanHtml = (loan) => `
  <div class="headRow">
    <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email}</p></div>
    <p class="muted">Ref: ${loan.ref || '—'}<br/>Date: ${fmtDate(loan.disbursedDate)}</p>
  </div>
  <h2>Loan Facility &amp; Security Summary Note</h2>
  <table class="ref">
    <tbody>
      <tr><td>Lender</td><td>${loan.lender || '—'}</td></tr>
      <tr><td>Principal Amount</td><td>${fmtMoney(loan.principal)} (non-taxable — a liability, not income)</td></tr>
      <tr><td>Annual Interest Rate</td><td>${loan.interestRate ? `${loan.interestRate}%` : '—'}</td></tr>
      <tr><td>Disbursement Date</td><td>${fmtDate(loan.disbursedDate)}</td></tr>
      <tr><td>Term (months)</td><td>${loan.termMonths || '—'}</td></tr>
      <tr><td>Status</td><td>${loan.status || '—'}</td></tr>
      <tr><td>Outstanding Balance</td><td>${fmtMoney(loan.outstandingBalance)}</td></tr>
      <tr><td>Interest Paid to Date (tax-deductible)</td><td>${fmtMoney(loan.interestPaidTotal)}</td></tr>
      <tr><td>Security / Debenture Registered with URSB</td><td>${loan.debentureRegistered ? `Yes — Ref: ${loan.debentureRegNo || '—'}` : 'No / Unsecured'}</td></tr>
    </tbody>
  </table>
  <p class="clause" style="font-size:11px;color:#9AAAB8;">Loan principal is a balance-sheet liability, not taxable income. Interest paid is an allowable deduction against Corporate Income Tax. Any debenture or mortgage securing this facility should be registered with the URSB Security Interest Registry, generally within 21–42 days of creation.</p>
  <div class="footerNote">Notes: ${loan.notes || '—'}</div>
`;

// Annual Corporate Income Tax Computation Sheet — the actual output of the
// CIT engine above, formatted for accountant review / URA filing support.
// This is the single working document: every Tax Ledger transaction for the
// fiscal year (so every income/expense total is traceable, not just quoted),
// every fixed asset's capital allowance for the year, and — bringing the two
// together — a clearly labelled Net Profit figure (income less expenses
// less capital allowances) followed by the final Corporate Income Tax
// payable, so a reader gets "total profit" and "tax to be paid" from one
// document without cross-referencing anything else.
const buildCITHtml = (summary, assetsForYear = []) => {
  const txns = summary.transactions || [];
  const incomeTxns = txns.filter(t => t.type === 'Income');
  const expenseTxns = txns.filter(t => t.type === 'Expense');
  const sumAmt = (list) => list.reduce((s, t) => s + (Number(t.grossAmount) || 0), 0);

  const txnRow = (t) => `
    <tr>
      <td>${escapeHtml(t.ref)}</td>
      <td>${fmtDate(t.date)}</td>
      <td>${escapeHtml(t.type)}</td>
      <td>${escapeHtml(t.object)}</td>
      <td>${escapeHtml(t.description)}</td>
      <td style="text-align:right">${fmtMoney(t.grossAmount)}</td>
    </tr>`;

  const assetsWithAllowance = assetsForYear.filter(a => a._dep?.acquired);
  const totalCapitalAllowances = assetsWithAllowance.reduce((s, a) => s + (a._dep.depreciation || 0), 0);

  return `
  <div class="headRow">
    <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email}</p></div>
    <p class="muted">Fiscal Year: ${summary.label}<br/>Generated: ${fmtDateTime(new Date())}</p>
  </div>
  <h2>Annual Corporate Income Tax Computation</h2>

  <h3>1. Income &amp; Expense Transactions — Tax Ledger, FY ${summary.label}</h3>
  <table class="ref">
    <thead><tr><th>Ref</th><th>Date</th><th>Type</th><th>Business Object</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${txns.length ? txns.map(txnRow).join('') : `<tr><td colspan="6" style="text-align:center;color:#9AAAB8;">No transactions recorded for this fiscal year</td></tr>`}
    </tbody>
    <tbody>
      <tr style="font-weight:700;background:#F7F9FC;"><td colspan="5">Total Gross Income (${incomeTxns.length} transactions)</td><td style="text-align:right">${fmtMoney(sumAmt(incomeTxns))}</td></tr>
      <tr style="font-weight:700;background:#F7F9FC;"><td colspan="5">Total Allowable Operating Expenses (${expenseTxns.length} transactions)</td><td style="text-align:right">${fmtMoney(sumAmt(expenseTxns))}</td></tr>
    </tbody>
  </table>

  <h3>2. Capital Allowances — Fixed Asset Register, FY ${summary.label}</h3>
  <table class="ref">
    <thead><tr><th>Ref</th><th>Asset</th><th>Class</th><th style="text-align:right">Opening Book Value</th><th style="text-align:right">Allowance This Year</th><th style="text-align:right">Closing Book Value</th></tr></thead>
    <tbody>
      ${assetsWithAllowance.length ? assetsWithAllowance.map(a => `
        <tr>
          <td>${escapeHtml(a.ref)}</td>
          <td>${escapeHtml(a.name)}</td>
          <td>${escapeHtml(assetClassByCode(a.assetClass).label)}</td>
          <td style="text-align:right">${fmtMoney(a._dep.opening)}</td>
          <td style="text-align:right">${fmtMoney(a._dep.depreciation)}</td>
          <td style="text-align:right">${fmtMoney(a._dep.closing)}</td>
        </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;color:#9AAAB8;">No depreciable assets held this fiscal year</td></tr>`}
    </tbody>
    <tbody>
      <tr style="font-weight:700;background:#F7F9FC;"><td colspan="4">Total Capital Allowances (Wear &amp; Tear, this year)</td><td style="text-align:right">${fmtMoney(totalCapitalAllowances)}</td><td></td></tr>
    </tbody>
  </table>

  <h3>3. Net Profit for the Financial Year</h3>
  <table class="ref">
    <tbody>
      <tr><td>Total Gross Income</td><td style="text-align:right">${fmtMoney(summary.totalIncome)}</td></tr>
      <tr><td>Less: Total Allowable Operating Expenses</td><td style="text-align:right">-${fmtMoney(summary.totalExpenses)}</td></tr>
      <tr><td>Less: Capital Allowances (Wear &amp; Tear)</td><td style="text-align:right">-${fmtMoney(summary.totalDepreciation)}</td></tr>
      <tr style="font-weight:700;font-size:14px;background:#F0FDF4;"><td>Net Profit for the Financial Year (After Capital Allowances)</td><td style="text-align:right">${fmtMoney(summary.netBeforeLoss)}</td></tr>
    </tbody>
  </table>

  <h3>4. Loss Relief &amp; Chargeable Income</h3>
  <table class="ref">
    <tbody>
      <tr><td>Loss Brought Forward (opening pool)</td><td style="text-align:right">${fmtMoney(summary.lossCarriedIn)}</td></tr>
      <tr><td>Loss Utilised This Year</td><td style="text-align:right">-${fmtMoney(summary.lossUtilised)}</td></tr>
      <tr style="font-weight:700;"><td>Chargeable Income</td><td style="text-align:right">${fmtMoney(summary.chargeable)}</td></tr>
      <tr><td>Loss Carried Forward to Next Year</td><td style="text-align:right">${fmtMoney(summary.lossCarriedOut)}</td></tr>
    </tbody>
  </table>

  <h3>5. Corporate Income Tax Payable</h3>
  <table class="ref">
    <tbody>
      <tr><td>Corporate Income Tax @ 30% of Chargeable Income</td><td style="text-align:right">${fmtMoney(summary.citGross)}</td></tr>
      <tr><td>Less: Withholding Tax Credits Already Collected</td><td style="text-align:right">-${fmtMoney(summary.totalWhtCredits)}</td></tr>
      <tr style="font-weight:700;font-size:14px;background:#FEF2F2;"><td>Net Corporate Income Tax Payable</td><td style="text-align:right">${fmtMoney(summary.citPayable)}</td></tr>
      <tr><td>Output VAT Collected This Year (reference)</td><td style="text-align:right">${fmtMoney(summary.totalVatCollected)}</td></tr>
    </tbody>
  </table>

  <div style="display:flex;gap:16px;margin:18px 0 6px;font-family:Arial,Helvetica,sans-serif;">
    <div style="flex:1;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px 18px;">
      <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;color:#15803D;font-weight:700;">Total Net Profit — FY ${summary.label}</div>
      <div style="font-size:21px;font-weight:700;color:#065F46;margin-top:4px;">${fmtMoney(summary.netBeforeLoss)}</div>
    </div>
    <div style="flex:1;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px 18px;">
      <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px;color:#B91C1C;font-weight:700;">Net Tax to Be Paid — FY ${summary.label}</div>
      <div style="font-size:21px;font-weight:700;color:#7F1D1D;margin-top:4px;">${fmtMoney(summary.citPayable)}</div>
    </div>
  </div>

  <div class="footerNote">This computation is generated from internally recorded transactions and the fixed asset register. It is a working paper to support your annual URA filing — have it reviewed by a qualified accountant before submission, especially for depreciation proration on mid-year asset acquisitions.</div>
`;
};

// ─── Financial statement PDFs — mirror the on-screen Balance Sheet /
// Income Statement tabs exactly: same section headings, same rows, same
// bold Total row per section, same final figures. A generic "Code / Account
// / Balance" table (what these used to export) drops the section structure
// and the totals the screen shows, so these build the sectioned layout
// directly from the same balanceSheet / incomeStatement objects the UI uses.
const statementSectionHtml = (heading, rows, totalLabel, totalValue) => `
  <h3>${escapeHtml(heading)}</h3>
  <table class="ref">
    <thead><tr><th>Code</th><th>Account</th><th style="text-align:right">Balance</th></tr></thead>
    <tbody>
      ${rows.length
        ? rows.map(a => `<tr><td>${escapeHtml(a.code)}</td><td>${escapeHtml(a.name)}</td><td style="text-align:right">${fmtMoney(a.balance)}</td></tr>`).join('')
        : `<tr><td colspan="3" style="text-align:center;color:#9AAAB8;">No accounts in this section</td></tr>`}
    </tbody>
    <tbody>
      <tr style="font-weight:700;background:#F7F9FC;"><td colspan="2">${escapeHtml(totalLabel)}</td><td style="text-align:right">${fmtMoney(totalValue)}</td></tr>
    </tbody>
  </table>
`;

const buildBalanceSheetHtml = (balanceSheet, incomeStatement) => `
  <div class="headRow">
    <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email}</p></div>
    <p class="muted">As at: ${fmtDate(new Date())}</p>
  </div>
  <h2>Balance Sheet</h2>

  ${statementSectionHtml('Assets', balanceSheet.assets, 'Total Assets', balanceSheet.totalAssets)}
  ${statementSectionHtml('Liabilities', balanceSheet.liabilities, 'Total Liabilities', balanceSheet.totalLiabilities)}

  <h3>Equity</h3>
  <table class="ref">
    <thead><tr><th>Code</th><th>Account</th><th style="text-align:right">Balance</th></tr></thead>
    <tbody>
      ${balanceSheet.equity.length
        ? balanceSheet.equity.map(a => `<tr><td>${escapeHtml(a.code)}</td><td>${escapeHtml(a.name)}</td><td style="text-align:right">${fmtMoney(a.balance)}</td></tr>`).join('')
        : `<tr><td colspan="3" style="text-align:center;color:#9AAAB8;">No accounts in this section</td></tr>`}
      <tr style="font-style:italic;color:#5A7A9A;"><td colspan="2">Current-Period Earnings</td><td style="text-align:right">${fmtMoney(incomeStatement.netIncome)}</td></tr>
    </tbody>
    <tbody>
      <tr style="font-weight:700;background:#F7F9FC;"><td colspan="2">Total Equity</td><td style="text-align:right">${fmtMoney(balanceSheet.totalEquity)}</td></tr>
    </tbody>
  </table>

  <div class="footerNote">
    ${Math.abs(balanceSheet.balances) < 1
      ? '✓ Balance sheet balances (Assets = Liabilities + Equity).'
      : `⚠ Out of balance by ${fmtMoney(Math.abs(balanceSheet.balances))} — check for unposted or misclassified entries.`}
  </div>
`;

const buildIncomeStatementHtml = (incomeStatement) => `
  <div class="headRow">
    <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email}</p></div>
    <p class="muted">Generated: ${fmtDateTime(new Date())}</p>
  </div>
  <h2>Income Statement</h2>

  ${statementSectionHtml('Revenue', incomeStatement.revenue, 'Total Revenue', incomeStatement.totalRevenue)}
  ${statementSectionHtml('Expenses', incomeStatement.expenses, 'Total Expenses', incomeStatement.totalExpenses)}

  <table class="ref">
    <tbody>
      <tr style="font-weight:700;font-size:15px;background:${incomeStatement.netIncome >= 0 ? '#F0FDF4' : '#FEF2F2'};">
        <td>Net Income</td>
        <td style="text-align:right;color:${incomeStatement.netIncome >= 0 ? '#059669' : '#B91C1C'};">${fmtMoney(incomeStatement.netIncome)}</td>
      </tr>
    </tbody>
  </table>
`;

// Formal, multi-line Billing & Invoicing document — distinct from the
// single-line Tax Invoice above (buildInvoiceHtml), which is generated
// straight off a Tax Ledger entry. This one is generated from the
// Invoicing tab's line-item invoices.
const buildFormalInvoiceHtml = (invoice) => {
  const itemRows = (invoice.items || []).map(i => `
    <tr><td>${i.description}</td><td style="text-align:right">${i.qty}</td><td style="text-align:right">${fmtMoney(i.rate)}</td><td style="text-align:right">${fmtMoney(i.amount)}</td></tr>
  `).join('');
  return `
    <div class="headRow">
      <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email}</p></div>
      <p class="muted">Invoice: ${invoice.invoiceNo}<br/>Issue date: ${fmtDate(invoice.issueDate)}<br/>Due date: ${fmtDate(invoice.dueDate)}</p>
    </div>
    <h2>Invoice</h2>
    <p class="clause"><strong>Bill To:</strong> ${invoice.customerName}${invoice.customerEmail ? ` · ${invoice.customerEmail}` : ''}</p>
    <table class="ref">
      <thead><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="max-width:280px;margin-left:auto;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subtotal</span><span>${fmtMoney(invoice.subtotal)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Tax (${invoice.taxRate || 0}%)</span><span>${fmtMoney(invoice.taxAmount)}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #1A1A1A;font-weight:700;font-size:15px;"><span>Total Due</span><span>${fmtMoney(invoice.total)}</span></div>
    </div>
    <div class="footerNote">Business Object: ${invoice.businessObject || '—'} · VAT Treatment: ${invoice.vatTreatment || '—'}</div>
  `;
};

const buildReceiptHtml = (receipt) => `
  <div class="headRow">
    <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email}</p></div>
    <p class="muted">Receipt: ${receipt.receiptNo}<br/>Date: ${fmtDate(receipt.date)}</p>
  </div>
  <h2>Payment Receipt</h2>
  <table class="ref">
    <tbody>
      <tr><td>Received From</td><td style="text-align:right">${receipt.customerName}</td></tr>
      <tr><td>Against Invoice</td><td style="text-align:right">${receipt.invoiceNo}</td></tr>
      <tr><td>Payment Method</td><td style="text-align:right">${receipt.method}</td></tr>
      ${receipt.whtWithheld ? `<tr><td>Withholding Tax (6%) Deducted at Source</td><td style="text-align:right">${fmtMoney(receipt.whtAmount)}</td></tr>` : ''}
      <tr style="font-weight:700;font-size:14px;"><td>Cash Amount Received</td><td style="text-align:right">${fmtMoney(receipt.amount)}</td></tr>
    </tbody>
  </table>
  <div class="footerNote">Auto-posted to both the Double-Entry Books and the Tax Ledger for Corporate Income Tax purposes.</div>
`;

// ─── Login / Access Denied ───────────────────────────────────────────────────
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
        <div style={{ fontSize: 40, marginBottom: 14 }}>💼</div>
        <h2 style={s.loginTitle}>Accounts &amp; Tax Compliance Center</h2>
        <p style={s.loginSub}>Multi-sector ledger, capital allowances, payroll bridge, and CIT engine. Sign in with your Finance credentials.</p>
        <form onSubmit={handleSubmit} noValidate>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
            style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8' }} disabled={loading} autoFocus autoComplete="username" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8', marginTop: 10 }} disabled={loading} autoComplete="current-password" />
          {error && <p style={s.loginErr}>{error}</p>}
          <button type="submit" style={s.loginBtn} disabled={loading}>{loading ? 'Signing in…' : 'Sign In →'}</button>
        </form>
      </div>
    </div>
  );
};

const AccessDenied = ({ email, onLogout }) => (
  <div style={s.loginBg}>
    <div style={s.loginCard}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔒</div>
      <h2 style={s.loginTitle}>Access Restricted</h2>
      <p style={s.loginSub}>
        {email} is signed in but isn't provisioned for the Accounts Center. Ask the CEO admin to
        create a Finance account or grant Finance permissions from the CEO Control Center's User Provisioning tab.
      </p>
      <button style={s.loginBtn} onClick={onLogout}>Sign Out</button>
    </div>
  </div>
);

// ─── Small shared bits ───────────────────────────────────────────────────────
const StatCard = ({ label, value, accent, sub }) => (
  <div style={{ ...gd.card, borderTop: `3px solid ${accent}` }}>
    <p style={gd.cardLabel}>{label}</p>
    <p style={{ ...gd.cardValue, color: accent }}>{value}</p>
    {sub && <p style={gd.cardSub}>{sub}</p>}
  </div>
);

const ObjectBadge = ({ object }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', background: '#F0FDFA', color: '#0D9488', borderRadius: 20, padding: '3px 10px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
    {object}
  </span>
);

const TxnTypeBadge = ({ type }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: type === 'Income' ? '#D1FAE5' : '#FEE2E2', color: type === 'Income' ? '#065F46' : '#991B1B', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: type === 'Income' ? '#10B981' : '#EF4444' }} />
    {type}
  </span>
);

const BADGE_TONES = {
  green: { bg: '#D1FAE5', color: '#065F46' },
  red:   { bg: '#FEE2E2', color: '#991B1B' },
  amber: { bg: '#FEF3C7', color: '#92400E' },
  blue:  { bg: '#DBEAFE', color: '#1D4ED8' },
  gray:  { bg: '#F0F4F8', color: '#5A7A9A' },
};
const Badge = ({ text, tone }) => {
  const t = BADGE_TONES[tone] || BADGE_TONES.gray;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: t.bg, color: t.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
      {text}
    </span>
  );
};
const invoiceStatusTone = (st) => ({ draft: 'gray', sent: 'blue', paid: 'green', overdue: 'red', void: 'gray' }[st] || 'gray');

// ═══════════════════════════════════════════════════════════════════════════
// ─── Transaction Form Modal ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const EMPTY_TXN = {
  date: new Date().toISOString().slice(0, 10), type: 'Income', object: ACCOUNTING_OBJECTS[0],
  category: INCOME_CATEGORIES[0], description: '', grossAmount: '',
  vatTreatment: VAT_TREATMENTS[3], vatAmount: 0,
  whtWithheld: false, whtAmount: 0, whtCertificateNo: '',
  counterpartyName: '', counterpartyTIN: '', paymentMethod: PAYMENT_METHODS[0],
};

const TransactionFormModal = ({ initial, onClose, onSave }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ? { ...EMPTY_TXN, ...initial } : EMPTY_TXN);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (field, val) => setForm(prev => {
    const next = { ...prev, [field]: val };
    if (field === 'type') next.category = val === 'Income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
    if (field === 'vatTreatment' || field === 'grossAmount') {
      const vatOn = (field === 'vatTreatment' ? val : next.vatTreatment) === VAT_TREATMENTS[0];
      const amt = Number(field === 'grossAmount' ? val : next.grossAmount) || 0;
      next.vatAmount = vatOn ? Math.round(amt * VAT_RATE) : 0;
    }
    if (field === 'whtWithheld' || field === 'grossAmount') {
      const on = field === 'whtWithheld' ? val : next.whtWithheld;
      const amt = Number(field === 'grossAmount' ? val : next.grossAmount) || 0;
      next.whtAmount = on ? Math.round(amt * WHT_RATE_PROFESSIONAL) : 0;
    }
    return next;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) { setError('A description is required.'); return; }
    if (!form.grossAmount || Number(form.grossAmount) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    const outcome = await onSave({ ...form, grossAmount: Number(form.grossAmount) }, isEdit);
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not save this transaction.');
    else onClose();
  };

  const categories = form.type === 'Income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{isEdit ? 'Edit Transaction' : 'New Ledger Entry'}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Tagged by Business Object · VAT &amp; WHT computed automatically</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={ms.modalForm}>
          <div style={ms.body}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={cu.label}>Type</label>
                <select style={cu.select} value={form.type} onChange={e => update('type', e.target.value)} disabled={saving}>
                  {TXN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={cu.label}>Date</label><input type="date" style={s.loginInput} value={form.date} onChange={e => update('date', e.target.value)} disabled={saving} /></div>

              <div>
                <label style={cu.label}>Business Object</label>
                <select style={cu.select} value={form.object} onChange={e => update('object', e.target.value)} disabled={saving}>
                  {ACCOUNTING_OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={cu.label}>Category</label>
                <select style={cu.select} value={form.category} onChange={e => update('category', e.target.value)} disabled={saving}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={cu.label}>Description</label>
                <input style={s.loginInput} value={form.description} onChange={e => update('description', e.target.value)} disabled={saving} placeholder="e.g. Software deployment fee — Client X, Phase 2" />
              </div>

              <div><label style={cu.label}>Amount (UGX, {form.type === 'Income' ? 'excl. VAT' : 'total'})</label><input type="number" min="0" style={s.loginInput} value={form.grossAmount} onChange={e => update('grossAmount', e.target.value)} disabled={saving} /></div>
              <div>
                <label style={cu.label}>Payment Method</label>
                <select style={cu.select} value={form.paymentMethod} onChange={e => update('paymentMethod', e.target.value)} disabled={saving}>
                  {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {form.type === 'Income' && (
                <>
                  <div>
                    <label style={cu.label}>VAT Treatment</label>
                    <select style={cu.select} value={form.vatTreatment} onChange={e => update('vatTreatment', e.target.value)} disabled={saving}>
                      {VAT_TREATMENTS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div><label style={cu.label}>VAT Amount (auto)</label><input style={{ ...s.loginInput, background: '#F7F9FC' }} value={fmtMoney(form.vatAmount)} disabled readOnly /></div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1A3C5E', fontWeight: 600, marginTop: 8 }}>
                      <input type="checkbox" checked={form.whtWithheld} onChange={e => update('whtWithheld', e.target.checked)} disabled={saving} />
                      Payer withheld 6% Withholding Tax
                    </label>
                  </div>
                  {form.whtWithheld && (
                    <>
                      <div><label style={cu.label}>WHT Amount (auto)</label><input style={{ ...s.loginInput, background: '#F7F9FC' }} value={fmtMoney(form.whtAmount)} disabled readOnly /></div>
                      <div><label style={cu.label}>WHT Certificate No.</label><input style={s.loginInput} value={form.whtCertificateNo} onChange={e => update('whtCertificateNo', e.target.value)} disabled={saving} /></div>
                    </>
                  )}

                  <div><label style={cu.label}>Client Name</label><input style={s.loginInput} value={form.counterpartyName} onChange={e => update('counterpartyName', e.target.value)} disabled={saving} /></div>
                  <div><label style={cu.label}>Client TIN (if any)</label><input style={s.loginInput} value={form.counterpartyTIN} onChange={e => update('counterpartyTIN', e.target.value)} disabled={saving} /></div>
                </>
              )}
              {form.type === 'Expense' && (
                <>
                  <div><label style={cu.label}>Paid To (Vendor / Contractor)</label><input style={s.loginInput} value={form.counterpartyName} onChange={e => update('counterpartyName', e.target.value)} disabled={saving} /></div>
                  <div></div>
                </>
              )}
            </div>

            {form.category === 'Office Supplies & Minor Equipment (<1M, immediate write-off)' && Number(form.grossAmount) >= 1000000 && (
              <p style={{ fontSize: 11.5, color: '#92400E', background: '#FEF3C7', borderRadius: 6, padding: '8px 10px', marginTop: 10 }}>
                ⚠️ This item is UGX {Number(form.grossAmount).toLocaleString()} — at or above the UGX 1,000,000 minor-equipment threshold. Consider logging it in Fixed Assets instead so it gets a proper capital-allowance schedule.
              </p>
            )}

            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} disabled={saving}>{saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Entry'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Fixed Asset Form Modal ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const EMPTY_ASSET = {
  name: '', assetClass: 'class1', acquisitionDate: new Date().toISOString().slice(0, 10),
  cost: '', stampDuty: '', legalFees: '', vendor: '', notes: '',
};

const FixedAssetFormModal = ({ initial, onClose, onSave }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ? { ...EMPTY_ASSET, ...initial } : EMPTY_ASSET);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('An asset name/description is required.'); return; }
    if (!form.cost || Number(form.cost) <= 0) { setError('Enter a valid acquisition cost.'); return; }
    setSaving(true); setError('');
    const totalCost = Number(form.cost) + (Number(form.stampDuty) || 0) + (Number(form.legalFees) || 0);
    const outcome = await onSave({ ...form, cost: totalCost, rawCost: Number(form.cost) }, isEdit);
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not save this asset.');
    else onClose();
  };

  const cls = assetClassByCode(form.assetClass);

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{isEdit ? 'Edit Fixed Asset' : 'New Fixed Asset'}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Cost base includes stamp duty &amp; legal fees · depreciation computed automatically</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={ms.modalForm}>
          <div style={ms.body}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}><label style={cu.label}>Asset Name / Description</label><input style={s.loginInput} value={form.name} onChange={e => update('name', e.target.value)} disabled={saving} placeholder="e.g. Plot 14, Nakawa — 0.5 acres" /></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={cu.label}>Asset Class</label>
                <select style={cu.select} value={form.assetClass} onChange={e => update('assetClass', e.target.value)} disabled={saving}>
                  {ASSET_CLASSES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div><label style={cu.label}>Acquisition Date</label><input type="date" style={s.loginInput} value={form.acquisitionDate} onChange={e => update('acquisitionDate', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Purchase Price</label><input type="number" min="0" style={s.loginInput} value={form.cost} onChange={e => update('cost', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Stamp Duty ({form.assetClass === 'land' ? `1% land transfer` : 'if any'})</label><input type="number" min="0" style={s.loginInput} value={form.stampDuty} onChange={e => update('stampDuty', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Legal / Conveyancing Fees</label><input type="number" min="0" style={s.loginInput} value={form.legalFees} onChange={e => update('legalFees', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Vendor / Seller</label><input style={s.loginInput} value={form.vendor} onChange={e => update('vendor', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Total Cost Base (auto)</label><input style={{ ...s.loginInput, background: '#F7F9FC' }} value={fmtMoney((Number(form.cost) || 0) + (Number(form.stampDuty) || 0) + (Number(form.legalFees) || 0))} disabled readOnly /></div>
            </div>
            <p style={{ fontSize: 11.5, color: '#9AAAB8', margin: '10px 0 0' }}>
              {cls.method === 'none' ? 'Land is non-depreciable — it will not reduce Corporate Income Tax, but its cost base (incl. stamp duty) is tracked here for the balance sheet and any future capital gains calculation.'
                : cls.method === 'straight' ? `Straight-line: ${fmtPct(cls.rate)} of original cost per year until fully written off.`
                : `Reducing balance: ${fmtPct(cls.rate)} of the remaining book value per year.`}
            </p>
            <div style={{ marginTop: 14 }}>
              <label style={cu.label}>Notes</label>
              <textarea style={{ ...s.loginInput, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />
            </div>
            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} disabled={saving}>{saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Asset'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Loan Form Modal ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const EMPTY_LOAN = {
  lender: '', principal: '', interestRate: '', disbursedDate: new Date().toISOString().slice(0, 10),
  termMonths: '', status: LOAN_STATUSES[0], outstandingBalance: '', interestPaidTotal: 0,
  debentureRegistered: false, debentureRegNo: '', notes: '',
};

const LoanFormModal = ({ initial, onClose, onSave }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ? { ...EMPTY_LOAN, ...initial } : EMPTY_LOAN);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lender.trim() || !form.principal) { setError('Lender and principal amount are required.'); return; }
    setSaving(true); setError('');
    const outcome = await onSave({
      ...form, principal: Number(form.principal), interestRate: Number(form.interestRate) || 0,
      outstandingBalance: form.outstandingBalance === '' ? Number(form.principal) : Number(form.outstandingBalance),
      interestPaidTotal: Number(form.interestPaidTotal) || 0,
    }, isEdit);
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not save this loan.');
    else onClose();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{isEdit ? 'Edit Loan' : 'New Loan Facility'}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Principal is non-taxable · interest paid is a deductible expense</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={ms.modalForm}>
          <div style={ms.body}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={cu.label}>Lender</label><input style={s.loginInput} value={form.lender} onChange={e => update('lender', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Principal Amount</label><input type="number" min="0" style={s.loginInput} value={form.principal} onChange={e => update('principal', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Annual Interest Rate (%)</label><input type="number" min="0" step="0.1" style={s.loginInput} value={form.interestRate} onChange={e => update('interestRate', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Term (months)</label><input type="number" min="0" style={s.loginInput} value={form.termMonths} onChange={e => update('termMonths', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Disbursed Date</label><input type="date" style={s.loginInput} value={form.disbursedDate} onChange={e => update('disbursedDate', e.target.value)} disabled={saving} /></div>
              <div>
                <label style={cu.label}>Status</label>
                <select style={cu.select} value={form.status} onChange={e => update('status', e.target.value)} disabled={saving}>
                  {LOAN_STATUSES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={cu.label}>Outstanding Balance</label><input type="number" min="0" style={s.loginInput} value={form.outstandingBalance} onChange={e => update('outstandingBalance', e.target.value)} disabled={saving} placeholder={form.principal || '0'} /></div>
              <div><label style={cu.label}>Interest Paid to Date</label><input type="number" min="0" style={s.loginInput} value={form.interestPaidTotal} onChange={e => update('interestPaidTotal', e.target.value)} disabled={saving} /></div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1A3C5E', fontWeight: 600, marginTop: 8 }}>
                  <input type="checkbox" checked={form.debentureRegistered} onChange={e => update('debentureRegistered', e.target.checked)} disabled={saving} />
                  Debenture / mortgage registered with URSB
                </label>
              </div>
              {form.debentureRegistered && (
                <div><label style={cu.label}>Debenture Registration No.</label><input style={s.loginInput} value={form.debentureRegNo} onChange={e => update('debentureRegNo', e.target.value)} disabled={saving} /></div>
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={cu.label}>Notes</label>
              <textarea style={{ ...s.loginInput, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />
            </div>
            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} disabled={saving}>{saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Loan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Contractor Voucher Form Modal ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const EMPTY_VOUCHER = {
  contractorId: '', date: new Date().toISOString().slice(0, 10), voucherType: CONTRACTOR_VOUCHER_TYPES[0],
  amount: '', taskDescription: '', nin: '', paymentMethod: PAYMENT_METHODS[0],
  whtWithheld: false, whtAmount: 0,
};

const VoucherFormModal = ({ contractors, initial, onClose, onSave }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ? { ...EMPTY_VOUCHER, ...initial } : { ...EMPTY_VOUCHER, contractorId: contractors[0]?.id || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (field, val) => setForm(prev => {
    const next = { ...prev, [field]: val };
    if (field === 'whtWithheld' || field === 'amount') {
      const on = field === 'whtWithheld' ? val : next.whtWithheld;
      const amt = Number(field === 'amount' ? val : next.amount) || 0;
      next.whtAmount = on ? Math.round(amt * WHT_RATE_PROFESSIONAL) : 0;
    }
    return next;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contractorId) { setError('Select a contractor.'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    const outcome = await onSave({ ...form, amount: Number(form.amount) }, isEdit);
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not save this voucher.');
    else onClose();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{isEdit ? 'Edit Voucher' : 'New Payment Voucher'}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Weekly token or month-end balance for an Independent Contractor</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={ms.modalForm}>
          <div style={ms.body}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={cu.label}>Contractor</label>
                <select style={cu.select} value={form.contractorId} onChange={e => update('contractorId', e.target.value)} disabled={saving}>
                  {contractors.length === 0 && <option value="">No Independent Contractors found in the Employee Directory</option>}
                  {contractors.map(c => <option key={c.id} value={c.id}>{c._fullName} · {c.employeeCode}</option>)}
                </select>
              </div>
              <div>
                <label style={cu.label}>Voucher Type</label>
                <select style={cu.select} value={form.voucherType} onChange={e => update('voucherType', e.target.value)} disabled={saving}>
                  {CONTRACTOR_VOUCHER_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div><label style={cu.label}>Date</label><input type="date" style={s.loginInput} value={form.date} onChange={e => update('date', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Amount</label><input type="number" min="0" style={s.loginInput} value={form.amount} onChange={e => update('amount', e.target.value)} disabled={saving} /></div>
              <div>
                <label style={cu.label}>Payment Method</label>
                <select style={cu.select} value={form.paymentMethod} onChange={e => update('paymentMethod', e.target.value)} disabled={saving}>
                  {PAYMENT_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div><label style={cu.label}>National ID (NIN)</label><input style={s.loginInput} value={form.nin} onChange={e => update('nin', e.target.value)} disabled={saving} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={cu.label}>Task / Deliverable Description</label><input style={s.loginInput} value={form.taskDescription} onChange={e => update('taskDescription', e.target.value)} disabled={saving} placeholder="e.g. Field IT installation support — Week 3" /></div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1A3C5E', fontWeight: 600, marginTop: 8 }}>
                  <input type="checkbox" checked={form.whtWithheld} onChange={e => update('whtWithheld', e.target.checked)} disabled={saving} />
                  Withhold 6% WHT on this fee
                </label>
              </div>
              {form.whtWithheld && <div><label style={cu.label}>WHT Amount (auto)</label><input style={{ ...s.loginInput, background: '#F7F9FC' }} value={fmtMoney(form.whtAmount)} disabled readOnly /></div>}
            </div>
            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} disabled={saving}>{saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Voucher'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Dividend Form Modal ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const EMPTY_DIVIDEND = { date: new Date().toISOString().slice(0, 10), shareholder: '', amount: '', resolutionRef: '' };

const DividendFormModal = ({ initial, onClose, onSave }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ? { ...EMPTY_DIVIDEND, ...initial } : EMPTY_DIVIDEND);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shareholder.trim() || !form.amount) { setError('Shareholder and amount are required.'); return; }
    setSaving(true); setError('');
    const amount = Number(form.amount);
    const outcome = await onSave({ ...form, amount, whtAmount: Math.round(amount * WHT_RATE_DIVIDEND) }, isEdit);
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not save this dividend.');
    else onClose();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{isEdit ? 'Edit Dividend' : 'Declare Dividend'}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>15% final Withholding Tax computed automatically</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={ms.modalForm}>
          <div style={ms.body}>
            <label style={cu.label}>Shareholder</label>
            <input style={s.loginInput} value={form.shareholder} onChange={e => update('shareholder', e.target.value)} disabled={saving} />
            <label style={{ ...cu.label, marginTop: 12 }}>Date</label>
            <input type="date" style={s.loginInput} value={form.date} onChange={e => update('date', e.target.value)} disabled={saving} />
            <label style={{ ...cu.label, marginTop: 12 }}>Gross Dividend Amount</label>
            <input type="number" min="0" style={s.loginInput} value={form.amount} onChange={e => update('amount', e.target.value)} disabled={saving} />
            {form.amount > 0 && (
              <p style={{ fontSize: 12.5, color: '#5A7A9A', margin: '8px 0 0' }}>
                15% WHT: <strong>{fmtMoney(form.amount * WHT_RATE_DIVIDEND)}</strong> &nbsp;·&nbsp; Net to shareholder: <strong>{fmtMoney(form.amount * (1 - WHT_RATE_DIVIDEND))}</strong>
              </p>
            )}
            <label style={{ ...cu.label, marginTop: 12 }}>Board Resolution Ref.</label>
            <input style={s.loginInput} value={form.resolutionRef} onChange={e => update('resolutionRef', e.target.value)} disabled={saving} />
            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} disabled={saving}>{saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Declare'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Compliance Event Form Modal ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const EMPTY_EVENT = { type: COMPLIANCE_EVENT_TYPES[0], dueDate: '', status: 'Upcoming', notes: '' };

const ComplianceEventFormModal = ({ initial, onClose, onSave }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ? { ...EMPTY_EVENT, ...initial } : EMPTY_EVENT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dueDate) { setError('A due date is required.'); return; }
    setSaving(true); setError('');
    const outcome = await onSave(form, isEdit);
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not save this event.');
    else onClose();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{isEdit ? 'Edit Compliance Event' : 'New Compliance Event'}</h3>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} style={ms.modalForm}>
          <div style={ms.body}>
            <label style={cu.label}>Type</label>
            <select style={cu.select} value={form.type} onChange={e => update('type', e.target.value)} disabled={saving}>
              {COMPLIANCE_EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{ ...cu.label, marginTop: 12 }}>Due Date</label>
            <input type="date" style={s.loginInput} value={form.dueDate} onChange={e => update('dueDate', e.target.value)} disabled={saving} />
            <label style={{ ...cu.label, marginTop: 12 }}>Status</label>
            <select style={cu.select} value={form.status} onChange={e => update('status', e.target.value)} disabled={saving}>
              {['Upcoming', 'Filed', 'Overdue'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={{ ...cu.label, marginTop: 12 }}>Notes</label>
            <textarea style={{ ...s.loginInput, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={e => update('notes', e.target.value)} disabled={saving} />
            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} disabled={saving}>{saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Add Event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Chart of Accounts Modal ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
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
    try { await onSave({ code: code.trim(), name: name.trim(), type, cashFlowCategory }); onClose(); }
    catch (err) { setError(err.message || 'Could not save this account.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Account</h3>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><label style={cu.label}>Code</label><input style={s.loginInput} value={code} onChange={e => setCode(e.target.value)} autoFocus /></div>
            <div style={{ flex: 2 }}><label style={cu.label}>Name</label><input style={s.loginInput} value={name} onChange={e => setName(e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={cu.label}>Type</label>
              <select style={cu.select} value={type} onChange={e => setType(e.target.value)}>{ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={cu.label}>Cash Flow Category</label>
              <select style={cu.select} value={cashFlowCategory} onChange={e => setCashFlowCategory(e.target.value)}>{CASH_FLOW_CATEGORIES.map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}</select>
            </div>
          </div>
          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '➕ Add Account'}</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Journal Entry Modal (double-entry) ────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const JournalEntryModal = ({ accounts, entryTypeDefault, onClose, onSave }) => {
  const blankLine = () => ({ id: uid4(), accountCode: accounts[0]?.code || '', debit: '', credit: '' });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState(generateRef('JE'));
  const [memo, setMemo] = useState('');
  const [entryType, setEntryType] = useState(entryTypeDefault || 'general');
  const [lines, setLines] = useState([blankLine(), blankLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totals = lineTotals(lines);
  const balanced = isBalanced(lines);

  const updateLine = (id, field, value) => setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
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
        .map(l => ({ accountCode: l.accountCode, accountName: accByCode[l.accountCode]?.name || l.accountCode, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 }));
      await onSave({ date, reference, memo, entryType, lines: cleanLines });
      onClose();
    } catch (err) { setError(err.message || 'Could not save this entry.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Journal Entry</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Double-entry — every line must balance.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}><label style={cu.label}>Date</label><input type="date" style={s.loginInput} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div style={{ flex: 1, minWidth: 160 }}><label style={cu.label}>Reference</label><input style={s.loginInput} value={reference} onChange={e => setReference(e.target.value)} /></div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={cu.label}>Book</label>
              <select style={cu.select} value={entryType} onChange={e => setEntryType(e.target.value)}>{ENTRY_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
            </div>
          </div>
          <label style={{ ...cu.label, marginTop: 12 }}>Description</label>
          <input style={s.loginInput} value={memo} onChange={e => setMemo(e.target.value)} placeholder="e.g. Office rent for July" />

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr>
                <th style={rm.th}>Account</th><th style={{ ...rm.th, textAlign: 'right' }}>Debit</th><th style={{ ...rm.th, textAlign: 'right' }}>Credit</th><th style={rm.th}></th>
              </tr></thead>
              <tbody>
                {lines.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <select style={cu.select} value={l.accountCode} onChange={e => updateLine(l.id, 'accountCode', e.target.value)}>{accounts.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select>
                    </td>
                    <td style={{ padding: '8px 10px' }}><input type="number" min="0" style={{ ...s.loginInput, textAlign: 'right' }} value={l.debit} onChange={e => updateLine(l.id, 'debit', e.target.value)} placeholder="0" /></td>
                    <td style={{ padding: '8px 10px' }}><input type="number" min="0" style={{ ...s.loginInput, textAlign: 'right' }} value={l.credit} onChange={e => updateLine(l.id, 'credit', e.target.value)} placeholder="0" /></td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}><button style={rm.miniBtn} onClick={() => removeLine(l.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td style={{ padding: '10px', fontWeight: 700, color: '#1A3C5E' }}>Totals</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{fmtMoney(totals.debit)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>{fmtMoney(totals.credit)}</td>
                <td></td>
              </tr></tfoot>
            </table>
          </div>
          <button style={{ ...rm.miniBtn, marginTop: 8 }} onClick={addLine}>+ Add line</button>
          <div style={{ marginTop: 14 }}>
            {balanced ? <Badge text="✓ Balanced" tone="green" /> : <Badge text={`Out of balance by ${fmtMoney(Math.abs(totals.debit - totals.credit))}`} tone="red" />}
          </div>
          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} onClick={handleSave} disabled={saving || !balanced}>{saving ? 'Posting…' : '📘 Post Entry'}</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Invoice Modal (create / edit) ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const InvoiceModal = ({ onClose, onSave }) => {
  const blankItem = () => ({ id: uid4(), description: '', qty: 1, rate: '' });
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [businessObject, setBusinessObject] = useState(ACCOUNTING_OBJECTS[0]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [vatTreatment, setVatTreatment] = useState(VAT_TREATMENTS[0]);
  const [items, setItems] = useState([blankItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (id, field, val) => setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  const addItem = () => setItems(prev => [...prev, blankItem()]);
  const removeItem = (id) => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);

  const subtotal = items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const taxRate = vatTreatment === VAT_TREATMENTS[0] ? VAT_RATE * 100 : 0;
  const taxAmount = Math.round(subtotal * taxRate / 100);
  const total = subtotal + taxAmount;

  const handleSave = async () => {
    if (!customerName.trim()) { setError('Customer name is required.'); return; }
    if (!items.some(i => i.description.trim() && Number(i.rate) > 0)) { setError('Add at least one line item.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({
        invoiceNo: genInvoiceNo(), customerName, customerEmail, businessObject, vatTreatment, issueDate, dueDate,
        items: items.filter(i => i.description.trim()).map(({ id, ...rest }) => ({ description: rest.description, qty: Number(rest.qty) || 0, rate: Number(rest.rate) || 0, amount: (Number(rest.qty) || 0) * (Number(rest.rate) || 0) })),
        taxRate, subtotal, taxAmount, total, status: 'draft',
      });
      onClose();
    } catch (err) { setError(err.message || 'Could not save this invoice.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Invoice</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Saved as a draft — send it once it looks right. Confirming payment later posts to both the Books and the Tax Ledger automatically.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}><label style={cu.label}>Customer Name</label><input style={s.loginInput} value={customerName} onChange={e => setCustomerName(e.target.value)} autoFocus /></div>
            <div style={{ flex: 1, minWidth: 200 }}><label style={cu.label}>Customer Email</label><input type="email" style={s.loginInput} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={cu.label}>Business Object</label>
              <select style={cu.select} value={businessObject} onChange={e => setBusinessObject(e.target.value)}>{ACCOUNTING_OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}</select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}><label style={cu.label}>Issue Date</label><input type="date" style={s.loginInput} value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
            <div style={{ flex: 1, minWidth: 140 }}><label style={cu.label}>Due Date</label><input type="date" style={s.loginInput} value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={cu.label}>VAT Treatment</label>
              <select style={cu.select} value={vatTreatment} onChange={e => setVatTreatment(e.target.value)}>{VAT_TREATMENTS.map(v => <option key={v} value={v}>{v}</option>)}</select>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr>
                <th style={rm.th}>Description</th><th style={{ ...rm.th, textAlign: 'right' }}>Qty</th><th style={{ ...rm.th, textAlign: 'right' }}>Rate</th><th style={{ ...rm.th, textAlign: 'right' }}>Amount</th><th style={rm.th}></th>
              </tr></thead>
              <tbody>
                {items.map(i => (
                  <tr key={i.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
                    <td style={{ padding: '8px 10px' }}><input style={s.loginInput} value={i.description} onChange={e => updateItem(i.id, 'description', e.target.value)} placeholder="Item or service" /></td>
                    <td style={{ padding: '8px 10px', width: 80 }}><input type="number" min="0" style={{ ...s.loginInput, textAlign: 'right' }} value={i.qty} onChange={e => updateItem(i.id, 'qty', e.target.value)} /></td>
                    <td style={{ padding: '8px 10px', width: 130 }}><input type="number" min="0" style={{ ...s.loginInput, textAlign: 'right' }} value={i.rate} onChange={e => updateItem(i.id, 'rate', e.target.value)} /></td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtMoney((Number(i.qty) || 0) * (Number(i.rate) || 0))}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}><button style={rm.miniBtn} onClick={() => removeItem(i.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button style={{ ...rm.miniBtn, marginTop: 8 }} onClick={addItem}>+ Add line item</button>

          <div style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 260 }}>
            <div style={cu.credRow}><span style={cu.credLabel}>Subtotal</span><span style={cu.credVal}>{fmtMoney(subtotal)}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Tax ({taxRate}%)</span><span style={cu.credVal}>{fmtMoney(taxAmount)}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Total Due</span><span style={{ ...cu.credVal, fontSize: 18, color: '#1A3C5E' }}>{fmtMoney(total)}</span></div>
          </div>
          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '🧾 Save Invoice'}</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Confirm Payment Modal (posts journal + Tax Ledger + issues receipt) ──
// ═══════════════════════════════════════════════════════════════════════════
const ConfirmPaymentModal = ({ invoice, accounts = [], cashAccounts, receivableAccount, onClose, onConfirm }) => {
  const [amount, setAmount] = useState(invoice.total);
  const [method, setMethod] = useState('Mobile Money');
  const [cashAccountCode, setCashAccountCode] = useState(cashAccounts[0]?.code || '');
  const [whtWithheld, setWhtWithheld] = useState(false);

  // Any account the 6% professional-fee WHT credit could be booked to —
  // primarily "Withholding Tax Credits (URA)", but the CEO's chart of
  // accounts may name/split this differently (e.g. per business object),
  // so this is a real, user-picked account rather than a hidden regex guess.
  const whtCandidateAccounts = useMemo(() => {
    const tagged = accounts.filter(a => /withholding tax|wht|professional/i.test(a.name || ''));
    return tagged.length ? tagged : accounts;
  }, [accounts]);
  const [whtAccountCode, setWhtAccountCode] = useState('');

  useEffect(() => {
    if (!whtAccountCode && whtCandidateAccounts.length) setWhtAccountCode(whtCandidateAccounts[0].code);
  }, [whtCandidateAccounts, whtAccountCode]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const whtAmount = whtWithheld ? Math.round((Number(invoice.subtotal) || 0) * WHT_RATE_PROFESSIONAL) : 0;
  const netCash = Math.max(0, (Number(amount) || 0) - whtAmount);

  const handleConfirm = async () => {
    if (!cashAccountCode) { setError('Choose which cash/bank account received the payment.'); return; }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount.'); return; }
    if (whtWithheld && !whtAccountCode) { setError('Choose which account the WHT credit should post to.'); return; }
    setSaving(true); setError('');
    try { await onConfirm({ amount: Number(amount), method, cashAccountCode, whtWithheld, whtAmount, whtAccountCode: whtWithheld ? whtAccountCode : '', netCash }); onClose(); }
    catch (err) { setError(err.message || 'Could not confirm this payment.'); }
    finally { setSaving(false); }
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
          <label style={cu.label}>Invoice Amount</label>
          <input type="number" style={s.loginInput} value={amount} onChange={e => setAmount(e.target.value)} />

          <label style={{ ...cu.label, marginTop: 12 }}>Payment Method</label>
          <select style={cu.select} value={method} onChange={e => setMethod(e.target.value)}>{['Mobile Money', 'Bank Transfer', 'Cash', 'Cheque', 'Card'].map(m => <option key={m} value={m}>{m}</option>)}</select>

          <label style={{ ...cu.label, marginTop: 12 }}>Deposited Into</label>
          <select style={cu.select} value={cashAccountCode} onChange={e => setCashAccountCode(e.target.value)}>{cashAccounts.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}</select>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1A3C5E', fontWeight: 600, marginTop: 14 }}>
            <input type="checkbox" checked={whtWithheld} onChange={e => setWhtWithheld(e.target.checked)} />
            Client withheld 6% Withholding Tax at source
          </label>
          {whtWithheld && (
            <>
              <p style={{ fontSize: 12.5, color: '#5A7A9A', marginTop: 6 }}>
                WHT credit: <strong>{fmtMoney(whtAmount)}</strong> &nbsp;·&nbsp; Cash actually received: <strong>{fmtMoney(netCash)}</strong>
              </p>
              <label style={{ ...cu.label, marginTop: 10 }}>Post WHT Credit To</label>
              <select style={cu.select} value={whtAccountCode} onChange={e => setWhtAccountCode(e.target.value)}>
                {whtCandidateAccounts.length === 0 && <option value="">No accounts available</option>}
                {whtCandidateAccounts.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
              </select>
              <p style={{ fontSize: 11.5, color: '#9AAAB8', marginTop: 4 }}>
                Usually "Withholding Tax Credits (URA)" — pick a different account if this client's WHT is tracked separately (e.g. per business object).
              </p>
            </>
          )}

          <p style={{ fontSize: 12, color: '#7A8A9A', marginTop: 14, lineHeight: 1.6 }}>
            This marks the invoice paid, generates a printable receipt, posts a balanced journal entry
            (Dr Cash{whtWithheld ? ' + Dr WHT Credits' : ''}, Cr Accounts Receivable) to the Double-Entry Books,
            and drops a matching Income entry into the Tax Ledger so it flows straight into the CIT computation.
          </p>
          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#10B981', color: '#fff' }} onClick={handleConfirm} disabled={saving}>{saving ? 'Confirming…' : '✓ Confirm & Post'}</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main Component ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const AccountsManager = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Ledger
  const [transactions, setTransactions] = useState([]);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [txnsError, setTxnsError] = useState(null);
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [txnTypeFilter, setTxnTypeFilter] = useState('All');
  const [txnObjectFilter, setTxnObjectFilter] = useState('All');
  const [txnSearch, setTxnSearch] = useState('');

  // Fixed Assets
  const [fixedAssets, setFixedAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assetsError, setAssetsError] = useState(null);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // Loans
  const [loans, setLoans] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [loansError, setLoansError] = useState(null);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);

  // Employees (read-only reference, owned by HrManager)
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Contractor vouchers
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [vouchersError, setVouchersError] = useState(null);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);

  // Dividends
  const [dividends, setDividends] = useState([]);
  const [loadingDividends, setLoadingDividends] = useState(true);
  const [dividendsError, setDividendsError] = useState(null);
  const [showDividendForm, setShowDividendForm] = useState(false);
  const [editingDividend, setEditingDividend] = useState(null);

  // Compliance calendar
  const [complianceEvents, setComplianceEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Double-Entry Books (Chart of Accounts + Journal)
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [booksError, setBooksError] = useState(null);
  const [booksSubTab, setBooksSubTab] = useState('journal'); // journal | chart
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalFilter, setJournalFilter] = useState('all');
  const [journalSearch, setJournalSearch] = useState('');

  // Invoicing & Billing
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [invoicesError, setInvoicesError] = useState(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('All');

  // Financial Statements
  const [statementsSubTab, setStatementsSubTab] = useState('balance'); // balance | income | cashflow

  // Fiscal year selection (drives the CIT engine + Dashboard)
  const fiscalOptions = useMemo(() => listFiscalYearOptions(), []);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(() => fiscalOptions[0]?.startYear ?? fiscalStartYearOf(new Date()));

  const [idleWarning, setIdleWarning] = useState(false);

  const isCeo = !!user && user.email?.toLowerCase() === CEO_EMAIL;
  const financePerms = profile?.permissions?.finance || {};
  const isFinanceStaff = !!profile && profile.status !== 'suspended' && (profile.department === 'Finance' || Object.values(financePerms).some(Boolean));
  const isAuthorized = isCeo || isFinanceStaff;
  const canWrite = isCeo || !!financePerms.write || profile?.department === 'Finance';
  const canEdit = isCeo || !!financePerms.edit || profile?.department === 'Finance';
  const canDelete = isCeo || !!financePerms.delete;
  const canApprove = isCeo || !!financePerms.approve || profile?.department === 'Finance';

  // ── Auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) { setProfile(null); setProfileLoaded(true); return; }
    setProfileLoaded(false);
    const unsub = onSnapshot(
      doc(db, 'teamUsers', user.uid),
      (snap) => { setProfile(snap.exists() ? snap.data() : null); setProfileLoaded(true); },
      () => { setProfile(null); setProfileLoaded(true); }
    );
    return unsub;
  }, [user]);

  // ── Idle session (mirrors HrManager) ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let lastActivity = Date.now();
    const bump = () => { lastActivity = Date.now(); setIdleWarning(false); };
    ['mousemove', 'keydown', 'click', 'scroll'].forEach(ev => window.addEventListener(ev, bump));
    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivity;
      if (idleFor > IDLE_LIMIT_MS) { signOut(auth); }
      else if (idleFor > IDLE_WARN_MS) { setIdleWarning(true); }
    }, 30000);
    return () => { ['mousemove', 'keydown', 'click', 'scroll'].forEach(ev => window.removeEventListener(ev, bump)); clearInterval(interval); };
  }, [user]);

  // ── Firestore listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) { setTransactions([]); return; }
    setLoadingTxns(true);
    const unsub = onSnapshot(collection(db, 'financeTransactions'),
      (snap) => { setTxnsError(null); setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingTxns(false); },
      (err) => { setTxnsError('Could not load transactions: ' + err.message); setLoadingTxns(false); });
    return unsub;
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) { setFixedAssets([]); return; }
    setLoadingAssets(true);
    const unsub = onSnapshot(collection(db, 'fixedAssets'),
      (snap) => { setAssetsError(null); setFixedAssets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingAssets(false); },
      (err) => { setAssetsError('Could not load fixed assets: ' + err.message); setLoadingAssets(false); });
    return unsub;
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) { setLoans([]); return; }
    setLoadingLoans(true);
    const unsub = onSnapshot(collection(db, 'loans'),
      (snap) => { setLoansError(null); setLoans(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingLoans(false); },
      (err) => { setLoansError('Could not load loans: ' + err.message); setLoadingLoans(false); });
    return unsub;
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) { setEmployees([]); return; }
    setLoadingEmployees(true);
    const unsub = onSnapshot(collection(db, 'employees'),
      (snap) => { setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingEmployees(false); },
      () => setLoadingEmployees(false));
    return unsub;
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) { setVouchers([]); return; }
    setLoadingVouchers(true);
    const unsub = onSnapshot(collection(db, 'contractorVouchers'),
      (snap) => { setVouchersError(null); setVouchers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingVouchers(false); },
      (err) => { setVouchersError('Could not load vouchers: ' + err.message); setLoadingVouchers(false); });
    return unsub;
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) { setDividends([]); return; }
    setLoadingDividends(true);
    const unsub = onSnapshot(collection(db, 'dividends'),
      (snap) => { setDividendsError(null); setDividends(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingDividends(false); },
      (err) => { setDividendsError('Could not load dividends: ' + err.message); setLoadingDividends(false); });
    return unsub;
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) { setComplianceEvents([]); return; }
    setLoadingEvents(true);
    const unsub = onSnapshot(collection(db, 'complianceEvents'),
      (snap) => { setEventsError(null); setComplianceEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingEvents(false); },
      (err) => { setEventsError('Could not load compliance events: ' + err.message); setLoadingEvents(false); });
    return unsub;
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) { setAccounts([]); setJournalEntries([]); return; }
    setLoadingBooks(true);
    const unsub1 = onSnapshot(collection(db, 'accounts'),
      (snap) => { setBooksError(null); setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.code.localeCompare(b.code))); setLoadingBooks(false); },
      (err) => { setBooksError('Could not load chart of accounts: ' + err.message); setLoadingBooks(false); });
    const unsub2 = onSnapshot(collection(db, 'journalEntries'),
      (snap) => { setJournalEntries(snap.docs.map(d => ({ id: d.id, ...d.data() }))); },
      (err) => setBooksError('Could not load journal entries: ' + err.message));
    return () => { unsub1(); unsub2(); };
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) { setInvoices([]); setReceipts([]); return; }
    setLoadingInvoices(true);
    const unsub1 = onSnapshot(collection(db, 'invoices'),
      (snap) => { setInvoicesError(null); setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingInvoices(false); },
      (err) => { setInvoicesError('Could not load invoices: ' + err.message); setLoadingInvoices(false); });
    const unsub2 = onSnapshot(collection(db, 'receipts'),
      (snap) => { setReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); },
      (err) => setInvoicesError('Could not load receipts: ' + err.message));
    return () => { unsub1(); unsub2(); };
  }, [isAuthorized]);

  const logAudit = useCallback(async (action, target, details = '') => {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        actorEmail: auth.currentUser?.email || 'unknown', actorUid: auth.currentUser?.uid || 'unknown',
        action, target, details, timestamp: serverTimestamp(),
      });
    } catch (err) { console.error('Audit log write failed:', err); }
  }, []);

  // ── CRUD: Transactions ─────────────────────────────────────────────────
  const handleSaveTxn = useCallback(async (form, isEdit) => {
    try {
      if (isEdit) {
        await updateDoc(doc(db, 'financeTransactions', form.id), { ...form, updatedAt: serverTimestamp() });
        await logAudit('Updated ledger entry', form.description, fmtMoney(form.grossAmount));
      } else {
        const ref = generateRef(form.type === 'Income' ? 'INV' : 'EXP');
        await addDoc(collection(db, 'financeTransactions'), { ...form, ref, createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' });
        await logAudit('Recorded ledger entry', form.description, `${form.type} · ${fmtMoney(form.grossAmount)}`);
      }
      return { success: true };
    } catch (err) { console.error(err); return { success: false, error: err.message }; }
  }, [logAudit]);

  const handleDeleteTxn = useCallback(async (txn) => {
    if (!window.confirm(`Delete this ${txn.type.toLowerCase()} entry "${txn.description}"?`)) return;
    try { await deleteDoc(doc(db, 'financeTransactions', txn.id)); await logAudit('Deleted ledger entry', txn.description); }
    catch (err) { alert('Could not delete: ' + err.message); }
  }, [logAudit]);

  // ── CRUD: Fixed Assets ─────────────────────────────────────────────────
  const handleSaveAsset = useCallback(async (form, isEdit) => {
    try {
      if (isEdit) { await updateDoc(doc(db, 'fixedAssets', form.id), { ...form, updatedAt: serverTimestamp() }); await logAudit('Updated fixed asset', form.name); }
      else { await addDoc(collection(db, 'fixedAssets'), { ...form, ref: generateRef('FA'), createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' }); await logAudit('Added fixed asset', form.name, fmtMoney(form.cost)); }
      return { success: true };
    } catch (err) { console.error(err); return { success: false, error: err.message }; }
  }, [logAudit]);

  const handleDeleteAsset = useCallback(async (asset) => {
    if (!window.confirm(`Delete fixed asset "${asset.name}"?`)) return;
    try { await deleteDoc(doc(db, 'fixedAssets', asset.id)); await logAudit('Deleted fixed asset', asset.name); }
    catch (err) { alert('Could not delete: ' + err.message); }
  }, [logAudit]);

  // ── CRUD: Loans ─────────────────────────────────────────────────────────
  const handleSaveLoan = useCallback(async (form, isEdit) => {
    try {
      if (isEdit) { await updateDoc(doc(db, 'loans', form.id), { ...form, updatedAt: serverTimestamp() }); await logAudit('Updated loan', form.lender); }
      else { await addDoc(collection(db, 'loans'), { ...form, ref: generateRef('LN'), createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' }); await logAudit('Added loan', form.lender, fmtMoney(form.principal)); }
      return { success: true };
    } catch (err) { console.error(err); return { success: false, error: err.message }; }
  }, [logAudit]);

  const handleDeleteLoan = useCallback(async (loan) => {
    if (!window.confirm(`Delete loan record from "${loan.lender}"?`)) return;
    try { await deleteDoc(doc(db, 'loans', loan.id)); await logAudit('Deleted loan', loan.lender); }
    catch (err) { alert('Could not delete: ' + err.message); }
  }, [logAudit]);

  // ── CRUD: Contractor Vouchers ──────────────────────────────────────────
  const handleSaveVoucher = useCallback(async (form, isEdit) => {
    try {
      if (isEdit) { await updateDoc(doc(db, 'contractorVouchers', form.id), { ...form, updatedAt: serverTimestamp() }); await logAudit('Updated payment voucher', form.contractorId); }
      else { await addDoc(collection(db, 'contractorVouchers'), { ...form, ref: generateRef('PV'), createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' }); await logAudit('Issued payment voucher', form.contractorId, fmtMoney(form.amount)); }
      return { success: true };
    } catch (err) { console.error(err); return { success: false, error: err.message }; }
  }, [logAudit]);

  const handleDeleteVoucher = useCallback(async (v) => {
    if (!window.confirm('Delete this payment voucher?')) return;
    try { await deleteDoc(doc(db, 'contractorVouchers', v.id)); await logAudit('Deleted payment voucher', v.id); }
    catch (err) { alert('Could not delete: ' + err.message); }
  }, [logAudit]);

  // ── CRUD: Dividends ─────────────────────────────────────────────────────
  const handleSaveDividend = useCallback(async (form, isEdit) => {
    try {
      if (isEdit) { await updateDoc(doc(db, 'dividends', form.id), { ...form, updatedAt: serverTimestamp() }); await logAudit('Updated dividend', form.shareholder); }
      else { await addDoc(collection(db, 'dividends'), { ...form, ref: generateRef('DIV'), createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' }); await logAudit('Declared dividend', form.shareholder, fmtMoney(form.amount)); }
      return { success: true };
    } catch (err) { console.error(err); return { success: false, error: err.message }; }
  }, [logAudit]);

  const handleDeleteDividend = useCallback(async (d) => {
    if (!window.confirm(`Delete dividend record for "${d.shareholder}"?`)) return;
    try { await deleteDoc(doc(db, 'dividends', d.id)); await logAudit('Deleted dividend', d.shareholder); }
    catch (err) { alert('Could not delete: ' + err.message); }
  }, [logAudit]);

  // ── CRUD: Compliance Events ────────────────────────────────────────────
  const handleSaveEvent = useCallback(async (form, isEdit) => {
    try {
      if (isEdit) { await updateDoc(doc(db, 'complianceEvents', form.id), { ...form, updatedAt: serverTimestamp() }); }
      else { await addDoc(collection(db, 'complianceEvents'), { ...form, createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' }); }
      await logAudit(isEdit ? 'Updated compliance event' : 'Added compliance event', form.type, form.dueDate);
      return { success: true };
    } catch (err) { console.error(err); return { success: false, error: err.message }; }
  }, [logAudit]);

  const handleDeleteEvent = useCallback(async (ev) => {
    if (!window.confirm('Delete this compliance event?')) return;
    try { await deleteDoc(doc(db, 'complianceEvents', ev.id)); await logAudit('Deleted compliance event', ev.type); }
    catch (err) { alert('Could not delete: ' + err.message); }
  }, [logAudit]);

  // ── Derived: Double-Entry Books & Financial Statements ─────────────────
  const cashAccounts = useMemo(() => accounts.filter(a => a.type === 'Asset' && /cash|bank/i.test(a.name)), [accounts]);
  const receivableAccount = useMemo(() => accounts.find(a => /accounts receivable/i.test(a.name)), [accounts]);
  const payableAccount = useMemo(() => accounts.find(a => /accounts payable/i.test(a.name)), [accounts]);
  const accountBalances = useMemo(() => computeAccountBalances(journalEntries, accounts), [journalEntries, accounts]);

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
    const totalEquity = totalEquityRaw + incomeStatement.netIncome;
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balances: totalAssets - (totalLiabilities + totalEquity) };
  }, [accounts, accountBalances, incomeStatement.netIncome]);

  const cashFlowStatement = useMemo(() => {
    const cashCodes = new Set(cashAccounts.map(a => a.code));
    const byCategory = { operating: 0, investing: 0, financing: 0 };
    const accByCode = Object.fromEntries(accounts.map(a => [a.code, a]));
    journalEntries.filter(e => e.status !== 'void').forEach(e => {
      (e.lines || []).forEach(l => {
        if (!cashCodes.has(l.accountCode)) return;
        const net = (Number(l.debit) || 0) - (Number(l.credit) || 0);
        const others = (e.lines || []).filter(o => o !== l && !cashCodes.has(o.accountCode));
        const category = others[0] ? (accByCode[others[0].accountCode]?.cashFlowCategory || 'operating') : 'operating';
        byCategory[category] = (byCategory[category] || 0) + net;
      });
    });
    return { ...byCategory, net: byCategory.operating + byCategory.investing + byCategory.financing };
  }, [journalEntries, cashAccounts, accounts]);

  const totalCash = useMemo(() => cashAccounts.reduce((s, a) => s + (accountBalances[a.code] || 0), 0), [cashAccounts, accountBalances]);
  const totalReceivable = useMemo(() => receivableAccount ? (accountBalances[receivableAccount.code] || 0) : 0, [receivableAccount, accountBalances]);
  const totalPayable = useMemo(() => payableAccount ? (accountBalances[payableAccount.code] || 0) : 0, [payableAccount, accountBalances]);

  // ── Chart of Accounts CRUD ─────────────────────────────────────────────
  const seedChartOfAccounts = useCallback(async () => {
    if (!window.confirm(`Create ${DEFAULT_CHART_OF_ACCOUNTS.length} standard accounts?`)) return;
    for (const a of DEFAULT_CHART_OF_ACCOUNTS) await setDoc(doc(db, 'accounts', a.code), a);
    await logAudit('Seeded chart of accounts', 'accounts', `${DEFAULT_CHART_OF_ACCOUNTS.length} accounts`);
  }, [logAudit]);

  const handleAddAccount = useCallback(async (account) => {
    await setDoc(doc(db, 'accounts', account.code), account);
    await logAudit('Created account', account.code, account.name);
  }, [logAudit]);

  const handleDeleteAccount = useCallback(async (account) => {
    if (!window.confirm(`Delete account ${account.code} · ${account.name}? This does not delete past journal entries.`)) return;
    try { await deleteDoc(doc(db, 'accounts', account.id || account.code)); await logAudit('Deleted account', account.code, account.name); }
    catch (err) { alert('Could not delete: ' + err.message); }
  }, [logAudit]);

  // ── Journal (double-entry) CRUD ────────────────────────────────────────
  const handlePostEntry = useCallback(async (entry) => {
    await addDoc(collection(db, 'journalEntries'), { ...entry, status: 'posted', createdBy: auth.currentUser?.email || 'unknown', createdAt: serverTimestamp() });
    await logAudit('Posted journal entry', entry.reference, entry.memo);
  }, [logAudit]);

  const handleVoidEntry = useCallback(async (entry) => {
    if (!window.confirm(`Void entry ${entry.reference}? It stays in the audit trail but is excluded from balances.`)) return;
    await updateDoc(doc(db, 'journalEntries', entry.id), { status: 'void' });
    await logAudit('Voided journal entry', entry.reference, entry.memo);
  }, [logAudit]);

  // ── Invoicing ────────────────────────────────────────────────────────────
  const handleCreateInvoice = useCallback(async (invoice) => {
    await addDoc(collection(db, 'invoices'), { ...invoice, createdBy: auth.currentUser?.email || 'unknown', createdAt: serverTimestamp() });
    await logAudit('Created invoice', invoice.invoiceNo, `${invoice.customerName} · ${fmtMoney(invoice.total)}`);
  }, [logAudit]);

  const handleSendInvoice = useCallback(async (invoice) => {
    await updateDoc(doc(db, 'invoices', invoice.id), { status: 'sent', sentAt: serverTimestamp() });
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

  // Confirming payment does three things at once: posts the balanced
  // settling journal entry to the Double-Entry Books, issues a receipt,
  // AND drops a matching Income entry into the Tax Ledger (with the right
  // Business Object / VAT / WHT tagging) so the CIT engine picks it up
  // automatically — nobody has to remember to re-key it by hand.
  const handleConfirmPayment = useCallback(async (invoice, { amount, method, cashAccountCode, whtWithheld, whtAmount, whtAccountCode, netCash }) => {
    const receiptNo = genReceiptNo();
    const cashAcc = accounts.find(a => a.code === cashAccountCode);
    // Whichever account the user picked in the Confirm Payment modal for
    // the WHT credit (falls back to the old regex guess, then '1300', if
    // the modal didn't supply one — e.g. programmatic callers).
    const whtAccount = accounts.find(a => a.code === whtAccountCode) || accounts.find(a => /withholding tax credit/i.test(a.name));

    const lines = [
      { accountCode: cashAccountCode, accountName: cashAcc?.name || 'Cash', debit: netCash, credit: 0 },
    ];
    if (whtWithheld && whtAmount > 0) {
      lines.push({ accountCode: whtAccount?.code || '1300', accountName: whtAccount?.name || 'Withholding Tax Credits (URA)', debit: whtAmount, credit: 0 });
    }
    lines.push({ accountCode: receivableAccount?.code || '1100', accountName: receivableAccount?.name || 'Accounts Receivable', debit: 0, credit: amount });

    await addDoc(collection(db, 'journalEntries'), {
      date: new Date().toISOString().slice(0, 10), reference: generateRef('PMT'),
      memo: `Payment received — ${invoice.invoiceNo} (${invoice.customerName})`, entryType: 'receivable',
      lines, status: 'posted', createdBy: auth.currentUser?.email || 'unknown', createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'receipts'), {
      receiptNo, invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, customerName: invoice.customerName,
      amount: netCash, whtWithheld, whtAmount, method, date: new Date().toISOString().slice(0, 10),
      issuedBy: auth.currentUser?.email || 'unknown', createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'invoices', invoice.id), { status: 'paid', paidAt: serverTimestamp(), receiptNo });

    // Bridge into the Tax Ledger so it feeds the CIT engine.
    await addDoc(collection(db, 'financeTransactions'), {
      date: new Date().toISOString().slice(0, 10), type: 'Income', object: invoice.businessObject || ACCOUNTING_OBJECTS[0],
      category: 'Service Fees / Contracts', description: `Invoice ${invoice.invoiceNo} — ${invoice.customerName}`,
      grossAmount: invoice.subtotal, vatTreatment: invoice.vatTreatment || VAT_TREATMENTS[3], vatAmount: invoice.taxAmount || 0,
      whtWithheld: !!whtWithheld, whtAmount: whtAmount || 0, whtCertificateNo: '',
      counterpartyName: invoice.customerName, counterpartyTIN: '', paymentMethod: method,
      ref: generateRef('INV'), createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown',
      sourceInvoiceNo: invoice.invoiceNo,
    });

    await logAudit('Confirmed payment', invoice.invoiceNo, `${fmtMoney(amount)} via ${method} · Receipt ${receiptNo}`);
  }, [accounts, receivableAccount, logAudit]);

  // ── Derived data ────────────────────────────────────────────────────────
  const contractors = useMemo(() =>
    employees.filter(e => e.engagementType === 'Independent Contractor').map(e => ({ ...e, _fullName: `${e.firstName || ''} ${e.lastName || ''}`.trim() })),
    [employees]);

  const contractorById = useCallback((id) => contractors.find(c => c.id === id) || employees.find(e => e.id === id), [contractors, employees]);

  const filteredTxns = useMemo(() => {
    let rows = transactions;
    if (txnTypeFilter !== 'All') rows = rows.filter(t => t.type === txnTypeFilter);
    if (txnObjectFilter !== 'All') rows = rows.filter(t => t.object === txnObjectFilter);
    if (txnSearch.trim()) {
      const q = txnSearch.toLowerCase();
      rows = rows.filter(t => (t.description || '').toLowerCase().includes(q) || (t.counterpartyName || '').toLowerCase().includes(q) || (t.ref || '').toLowerCase().includes(q));
    }
    return [...rows].sort((a, b) => (toDateObj(b.date) || 0) - (toDateObj(a.date) || 0));
  }, [transactions, txnTypeFilter, txnObjectFilter, txnSearch]);

  const objectSummary = useMemo(() => {
    const map = {};
    ACCOUNTING_OBJECTS.forEach(o => { map[o] = { income: 0, expense: 0 }; });
    transactions.forEach(t => {
      if (!map[t.object]) map[t.object] = { income: 0, expense: 0 };
      if (t.type === 'Income') map[t.object].income += Number(t.grossAmount) || 0;
      else map[t.object].expense += Number(t.grossAmount) || 0;
    });
    return map;
  }, [transactions]);

  const citSummary = useMemo(() => computeCITForYear(transactions, fixedAssets, selectedFiscalYear), [transactions, fixedAssets, selectedFiscalYear]);

  const assetsWithDepreciation = useMemo(() =>
    fixedAssets.map(a => ({ ...a, _dep: depreciationForAsset(a, selectedFiscalYear) })),
    [fixedAssets, selectedFiscalYear]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...complianceEvents]
      .filter(e => e.status !== 'Filed')
      .map(e => ({ ...e, _daysLeft: e.dueDate ? Math.round((toDateObj(e.dueDate) - now) / 86400000) : null }))
      .sort((a, b) => (a._daysLeft ?? 9999) - (b._daysLeft ?? 9999));
  }, [complianceEvents]);

  const dueSoonEvents = useMemo(() => upcomingEvents.filter(e => e._daysLeft !== null && e._daysLeft <= 14), [upcomingEvents]);

  const outstandingLoanTotal = useMemo(() => loans.filter(l => l.status === 'Active').reduce((s, l) => s + (Number(l.outstandingBalance) || 0), 0), [loans]);
  const totalDividendsPaid = useMemo(() => dividends.reduce((s, d) => s + (Number(d.amount) || 0), 0), [dividends]);

  const exportTxnsCSV = () => exportTablePDF('General Ledger', filteredTxns, [
    { label: 'Ref', get: t => t.ref },
    { label: 'Date', get: t => fmtDate(t.date) },
    { label: 'Type', get: t => t.type },
    { label: 'Business Object', get: t => t.object },
    { label: 'Category', get: t => t.category },
    { label: 'Description', get: t => t.description },
    { label: 'Amount', get: t => t.grossAmount },
    { label: 'VAT Treatment', get: t => t.vatTreatment },
    { label: 'VAT Amount', get: t => t.vatAmount },
    { label: 'WHT Withheld', get: t => t.whtWithheld ? 'Yes' : 'No' },
    { label: 'WHT Amount', get: t => t.whtAmount },
    { label: 'Counterparty', get: t => t.counterpartyName },
  ]);

  const exportAssetsCSV = () => exportTablePDF('Fixed Assets & Capital Allowances', assetsWithDepreciation, [
    { label: 'Ref', get: a => a.ref },
    { label: 'Name', get: a => a.name },
    { label: 'Class', get: a => assetClassByCode(a.assetClass).label },
    { label: 'Acquisition Date', get: a => fmtDate(a.acquisitionDate) },
    { label: 'Cost Base', get: a => a.cost },
    { label: 'Opening Book Value', get: a => Math.round(a._dep.opening) },
    { label: 'Depreciation This Year', get: a => Math.round(a._dep.depreciation) },
    { label: 'Closing Book Value', get: a => Math.round(a._dep.closing) },
  ]);

  // ── Derived: Journal & Invoicing filters ───────────────────────────────
  const filteredJournal = useMemo(() => {
    const q = journalSearch.trim().toLowerCase();
    return journalEntries
      .filter(e => journalFilter === 'all' || e.entryType === journalFilter)
      .filter(e => !q || e.memo?.toLowerCase().includes(q) || e.reference?.toLowerCase().includes(q) || (e.lines || []).some(l => l.accountName?.toLowerCase().includes(q)))
      .sort((a, b) => (toDateObj(b.date) || 0) - (toDateObj(a.date) || 0));
  }, [journalEntries, journalFilter, journalSearch]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    return invoices
      .filter(i => invoiceStatusFilter === 'All' || i.status === invoiceStatusFilter)
      .filter(i => !q || i.customerName?.toLowerCase().includes(q) || i.invoiceNo?.toLowerCase().includes(q))
      .sort((a, b) => (toDateObj(b.issueDate) || 0) - (toDateObj(a.issueDate) || 0));
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  const invoiceCounts = useMemo(() => {
    const c = { All: invoices.length };
    INVOICE_STATUSES.forEach(st => { c[st] = invoices.filter(i => i.status === st).length; });
    return c;
  }, [invoices]);

  const exportJournalCSV = () => exportTablePDF('General Journal', filteredJournal, [
    { label: 'Date', get: e => fmtDate(e.date) },
    { label: 'Reference', get: e => e.reference },
    { label: 'Book', get: e => e.entryType },
    { label: 'Description', get: e => e.memo },
    { label: 'Debit', get: e => lineTotals(e.lines || []).debit },
    { label: 'Credit', get: e => lineTotals(e.lines || []).credit },
    { label: 'Status', get: e => e.status },
  ]);

  const exportInvoicesCSV = () => exportTablePDF('Invoices', filteredInvoices, [
    { label: 'Invoice No', get: i => i.invoiceNo },
    { label: 'Customer', get: i => i.customerName },
    { label: 'Business Object', get: i => i.businessObject },
    { label: 'Issue Date', get: i => fmtDate(i.issueDate) },
    { label: 'Due Date', get: i => fmtDate(i.dueDate) },
    { label: 'Total', get: i => i.total },
    { label: 'Status', get: i => i.status },
  ]);

  const exportBalanceSheetPDF = () => openPrintWindow('Balance Sheet', buildBalanceSheetHtml(balanceSheet, incomeStatement));
  const exportIncomeStatementPDF = () => openPrintWindow('Income Statement', buildIncomeStatementHtml(incomeStatement));

  if (authLoading || (user && !profileLoaded)) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A7A9A' }}>Loading…</div>;
  }
  if (!user) return <LoginScreen />;
  if (!isAuthorized) return <AccessDenied email={user.email} onLogout={() => signOut(auth)} />;

  return (
    <Layout>
      <div style={s.page}>
        {idleWarning && <div style={s.errorBanner}>⏳ You've been idle a while — you'll be signed out soon for security. Move your mouse or click anywhere to stay signed in.</div>}

        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Accounts &amp; Tax Compliance Center</h1>
            <p style={s.pageSub}>Multi-sector ledger · Capital allowances · CIT engine · {COMPANY_INFO.name}</p>
          </div>
          <button style={s.logoutBtn} disabled={loggingOut} onClick={async () => { setLoggingOut(true); await signOut(auth); }}>{loggingOut ? 'Signing out…' : '⏻ Sign Out'}</button>
        </div>

        {dueSoonEvents.length > 0 && activeTab !== 'compliance' && (
          <div style={s.errorBanner}>⚠️ {dueSoonEvents.length} compliance {dueSoonEvents.length === 1 ? 'deadline is' : 'deadlines are'} due within 14 days — see the Compliance Calendar tab.</div>
        )}
        {txnsError && activeTab === 'ledger' && <div style={s.errorBanner}>⚠️ {txnsError}</div>}
        {booksError && activeTab === 'books' && <div style={s.errorBanner}>⚠️ {booksError}</div>}
        {invoicesError && activeTab === 'invoicing' && <div style={s.errorBanner}>⚠️ {invoicesError}</div>}
        {assetsError && activeTab === 'assets' && <div style={s.errorBanner}>⚠️ {assetsError}</div>}
        {loansError && activeTab === 'loans' && <div style={s.errorBanner}>⚠️ {loansError}</div>}
        {vouchersError && activeTab === 'contractors' && <div style={s.errorBanner}>⚠️ {vouchersError}</div>}
        {dividendsError && activeTab === 'dividends' && <div style={s.errorBanner}>⚠️ {dividendsError}</div>}
        {eventsError && activeTab === 'compliance' && <div style={s.errorBanner}>⚠️ {eventsError}</div>}

        <div style={s.dashSwitcher}>
          <button style={{ ...s.dashTab, ...(activeTab === 'dashboard' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'ledger' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('ledger')}>📒 Tax Ledger <span style={s.tabCount}>{transactions.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'books' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('books')}>📘 Double-Entry Books</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'invoicing' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('invoicing')}>🧾 Invoicing {invoiceCounts.sent > 0 && <span style={{ ...s.tabCount, background: '#DBEAFE', color: '#1D4ED8' }}>{invoiceCounts.sent}</span>}</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'statements' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('statements')}>📑 Financial Statements</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'assets' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('assets')}>🏢 Fixed Assets <span style={s.tabCount}>{fixedAssets.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'loans' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('loans')}>🏦 Loans <span style={s.tabCount}>{loans.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'contractors' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('contractors')}>🧾 Contractors &amp; Vouchers</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'dividends' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('dividends')}>💰 Dividends</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'compliance' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('compliance')}>🗓️ Compliance Calendar {dueSoonEvents.length > 0 && <span style={{ ...s.tabCount, background: '#FEF3C7', color: '#92400E' }}>{dueSoonEvents.length}</span>}</button>
        </div>

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Corporate Income Tax Summary</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select style={{ ...cu.select, width: 'auto' }} value={selectedFiscalYear} onChange={e => setSelectedFiscalYear(Number(e.target.value))}>
                  {fiscalOptions.map(o => <option key={o.startYear} value={o.startYear}>FY {o.label}</option>)}
                </select>
                <button style={s.tab} onClick={() => openPrintWindow(`CIT Computation — FY ${citSummary.label}`, buildCITHtml(citSummary, assetsWithDepreciation), 'portrait')}>⬇ Download CIT Sheet</button>
              </div>
            </div>

            <div style={s.trackGrid}>
              <StatCard label="Total Gross Income" value={fmtMoney(citSummary.totalIncome)} accent="#10B981" sub="All Business Objects pooled" />
              <StatCard label="Allowable Expenses" value={fmtMoney(citSummary.totalExpenses)} accent="#EF4444" sub="Operating costs, this FY" />
              <StatCard label="Capital Allowances" value={fmtMoney(citSummary.totalDepreciation)} accent="#F59E0B" sub="Wear &amp; tear, this FY" />
              <StatCard label="Net Profit for the FY" value={fmtMoney(citSummary.netBeforeLoss)} accent="#059669" sub="Income − Expenses − Capital Allowances" />
              <StatCard label="Chargeable Income" value={fmtMoney(citSummary.chargeable)} accent="#1A3C5E" sub={citSummary.lossUtilised > 0 ? `After ${fmtMoney(citSummary.lossUtilised)} loss relief` : 'After loss relief'} />
              <StatCard label="CIT @ 30% (before WHT credit)" value={fmtMoney(citSummary.citGross)} accent="#7C3AED" />
              <StatCard label="WHT Credits Collected" value={fmtMoney(citSummary.totalWhtCredits)} accent="#0D9488" sub="6% withheld by payers" />
              <StatCard label="Net CIT Payable" value={fmtMoney(citSummary.citPayable)} accent="#DC2626" sub={`FY ${citSummary.label}`} />
              <StatCard label="Loss Carried Forward" value={fmtMoney(citSummary.lossCarriedOut)} accent="#64748B" sub="Shields future profit" />
            </div>

            <h2 style={{ ...s.sectionHead, margin: '28px 0 14px' }}>Business Object Performance (Internal Only — Not Separately Taxed)</h2>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr style={s.thead}><th style={s.th}>Business Object</th><th style={s.th}>Income</th><th style={s.th}>Expenses</th><th style={s.th}>Net</th></tr></thead>
                <tbody>
                  {ACCOUNTING_OBJECTS.map(o => {
                    const row = objectSummary[o] || { income: 0, expense: 0 };
                    const net = row.income - row.expense;
                    return (
                      <tr key={o} style={s.tr}>
                        <td style={s.td}><ObjectBadge object={o} /></td>
                        <td style={s.td}>{fmtMoney(row.income)}</td>
                        <td style={s.td}>{fmtMoney(row.expense)}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: net >= 0 ? '#065F46' : '#991B1B' }}>{fmtMoney(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ ...s.trackGrid, marginTop: 24 }}>
              <StatCard label="Outstanding Loan Balance" value={fmtMoney(outstandingLoanTotal)} accent="#B45309" sub="Active facilities" />
              <StatCard label="Dividends Paid (all time)" value={fmtMoney(totalDividendsPaid)} accent="#0D9488" sub="15% WHT remitted per payout" />
              <StatCard label="Independent Contractors" value={contractors.length} accent="#4338CA" sub="Service-agreement staff" />
              <StatCard label="Output VAT Collected (FY)" value={fmtMoney(citSummary.totalVatCollected)} accent="#1D4ED8" sub="Standard-rated income" />
            </div>

            <h2 style={{ ...s.sectionHead, margin: '28px 0 14px' }}>Double-Entry Books Snapshot</h2>
            <div style={s.trackGrid}>
              <StatCard label="Cash &amp; Bank" value={fmtMoney(totalCash)} accent="#1A3C5E" />
              <StatCard label="Accounts Receivable" value={fmtMoney(totalReceivable)} accent="#2E6DA4" sub={`${invoiceCounts.sent || 0} unpaid invoices`} />
              <StatCard label="Accounts Payable" value={fmtMoney(totalPayable)} accent="#EF4444" />
              <StatCard label="Net Income (Books, to date)" value={fmtMoney(incomeStatement.netIncome)} accent={incomeStatement.netIncome >= 0 ? '#10B981' : '#EF4444'} />
            </div>
            {accounts.length === 0 && (
              <p style={{ fontSize: 12.5, color: '#9AAAB8', marginTop: 12 }}>No chart of accounts yet — head to <strong>Double-Entry Books → Chart of Accounts</strong> to seed the defaults and start posting entries.</p>
            )}

            <p style={{ fontSize: 11.5, color: '#9AAAB8', marginTop: 18 }}>
              The CIT computation above is a working paper generated from the Tax Ledger and fixed-asset register; the snapshot here comes from the separate Double-Entry Books. Neither is a substitute for a qualified accountant's review before filing with the URA.
            </p>
          </>
        )}

        {/* ── Ledger ── */}
        {activeTab === 'ledger' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>General Ledger</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportTxnsCSV}>⬇ Export PDF</button>
                {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => { setEditingTxn(null); setShowTxnForm(true); }}>➕ New Entry</button>}
              </div>
            </div>
            <div style={s.toolbar}>
              <div style={s.tabs}>
                {['All', ...TXN_TYPES].map(t => <button key={t} style={{ ...s.tab, ...(txnTypeFilter === t ? s.tabActive : {}) }} onClick={() => setTxnTypeFilter(t)}>{t}</button>)}
              </div>
              <select style={{ ...cu.select, width: 'auto' }} value={txnObjectFilter} onChange={e => setTxnObjectFilter(e.target.value)}>
                <option value="All">All Business Objects</option>
                {ACCOUNTING_OBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <input style={s.searchInput} placeholder="Search description, counterparty, or ref…" value={txnSearch} onChange={e => setTxnSearch(e.target.value)} />
            </div>
            <div style={s.tableWrap}>
              {loadingTxns ? <div style={s.tableMsg}>Loading ledger…</div> : filteredTxns.length === 0 ? <div style={s.tableMsg}>No transactions match your filters.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}>
                    <th style={s.th}>Date</th><th style={s.th}>Type</th><th style={s.th}>Object</th><th style={s.th}>Description</th>
                    <th style={s.th}>Amount</th><th style={s.th}>VAT</th><th style={s.th}>WHT</th><th style={s.th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filteredTxns.map(t => (
                      <tr key={t.id} style={s.tr}>
                        <td style={s.td}>{fmtDate(t.date)}</td>
                        <td style={s.td}><TxnTypeBadge type={t.type} /></td>
                        <td style={s.td}><ObjectBadge object={t.object} /></td>
                        <td style={s.td}>{t.description}<div style={{ fontSize: 11, color: '#9AAAB8' }}>{t.ref} {t.counterpartyName ? `· ${t.counterpartyName}` : ''}</div></td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{fmtMoney(t.grossAmount)}</td>
                        <td style={s.td}>{t.vatTreatment === VAT_TREATMENTS[0] ? fmtMoney(t.vatAmount) : '—'}</td>
                        <td style={s.td}>{t.whtWithheld ? fmtMoney(t.whtAmount) : '—'}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {t.type === 'Income' && <button style={s.btnShortlist} onClick={() => openPrintWindow(`Invoice ${t.ref}`, buildInvoiceHtml(t), 'portrait')}>Invoice</button>}
                            {canWrite && <button style={s.btnView} onClick={() => { setEditingTxn(t); setShowTxnForm(true); }}>Edit</button>}
                            {canDelete && <button style={s.btnDelete} onClick={() => handleDeleteTxn(t)}>Delete</button>}
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

        {/* ── Double-Entry Books (Journal + Chart of Accounts) ── */}
        {activeTab === 'books' && (
          <>
            <div style={s.toolbar}>
              <div style={s.tabs}>
                <button style={{ ...s.tab, ...(booksSubTab === 'journal' ? s.tabActive : {}) }} onClick={() => setBooksSubTab('journal')}>Journal</button>
                <button style={{ ...s.tab, ...(booksSubTab === 'chart' ? s.tabActive : {}) }} onClick={() => setBooksSubTab('chart')}>Chart of Accounts</button>
              </div>
            </div>

            {booksSubTab === 'journal' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ ...s.sectionHead, margin: 0 }}>General Journal</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={s.tab} onClick={exportJournalCSV}>⬇ Export PDF</button>
                    {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => setShowJournalForm(true)}>➕ New Entry</button>}
                  </div>
                </div>
                <div style={s.toolbar}>
                  <div style={s.tabs}>
                    {[{ key: 'all', label: 'All' }, ...ENTRY_TYPES].map(t => <button key={t.key} style={{ ...s.tab, ...(journalFilter === t.key ? s.tabActive : {}) }} onClick={() => setJournalFilter(t.key)}>{t.label}</button>)}
                  </div>
                  <input style={s.searchInput} placeholder="Search reference, memo, or account…" value={journalSearch} onChange={e => setJournalSearch(e.target.value)} />
                </div>
                <div style={s.tableWrap}>
                  {loadingBooks ? <div style={s.tableMsg}>Loading journal…</div> : filteredJournal.length === 0 ? <div style={s.tableMsg}>No entries yet{canWrite ? ' — post your first journal entry above.' : '.'}</div> : (
                    <table style={s.table}>
                      <thead><tr style={s.thead}>
                        <th style={s.th}>Date</th><th style={s.th}>Reference</th><th style={s.th}>Description</th><th style={s.th}>Lines</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Debit</th><th style={{ ...s.th, textAlign: 'right' }}>Credit</th><th style={s.th}>Status</th>{canDelete && <th style={s.th}>Actions</th>}
                      </tr></thead>
                      <tbody>
                        {filteredJournal.map(e => {
                          const t = lineTotals(e.lines || []);
                          return (
                            <tr key={e.id} style={s.tr}>
                              <td style={s.td}>{fmtDate(e.date)}</td>
                              <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12.5 }}>{e.reference}</td>
                              <td style={s.td}>{e.memo}</td>
                              <td style={{ ...s.td, fontSize: 12.5, color: '#5A7A9A' }}>{(e.lines || []).map(l => `${l.accountName} ${l.debit ? 'Dr ' + fmtMoney(l.debit) : 'Cr ' + fmtMoney(l.credit)}`).join(' · ')}</td>
                              <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(t.debit)}</td>
                              <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(t.credit)}</td>
                              <td style={s.td}>{e.status === 'void' ? <Badge text="Void" tone="gray" /> : <Badge text="Posted" tone="green" />}</td>
                              {canDelete && <td style={s.td}>{e.status !== 'void' && <button style={s.btnDelete} onClick={() => handleVoidEntry(e)}>Void</button>}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {booksSubTab === 'chart' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <h2 style={{ ...s.sectionHead, margin: 0 }}>Chart of Accounts</h2>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {accounts.length === 0 && canWrite && <button style={s.tab} onClick={seedChartOfAccounts}>🌱 Seed Default Chart</button>}
                    {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => setShowAccountForm(true)}>➕ New Account</button>}
                  </div>
                </div>
                <div style={s.tableWrap}>
                  {accounts.length === 0 ? <div style={s.tableMsg}>No accounts yet. Seed the default chart or add your own.</div> : (
                    <table style={s.table}>
                      <thead><tr style={s.thead}><th style={s.th}>Code</th><th style={s.th}>Name</th><th style={s.th}>Type</th><th style={s.th}>Cash Flow Category</th><th style={{ ...s.th, textAlign: 'right' }}>Balance</th>{canDelete && <th style={s.th}>Actions</th>}</tr></thead>
                      <tbody>
                        {accounts.map(a => (
                          <tr key={a.code} style={s.tr}>
                            <td style={{ ...s.td, fontFamily: 'monospace' }}>{a.code}</td>
                            <td style={{ ...s.td, fontWeight: 700 }}>{a.name}</td>
                            <td style={s.td}>{a.type}</td>
                            <td style={s.td}>{a.cashFlowCategory}</td>
                            <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(accountBalances[a.code] || 0)}</td>
                            {canDelete && <td style={s.td}><button style={s.btnDelete} onClick={() => handleDeleteAccount(a)}>Delete</button></td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Invoicing & Billing ── */}
        {activeTab === 'invoicing' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Billing &amp; Invoicing</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportInvoicesCSV}>⬇ Export PDF</button>
                {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => setShowInvoiceForm(true)}>➕ New Invoice</button>}
              </div>
            </div>
            <div style={s.toolbar}>
              <div style={s.tabs}>
                {['All', ...INVOICE_STATUSES].map(st => <button key={st} style={{ ...s.tab, ...(invoiceStatusFilter === st ? s.tabActive : {}) }} onClick={() => setInvoiceStatusFilter(st)}>{st === 'All' ? 'All' : st[0].toUpperCase() + st.slice(1)} <span style={s.tabCount}>{invoiceCounts[st] || 0}</span></button>)}
              </div>
              <input style={s.searchInput} placeholder="Search customer or invoice #…" value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} />
            </div>
            <div style={s.tableWrap}>
              {loadingInvoices ? <div style={s.tableMsg}>Loading invoices…</div> : filteredInvoices.length === 0 ? <div style={s.tableMsg}>No invoices match your filters.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Invoice</th><th style={s.th}>Customer</th><th style={s.th}>Due</th><th style={{ ...s.th, textAlign: 'right' }}>Total</th><th style={s.th}>Status</th><th style={s.th}>Actions</th></tr></thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} style={s.tr}>
                        <td style={s.td}><span style={{ fontWeight: 700, color: '#1A3C5E' }}>{inv.invoiceNo}</span><div style={{ fontSize: 12, color: '#7A8A9A' }}>Issued {fmtDate(inv.issueDate)}</div></td>
                        <td style={s.td}>{inv.customerName}</td>
                        <td style={s.td}>{fmtDate(inv.dueDate)}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(inv.total)}</td>
                        <td style={s.td}><Badge text={inv.status} tone={invoiceStatusTone(inv.status)} /></td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button style={s.btnView} onClick={() => openPrintWindow(`Invoice ${inv.invoiceNo}`, buildFormalInvoiceHtml(inv), 'portrait')}>🖨 Print</button>
                            {canWrite && inv.status === 'draft' && <button style={s.btnShortlist} onClick={() => handleSendInvoice(inv)}>Send</button>}
                            {canApprove && ['sent', 'overdue'].includes(inv.status) && <button style={s.btnShortlist} onClick={() => setPaymentTarget(inv)}>Confirm Payment</button>}
                            {canEdit && !['void', 'paid'].includes(inv.status) && <button style={s.btnReject} onClick={() => handleVoidInvoice(inv)}>Void</button>}
                            {canDelete && inv.status === 'draft' && <button style={s.btnDelete} onClick={() => handleDeleteInvoice(inv)}>Delete</button>}
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
              {receipts.length === 0 ? <div style={s.tableMsg}>No receipts issued yet — receipts are created automatically when you confirm an invoice payment.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Receipt</th><th style={s.th}>Invoice</th><th style={s.th}>Customer</th><th style={s.th}>Method</th><th style={{ ...s.th, textAlign: 'right' }}>Amount</th><th style={s.th}>Date</th><th style={s.th}>Actions</th></tr></thead>
                  <tbody>
                    {[...receipts].sort((a, b) => (toDateObj(b.date) || 0) - (toDateObj(a.date) || 0)).map(r => (
                      <tr key={r.id} style={s.tr}>
                        <td style={{ ...s.td, fontWeight: 700, color: '#1A3C5E' }}>{r.receiptNo}</td>
                        <td style={s.td}>{r.invoiceNo}</td>
                        <td style={s.td}>{r.customerName}</td>
                        <td style={s.td}>{r.method}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(r.amount)}</td>
                        <td style={s.td}>{fmtDate(r.date)}</td>
                        <td style={s.td}><button style={s.btnView} onClick={() => openPrintWindow(`Receipt ${r.receiptNo}`, buildReceiptHtml(r), 'portrait')}>🖨 Print</button></td>
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
                <button style={{ ...s.tab, ...(statementsSubTab === 'balance' ? s.tabActive : {}) }} onClick={() => setStatementsSubTab('balance')}>Balance Sheet</button>
                <button style={{ ...s.tab, ...(statementsSubTab === 'income' ? s.tabActive : {}) }} onClick={() => setStatementsSubTab('income')}>Income Statement</button>
                <button style={{ ...s.tab, ...(statementsSubTab === 'cashflow' ? s.tabActive : {}) }} onClick={() => setStatementsSubTab('cashflow')}>Cash Flow</button>
              </div>
            </div>

            {statementsSubTab === 'balance' && (
              <div style={s.tableWrap}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ ...s.sectionHead, margin: 0 }}>Assets</h3>
                    <button style={s.tab} onClick={exportBalanceSheetPDF}>⬇ Export PDF</button>
                  </div>
                  {balanceSheet.assets.map(a => <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}><span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{fmtMoney(a.balance)}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, color: '#1A3C5E' }}><span>Total Assets</span><span>{fmtMoney(balanceSheet.totalAssets)}</span></div>

                  <h3 style={{ ...s.sectionHead, marginTop: 20 }}>Liabilities</h3>
                  {balanceSheet.liabilities.map(a => <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}><span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{fmtMoney(a.balance)}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, color: '#1A3C5E' }}><span>Total Liabilities</span><span>{fmtMoney(balanceSheet.totalLiabilities)}</span></div>

                  <h3 style={{ ...s.sectionHead, marginTop: 20 }}>Equity</h3>
                  {balanceSheet.equity.map(a => <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}><span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{fmtMoney(a.balance)}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8', fontStyle: 'italic', color: '#5A7A9A' }}><span>Current-Period Earnings</span><span>{fmtMoney(incomeStatement.netIncome)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800, color: '#1A3C5E' }}><span>Total Equity</span><span>{fmtMoney(balanceSheet.totalEquity)}</span></div>

                  <div style={{ marginTop: 16 }}>
                    {Math.abs(balanceSheet.balances) < 1
                      ? <Badge text="✓ Balance sheet balances (Assets = Liabilities + Equity)" tone="green" />
                      : <Badge text={`Out of balance by ${fmtMoney(Math.abs(balanceSheet.balances))} — check for unposted or misclassified entries`} tone="red" />}
                  </div>
                </div>
              </div>
            )}

            {statementsSubTab === 'income' && (
              <div style={s.tableWrap}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ ...s.sectionHead, margin: 0 }}>Revenue</h3>
                    <button style={s.tab} onClick={exportIncomeStatementPDF}>⬇ Export PDF</button>
                  </div>
                  {incomeStatement.revenue.map(a => <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}><span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{fmtMoney(a.balance)}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800 }}><span>Total Revenue</span><span>{fmtMoney(incomeStatement.totalRevenue)}</span></div>

                  <h3 style={{ ...s.sectionHead, marginTop: 20 }}>Expenses</h3>
                  {incomeStatement.expenses.map(a => <div key={a.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}><span>{a.code} · {a.name}</span><span style={{ fontWeight: 600 }}>{fmtMoney(a.balance)}</span></div>)}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 800 }}><span>Total Expenses</span><span>{fmtMoney(incomeStatement.totalExpenses)}</span></div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', marginTop: 10, borderTop: '2px solid #1A3C5E', fontWeight: 800, fontSize: 16, color: incomeStatement.netIncome >= 0 ? '#059669' : '#B91C1C' }}><span>Net Income</span><span>{fmtMoney(incomeStatement.netIncome)}</span></div>
                </div>
              </div>
            )}

            {statementsSubTab === 'cashflow' && (
              <div style={s.tableWrap}>
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}><span>Operating Activities</span><span style={{ fontWeight: 600 }}>{fmtMoney(cashFlowStatement.operating)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}><span>Investing Activities</span><span style={{ fontWeight: 600 }}>{fmtMoney(cashFlowStatement.investing)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F0F4F8' }}><span>Financing Activities</span><span style={{ fontWeight: 600 }}>{fmtMoney(cashFlowStatement.financing)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', marginTop: 10, borderTop: '2px solid #1A3C5E', fontWeight: 800, fontSize: 16 }}><span>Net Change in Cash</span><span>{fmtMoney(cashFlowStatement.net)}</span></div>
                  <p style={{ fontSize: 12, color: '#9AAAB8', marginTop: 14 }}>Categorized automatically from the offsetting account on each journal entry that touches Cash and Bank. Tag accounts with the right cash-flow category in Chart of Accounts to keep this accurate.</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Fixed Assets ── */}
        {activeTab === 'assets' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>Fixed Assets &amp; Capital Allowances</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>Depreciation shown for FY {fiscalYearLabel(selectedFiscalYear)} — change the year on the Dashboard tab.</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportAssetsCSV}>⬇ Export PDF</button>
                {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => { setEditingAsset(null); setShowAssetForm(true); }}>➕ New Asset</button>}
              </div>
            </div>
            <div style={s.tableWrap}>
              {loadingAssets ? <div style={s.tableMsg}>Loading fixed assets…</div> : assetsWithDepreciation.length === 0 ? <div style={s.tableMsg}>No fixed assets recorded yet.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}>
                    <th style={s.th}>Asset</th><th style={s.th}>Class</th><th style={s.th}>Acquired</th><th style={s.th}>Cost Base</th>
                    <th style={s.th}>Opening BV</th><th style={s.th}>Depreciation (FY)</th><th style={s.th}>Closing BV</th><th style={s.th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {assetsWithDepreciation.map(a => (
                      <tr key={a.id} style={s.tr}>
                        <td style={s.td}>{a.name}{a.notes && <div style={{ fontSize: 11, color: '#9AAAB8' }}>{a.notes}</div>}</td>
                        <td style={s.td}>{assetClassByCode(a.assetClass).label.split('(')[0]}</td>
                        <td style={s.td}>{fmtDate(a.acquisitionDate)}</td>
                        <td style={s.td}>{fmtMoney(a.cost)}</td>
                        <td style={s.td}>{fmtMoney(a._dep.opening)}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: '#B45309' }}>{fmtMoney(a._dep.depreciation)}</td>
                        <td style={s.td}>{fmtMoney(a._dep.closing)}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {canWrite && <button style={s.btnView} onClick={() => { setEditingAsset(a); setShowAssetForm(true); }}>Edit</button>}
                            {canDelete && <button style={s.btnDelete} onClick={() => handleDeleteAsset(a)}>Delete</button>}
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

        {/* ── Loans ── */}
        {activeTab === 'loans' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Loans &amp; Debentures</h2>
              {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => { setEditingLoan(null); setShowLoanForm(true); }}>➕ New Loan</button>}
            </div>
            <div style={s.tableWrap}>
              {loadingLoans ? <div style={s.tableMsg}>Loading loans…</div> : loans.length === 0 ? <div style={s.tableMsg}>No loans recorded yet.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}>
                    <th style={s.th}>Lender</th><th style={s.th}>Principal</th><th style={s.th}>Rate</th><th style={s.th}>Outstanding</th>
                    <th style={s.th}>Interest Paid</th><th style={s.th}>Debenture</th><th style={s.th}>Status</th><th style={s.th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {loans.map(l => (
                      <tr key={l.id} style={s.tr}>
                        <td style={s.td}>{l.lender}</td>
                        <td style={s.td}>{fmtMoney(l.principal)}</td>
                        <td style={s.td}>{l.interestRate}%</td>
                        <td style={s.td}>{fmtMoney(l.outstandingBalance)}</td>
                        <td style={s.td}>{fmtMoney(l.interestPaidTotal)}</td>
                        <td style={s.td}>{l.debentureRegistered ? `✅ ${l.debentureRegNo || ''}` : '—'}</td>
                        <td style={s.td}>{l.status}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button style={s.btnShortlist} onClick={() => openPrintWindow(`Loan Note — ${l.lender}`, buildLoanHtml(l))}>Note</button>
                            {canWrite && <button style={s.btnView} onClick={() => { setEditingLoan(l); setShowLoanForm(true); }}>Edit</button>}
                            {canDelete && <button style={s.btnDelete} onClick={() => handleDeleteLoan(l)}>Delete</button>}
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

        {/* ── Contractors & Vouchers ── */}
        {activeTab === 'contractors' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Contractors &amp; Payment Vouchers</h2>
              {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => { setEditingVoucher(null); setShowVoucherForm(true); }}>➕ New Voucher</button>}
            </div>
            <p style={{ ...s.pageSub, margin: '0 0 14px' }}>
              Weekly-Saturday token + last-Saturday monthly balance for Independent Contractors (see the Employee Directory in HR for the underlying Service Agreements). Formal payroll (PAYE/NSSF) stays in HR Manager.
            </p>
            {loadingEmployees ? null : contractors.length === 0 && (
              <p style={{ fontSize: 12.5, color: '#9AAAB8', marginBottom: 14 }}>No employees are currently marked as "Independent Contractor" in the HR Employee Directory.</p>
            )}
            <div style={s.tableWrap}>
              {loadingVouchers ? <div style={s.tableMsg}>Loading vouchers…</div> : vouchers.length === 0 ? <div style={s.tableMsg}>No payment vouchers recorded yet.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}>
                    <th style={s.th}>Date</th><th style={s.th}>Contractor</th><th style={s.th}>Type</th><th style={s.th}>Amount</th><th style={s.th}>WHT</th><th style={s.th}>Task</th><th style={s.th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {[...vouchers].sort((a, b) => (toDateObj(b.date) || 0) - (toDateObj(a.date) || 0)).map(v => {
                      const c = contractorById(v.contractorId);
                      const name = c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : v.contractorId;
                      return (
                        <tr key={v.id} style={s.tr}>
                          <td style={s.td}>{fmtDate(v.date)}</td>
                          <td style={s.td}>{name}</td>
                          <td style={s.td}>{v.voucherType}</td>
                          <td style={{ ...s.td, fontWeight: 700 }}>{fmtMoney(v.amount)}</td>
                          <td style={s.td}>{v.whtWithheld ? fmtMoney(v.whtAmount) : '—'}</td>
                          <td style={s.td}>{v.taskDescription}</td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button style={s.btnShortlist} onClick={() => openPrintWindow(`Payment Voucher ${v.ref}`, buildVoucherHtml(v, name))}>Voucher</button>
                              {canWrite && <button style={s.btnView} onClick={() => { setEditingVoucher(v); setShowVoucherForm(true); }}>Edit</button>}
                              {canDelete && <button style={s.btnDelete} onClick={() => handleDeleteVoucher(v)}>Delete</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Dividends ── */}
        {activeTab === 'dividends' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Dividend Distributions</h2>
              {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => { setEditingDividend(null); setShowDividendForm(true); }}>➕ Declare Dividend</button>}
            </div>
            <div style={s.tableWrap}>
              {loadingDividends ? <div style={s.tableMsg}>Loading dividends…</div> : dividends.length === 0 ? <div style={s.tableMsg}>No dividends declared yet.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Date</th><th style={s.th}>Shareholder</th><th style={s.th}>Gross</th><th style={s.th}>WHT (15%)</th><th style={s.th}>Net Paid</th><th style={s.th}>Actions</th></tr></thead>
                  <tbody>
                    {[...dividends].sort((a, b) => (toDateObj(b.date) || 0) - (toDateObj(a.date) || 0)).map(d => (
                      <tr key={d.id} style={s.tr}>
                        <td style={s.td}>{fmtDate(d.date)}</td>
                        <td style={s.td}>{d.shareholder}</td>
                        <td style={s.td}>{fmtMoney(d.amount)}</td>
                        <td style={s.td}>{fmtMoney(d.whtAmount)}</td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{fmtMoney((Number(d.amount) || 0) - (Number(d.whtAmount) || 0))}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button style={s.btnShortlist} onClick={() => openPrintWindow(`Dividend Certificate ${d.ref}`, buildDividendHtml(d))}>Certificate</button>
                            {canWrite && <button style={s.btnView} onClick={() => { setEditingDividend(d); setShowDividendForm(true); }}>Edit</button>}
                            {canDelete && <button style={s.btnDelete} onClick={() => handleDeleteDividend(d)}>Delete</button>}
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

        {/* ── Compliance Calendar ── */}
        {activeTab === 'compliance' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>Compliance Calendar</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>URSB Annual Return (42 days post-AGM) · URA CIT/PAYE/VAT/WHT filing dates</p>
              </div>
              {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => { setEditingEvent(null); setShowEventForm(true); }}>➕ New Event</button>}
            </div>
            <div style={s.tableWrap}>
              {loadingEvents ? <div style={s.tableMsg}>Loading compliance calendar…</div> : upcomingEvents.length === 0 && complianceEvents.filter(e => e.status === 'Filed').length === 0 ? <div style={s.tableMsg}>No compliance events recorded yet.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Type</th><th style={s.th}>Due Date</th><th style={s.th}>Days Left</th><th style={s.th}>Status</th><th style={s.th}>Notes</th><th style={s.th}>Actions</th></tr></thead>
                  <tbody>
                    {[...complianceEvents].sort((a, b) => (toDateObj(a.dueDate) || 0) - (toDateObj(b.dueDate) || 0)).map(ev => {
                      const daysLeft = ev.dueDate ? Math.round((toDateObj(ev.dueDate) - new Date()) / 86400000) : null;
                      const overdue = daysLeft !== null && daysLeft < 0 && ev.status !== 'Filed';
                      return (
                        <tr key={ev.id} style={s.tr}>
                          <td style={s.td}>{ev.type}</td>
                          <td style={s.td}>{fmtDate(ev.dueDate)}</td>
                          <td style={{ ...s.td, color: overdue ? '#DC2626' : daysLeft !== null && daysLeft <= 14 ? '#B45309' : '#5A7A9A', fontWeight: overdue || (daysLeft !== null && daysLeft <= 14) ? 700 : 400 }}>
                            {ev.status === 'Filed' ? '—' : daysLeft === null ? '—' : overdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days`}
                          </td>
                          <td style={s.td}>{ev.status}</td>
                          <td style={s.td}>{ev.notes}</td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {canWrite && <button style={s.btnView} onClick={() => { setEditingEvent(ev); setShowEventForm(true); }}>Edit</button>}
                              {canDelete && <button style={s.btnDelete} onClick={() => handleDeleteEvent(ev)}>Delete</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {showTxnForm && <TransactionFormModal initial={editingTxn} onClose={() => { setShowTxnForm(false); setEditingTxn(null); }} onSave={handleSaveTxn} />}
      {showAssetForm && <FixedAssetFormModal initial={editingAsset} onClose={() => { setShowAssetForm(false); setEditingAsset(null); }} onSave={handleSaveAsset} />}
      {showLoanForm && <LoanFormModal initial={editingLoan} onClose={() => { setShowLoanForm(false); setEditingLoan(null); }} onSave={handleSaveLoan} />}
      {showVoucherForm && <VoucherFormModal contractors={contractors} initial={editingVoucher} onClose={() => { setShowVoucherForm(false); setEditingVoucher(null); }} onSave={handleSaveVoucher} />}
      {showDividendForm && <DividendFormModal initial={editingDividend} onClose={() => { setShowDividendForm(false); setEditingDividend(null); }} onSave={handleSaveDividend} />}
      {showEventForm && <ComplianceEventFormModal initial={editingEvent} onClose={() => { setShowEventForm(false); setEditingEvent(null); }} onSave={handleSaveEvent} />}
      {showAccountForm && <AccountModal onClose={() => setShowAccountForm(false)} onSave={handleAddAccount} />}
      {showJournalForm && <JournalEntryModal accounts={accounts} entryTypeDefault={journalFilter === 'all' ? 'general' : journalFilter} onClose={() => setShowJournalForm(false)} onSave={handlePostEntry} />}
      {showInvoiceForm && <InvoiceModal onClose={() => setShowInvoiceForm(false)} onSave={handleCreateInvoice} />}
      {paymentTarget && (
        <ConfirmPaymentModal
          invoice={paymentTarget}
          accounts={accounts}
          cashAccounts={cashAccounts.length ? cashAccounts : accounts.filter(a => a.type === 'Asset')}
          receivableAccount={receivableAccount}
          onClose={() => setPaymentTarget(null)}
          onConfirm={(payload) => handleConfirmPayment(paymentTarget, payload)}
        />
      )}
    </Layout>
  );
};

// ─── Styles (mirrors HrManager.jsx's design system, teal accent for Finance) ─
const s = {
  errorBanner: { background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E', fontWeight: 600 },

  loginBg:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' },
  loginCard:  { background: '#fff', borderRadius: 14, padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', textAlign: 'center', width: '100%', maxWidth: 380, border: '1px solid #E2E8F0', borderTop: '4px solid #0D9488' },
  loginTitle: { fontSize: 22, fontWeight: 700, color: '#1A3C5E', margin: '0 0 8px' },
  loginSub:   { color: '#5A7A9A', fontSize: 14, margin: '0 0 28px' },
  loginInput: { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  loginErr:   { color: '#EF4444', fontSize: 13, margin: '10px 0 0', textAlign: 'left' },
  loginBtn:   { width: '100%', background: '#0D9488', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },

  page:        { padding: '36px 5%', maxWidth: 1280, margin: '0 auto' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle:   { fontSize: 26, fontWeight: 700, color: '#1A3C5E', margin: 0 },
  pageSub:     { color: '#5A7A9A', margin: '4px 0 0', fontSize: 14 },
  logoutBtn:   { padding: '8px 16px', background: '#fff', border: '1.5px solid #C5CDD6', color: '#4A6B8A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  dashSwitcher: { display: 'flex', gap: 8, marginBottom: 28, borderBottom: '2px solid #E2E8F0', paddingBottom: 0, flexWrap: 'wrap' },
  dashTab:      { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '10px 4px 12px', fontSize: 14, fontWeight: 700, color: '#7A8A9A', cursor: 'pointer', marginBottom: -2 },
  dashTabActive:{ color: '#0D9488', borderBottomColor: '#0D9488' },

  sectionHead: { fontSize: 15, fontWeight: 700, color: '#1A3C5E', margin: '0 0 14px' },
  trackGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },

  toolbar:     { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' },
  tabs:        { display: 'flex', gap: 4, flexWrap: 'wrap' },
  tab:         { background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 7, padding: '7px 12px', fontSize: 13, color: '#5A7A9A', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 },
  tabActive:   { background: '#0D9488', color: '#fff', borderColor: '#0D9488' },
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
  modal:     { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', overflow: 'hidden' },
  modalForm: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
  header:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F7F9FC', borderRadius: '12px 12px 0 0', flexShrink: 0 },
  actionBar: { display: 'flex', gap: 8, padding: '12px 24px', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', flexShrink: 0 },
  actionBtn: { border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  body:      { overflowY: 'auto', padding: '20px 24px', flex: 1, minHeight: 0 },
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