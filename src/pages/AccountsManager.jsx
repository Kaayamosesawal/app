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
 *  - Payroll (from HrManager): each payroll run HR generates is posted here as a
 *    balanced journal (Dr Salaries + employer NSSF; Cr PAYE payable, NSSF payable,
 *    Bank) and as a deductible Tax Ledger expense, then tracked to remittance
 *    (PAYE + NSSF due by the 15th of the following month).
 *  - IT Operations Budget: the UGX 440,000 monthly business-expense budget is a shared
 *    company budget, NOT staff pay. Claims need a receipt reference, are approved,
 *    then paid to a supplier or reimbursed against actual spend, and post to the books.
 *
 *  - Harmonised workflow: every money movement lands in BOTH the Tax Ledger (CIT engine) and
 *    the Double-Entry Books (statements), so the Income Statement, Balance Sheet and CIT sheet agree:
 *      · Invoice sent       → Dr Receivable, Cr Revenue (+ Output VAT); payment later clears Receivable.
 *      · Manual ledger entry→ posted automatically to the books (edit/delete re-posts or voids it).
 *      · Contractor voucher → pending → approved → PAID; paying posts Dr Contractor Fees,
 *                             Cr WHT Payable, Cr Bank, plus a deductible Tax Ledger expense.
 *      · Payroll / IT Ops   → already posted both ways (unchanged).
 *      · Dividends          → "Post to Books": Dr Retained Earnings, Cr WHT Payable, Cr Bank.
 *    "Sync to books" back-fills older records, and Financial Statements → Reconciliation
 *    proves the two sets of figures agree.
 *
 * IMPORTANT — this is a records/compliance-support tool, not a filing
 * system: it does not call the live URA EFRIS API. Every figure it
 * produces should be reviewed by a qualified accountant/tax advisor
 * before being relied on for an actual URA or URSB filing.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db, auth } from '../firebase/firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc, addDoc, getDoc,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';
// Every printable document uses the shared Slirus letterhead/footer (utils/pdfBrand.js) through financePdfs.js.
import {
  downloadTablePdf, downloadTaxInvoicePdf, downloadInvoicePdf, downloadReceiptPdf, downloadVoucherPdf,
  downloadDividendPdf, downloadLoanPdf, downloadCitPdf, downloadBalanceSheetPdf, downloadIncomeStatementPdf,
  downloadPayrollSummaryPdf, downloadExpenseStatementPdf,
} from '../utils/financePdfs';

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
  { code: '5110', name: 'Employer NSSF Contribution', type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5200', name: 'Rent Expense',               type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5300', name: 'Utilities Expense',          type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5310', name: 'Communication Expense',      type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5400', name: 'Office Supplies',            type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5600', name: 'Transport & Field Operations', type: 'Expense', cashFlowCategory: 'operating' },
  { code: '5700', name: 'Software, Cloud & Subscriptions', type: 'Expense', cashFlowCategory: 'operating' },
  { code: '5800', name: 'IT Equipment Maintenance & Accessories', type: 'Expense', cashFlowCategory: 'operating' },
  { code: '5900', name: 'Tax Expense',                type: 'Expense',   cashFlowCategory: 'operating' },
];

// Accounts needed by the harmonised workflow (added to the default chart; "Add Missing Defaults" and
// the posting helpers create any that are absent).
[
  { code: '2600', name: 'WHT Payable (URA)',            type: 'Liability', cashFlowCategory: 'operating' },
  { code: '4200', name: 'Rental Income',                type: 'Revenue',   cashFlowCategory: 'operating' },
  { code: '4300', name: 'Interest Income',              type: 'Revenue',   cashFlowCategory: 'operating' },
  { code: '4900', name: 'Other Income',                 type: 'Revenue',   cashFlowCategory: 'operating' },
  { code: '5500', name: 'Marketing & Advertising',      type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5650', name: 'Professional & Legal Fees',    type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5950', name: 'Interest Expense',             type: 'Expense',   cashFlowCategory: 'operating' },
  { code: '5990', name: 'Other Operating Expense',      type: 'Expense',   cashFlowCategory: 'operating' },
].forEach(a => { if (!DEFAULT_CHART_OF_ACCOUNTS.some(d => d.code === a.code)) DEFAULT_CHART_OF_ACCOUNTS.push(a); });

// Well-known account codes used by the automatic postings.
const ACCT = {
  AR: '1100', WHT_CREDIT: '1300', VAT_PAYABLE: '2400', WHT_PAYABLE: '2600', RETAINED: '3100',
  SALES: '4000', SERVICES: '4100', CONTRACTOR: '5100', OTHER_EXP: '5990',
};
// Tax Ledger category → books account.
const INCOME_ACCOUNT_BY_CATEGORY = {
  'Service Fees / Contracts': '4100', 'Product Sales': '4000', 'Rental Income': '4200',
  'Interest Income': '4300', 'Other Income': '4900',
};
const EXPENSE_ACCOUNT_BY_CATEGORY = {
  'Contractor / Service Fees': '5100', 'Salaries & Wages (PAYE, reference only)': '5100', 'Rent & Utilities': '5200',
  'Marketing & Advertising': '5500', 'Transport & Logistics': '5600', 'Professional & Legal Fees': '5650',
  'Raw Materials / Inputs': '5000', 'Office Supplies & Minor Equipment (<1M, immediate write-off)': '5400',
  'Bank & Loan Interest': '5950', 'Other Operating Expense': '5990',
};
// Ledger rows generated by another workflow (invoice payment, payroll, ops claim, voucher) are managed from
// their source document, so they are read-only in the Tax Ledger.
const isSystemTxn = (t) => !!(t.sourceInvoiceNo || t.sourcePayrollPeriod || t.sourceClaimId || t.sourceVoucherId);
// Vouchers created before the approval workflow have no status: they were already paid out.
const voucherStatusOf = (v) => v.status || 'paid';
const VOUCHER_STATUS_TONE = { pending: 'amber', approved: 'blue', paid: 'green', reversed: 'gray' };

const ENTRY_TYPES = [
  { key: 'general', label: 'General Journal' },
  { key: 'cash', label: 'Cash Book' },
  { key: 'payable', label: 'Accounts Payable' },
  { key: 'receivable', label: 'Accounts Receivable' },
];

const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'void'];

// ─── IT Operations & Business Expense budget ───────────────────────────────
// A SHARED company budget (not per employee, not pay). The ceilings are spending limits,
// not entitlements: unspent money stays with the company. Each category posts to its own
// expense account and, when paid, to the Tax Ledger as a deductible expense.
const OPS_BUDGET = [
  { key: 'internet',  label: 'Official internet and data expenses',               ceiling: 70000,  accountCode: '5300', taxCategory: 'Rent & Utilities' },
  { key: 'transport', label: 'Client-site transport and field operations',        ceiling: 100000, accountCode: '5600', taxCategory: 'Transport & Logistics' },
  { key: 'software',  label: 'Software, cloud and technical subscriptions',       ceiling: 80000,  accountCode: '5700', taxCategory: 'Other Operating Expense' },
  { key: 'equipment', label: 'IT equipment maintenance and accessories',          ceiling: 100000, accountCode: '5800', taxCategory: 'Other Operating Expense' },
  { key: 'comms',     label: 'Official communication and technical coordination', ceiling: 40000,  accountCode: '5310', taxCategory: 'Other Operating Expense' },
  { key: 'supplies',  label: 'Approved operational supplies',                     ceiling: 50000,  accountCode: '5400', taxCategory: 'Office Supplies & Minor Equipment (<1M, immediate write-off)' },
];
const OPS_BUDGET_TOTAL = OPS_BUDGET.reduce((t, c) => t + c.ceiling, 0); // 440,000
const opsCategory = (label) => OPS_BUDGET.find(c => c.label === label) || null;
const OPS_PAYMENT_ROUTES = ['Paid directly to supplier', 'Employee reimbursement (actual spend)'];
const CLAIM_STATUS_TONE = { pending: 'amber', approved: 'blue', paid: 'green', rejected: 'gray' };
function toDateObjEarly(v) { if (!v) return null; if (v?.toDate) return v.toDate(); const d = new Date(v); return isNaN(d) ? null : d; }
const monthOf = (v) => { const d = toDateObjEarly(v); return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : ''; };

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

// ─── PDF output ─────────────────────────────────────────────────────────────
// All documents (invoices, receipts, vouchers, certificates, loan notes, the CIT sheet,
// statements, payroll and expense statements, table exports) are real PDFs built in
// utils/financePdfs.js on top of utils/pdfBrand.js — same letterhead, logo badge,
// contact lines and footer as every other Slirus document.
// Salary bank account (Housing Finance Bank): captured by HR on the employee record and copied onto each
// pay slip when payroll runs. Finance pays net salaries from the Bank account to these HFB accounts.
const HFB_BANK_NAME = 'Housing Finance Bank (HFB)';
const hasBankAccount = (v) => /^\d{6,20}$/.test(String(v || '').replace(/[\s-]+/g, ''));
// Slips generated before bank details existed carry no account: fall back to the employee's current HFB account.
const slipWithBank = (p, employees) => {
  if (hasBankAccount(p.bankAccountNumber)) return p;
  const e = (employees || []).find(x => x.id === p.employeeId);
  if (!e || !hasBankAccount(e.bankAccountNumber)) return p;
  return {
    ...p, bankName: HFB_BANK_NAME, bankAccountNumber: String(e.bankAccountNumber).replace(/[\s-]+/g, ''),
    bankAccountName: (e.bankAccountName || '').trim() || p.employeeName,
  };
};
const runPdf = (fn) => fn().catch((err) => { console.error('PDF error:', err); alert('Could not build the PDF: ' + err.message); });
const exportTablePDF = (title, rows, columns) => runPdf(() => downloadTablePdf(title, rows, columns));

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
// ─── Cash-account modal (payroll posting, PAYE/NSSF remittance, paying a claim) ──
// ═══════════════════════════════════════════════════════════════════════════
const CashAccountModal = ({ title, subtitle, accent = '#0D9488', cashAccounts, summaryLines = [], confirmLabel, referenceLabel, referenceRequired = false, onClose, onConfirm }) => {
  const [cashAccountCode, setCashAccountCode] = useState(cashAccounts[0]?.code || '');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!cashAccountCode) { setError('Choose the cash/bank account. If the list is empty, create the chart of accounts first (Double-Entry Books → Chart of Accounts).'); return; }
    if (referenceRequired && !reference.trim()) { setError(`${referenceLabel} is required for the audit trail.`); return; }
    setSaving(true); setError('');
    try { await onConfirm({ cashAccountCode, reference: reference.trim() }); onClose(); }
    catch (err) { setError(err.message || 'Could not complete this action.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: `4px solid ${accent}` }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{title}</h3>
            {subtitle && <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{subtitle}</p>}
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          {summaryLines.map(([label, value]) => (
            <div key={label} style={cu.credRow}><span style={cu.credLabel}>{label}</span><span style={cu.credVal}>{value}</span></div>
          ))}
          <label style={{ ...cu.label, marginTop: 14 }}>Cash / Bank Account</label>
          <select style={cu.select} value={cashAccountCode} onChange={e => setCashAccountCode(e.target.value)}>
            {cashAccounts.length === 0 && <option value="">No accounts available</option>}
            {cashAccounts.map(a => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
          </select>
          {referenceLabel && (
            <>
              <label style={{ ...cu.label, marginTop: 12 }}>{referenceLabel}{referenceRequired ? '' : ' (optional)'}</label>
              <input style={s.loginInput} value={reference} onChange={e => setReference(e.target.value)} />
            </>
          )}
          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: accent, color: '#fff' }} onClick={handleConfirm} disabled={saving}>{saving ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── IT Operations expense claim modal ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const OpsClaimModal = ({ usedFor, onClose, onSave }) => {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), category: OPS_BUDGET[0].label, payee: '', description: '',
    amount: '', receiptRef: '', route: OPS_PAYMENT_ROUTES[0], overrideReason: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const update = (f, v) => setForm(prev => ({ ...prev, [f]: v }));

  const cat = opsCategory(form.category);
  const amount = Number(form.amount) || 0;
  const used = usedFor(form.category, monthOf(form.date));
  const over = cat ? used + amount > cat.ceiling : false;

  const handleSave = async () => {
    if (!form.payee.trim()) { setError('Enter the supplier or the employee being reimbursed.'); return; }
    if (!form.description.trim()) { setError('Describe the business purpose (what it was for and which job/client).'); return; }
    if (amount <= 0) { setError('Enter a valid amount.'); return; }
    if (!form.receiptRef.trim()) { setError('A receipt / invoice reference is required — no receipt, no reimbursement.'); return; }
    if (over && !form.overrideReason.trim()) { setError('This exceeds the monthly ceiling for the category. Give management\'s reason to proceed.'); return; }
    setSaving(true); setError('');
    try { await onSave({ ...form, amount, overCeiling: over }); onClose(); }
    catch (err) { setError(err.message || 'Could not save this claim.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #0D9488' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Business Expense</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Actual company spend only — not pay. Needs a receipt and approval before it is paid.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={ms.body}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={cu.label}>Budget category</label>
              <select style={cu.select} value={form.category} onChange={e => update('category', e.target.value)} disabled={saving}>
                {OPS_BUDGET.map(c => <option key={c.key} value={c.label}>{c.label} — ceiling {fmtMoney(c.ceiling)}</option>)}
              </select>
            </div>
            <div><label style={cu.label}>Date of expense</label><input type="date" style={s.loginInput} value={form.date} onChange={e => update('date', e.target.value)} disabled={saving} /></div>
            <div><label style={cu.label}>Amount (UGX)</label><input type="number" min="0" style={s.loginInput} value={form.amount} onChange={e => update('amount', e.target.value)} disabled={saving} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={cu.label}>How it is paid</label>
              <select style={cu.select} value={form.route} onChange={e => update('route', e.target.value)} disabled={saving}>
                {OPS_PAYMENT_ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div><label style={cu.label}>{form.route === OPS_PAYMENT_ROUTES[0] ? 'Supplier' : 'Employee reimbursed'}</label><input style={s.loginInput} value={form.payee} onChange={e => update('payee', e.target.value)} disabled={saving} /></div>
            <div><label style={cu.label}>Receipt / invoice ref.</label><input style={s.loginInput} value={form.receiptRef} onChange={e => update('receiptRef', e.target.value)} disabled={saving} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={cu.label}>Business purpose</label><input style={s.loginInput} placeholder="e.g. Boda fare — router install at client X, 12 Nov" value={form.description} onChange={e => update('description', e.target.value)} disabled={saving} /></div>
          </div>
          {cat && (
            <p style={{ fontSize: 12, color: over ? '#92400E' : '#5A7A9A', background: over ? '#FEF3C7' : '#F7F9FC', borderRadius: 6, padding: '8px 10px', marginTop: 12 }}>
              {monthOf(form.date)} · {cat.label}: {fmtMoney(used)} already claimed of {fmtMoney(cat.ceiling)}{over ? ` — this claim would exceed the ceiling by ${fmtMoney(used + amount - cat.ceiling)}.` : '.'}
            </p>
          )}
          {over && (
            <div style={{ marginTop: 10 }}>
              <label style={cu.label}>Management reason for exceeding the ceiling</label>
              <input style={s.loginInput} value={form.overrideReason} onChange={e => update('overrideReason', e.target.value)} disabled={saving} />
            </div>
          )}
          {form.category === OPS_BUDGET[3].label && amount >= 1000000 && (
            <p style={{ fontSize: 11.5, color: '#92400E', background: '#FEF3C7', borderRadius: 6, padding: '8px 10px', marginTop: 10 }}>
              ⚠️ At UGX 1,000,000 or more, equipment should be logged in Fixed Assets so it gets a capital-allowance schedule.
            </p>
          )}
          {error && <p style={s.loginErr}>{error}</p>}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
          <button style={{ ...ms.actionBtn, background: '#0D9488', color: '#fff' }} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : '➕ Submit Expense'}</button>
        </div>
      </div>
    </div>
  );
};

// Fixed-id documents (payroll_<period>, remit_<period>, ops_<claimId>) must be written at most once.
// The Firestore rules make journal entries and ledger rows immutable after creation, so re-running a
// half-finished posting with setDoc() on an existing id would be an (denied) update. Skipping the write
// when the document is already there makes a retry safe: it carries on from where it stopped.
const setOnce = async (collectionName, id, data) => {
  const ref = doc(db, collectionName, id);
  if (!(await getDoc(ref)).exists()) await setDoc(ref, data);
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main Component ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
// ─── Harmonised posting helpers ─────────────────────────────────────────────
// Every helper writes balanced journal lines to the Double-Entry Books. They take the current chart of
// accounts as an argument and create any default account that is missing, so posting never fails just
// because the chart was not seeded.
const ensuredCodes = new Set();
const bookAcctName = (list, code) => (list.find(a => a.code === code) || DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === code))?.name || code;
const ensureBookAccounts = async (list, codes) => {
  for (const code of codes) {
    if (ensuredCodes.has(code) || list.some(a => a.code === code)) continue;
    const def = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === code);
    if (def) { await setDoc(doc(db, 'accounts', code), def); ensuredCodes.add(code); }
  }
};
const defaultCashCode = (list) => (list.find(a => a.type === 'Asset' && /cash|bank/i.test(a.name)) || {}).code || '1000';
const mkLine = (list, code, debit, credit) => ({ accountCode: code, accountName: bookAcctName(list, code), debit, credit });
const keepLines = (lines) => lines.filter(l => l.debit > 0 || l.credit > 0);
const contractorNameOf = (employeeList, id) => {
  const e = employeeList.find(x => x.id === id);
  return e ? `${e.firstName || ''} ${e.lastName || ''}`.trim() || id : id;
};
const dateStrOf = (v) => (typeof v === 'string' && v) ? v.slice(0, 10) : (toDateObj(v)?.toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10));

// Tax Ledger row → balanced journal lines.
const buildTxnLines = (list, t, cashCode) => {
  const gross = Math.round(Number(t.grossAmount) || 0);
  if (t.type === 'Income') {
    const vat = t.vatTreatment === VAT_TREATMENTS[0] ? Math.round(Number(t.vatAmount) || 0) : 0;
    const wht = t.whtWithheld ? Math.round(Number(t.whtAmount) || 0) : 0;
    const rev = INCOME_ACCOUNT_BY_CATEGORY[t.category] || ACCT.SERVICES;
    return keepLines([
      mkLine(list, cashCode, gross + vat - wht, 0), mkLine(list, ACCT.WHT_CREDIT, wht, 0),
      mkLine(list, rev, 0, gross), mkLine(list, ACCT.VAT_PAYABLE, 0, vat),
    ]);
  }
  const exp = EXPENSE_ACCOUNT_BY_CATEGORY[t.category] || ACCT.OTHER_EXP;
  return [mkLine(list, exp, gross, 0), mkLine(list, cashCode, 0, gross)];
};

// Posts one Tax Ledger row to the books. Returns the journal id (stored on the ledger row).
const postTxnJournal = async (list, txnId, t) => {
  const cashCode = defaultCashCode(list);
  const lines = buildTxnLines(list, t, cashCode);
  if (!isBalanced(lines)) throw new Error('The entry does not balance — nothing was posted to the books.');
  await ensureBookAccounts(list, [cashCode, ...lines.map(l => l.accountCode)]);
  const jid = `txn_${txnId}_${Date.now().toString(36)}`;
  await setDoc(doc(db, 'journalEntries', jid), {
    date: dateStrOf(t.date), reference: t.ref || generateRef('JE'), memo: `${t.type}: ${t.description}`,
    entryType: 'cash', lines, status: 'posted', sourceTxnId: txnId,
    createdBy: auth.currentUser?.email || 'unknown', createdAt: serverTimestamp(),
  });
  return jid;
};

// Invoice sent (or found paid without revenue recognised): Dr Receivable, Cr Revenue, Cr Output VAT.
const postInvoiceRevenue = async (list, invoice) => {
  const total = Math.round(Number(invoice.total) || 0);
  const tax = Math.round(Number(invoice.taxAmount) || 0);
  if (total <= 0) return;
  const rev = ['Fashion & Retail', 'Agriculture'].includes(invoice.businessObject) ? ACCT.SALES : ACCT.SERVICES;
  const lines = keepLines([mkLine(list, ACCT.AR, total, 0), mkLine(list, rev, 0, total - tax), mkLine(list, ACCT.VAT_PAYABLE, 0, tax)]);
  await ensureBookAccounts(list, lines.map(l => l.accountCode));
  await setOnce('journalEntries', `invrev_${invoice.id}`, {
    date: dateStrOf(invoice.issueDate), reference: invoice.invoiceNo,
    memo: `Invoice ${invoice.invoiceNo} — ${invoice.customerName} (revenue recognised)`, entryType: 'receivable',
    lines, status: 'posted', sourceInvoiceId: invoice.id,
    createdBy: auth.currentUser?.email || 'unknown', createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'invoices', invoice.id), { revenuePosted: true });
};

// Contractor voucher paid: Dr Contractor Fees (gross), Cr WHT Payable, Cr Bank (net) + deductible Tax Ledger expense.
const postVoucherJournal = async (list, v, name, cashCode, reference) => {
  const gross = Math.round(Number(v.amount) || 0);
  const wht = v.whtWithheld ? Math.round(Number(v.whtAmount) || 0) : 0;
  const lines = keepLines([mkLine(list, ACCT.CONTRACTOR, gross, 0), mkLine(list, ACCT.WHT_PAYABLE, 0, wht), mkLine(list, cashCode, 0, gross - wht)]);
  if (!isBalanced(lines)) throw new Error('The voucher journal does not balance — nothing was posted.');
  await ensureBookAccounts(list, [cashCode, ...lines.map(l => l.accountCode)]);
  const email = auth.currentUser?.email || 'unknown';
  const date = dateStrOf(v.date);
  await setOnce('journalEntries', `voucher_${v.id}`, {
    date, reference: v.ref || `PV-${v.id.slice(0, 6)}`,
    memo: `Contractor voucher — ${name} (${v.voucherType})${v.taskDescription ? ': ' + v.taskDescription : ''}${reference ? ' · ref ' + reference : ''}`,
    entryType: 'cash', lines, status: 'posted', sourceVoucherId: v.id, createdBy: email, createdAt: serverTimestamp(),
  });
  await setOnce('financeTransactions', `voucher_${v.id}`, {
    date, type: 'Expense', object: ACCOUNTING_OBJECTS[0], category: EXPENSE_CATEGORIES[0],
    description: `${v.voucherType}: ${v.taskDescription || name} (${name})`, grossAmount: gross,
    vatTreatment: VAT_TREATMENTS[3], vatAmount: 0, whtWithheld: false, whtAmount: 0, whtCertificateNo: '', whtDeducted: wht,
    counterpartyName: name, counterpartyTIN: '', paymentMethod: v.paymentMethod || PAYMENT_METHODS[0],
    ref: v.ref || `PV-${v.id.slice(0, 6)}`, sourceVoucherId: v.id, booksPosted: true, createdAt: serverTimestamp(), createdBy: email,
  });
};

// Dividend: Dr Retained Earnings (gross), Cr WHT Payable (15%), Cr Bank (net). Not an expense, so no Tax Ledger row.
const postDividendJournal = async (list, d, cashCode) => {
  const gross = Math.round(Number(d.amount) || 0);
  const wht = Math.round(Number(d.whtAmount) || gross * WHT_RATE_DIVIDEND);
  const lines = keepLines([mkLine(list, ACCT.RETAINED, gross, 0), mkLine(list, ACCT.WHT_PAYABLE, 0, wht), mkLine(list, cashCode, 0, gross - wht)]);
  if (!isBalanced(lines)) throw new Error('The dividend journal does not balance — nothing was posted.');
  await ensureBookAccounts(list, [cashCode, ...lines.map(l => l.accountCode)]);
  await setOnce('journalEntries', `dividend_${d.id}`, {
    date: dateStrOf(d.date), reference: d.ref || `DIV-${d.id.slice(0, 6)}`,
    memo: `Dividend to ${d.shareholder}${d.resolutionRef ? ' (resolution ' + d.resolutionRef + ')' : ''}`,
    entryType: 'cash', lines, status: 'posted', sourceDividendId: d.id,
    createdBy: auth.currentUser?.email || 'unknown', createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'dividends', d.id), { booksPosted: true, postedAt: serverTimestamp() });
};

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

  // Payroll (runs created by HrManager; slips are read for the summary PDF only)
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [payrollSlips, setPayrollSlips] = useState([]);
  const [loadingPayroll, setLoadingPayroll] = useState(true);
  const [payrollError, setPayrollError] = useState(null);
  const [payrollTarget, setPayrollTarget] = useState(null); // { run, mode: 'post' | 'remit' }

  // IT Operations budget claims
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [claimsError, setClaimsError] = useState(null);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [payClaimTarget, setPayClaimTarget] = useState(null);
  const [opsPeriod, setOpsPeriod] = useState(new Date().toISOString().slice(0, 7));

  // Fiscal year selection (drives the CIT engine + Dashboard)
  const fiscalOptions = useMemo(() => listFiscalYearOptions(), []);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(() => fiscalOptions[0]?.startYear ?? fiscalStartYearOf(new Date()));

  const [idleWarning, setIdleWarning] = useState(false);

  // Harmonisation: pay-voucher / post-dividend dialogs, sync state, and a ref so memoised handlers always
  // see the latest chart of accounts.
  const [payVoucherTarget, setPayVoucherTarget] = useState(null);
  const [payDividendTarget, setPayDividendTarget] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const accountsRef = useRef([]);
  useEffect(() => { accountsRef.current = accounts; }, [accounts]);

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

  useEffect(() => {
    if (!isAuthorized) { setPayrollRuns([]); setPayrollSlips([]); return; }
    setLoadingPayroll(true);
    const unsub1 = onSnapshot(collection(db, 'payrollDisbursements'),
      (snap) => { setPayrollError(null); setPayrollRuns(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingPayroll(false); },
      (err) => { setPayrollError('Could not load payroll runs: ' + err.message + ' (Finance needs read access to payrollDisbursements in firestore.rules.)'); setLoadingPayroll(false); });
    // Slips are only needed to list employees on the summary PDF — a denial here is not fatal.
    const unsub2 = onSnapshot(collection(db, 'payslips'),
      (snap) => setPayrollSlips(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setPayrollSlips([]));
    return () => { unsub1(); unsub2(); };
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) { setClaims([]); return; }
    setLoadingClaims(true);
    const unsub = onSnapshot(collection(db, 'opsExpenseClaims'),
      (snap) => { setClaimsError(null); setClaims(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingClaims(false); },
      (err) => { setClaimsError('Could not load expense claims: ' + err.message); setLoadingClaims(false); });
    return unsub;
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
        const { id: txnId, ...rest } = form;
        let extra = {};
        if (form.booksPosted && form.journalId) {
          // Re-post the corrected figures, then void the old journal so books and ledger stay in step.
          const newJid = await postTxnJournal(accountsRef.current, txnId, rest);
          await updateDoc(doc(db, 'journalEntries', form.journalId), { status: 'void' });
          extra = { booksPosted: true, journalId: newJid };
        }
        await updateDoc(doc(db, 'financeTransactions', txnId), { ...rest, ...extra, updatedAt: serverTimestamp() });
        await logAudit('Updated ledger entry', form.description, fmtMoney(form.grossAmount));
      } else {
        const ref = generateRef(form.type === 'Income' ? 'INV' : 'EXP');
        const docRef = doc(collection(db, 'financeTransactions'));
        let posted = {};
        try {
          const jid = await postTxnJournal(accountsRef.current, docRef.id, { ...form, ref });
          posted = { booksPosted: true, journalId: jid };
        } catch (postErr) {
          console.error(postErr);
          alert('Saved to the Tax Ledger, but it could not be posted to the books (' + postErr.message + '). Use "Sync to books" to retry.');
        }
        await setDoc(docRef, { ...form, ref, ...posted, createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' });
        await logAudit('Recorded ledger entry', form.description, `${form.type} · ${fmtMoney(form.grossAmount)}`);
      }
      return { success: true };
    } catch (err) { console.error(err); return { success: false, error: err.message }; }
  }, [logAudit]);

  const handleDeleteTxn = useCallback(async (txn) => {
    if (!window.confirm(`Delete this ${txn.type.toLowerCase()} entry "${txn.description}"?`)) return;
    try { if (txn.booksPosted && txn.journalId) await updateDoc(doc(db, 'journalEntries', txn.journalId), { status: 'void' }); await deleteDoc(doc(db, 'financeTransactions', txn.id)); await logAudit('Deleted ledger entry', txn.description); }
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
      else { await addDoc(collection(db, 'contractorVouchers'), { ...form, status: 'pending', booksPosted: false, ref: generateRef('PV'), createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown' }); await logAudit('Issued payment voucher', form.contractorId, fmtMoney(form.amount)); }
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

  // Adds any default account the book doesn't have yet (e.g. the payroll / operations accounts)
  // without touching accounts that already exist.
  const addMissingDefaultAccounts = useCallback(async () => {
    const missing = DEFAULT_CHART_OF_ACCOUNTS.filter(d => !accounts.some(a => a.code === d.code));
    if (missing.length === 0) { alert('Your chart of accounts already has every default account.'); return; }
    if (!window.confirm(`Add ${missing.length} missing account(s)?\n\n${missing.map(m => `${m.code} · ${m.name}`).join('\n')}`)) return;
    for (const a of missing) await setDoc(doc(db, 'accounts', a.code), a);
    await logAudit('Added default accounts', 'accounts', missing.map(m => m.code).join(', '));
  }, [accounts, logAudit]);

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
    // Recognise the revenue the moment the invoice goes out (Dr Receivable, Cr Revenue + VAT).
    try { if (!invoice.revenuePosted) await postInvoiceRevenue(accountsRef.current, invoice); }
    catch (err) { alert('Could not post the invoice revenue to the books: ' + err.message); return; }
    await updateDoc(doc(db, 'invoices', invoice.id), { status: 'sent', sentAt: serverTimestamp() });
    await logAudit('Sent invoice', invoice.invoiceNo, invoice.customerEmail || 'no email on file');
  }, [logAudit]);

  const handleVoidInvoice = useCallback(async (invoice) => {
    if (!window.confirm(`Void invoice ${invoice.invoiceNo}?`)) return;
    if (invoice.revenuePosted) await updateDoc(doc(db, 'journalEntries', `invrev_${invoice.id}`), { status: 'void' });
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
    // Older invoices were never recognised as revenue; do it now so the payment below clears a real receivable.
    if (!invoice.revenuePosted) await postInvoiceRevenue(accountsRef.current, invoice);
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
      sourceInvoiceNo: invoice.invoiceNo, booksPosted: true,
    });

    await logAudit('Confirmed payment', invoice.invoiceNo, `${fmtMoney(amount)} via ${method} · Receipt ${receiptNo}`);
  }, [accounts, receivableAccount, logAudit]);

  // ── Payroll posting & remittance ───────────────────────────────────────
  // Journal ids are fixed (payroll_<period>, remit_<period>), so retrying a half-finished
  // posting rewrites the same documents instead of duplicating them.
  const acctName = useCallback((code) => (accounts.find(a => a.code === code) || DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === code))?.name || code, [accounts]);
  const ensureAccounts = useCallback(async (codes) => {
    for (const code of codes) {
      if (accounts.some(a => a.code === code)) continue;
      const def = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === code);
      if (def) await setDoc(doc(db, 'accounts', code), def);
    }
  }, [accounts]);

  // Net salaries per employee to their HFB account (from the slips HR generated), for the bank transfer.
  const exportPayrollBankSchedule = (run) => {
    const slips = payrollSlips.filter(p => p.period === run.period).map(p => slipWithBank(p, employees));
    if (!slips.length) { alert(`No pay slips found for ${run.period}.`); return; }
    const missing = slips.filter(p => !hasBankAccount(p.bankAccountNumber)).map(p => p.employeeName);
    if (missing.length && !window.confirm(`${missing.length} employee(s) have no HFB account on their slip: ${missing.join(', ')}.\n\nAsk HR to add the account to the employee record. Download the schedule anyway?`)) return;
    downloadCSV(`slirus_hfb_salary_payments_${run.period}.csv`, toCSV(slips, [
      { label: 'Account Name', get: p => p.bankAccountName || p.employeeName },
      { label: 'Account Number', get: p => p.bankAccountNumber || '' },
      { label: 'Amount (UGX)', get: p => Math.round(Number(p.netPay) || 0) },
      { label: 'Narration', get: p => `Salary ${run.period}` },
    ]));
  };

  const handlePostPayroll = useCallback(async (run, { cashAccountCode }) => {
    if (run.postedToLedger) throw new Error('This payroll run is already posted.');
    const gross = (Number(run.totalGross) || 0) + (Number(run.totalAllowances) || 0);
    const paye = Number(run.totalPAYE) || 0;
    const nssfEmp = Number(run.totalNSSFEmployee) || 0;
    const nssfCo = Number(run.totalNSSFCompany) || 0;
    const net = Number(run.totalNetPay) || 0;
    if (Math.abs(gross - paye - nssfEmp - net) > 1) throw new Error('The run does not add up (gross − PAYE − NSSF ≠ net). Ask HR to check the pay slips before posting.');
    await ensureAccounts(['5100', '5110', '2100', '2200']);
    const L = (code, debit, credit) => ({ accountCode: code, accountName: acctName(code), debit, credit });
    const lines = [
      L('5100', gross, 0), L('5110', nssfCo, 0),
      L('2100', 0, paye), L('2200', 0, nssfEmp + nssfCo), L(cashAccountCode, 0, net),
    ].filter(l => l.debit > 0 || l.credit > 0);
    if (!isBalanced(lines)) throw new Error('The journal does not balance — nothing was posted.');
    const today = new Date().toISOString().slice(0, 10);
    const email = auth.currentUser?.email || 'unknown';
    await setOnce('journalEntries', `payroll_${run.period}`, {
      date: today, reference: `PAY-${run.period}`, memo: `Payroll ${run.period} — ${run.employeeCount} employee(s): salaries, PAYE and NSSF`,
      entryType: 'general', lines, status: 'posted', createdBy: email, createdAt: serverTimestamp(),
    });
    // Deductible expense for the CIT engine: gross pay + the employer's NSSF (PAYE is part of gross).
    await setOnce('financeTransactions', `payroll_${run.period}`, {
      date: today, type: 'Expense', object: ACCOUNTING_OBJECTS[5], category: EXPENSE_CATEGORIES[1],
      description: `Payroll ${run.period} (incl. employer NSSF)`, grossAmount: gross + nssfCo,
      vatTreatment: VAT_TREATMENTS[3], vatAmount: 0, whtWithheld: false, whtAmount: 0, whtCertificateNo: '',
      counterpartyName: 'Staff payroll', counterpartyTIN: '', paymentMethod: 'Bank Transfer',
      ref: `PAY-${run.period}`, sourcePayrollPeriod: run.period, createdAt: serverTimestamp(), createdBy: email,
    });
    await updateDoc(doc(db, 'payrollDisbursements', run.id), { postedToLedger: true, postedAt: serverTimestamp(), postedBy: email, cashAccountCode });
    await logAudit('Posted payroll to ledger', run.period, `Cost to company ${fmtMoney(gross + nssfCo)}`);
  }, [acctName, ensureAccounts, logAudit]);

  const handleRemitPayroll = useCallback(async (run, { cashAccountCode, reference }) => {
    if (!run.postedToLedger) throw new Error('Post the payroll to the ledger first.');
    if (run.remitted) throw new Error('This run has already been remitted.');
    const paye = Number(run.totalPAYE) || 0;
    const nssf = (Number(run.totalNSSFEmployee) || 0) + (Number(run.totalNSSFCompany) || 0);
    const L = (code, debit, credit) => ({ accountCode: code, accountName: acctName(code), debit, credit });
    const lines = [L('2100', paye, 0), L('2200', nssf, 0), L(cashAccountCode, 0, paye + nssf)].filter(l => l.debit > 0 || l.credit > 0);
    const email = auth.currentUser?.email || 'unknown';
    await setOnce('journalEntries', `remit_${run.period}`, {
      date: new Date().toISOString().slice(0, 10), reference: `REM-${run.period}`,
      memo: `PAYE and NSSF remitted for ${run.period} — ref ${reference}`, entryType: 'general',
      lines, status: 'posted', createdBy: email, createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'payrollDisbursements', run.id), { remitted: true, remittedAt: serverTimestamp(), remittedBy: email, remittanceRef: reference, remittedAmount: paye + nssf });
    await logAudit('Recorded PAYE/NSSF remittance', run.period, `${fmtMoney(paye + nssf)} · ${reference}`);
  }, [acctName, logAudit]);

  // ── IT Operations budget claims ────────────────────────────────────────
  const handleSaveClaim = useCallback(async (form) => {
    await addDoc(collection(db, 'opsExpenseClaims'), {
      ...form, period: monthOf(form.date), ref: generateRef('OPS'), status: 'pending',
      createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown',
    });
    await logAudit('Submitted business expense', form.category, `${fmtMoney(form.amount)} · ${form.payee} · receipt ${form.receiptRef}`);
  }, [logAudit]);

  const handleClaimDecision = useCallback(async (claim, decision) => {
    try {
      await updateDoc(doc(db, 'opsExpenseClaims', claim.id), { status: decision, decidedAt: serverTimestamp(), decidedBy: auth.currentUser?.email || 'unknown' });
      await logAudit(decision === 'approved' ? 'Approved business expense' : 'Rejected business expense', claim.ref, fmtMoney(claim.amount));
    } catch (err) { alert('Could not update the expense: ' + err.message); }
  }, [logAudit]);

  const handlePayClaim = useCallback(async (claim, { cashAccountCode, reference }) => {
    if (claim.status !== 'approved') throw new Error('Only approved expenses can be paid.');
    const cat = opsCategory(claim.category);
    if (!cat) throw new Error('Unknown budget category on this claim.');
    await ensureAccounts([cat.accountCode]);
    const lines = [
      { accountCode: cat.accountCode, accountName: acctName(cat.accountCode), debit: claim.amount, credit: 0 },
      { accountCode: cashAccountCode, accountName: acctName(cashAccountCode), debit: 0, credit: claim.amount },
    ];
    const email = auth.currentUser?.email || 'unknown';
    const today = new Date().toISOString().slice(0, 10);
    await setOnce('journalEntries', `ops_${claim.id}`, {
      date: today, reference: claim.ref, memo: `${claim.category} — ${claim.description} (${claim.payee}, receipt ${claim.receiptRef})`,
      entryType: 'cash', lines, status: 'posted', createdBy: email, createdAt: serverTimestamp(),
    });
    await setOnce('financeTransactions', `ops_${claim.id}`, {
      date: today, type: 'Expense', object: ACCOUNTING_OBJECTS[0], category: cat.taxCategory,
      description: `${claim.category}: ${claim.description}`, grossAmount: claim.amount,
      vatTreatment: VAT_TREATMENTS[3], vatAmount: 0, whtWithheld: false, whtAmount: 0, whtCertificateNo: '',
      counterpartyName: claim.payee, counterpartyTIN: '', paymentMethod: PAYMENT_METHODS[0],
      ref: claim.ref, receiptRef: claim.receiptRef, sourceClaimId: claim.id, createdAt: serverTimestamp(), createdBy: email,
    });
    await updateDoc(doc(db, 'opsExpenseClaims', claim.id), { status: 'paid', paidAt: serverTimestamp(), paidBy: email, paymentRef: reference || '', cashAccountCode });
    await logAudit('Paid business expense', claim.ref, `${fmtMoney(claim.amount)} · ${claim.payee}`);
  }, [acctName, ensureAccounts, logAudit]);

  // ── Derived: payroll & operations budget ───────────────────────────────
  // ── Contractor voucher workflow: pending → approved → paid (posts to books + Tax Ledger) ──
  const handleApproveVoucher = useCallback(async (v) => {
    try {
      await updateDoc(doc(db, 'contractorVouchers', v.id), { status: 'approved', approvedAt: serverTimestamp(), approvedBy: auth.currentUser?.email || 'unknown' });
      await logAudit('Approved contractor voucher', v.ref || v.id, fmtMoney(v.amount));
    } catch (err) { alert('Could not approve the voucher: ' + err.message); }
  }, [logAudit]);

  const handlePayVoucher = useCallback(async (v, { cashAccountCode, reference }) => {
    if (voucherStatusOf(v) !== 'approved') throw new Error('Only approved vouchers can be paid.');
    const name = contractorNameOf(employees, v.contractorId);
    await postVoucherJournal(accountsRef.current, v, name, cashAccountCode, reference);
    await updateDoc(doc(db, 'contractorVouchers', v.id), {
      status: 'paid', booksPosted: true, paidAt: serverTimestamp(), paidBy: auth.currentUser?.email || 'unknown',
      paymentRef: reference || '', cashAccountCode,
    });
    await logAudit('Paid contractor voucher', v.ref || v.id, `${fmtMoney(v.amount)} · ${name}`);
  }, [employees, logAudit]);

  // Undo a paid voucher: removes its Tax Ledger expense and voids its journal so both sets of books drop it.
  const handleReverseVoucher = useCallback(async (v) => {
    if (!window.confirm('Reverse this paid voucher? Its expense is removed from the Tax Ledger and its journal entry is voided.')) return;
    try {
      if (v.booksPosted) {
        await deleteDoc(doc(db, 'financeTransactions', `voucher_${v.id}`));
        await updateDoc(doc(db, 'journalEntries', `voucher_${v.id}`), { status: 'void' });
      }
      await updateDoc(doc(db, 'contractorVouchers', v.id), { status: 'reversed', booksPosted: false, reversedAt: serverTimestamp(), reversedBy: auth.currentUser?.email || 'unknown' });
      await logAudit('Reversed contractor voucher', v.ref || v.id, fmtMoney(v.amount));
    } catch (err) { alert('Could not reverse the voucher: ' + err.message); }
  }, [logAudit]);

  const handlePostDividend = useCallback(async (d, { cashAccountCode }) => {
    await postDividendJournal(accountsRef.current, d, cashAccountCode);
    await logAudit('Posted dividend to books', d.shareholder, fmtMoney(d.amount));
  }, [logAudit]);

  // ── "Sync to books": back-fills anything that never reached the Double-Entry Books ──
  const pendingSync = useMemo(() => {
    const txns = transactions.filter(t => !t.booksPosted && !isSystemTxn(t));
    const inv = invoices.filter(i => ['sent', 'paid', 'overdue'].includes(i.status) && !i.revenuePosted);
    const vch = vouchers.filter(v => voucherStatusOf(v) === 'paid' && !v.booksPosted);
    const div = dividends.filter(d => !d.booksPosted);
    return { txns, inv, vch, div, total: txns.length + inv.length + vch.length + div.length };
  }, [transactions, invoices, vouchers, dividends]);

  const handleSyncBooks = useCallback(async () => {
    const { txns, inv, vch, div, total } = pendingSync;
    if (total === 0) return;
    const list = accountsRef.current;
    const cashCode = defaultCashCode(list);
    if (!window.confirm(
      `Post ${total} record(s) to the Double-Entry Books?\n\n` +
      `• ${inv.length} invoice(s) — revenue recognition\n• ${txns.length} Tax Ledger entr${txns.length === 1 ? 'y' : 'ies'}\n` +
      `• ${vch.length} paid contractor voucher(s) — also added to the Tax Ledger as expenses\n• ${div.length} dividend(s)\n\n` +
      `Cash movements use account ${cashCode} · ${bookAcctName(list, cashCode)}.`)) return;
    setSyncing(true);
    let ok = 0; const failed = [];
    const attempt = async (label, fn) => { try { await fn(); ok++; } catch (err) { console.error(err); failed.push(`${label}: ${err.message}`); } };
    for (const i of inv) await attempt(`Invoice ${i.invoiceNo}`, () => postInvoiceRevenue(list, i));
    for (const t of txns) await attempt(`Entry ${t.ref || t.id}`, async () => {
      const jid = await postTxnJournal(list, t.id, t);
      await updateDoc(doc(db, 'financeTransactions', t.id), { booksPosted: true, journalId: jid });
    });
    for (const v of vch) await attempt(`Voucher ${v.ref || v.id}`, async () => {
      await postVoucherJournal(list, v, contractorNameOf(employees, v.contractorId), cashCode, v.paymentRef || '');
      await updateDoc(doc(db, 'contractorVouchers', v.id), { booksPosted: true });
    });
    for (const d of div) await attempt(`Dividend ${d.shareholder}`, () => postDividendJournal(list, d, cashCode));
    await logAudit('Synced records to books', 'journalEntries', `${ok} posted, ${failed.length} failed`);
    setSyncing(false);
    alert(`${ok} record(s) posted to the books.` + (failed.length ? `\n\n${failed.length} could not be posted:\n${failed.join('\n')}` : ''));
  }, [pendingSync, employees, logAudit]);

  // Books vs Tax Ledger — every difference must be explained by a known timing/scope item.
  const reconciliation = useMemo(() => {
    const sum = (arr, f) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0);
    const ledgerIncome = sum(transactions.filter(t => t.type === 'Income'), t => t.grossAmount);
    const ledgerExpense = sum(transactions.filter(t => t.type === 'Expense'), t => t.grossAmount);
    const unsyncedIncome = sum(pendingSync.txns.filter(t => t.type === 'Income'), t => t.grossAmount);
    const unsyncedExpense = sum(pendingSync.txns.filter(t => t.type === 'Expense'), t => t.grossAmount);
    // Invoices sent but unpaid are revenue in the books (accrual) but only reach the Tax Ledger when paid.
    const accruedUnpaid = sum(invoices.filter(i => ['sent', 'overdue'].includes(i.status) && i.revenuePosted), i => Number(i.total) - Number(i.taxAmount || 0));
    const expectedRevenue = ledgerIncome - unsyncedIncome + accruedUnpaid;
    const expectedExpense = ledgerExpense - unsyncedExpense;
    const paidVouchers = vouchers.filter(v => voucherStatusOf(v) === 'paid');
    return {
      ledgerIncome, ledgerExpense, unsyncedIncome, unsyncedExpense, accruedUnpaid, expectedRevenue, expectedExpense,
      revenueDiff: incomeStatement.totalRevenue - expectedRevenue, expenseDiff: incomeStatement.totalExpenses - expectedExpense,
      paidVoucherCount: paidVouchers.length, paidVoucherTotal: sum(paidVouchers, v => v.amount),
    };
  }, [transactions, invoices, vouchers, pendingSync, incomeStatement]);

  const syncBanner = pendingSync.total > 0 ? (
    <div style={{ ...s.errorBanner, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span>📘 {pendingSync.total} record(s) are not in the Double-Entry Books yet ({[
        pendingSync.inv.length && `${pendingSync.inv.length} invoice(s)`, pendingSync.txns.length && `${pendingSync.txns.length} ledger entr${pendingSync.txns.length === 1 ? 'y' : 'ies'}`,
        pendingSync.vch.length && `${pendingSync.vch.length} voucher(s)`, pendingSync.div.length && `${pendingSync.div.length} dividend(s)`,
      ].filter(Boolean).join(', ')}). The statements will not match the Tax Ledger until they are posted.</span>
      {canApprove && <button style={{ ...s.btnShortlist, padding: '7px 14px' }} disabled={syncing} onClick={handleSyncBooks}>{syncing ? 'Posting…' : 'Sync to books'}</button>}
    </div>
  ) : null;

  const payrollRunsSorted = useMemo(() => [...payrollRuns].sort((a, b) => String(b.period).localeCompare(String(a.period))), [payrollRuns]);
  const payrollToPost = useMemo(() => payrollRuns.filter(r => !r.postedToLedger).length, [payrollRuns]);
  const payrollUnremitted = useMemo(() => payrollRuns.filter(r => r.postedToLedger && !r.remitted)
    .reduce((t, r) => t + (Number(r.totalPAYE) || 0) + (Number(r.totalNSSFEmployee) || 0) + (Number(r.totalNSSFCompany) || 0), 0), [payrollRuns]);
  const payrollOverdue = useMemo(() => payrollRuns.filter(r => !r.remitted && r.remittanceDueDate && new Date(`${r.remittanceDueDate}T23:59:59`) < new Date()), [payrollRuns]);

  const claimsInPeriod = useMemo(() => claims.filter(c => c.period === opsPeriod), [claims, opsPeriod]);
  const sumAmt = (list) => list.reduce((t, c) => t + (Number(c.amount) || 0), 0);
  const opsLines = useMemo(() => OPS_BUDGET.map(c => {
    const mine = claimsInPeriod.filter(x => x.category === c.label);
    return {
      key: c.key, category: c.label, ceiling: c.ceiling,
      spent: sumAmt(mine.filter(x => x.status === 'paid')),
      committed: sumAmt(mine.filter(x => x.status === 'approved')),
      pending: sumAmt(mine.filter(x => x.status === 'pending')),
    };
  }), [claimsInPeriod]);
  const opsSpent = opsLines.reduce((t, l) => t + l.spent, 0);
  const opsCommitted = opsLines.reduce((t, l) => t + l.committed, 0);
  const usedFor = useCallback((category, period) => sumAmt(claims.filter(c => c.period === period && c.category === category && c.status !== 'rejected')), [claims]);

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

  const exportBalanceSheetPDF = () => runPdf(() => downloadBalanceSheetPdf(balanceSheet, incomeStatement));
  const exportIncomeStatementPDF = () => runPdf(() => downloadIncomeStatementPdf(incomeStatement));

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
        {payrollError && activeTab === 'payroll' && <div style={s.errorBanner}>⚠️ {payrollError}</div>}
        {claimsError && activeTab === 'opsbudget' && <div style={s.errorBanner}>⚠️ {claimsError}</div>}
        {payrollOverdue.length > 0 && activeTab !== 'payroll' && (
          <div style={{ ...s.errorBanner, background: '#FEE2E2', borderColor: '#EF4444', color: '#991B1B', cursor: 'pointer' }} onClick={() => setActiveTab('payroll')}>
            ⛔ PAYE/NSSF for {payrollOverdue.map(r => r.period).join(', ')} is past its 15th-of-month due date and not recorded as remitted — late payment attracts penalties and interest. Click to review.
          </div>
        )}

        {syncBanner}

        <div style={s.dashSwitcher}>
          <button style={{ ...s.dashTab, ...(activeTab === 'dashboard' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'ledger' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('ledger')}>📒 Tax Ledger <span style={s.tabCount}>{transactions.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'books' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('books')}>📘 Double-Entry Books</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'invoicing' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('invoicing')}>🧾 Invoicing {invoiceCounts.sent > 0 && <span style={{ ...s.tabCount, background: '#DBEAFE', color: '#1D4ED8' }}>{invoiceCounts.sent}</span>}</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'statements' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('statements')}>📑 Financial Statements</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'assets' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('assets')}>🏢 Fixed Assets <span style={s.tabCount}>{fixedAssets.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'loans' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('loans')}>🏦 Loans <span style={s.tabCount}>{loans.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'contractors' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('contractors')}>🧾 Contractors &amp; Vouchers</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'payroll' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('payroll')}>💵 Payroll {payrollToPost > 0 && <span style={{ ...s.tabCount, background: '#FEF3C7', color: '#92400E' }}>{payrollToPost}</span>}</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'opsbudget' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('opsbudget')}>🧰 IT Operations Budget</button>
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
                <button style={s.tab} onClick={() => runPdf(() => downloadCitPdf(citSummary, assetsWithDepreciation, (c) => assetClassByCode(c).label))}>⬇ Download CIT Sheet</button>
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
              <StatCard label="PAYE + NSSF Still to Remit" value={fmtMoney(payrollUnremitted)} accent={payrollOverdue.length ? '#DC2626' : '#7C3AED'} sub={payrollOverdue.length ? `${payrollOverdue.length} run(s) overdue` : 'Due the 15th of next month'} />
              <StatCard label="IT Ops Budget Used (month)" value={fmtMoney(opsSpent)} accent="#0D9488" sub={`of ${fmtMoney(OPS_BUDGET_TOTAL)} shared ceiling`} />
              <StatCard label="Output VAT Collected (FY)" value={fmtMoney(citSummary.totalVatCollected)} accent="#1D4ED8" sub="Standard-rated income" />
            </div>

            <h2 style={{ ...s.sectionHead, margin: '28px 0 14px' }}>Double-Entry Books Snapshot</h2>
            <div style={s.trackGrid}>
              <StatCard label="Cash &amp; Bank" value={fmtMoney(totalCash)} accent="#1A3C5E" />
              <StatCard label="Accounts Receivable" value={fmtMoney(totalReceivable)} accent="#2E6DA4" sub={`${invoiceCounts.sent || 0} unpaid invoices`} />
              <StatCard label="Accounts Payable" value={fmtMoney(totalPayable)} accent="#EF4444" />
              <StatCard label="WHT Payable to URA" value={fmtMoney(accountBalances[ACCT.WHT_PAYABLE] || 0)} accent="#7C3AED" sub="Contractor 6% + dividend 15%" />
              <StatCard label="Contractor Vouchers Paid" value={fmtMoney(reconciliation.paidVoucherTotal)} accent="#4338CA" sub={`${reconciliation.paidVoucherCount} voucher(s) in expenses`} />
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
                        <td style={s.td}>{t.description}<div style={{ fontSize: 11, color: '#9AAAB8' }}>{t.ref} {t.counterpartyName ? `· ${t.counterpartyName}` : ''} · {(t.booksPosted || isSystemTxn(t)) ? '✓ in books' : '⚠ not in books'}</div></td>
                        <td style={{ ...s.td, fontWeight: 700 }}>{fmtMoney(t.grossAmount)}</td>
                        <td style={s.td}>{t.vatTreatment === VAT_TREATMENTS[0] ? fmtMoney(t.vatAmount) : '—'}</td>
                        <td style={s.td}>{t.whtWithheld ? fmtMoney(t.whtAmount) : '—'}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {t.type === 'Income' && <button style={s.btnShortlist} onClick={() => runPdf(() => downloadTaxInvoicePdf(t, VAT_TREATMENTS[0], VAT_RATE))}>Invoice</button>}
                            {canWrite && !isSystemTxn(t) && <button style={s.btnView} onClick={() => { setEditingTxn(t); setShowTxnForm(true); }}>Edit</button>}
                            {canDelete && !isSystemTxn(t) && <button style={s.btnDelete} onClick={() => handleDeleteTxn(t)}>Delete</button>}
                            {isSystemTxn(t) && <span style={{ fontSize: 11, color: '#9AAAB8', alignSelf: 'center' }}>Auto — managed from source</span>}
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
                    {accounts.length > 0 && canWrite && <button style={s.tab} onClick={addMissingDefaultAccounts}>➕ Add Missing Defaults</button>}
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
                            <button style={s.btnView} onClick={() => runPdf(() => downloadInvoicePdf(inv))}>🖨 Print</button>
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
                        <td style={s.td}><button style={s.btnView} onClick={() => runPdf(() => downloadReceiptPdf(r))}>🖨 Print</button></td>
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
                <button style={{ ...s.tab, ...(statementsSubTab === 'reconcile' ? s.tabActive : {}) }} onClick={() => setStatementsSubTab('reconcile')}>Reconciliation {pendingSync.total > 0 && <span style={{ ...s.tabCount, background: '#FEF3C7', color: '#92400E' }}>{pendingSync.total}</span>}</button>
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

        {/* ── Reconciliation: Books vs Tax Ledger ── */}
        {activeTab === 'statements' && statementsSubTab === 'reconcile' && (() => {
          const R = reconciliation;
          const Row = ({ label, value, bold }) => (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F0F4F8', fontWeight: bold ? 800 : 500, color: '#1A3C5E' }}>
              <span>{label}</span><span>{fmtMoney(value)}</span>
            </div>
          );
          const agrees = (n) => Math.abs(n) < 1;
          return (
            <div style={s.tableWrap}>
              <div style={{ padding: '16px 20px' }}>
                <h3 style={{ ...s.sectionHead, margin: 0 }}>Revenue — Tax Ledger vs Books</h3>
                <Row label="Tax Ledger income (excl. VAT)" value={R.ledgerIncome} />
                <Row label="− Ledger entries not yet in the books" value={-R.unsyncedIncome} />
                <Row label="+ Invoiced but unpaid (recognised in books when sent)" value={R.accruedUnpaid} />
                <Row label="= Expected books revenue" value={R.expectedRevenue} bold />
                <Row label="Books revenue (Income Statement)" value={incomeStatement.totalRevenue} bold />
                <div style={{ margin: '10px 0 22px' }}>{agrees(R.revenueDiff) ? <Badge text="✓ Revenue agrees" tone="green" /> : <Badge text={`Unexplained difference ${fmtMoney(R.revenueDiff)} — likely a journal entry posted directly in the books`} tone="red" />}</div>

                <h3 style={{ ...s.sectionHead, margin: 0 }}>Expenses — Tax Ledger vs Books</h3>
                <Row label="Tax Ledger expenses (payroll, IT Ops, contractor vouchers, manual)" value={R.ledgerExpense} />
                <Row label="− Ledger entries not yet in the books" value={-R.unsyncedExpense} />
                <Row label="= Expected books expenses" value={R.expectedExpense} bold />
                <Row label="Books expenses (Income Statement)" value={incomeStatement.totalExpenses} bold />
                <div style={{ margin: '10px 0 22px' }}>{agrees(R.expenseDiff) ? <Badge text="✓ Expenses agree" tone="green" /> : <Badge text={`Unexplained difference ${fmtMoney(R.expenseDiff)} — likely a journal entry posted directly in the books`} tone="red" />}</div>

                <h3 style={{ ...s.sectionHead, margin: 0 }}>Included &amp; tax-only items</h3>
                <Row label={`Paid contractor vouchers in expenses (${R.paidVoucherCount})`} value={R.paidVoucherTotal} />
                <Row label={`Capital allowances FY ${citSummary.label} (tax-only, in the CIT sheet, not booked)`} value={citSummary.totalDepreciation} />
                <p style={{ fontSize: 12, color: '#9AAAB8', marginTop: 12, lineHeight: 1.6 }}>
                  Books net income and CIT chargeable income differ only by capital allowances and loss relief. Fixed-asset purchases and loan drawdowns live in their registers and are not auto-posted to the books; post them as journal entries if you need them on the Balance Sheet.
                </p>
                {pendingSync.total > 0 && canApprove && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', background: '#0D9488' }} disabled={syncing} onClick={handleSyncBooks}>{syncing ? 'Posting…' : `Sync ${pendingSync.total} record(s) to books`}</button>}
              </div>
            </div>
          );
        })()}

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
                            <button style={s.btnShortlist} onClick={() => runPdf(() => downloadLoanPdf(l))}>Note</button>
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
                    <th style={s.th}>Date</th><th style={s.th}>Contractor</th><th style={s.th}>Type</th><th style={s.th}>Amount</th><th style={s.th}>WHT</th><th style={s.th}>Task</th><th style={s.th}>Status</th><th style={s.th}>Actions</th>
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
                            <Badge text={voucherStatusOf(v)} tone={VOUCHER_STATUS_TONE[voucherStatusOf(v)] || 'gray'} />
                            {v.booksPosted && voucherStatusOf(v) === 'paid' && <div style={{ fontSize: 11, color: '#065F46', marginTop: 3 }}>✓ In books &amp; Tax Ledger</div>}
                            {!v.booksPosted && voucherStatusOf(v) === 'paid' && <div style={{ fontSize: 11, color: '#92400E', marginTop: 3 }}>⚠ Not in books — use Sync</div>}
                          </td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {canApprove && voucherStatusOf(v) === 'pending' && <button style={s.btnShortlist} onClick={() => handleApproveVoucher(v)}>Approve</button>}
                              {canApprove && voucherStatusOf(v) === 'approved' && <button style={s.btnShortlist} onClick={() => setPayVoucherTarget(v)}>Pay</button>}
                              <button style={s.btnView} onClick={() => runPdf(() => downloadVoucherPdf(v, name))}>Voucher</button>
                              {canWrite && ['pending', 'approved'].includes(voucherStatusOf(v)) && <button style={s.btnView} onClick={() => { setEditingVoucher(v); setShowVoucherForm(true); }}>Edit</button>}
                              {canDelete && ['pending', 'approved', 'reversed'].includes(voucherStatusOf(v)) && <button style={s.btnDelete} onClick={() => handleDeleteVoucher(v)}>Delete</button>}
                              {canDelete && voucherStatusOf(v) === 'paid' && v.booksPosted && <button style={s.btnReject} onClick={() => handleReverseVoucher(v)}>Reverse</button>}
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

        {/* ── Payroll (runs generated in HR Manager) ── */}
        {activeTab === 'payroll' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Payroll — posting &amp; PAYE / NSSF remittance</h2>
              <p style={{ ...s.pageSub, margin: '4px 0 0' }}>HR generates the pay slips; Finance posts each run to the books and records the remittance. PAYE and NSSF (5% employee + 10% employer, on total gross pay) are due to URA and NSSF by the 15th of the following month.</p>
            </div>
            <div style={s.tableWrap}>
              {loadingPayroll ? <div style={s.tableMsg}>Loading payroll runs…</div> : payrollRunsSorted.length === 0 ? <div style={s.tableMsg}>No payroll runs yet — HR creates them with “Run Payroll” in the HR Control Center.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}>
                    <th style={s.th}>Period</th><th style={s.th}>Staff</th><th style={{ ...s.th, textAlign: 'right' }}>Gross pay</th><th style={{ ...s.th, textAlign: 'right' }}>PAYE</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>NSSF (5%+10%)</th><th style={{ ...s.th, textAlign: 'right' }}>Net pay</th><th style={{ ...s.th, textAlign: 'right' }}>Cost to company</th>
                    <th style={s.th}>Remit by</th><th style={s.th}>Status</th><th style={s.th}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {payrollRunsSorted.map(r => {
                      const nssf = (Number(r.totalNSSFEmployee) || 0) + (Number(r.totalNSSFCompany) || 0);
                      const overdue = !r.remitted && r.remittanceDueDate && new Date(`${r.remittanceDueDate}T23:59:59`) < new Date();
                      return (
                        <tr key={r.id} style={s.tr}>
                          <td style={{ ...s.td, fontWeight: 700 }}>{r.period}</td>
                          <td style={s.td}>{r.employeeCount}</td>
                          <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney((Number(r.totalGross) || 0) + (Number(r.totalAllowances) || 0))}</td>
                          <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(r.totalPAYE)}</td>
                          <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(nssf)}</td>
                          <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(r.totalNetPay)}</td>
                          <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(r.totalCostToCompany)}</td>
                          <td style={{ ...s.td, color: overdue ? '#DC2626' : '#5A7A9A', fontWeight: overdue ? 700 : 400 }}>{r.remittanceDueDate ? fmtDate(r.remittanceDueDate) : '—'}</td>
                          <td style={s.td}>
                            {r.remitted ? <Badge text="Remitted" tone="green" /> : r.postedToLedger ? <Badge text={overdue ? 'Remittance overdue' : 'Posted — remit'} tone={overdue ? 'red' : 'blue'} /> : <Badge text="Awaiting posting" tone="amber" />}
                          </td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button style={s.btnView} onClick={() => runPdf(() => downloadPayrollSummaryPdf(r, payrollSlips.filter(p => p.period === r.period)))}>🖨 Summary</button>
                              <button style={s.btnView} onClick={() => exportPayrollBankSchedule(r)}>🏦 HFB Schedule</button>
                              {canApprove && !r.postedToLedger && <button style={s.btnShortlist} onClick={() => setPayrollTarget({ run: r, mode: 'post' })}>Post to Ledger</button>}
                              {canApprove && r.postedToLedger && !r.remitted && <button style={s.btnShortlist} onClick={() => setPayrollTarget({ run: r, mode: 'remit' })}>Record Remittance</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <p style={{ fontSize: 12, color: '#9AAAB8', marginTop: 14, lineHeight: 1.6 }}>
              Posting books: Dr Salaries (gross) + Employer NSSF; Cr PAYE Payable, NSSF Payable, Bank (net pay) — and adds one deductible expense to the Tax Ledger for the Corporate Income Tax computation. Do not also key the same salaries into the Tax Ledger by hand. Recording the remittance clears the PAYE and NSSF liabilities. Keep the URA payment slip (PRN) and the NSSF receipt.
            </p>
          </>
        )}

        {/* ── IT Operations & Business Expense budget ── */}
        {activeTab === 'opsbudget' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>IT Operations &amp; Business Expense Budget</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>One shared company budget of {fmtMoney(OPS_BUDGET_TOTAL)} a month for running the IT business. It is not staff pay and not a per-person entitlement — money is paid to suppliers or reimbursed against actual receipts.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="month" style={{ ...s.loginInput, width: 'auto' }} value={opsPeriod} onChange={e => setOpsPeriod(e.target.value)} />
                <button style={s.tab} onClick={() => runPdf(() => downloadExpenseStatementPdf({ period: opsPeriod, budgetLines: opsLines, claims: claimsInPeriod.filter(c => c.status === 'paid'), ceiling: OPS_BUDGET_TOTAL, spent: opsSpent }))}>⬇ Statement PDF</button>
                {canWrite && <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#0D9488' }} onClick={() => setShowClaimForm(true)}>➕ New Expense</button>}
              </div>
            </div>

            <div style={s.trackGrid}>
              <StatCard label="Monthly Ceiling" value={fmtMoney(OPS_BUDGET_TOTAL)} accent="#1A3C5E" sub="Spending limit, not an entitlement" />
              <StatCard label="Paid This Month" value={fmtMoney(opsSpent)} accent="#10B981" />
              <StatCard label="Approved, Not Yet Paid" value={fmtMoney(opsCommitted)} accent="#2E6DA4" />
              <StatCard label="Headroom" value={fmtMoney(OPS_BUDGET_TOTAL - opsSpent - opsCommitted)} accent="#0D9488" sub="Unspent stays with the company" />
            </div>

            <h2 style={{ ...s.sectionHead, margin: '24px 0 12px' }}>Budget by category — {opsPeriod}</h2>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr style={s.thead}><th style={s.th}>Category</th><th style={{ ...s.th, textAlign: 'right' }}>Ceiling</th><th style={{ ...s.th, textAlign: 'right' }}>Paid</th><th style={{ ...s.th, textAlign: 'right' }}>Approved</th><th style={{ ...s.th, textAlign: 'right' }}>Pending</th><th style={{ ...s.th, textAlign: 'right' }}>Remaining</th></tr></thead>
                <tbody>
                  {opsLines.map(l => {
                    const remaining = l.ceiling - l.spent - l.committed;
                    return (
                      <tr key={l.key} style={s.tr}>
                        <td style={s.td}>{l.category}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(l.ceiling)}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(l.spent)}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>{fmtMoney(l.committed)}</td>
                        <td style={{ ...s.td, textAlign: 'right', color: '#92400E' }}>{fmtMoney(l.pending)}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: remaining < 0 ? '#DC2626' : '#065F46' }}>{fmtMoney(remaining)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2 style={{ ...s.sectionHead, margin: '24px 0 12px' }}>Expenses</h2>
            <div style={s.tableWrap}>
              {loadingClaims ? <div style={s.tableMsg}>Loading expenses…</div> : claimsInPeriod.length === 0 ? <div style={s.tableMsg}>No expenses recorded for {opsPeriod}.</div> : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Date</th><th style={s.th}>Category</th><th style={s.th}>Purpose</th><th style={s.th}>Paid to</th><th style={s.th}>Receipt</th><th style={{ ...s.th, textAlign: 'right' }}>Amount</th><th style={s.th}>Status</th><th style={s.th}>Actions</th></tr></thead>
                  <tbody>
                    {[...claimsInPeriod].sort((a, b) => (toDateObj(b.date) || 0) - (toDateObj(a.date) || 0)).map(c => (
                      <tr key={c.id} style={s.tr}>
                        <td style={s.td}>{fmtDate(c.date)}<div style={{ fontSize: 11, color: '#9AAAB8' }}>{c.ref}</div></td>
                        <td style={{ ...s.td, fontSize: 12.5 }}>{c.category}{c.overCeiling && <div style={{ fontSize: 11, color: '#92400E' }}>Over ceiling: {c.overrideReason}</div>}</td>
                        <td style={s.td}>{c.description}</td>
                        <td style={s.td}>{c.payee}<div style={{ fontSize: 11, color: '#9AAAB8' }}>{c.route}</div></td>
                        <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12.5 }}>{c.receiptRef}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{fmtMoney(c.amount)}</td>
                        <td style={s.td}><Badge text={c.status} tone={CLAIM_STATUS_TONE[c.status] || 'gray'} /></td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {canApprove && c.status === 'pending' && <button style={s.btnShortlist} onClick={() => handleClaimDecision(c, 'approved')}>Approve</button>}
                            {canApprove && c.status === 'pending' && <button style={s.btnReject} onClick={() => handleClaimDecision(c, 'rejected')}>Reject</button>}
                            {canApprove && c.status === 'approved' && <button style={s.btnShortlist} onClick={() => setPayClaimTarget(c)}>Pay</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 10, padding: '12px 16px', marginTop: 16, fontSize: 12.5, color: '#115E59', lineHeight: 1.7 }}>
              <strong>Rules that keep this tax-safe:</strong> spend only on genuine company purposes · pay suppliers directly wherever possible (internet, software, equipment) · reimburse employees only the <em>actual</em> amount spent, against a receipt · never top up staff with the unspent balance · keep every receipt, client assignment record and subscription invoice. Paying a fixed sum to people regardless of spend is wages and would attract PAYE and NSSF.
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
                            {d.booksPosted ? <Badge text="In books" tone="green" /> : canApprove && <button style={s.btnShortlist} onClick={() => setPayDividendTarget(d)}>Post to Books</button>}
                            <button style={s.btnView} onClick={() => runPdf(() => downloadDividendPdf(d))}>Certificate</button>
                            {canWrite && !d.booksPosted && <button style={s.btnView} onClick={() => { setEditingDividend(d); setShowDividendForm(true); }}>Edit</button>}
                            {canDelete && !d.booksPosted && <button style={s.btnDelete} onClick={() => handleDeleteDividend(d)}>Delete</button>}
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
      {showClaimForm && <OpsClaimModal usedFor={usedFor} onClose={() => setShowClaimForm(false)} onSave={handleSaveClaim} />}
      {payVoucherTarget && (() => {
        const gross = Number(payVoucherTarget.amount) || 0;
        const wht = payVoucherTarget.whtWithheld ? Number(payVoucherTarget.whtAmount) || 0 : 0;
        return (
          <CashAccountModal
            title="Pay Contractor Voucher" subtitle={`${payVoucherTarget.ref || ''} · ${contractorNameOf(employees, payVoucherTarget.contractorId)}`}
            cashAccounts={cashAccounts.length ? cashAccounts : accounts.filter(a => a.type === 'Asset')}
            summaryLines={[['Voucher', payVoucherTarget.voucherType], ['Gross fee (expense)', fmtMoney(gross)], ['6% WHT withheld', fmtMoney(wht)], ['Net paid out', fmtMoney(gross - wht)]]}
            confirmLabel="✓ Pay & Post to Books" referenceLabel="Payment reference (MoMo / bank ref)"
            onClose={() => setPayVoucherTarget(null)} onConfirm={(p) => handlePayVoucher(payVoucherTarget, p)}
          />
        );
      })()}
      {payDividendTarget && (
        <CashAccountModal
          title="Post Dividend to Books" subtitle={`${payDividendTarget.shareholder} · ${fmtDate(payDividendTarget.date)}`} accent="#0D9488"
          cashAccounts={cashAccounts.length ? cashAccounts : accounts.filter(a => a.type === 'Asset')}
          summaryLines={[['Gross dividend', fmtMoney(payDividendTarget.amount)], ['15% WHT payable', fmtMoney(payDividendTarget.whtAmount)], ['Net paid out', fmtMoney((Number(payDividendTarget.amount) || 0) - (Number(payDividendTarget.whtAmount) || 0))]]}
          confirmLabel="✓ Post to Books"
          onClose={() => setPayDividendTarget(null)} onConfirm={(p) => handlePostDividend(payDividendTarget, p)}
        />
      )}
      {payClaimTarget && (
        <CashAccountModal
          title="Pay Business Expense" subtitle={`${payClaimTarget.ref} · ${payClaimTarget.payee}`}
          cashAccounts={cashAccounts.length ? cashAccounts : accounts.filter(a => a.type === 'Asset')}
          summaryLines={[['Category', payClaimTarget.category], ['Receipt', payClaimTarget.receiptRef], ['Amount', fmtMoney(payClaimTarget.amount)]]}
          confirmLabel="✓ Pay & Post" referenceLabel="Payment reference (MoMo / bank ref)"
          onClose={() => setPayClaimTarget(null)} onConfirm={(p) => handlePayClaim(payClaimTarget, p)}
        />
      )}
      {payrollTarget && payrollTarget.mode === 'post' && (
        <CashAccountModal
          title={`Post Payroll ${payrollTarget.run.period}`} subtitle="Journal + Tax Ledger expense, posted once" accent="#059669"
          cashAccounts={cashAccounts.length ? cashAccounts : accounts.filter(a => a.type === 'Asset')}
          summaryLines={[
            ['Salary expense (gross)', fmtMoney((Number(payrollTarget.run.totalGross) || 0) + (Number(payrollTarget.run.totalAllowances) || 0))],
            ['Employer NSSF (10%)', fmtMoney(payrollTarget.run.totalNSSFCompany)],
            ['PAYE payable', fmtMoney(payrollTarget.run.totalPAYE)],
            ['NSSF payable (5% + 10%)', fmtMoney((Number(payrollTarget.run.totalNSSFEmployee) || 0) + (Number(payrollTarget.run.totalNSSFCompany) || 0))],
            ['Net salaries paid from bank', fmtMoney(payrollTarget.run.totalNetPay)],
            ['Paid into', (() => {
              const slips = payrollSlips.filter(p => p.period === payrollTarget.run.period).map(p => slipWithBank(p, employees));
              const missing = slips.filter(p => !hasBankAccount(p.bankAccountNumber)).length;
              return `${HFB_BANK_NAME} · ${slips.length - missing} of ${slips.length} accounts on file${missing ? ` (${missing} missing)` : ''}`;
            })()],
          ]}
          confirmLabel="✓ Post to Books" onClose={() => setPayrollTarget(null)} onConfirm={(p) => handlePostPayroll(payrollTarget.run, p)}
        />
      )}
      {payrollTarget && payrollTarget.mode === 'remit' && (
        <CashAccountModal
          title={`Record Remittance ${payrollTarget.run.period}`} subtitle="Clears the PAYE and NSSF liabilities" accent="#7C3AED"
          cashAccounts={cashAccounts.length ? cashAccounts : accounts.filter(a => a.type === 'Asset')}
          summaryLines={[
            ['PAYE paid to URA', fmtMoney(payrollTarget.run.totalPAYE)],
            ['NSSF paid (5% + 10%)', fmtMoney((Number(payrollTarget.run.totalNSSFEmployee) || 0) + (Number(payrollTarget.run.totalNSSFCompany) || 0))],
          ]}
          confirmLabel="✓ Record Remittance" referenceLabel="URA PRN / NSSF receipt no." referenceRequired
          onClose={() => setPayrollTarget(null)} onConfirm={(p) => handleRemitPayroll(payrollTarget.run, p)}
        />
      )}
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