/**
 * HrManager.jsx – Slirus Holdings HR Control Center (Human Capital Management)
 *
 * HR Manager dashboard. Access is provisioned by the CEO Control Center
 * (CeoManager.jsx): a `teamUsers/{uid}` profile with department `HR` or an
 * explicit `permissions.hr.*` grant is required to enter. Sits alongside
 * CeoManager.jsx and Admin.jsx and reuses the same auth/session conventions.
 *
 * Modules:
 *  - Employee Master Directory: digital profiles (personal details, job
 *    grade, contract data, employment history timeline) with an ID Card
 *    creator — the photo is captured from the device camera/file picker and
 *    kept in the browser's localStorage (never uploaded), keyed per employee.
 *  - Automated Lifecycle Management: contract pipeline — Active ➔ Expiring
 *    Soon (auto-flagged, banner alert) ➔ Renewed / Terminated / Resigned /
 *    Expired. Every transition is written to the employee's history.
 *  - Automated Payroll Engine: job-grade base pay, progressive PAYE-style
 *    tax, allowances/deductions, one-click monthly payroll run that
 *    generates immutable digital pay slips (duplicate-run safe).
 *  - Leave Management Workflow: HR logs/reviews requests; single-click
 *    Approve / Reject that automatically adjusts each employee's leave
 *    balance. Balances board included.
 *  - Performance & Appraisal: scored review matrix tied to system-driven
 *    Promote (bumps job grade + salary) / Demote actions.
 *  - Attendance (read-only): pulls clock in/out events written by the
 *    separate fingerprint/phone Attendance module (`attendance` collection)
 *    into each employee's profile — this file does not capture biometrics.
 *
 * Branding on generated documents (ID card, Contract, Appointment Letter,
 * Pay Slip) uses the company logo at `/Slirus.png` in the public folder —
 * place it there before generating real documents. The ID card's QR code
 * is rendered with the `qrcode` npm package (`npm install qrcode`).
 *
 * State lives at the top level and is passed down explicitly. All Firebase
 * calls are try/catch with user-facing error feedback, matching CeoManager.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db, auth } from '../firebase/firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';
import QRCode from 'qrcode';

// ─── Config ─────────────────────────────────────────────────────────────────
// NOTE: This is a UX gate only. The real authorization boundary must live in
// Firestore Security Rules (e.g. request.auth.token / teamUsers doc lookup)
// — never trust a client-side check alone.
const CEO_EMAIL = (import.meta.env.VITE_CEO_EMAIL || 'kaayamosesawal@gmail.com').toLowerCase();

const DEPARTMENTS = ['Sales', 'HR', 'Finance', 'Operations', 'Engineering', 'Marketing', 'Executive'];

const JOB_GRADES = [
  { code: 'G1', title: 'Intern / Trainee',      level: 1, baseSalary: 400000 },
  { code: 'G2', title: 'Junior Staff',           level: 2, baseSalary: 900000 },
  { code: 'G3', title: 'Staff',                  level: 3, baseSalary: 1500000 },
  { code: 'G4', title: 'Senior Staff',           level: 4, baseSalary: 2300000 },
  { code: 'G5', title: 'Team Lead',              level: 5, baseSalary: 3200000 },
  { code: 'G6', title: 'Manager',                level: 6, baseSalary: 4500000 },
  { code: 'G7', title: 'Senior Manager',         level: 7, baseSalary: 6200000 },
  { code: 'G8', title: 'Director',               level: 8, baseSalary: 9000000 },
  { code: 'G9', title: 'Executive',              level: 9, baseSalary: 13000000 },
];

const CONTRACT_TYPES = ['Probation', 'Fixed-Term', 'Permanent', 'Intern', 'Consultant'];
const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];

const CONTRACT_MANUAL_STATES = ['active', 'renewed', 'terminated', 'resigned'];
const EXPIRING_SOON_WINDOW_DAYS = 30;

const LEAVE_TYPES = ['Annual', 'Sick', 'Maternity', 'Paternity', 'Compassionate', 'Unpaid'];
const DEFAULT_LEAVE_BALANCES = { Annual: 21, Sick: 10, Compassionate: 5 };

const PERFORMANCE_CRITERIA = [
  { key: 'quality',       label: 'Quality of Work' },
  { key: 'productivity',  label: 'Productivity' },
  { key: 'teamwork',      label: 'Teamwork' },
  { key: 'communication', label: 'Communication' },
  { key: 'reliability',   label: 'Reliability & Punctuality' },
];

const RECOMMENDATIONS = ['None', 'Promote', 'Demote', 'Performance Improvement Plan'];

const IDLE_LIMIT_MS = 20 * 60 * 1000;
const IDLE_WARN_MS  = 18 * 60 * 1000;

// ─── Letterhead / statutory reference data for generated documents ─────────
// Edit these to match the company's registered details before issuing real
// contracts or appointment letters.
const COMPANY_INFO = {
  name: 'Slirus Holdings',
  address: '[Company Postal Address, Plot No., Street, City]',
  phone: '[Company Phone Number]',
  email: '[Company Email Address]',
  website: 'https://slirus.com',
  logo: '/Slirus.png', // served from the public folder
};

const ID_CARD_VALIDITY_YEARS = 1;

// General reference only — not legal advice. Termination notice periods
// commonly applied under Uganda's Employment Act, 2006 scale with length of
// continuous service. Confirm current figures with a qualified labour-law
// advisor before relying on this for an actual contract.
const NOTICE_PERIOD_TABLE = [
  { tenure: 'Less than 6 months', notice: '2 weeks' },
  { tenure: '6 months – 1 year', notice: '1 month' },
  { tenure: '1 – 5 years', notice: '2 months' },
  { tenure: '5 – 10 years', notice: '3 months' },
  { tenure: 'More than 10 years', notice: '6 months' },
];
const DEFAULT_PROBATION_MONTHS = 6; // statutory maximum for a single probation period

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (ts) => {
  if (!ts) return '—';
  if (ts?.toDate) return ts.toDate().toLocaleDateString('en-UG');
  const d = new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-UG');
};
const fmtDateTime = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-UG') : '—');

const fmtMoney = (n) =>
  'UGX ' + Math.round(Number(n) || 0).toLocaleString('en-UG');

const toDateObj = (v) => {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

const daysBetween = (a, b) => {
  const A = toDateObj(a), B = toDateObj(b);
  if (!A || !B) return null;
  return Math.round((B.setHours(0,0,0,0) - A.setHours(0,0,0,0)) / 86400000);
};

// Progressive, PAYE-style monthly tax (illustrative — configure to your
// jurisdiction's real bands before relying on this for statutory filing).
const computeTax = (gross) => {
  const g = Math.max(0, Number(gross) || 0);
  const bands = [
    { upTo: 235000,     rate: 0,    base: 0 },
    { upTo: 335000,     rate: 0.10, base: 0 },
    { upTo: 410000,     rate: 0.20, base: 10000 },
    { upTo: 10000000,   rate: 0.30, base: 25000 },
    { upTo: Infinity,   rate: 0.40, base: 2902000 },
  ];
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    if (g <= b.upTo) {
      const floor = i === 0 ? 0 : bands[i - 1].upTo;
      return Math.round(b.base + (g - floor) * b.rate);
    }
  }
  return 0;
};

const gradeByCode = (code) => JOB_GRADES.find(g => g.code === code) || null;
const nextGrade = (code) => {
  const cur = gradeByCode(code);
  if (!cur) return null;
  return JOB_GRADES.find(g => g.level === cur.level + 1) || null;
};
const prevGrade = (code) => {
  const cur = gradeByCode(code);
  if (!cur) return null;
  return JOB_GRADES.find(g => g.level === cur.level - 1) || null;
};

// Contract status is derived on the client from the last manual state +
// the contract end date, so "Expiring Soon" and "Expired" update themselves
// without a scheduled function.
const deriveContractStatus = (emp) => {
  const manual = emp.contractStatus || 'active';
  if (manual === 'terminated' || manual === 'resigned') return manual;
  const end = toDateObj(emp.contractEnd);
  if (!end) return manual === 'renewed' ? 'active' : manual;
  const daysLeft = daysBetween(new Date(), end);
  if (daysLeft === null) return manual;
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= EXPIRING_SOON_WINDOW_DAYS) return 'expiring_soon';
  return 'active';
};

const CONTRACT_STATUS_CONFIG = {
  active:         { label: 'Active',         bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  expiring_soon:  { label: 'Expiring Soon',  bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  renewed:        { label: 'Renewed',        bg: '#DBEAFE', color: '#1D4ED8', dot: '#3B82F6' },
  expired:        { label: 'Expired',        bg: '#F3E8FF', color: '#6B21A8', dot: '#A855F7' },
  terminated:     { label: 'Terminated',     bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
  resigned:       { label: 'Resigned',       bg: '#E2E8F0', color: '#334155', dot: '#64748B' },
};
const ContractStatusBadge = ({ status }) => {
  const cfg = CONTRACT_STATUS_CONFIG[status] || CONTRACT_STATUS_CONFIG.active;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const LEAVE_STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  approved: { label: 'Approved', bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  rejected: { label: 'Rejected', bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};
const LeaveStatusBadge = ({ status }) => {
  const cfg = LEAVE_STATUS_CONFIG[status] || LEAVE_STATUS_CONFIG.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const EMP_STATUS_CONFIG = {
  active:     { bg: '#D1FAE5', color: '#065F46', dot: '#10B981', label: 'Active' },
  inactive:   { bg: '#F1F5F9', color: '#475569', dot: '#94A3B8', label: 'Inactive' },
};
const EmployeeStatusBadge = ({ status }) => {
  const cfg = EMP_STATUS_CONFIG[status] || EMP_STATUS_CONFIG.active;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};

const generateEmployeeCode = () => 'SH-' + Date.now().toString(36).toUpperCase().slice(-6);

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

// ─── Print / "download as PDF" window (browser Print → Save as PDF) ───────
const openPrintWindow = (title, bodyHtml) => {
  const win = window.open('', '_blank', 'width=850,height=1100');
  if (!win) { alert('Please allow pop-ups to download this document.'); return; }
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Georgia, 'Times New Roman', serif; color: #1A1A1A; padding: 48px 56px; line-height: 1.55; font-size: 13.5px; }
          h1 { font-size: 19px; margin: 0 0 2px; letter-spacing: 0.3px; }
          h2 { font-size: 14px; text-align: center; text-transform: uppercase; letter-spacing: 1px; margin: 26px 0 18px; border-top: 2px solid #1A3C5E; border-bottom: 2px solid #1A3C5E; padding: 10px 0; }
          h3 { font-size: 13px; margin: 20px 0 6px; color: #1A3C5E; }
          .muted { color: #5A7A9A; font-size: 12px; font-family: Arial, Helvetica, sans-serif; }
          .headRow { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7C3AED; padding-bottom: 14px; margin-bottom: 6px; font-family: Arial, Helvetica, sans-serif; }
          .logo { height: 52px; width: auto; margin-bottom: 6px; display: block; }
          .clause { margin: 0 0 12px; text-align: justify; }
          .clause-title { font-weight: 700; }
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
          <button onclick="window.print()" style="padding:10px 18px;background:#7C3AED;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:Arial,Helvetica,sans-serif;">Print / Save as PDF</button>
        </div>
      </body>
    </html>
  `);
  win.document.close();
};

// Absolute origin path so the logo resolves correctly inside the popup
// print window (which starts blank, not at the app's route).
const logoImgTag = () => `<img class="logo" src="${window.location.origin}${COMPANY_INFO.logo}" alt="${COMPANY_INFO.name} logo" onerror="this.style.display='none'" />`;

// ─── Standard Contract of Employment (Uganda Employment Act, 2006 reference) ──
// This is a general-purpose starting template, not a substitute for legal
// review. Fields pulled from the employee record are filled in automatically;
// blank underscored spaces are left for details this system doesn't capture
// (place of work, reporting line, bank account, special conditions) and for
// wet-ink signing.
const buildContractHtml = (employee) => {
  const grade = gradeByCode(employee.jobGradeCode);
  const name = employeeFullName(employee);
  const probationClause = employee.contractType === 'Probation'
    ? `<p class="clause">The Employee shall serve an initial probationary period of <span class="blank">${DEFAULT_PROBATION_MONTHS} months</span> from the Commencement Date, during which either party may terminate this Contract by giving <span class="blank">2 weeks'</span> written notice. The Employer may, by written agreement with the Employee, extend the probationary period once, provided the total probationary period does not exceed six (6) months, in line with the Employment Act, 2006.</p>`
    : '';

  return `
    <div class="headRow">
      <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email} · ${COMPANY_INFO.website}</p></div>
      <p class="muted">Ref: ${employee.employeeCode || '—'}<br/>Date: ${fmtDate(employee.contractStart || employee.hireDate)}</p>
    </div>
    <h2>Contract of Employment</h2>

    <p class="clause">THIS CONTRACT OF EMPLOYMENT is made between <strong>${COMPANY_INFO.name}</strong> of ${COMPANY_INFO.address} (<strong>"the Employer"</strong>) and <strong>${name}</strong> of <span class="blank">&nbsp;</span> (<strong>"the Employee"</strong>), and made in accordance with the Employment Act, 2006 of the Republic of Uganda and its subsidiary regulations.</p>

    <h3>1. Position &amp; Duties</h3>
    <p class="clause">The Employee is engaged as <strong>${employee.position || '[Job Title]'}</strong> in the <strong>${employee.department}</strong> department, Job Grade <strong>${grade ? `${grade.code} – ${grade.title}` : '[Grade]'}</strong>, reporting to <span class="blank">&nbsp;</span>. The Employee shall perform the duties of this position and any other reasonable duties assigned by the Employer from time to time.</p>

    <h3>2. Commencement &amp; Duration</h3>
    <p class="clause">This Contract commences on <strong>${fmtDate(employee.contractStart || employee.hireDate)}</strong> and is a <strong>${employee.contractType || '[Contract Type]'}</strong> contract${employee.contractEnd ? `, ending on <strong>${fmtDate(employee.contractEnd)}</strong> unless renewed or lawfully terminated earlier` : ', continuing until lawfully terminated by either party in accordance with Clause 6'}.</p>
    ${probationClause}

    <h3>3. Place of Work</h3>
    <p class="clause">The Employee's normal place of work shall be <span class="blank">&nbsp;</span>, or such other location as the Employer may reasonably require within the Republic of Uganda.</p>

    <h3>4. Hours of Work</h3>
    <p class="clause">The Employee shall work <span class="blank">48</span> hours per week, Monday to <span class="blank">Saturday</span>, from <span class="blank">&nbsp;</span> to <span class="blank">&nbsp;</span>, with a rest break as scheduled by the Employer, and at least one rest day per week, in accordance with the Employment Act, 2006.</p>

    <h3>5. Remuneration</h3>
    <p class="clause">The Employee shall be paid a gross monthly salary of <strong>${fmtMoney(grade?.baseSalary)}</strong> (Job Grade ${grade?.code || '—'}), payable monthly in arrears by bank transfer to account number <span class="blank">&nbsp;</span> at <span class="blank">&nbsp;</span> Bank, subject to statutory deductions including PAYE and NSSF contributions.</p>

    <h3>6. Leave Entitlement</h3>
    <p class="clause">The Employee is entitled to twenty-one (21) working days of paid annual leave for each period of twelve (12) months' continuous service, in addition to public holidays. Sick leave, maternity/paternity leave, and compassionate leave shall be granted in accordance with the Employment Act, 2006 and the Employer's leave policy.</p>

    <h3>7. Termination &amp; Notice</h3>
    <p class="clause">Either party may terminate this Contract by giving written notice according to the Employee's length of continuous service, or payment in lieu of notice:</p>
    <table class="ref">
      <thead><tr><th>Length of Continuous Service</th><th>Minimum Notice Period</th></tr></thead>
      <tbody>${NOTICE_PERIOD_TABLE.map(r => `<tr><td>${r.tenure}</td><td>${r.notice}</td></tr>`).join('')}</tbody>
    </table>
    <p class="clause">The Employer may summarily dismiss the Employee without notice for gross misconduct, as defined under the Employment Act, 2006.</p>

    <h3>8. Confidentiality &amp; Code of Conduct</h3>
    <p class="clause">The Employee shall not, during or after employment, disclose any confidential business, financial, or client information belonging to the Employer, and shall abide by the Employer's code of conduct and policies as amended from time to time.</p>

    <h3>9. Governing Law</h3>
    <p class="clause">This Contract is governed by the laws of the Republic of Uganda, including the Employment Act, 2006, the Employment (Standard Wage) Order, and the NSSF Act, as amended.</p>

    <h3>10. Special Conditions</h3>
    <p class="clause">${'&nbsp;'.repeat(1)}<span class="blank" style="min-width:100%;display:block;height:20px;margin-bottom:6px;">&nbsp;</span><span class="blank" style="min-width:100%;display:block;height:20px;">&nbsp;</span></p>

    <div class="sigblock">
      <div class="sigcol"><div class="sigline">Signed for and on behalf of the Employer &nbsp;&nbsp; Name: __________________ &nbsp; Date: __________</div></div>
      <div class="sigcol"><div class="sigline">Signed by the Employee &nbsp;&nbsp; Name: ${name} &nbsp; Date: __________</div></div>
    </div>
    <div class="sigblock">
      <div class="sigcol"><div class="sigline">Witness Name: __________________ &nbsp; Signature: __________</div></div>
      <div class="sigcol"></div>
    </div>

    <div class="footerNote">This document is a general-purpose contract template generated from HR system records. It is not a substitute for review by a qualified legal/HR advisor before use, and should be adapted to the specific role and any collective agreements in force.</div>
  `;
};

// ─── Standard Letter of Appointment ────────────────────────────────────────
const buildAppointmentLetterHtml = (employee) => {
  const grade = gradeByCode(employee.jobGradeCode);
  const name = employeeFullName(employee);
  const isProbation = employee.contractType === 'Probation';

  return `
    <div class="headRow">
      <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email} · ${COMPANY_INFO.website}</p></div>
      <p class="muted">Ref: ${employee.employeeCode || '—'}<br/>Date: ${fmtDate(employee.hireDate)}</p>
    </div>
    <h2>Letter of Appointment</h2>

    <p class="clause">Dear ${name},</p>
    <p class="clause"><strong>RE: OFFER OF APPOINTMENT — ${employee.position || '[Job Title]'}</strong></p>

    <p class="clause">We are pleased to confirm your appointment as <strong>${employee.position || '[Job Title]'}</strong> in the <strong>${employee.department}</strong> department of ${COMPANY_INFO.name}, on the following terms:</p>

    <h3>1. Commencement</h3>
    <p class="clause">Your employment shall commence on <strong>${fmtDate(employee.hireDate)}</strong>. You are required to report to <span class="blank">&nbsp;</span> (Line Manager) at our offices at <span class="blank">&nbsp;</span> on your first day at <span class="blank">&nbsp;</span> (time).</p>

    <h3>2. Nature of Appointment</h3>
    <p class="clause">This is a <strong>${employee.contractType || '[Contract Type]'}</strong> appointment${employee.contractEnd ? `, running until <strong>${fmtDate(employee.contractEnd)}</strong>` : ''}.${isProbation ? ` You will serve a probationary period of <span class="blank">${DEFAULT_PROBATION_MONTHS} months</span>, during which your performance will be reviewed before confirmation.` : ''}</p>

    <h3>3. Job Grade &amp; Remuneration</h3>
    <p class="clause">You are placed on Job Grade <strong>${grade?.code || '—'}</strong> (${grade?.title || '—'}), with a gross monthly salary of <strong>${fmtMoney(grade?.baseSalary)}</strong>, subject to statutory deductions (PAYE, NSSF), payable monthly by bank transfer to an account you shall provide to HR.</p>

    <h3>4. Documents Required on Reporting</h3>
    <p class="clause">Please bring the following on your first day: (a) a copy of your National ID / passport; (b) certified copies of academic and professional certificates; (c) two recent passport photographs; (d) bank account details; (e) NSSF number, if already registered; (f) contacts of two referees; (g) <span class="blank">&nbsp;</span>.</p>

    <h3>5. General</h3>
    <p class="clause">Your full terms of employment, including hours of work, leave entitlement, termination notice, and conduct obligations, are set out in the accompanying Contract of Employment, which forms part of this offer.</p>

    <p class="clause">Please indicate your acceptance of this offer by signing and returning a copy of this letter by <span class="blank">&nbsp;</span>. We look forward to welcoming you to the team.</p>

    <div class="sigblock">
      <div class="sigcol"><div class="sigline">For ${COMPANY_INFO.name} &nbsp;&nbsp; Name: __________________ &nbsp; Title: __________________</div></div>
      <div class="sigcol"><div class="sigline">Accepted by Employee &nbsp;&nbsp; Name: ${name} &nbsp; Date: __________</div></div>
    </div>

    <div class="footerNote">This is a general-purpose appointment letter template generated from HR system records. Review with a qualified HR/legal advisor before issuing, and attach the corresponding Contract of Employment.</div>
  `;
};

// ─── Digital Pay Slip (printable) ──────────────────────────────────────────
const buildPayslipHtml = (payslip) => `
  <div class="headRow">
    <div>${logoImgTag()}<h1>${COMPANY_INFO.name}</h1><p class="muted">${COMPANY_INFO.address}<br/>${COMPANY_INFO.phone} · ${COMPANY_INFO.email} · ${COMPANY_INFO.website}</p></div>
    <p class="muted">Period: ${payslip.period}<br/>Generated: ${fmtDateTime(payslip.generatedAt)}</p>
  </div>
  <h2>Digital Pay Slip</h2>
  <p class="clause"><strong>Employee:</strong> ${payslip.employeeName} &nbsp;&nbsp; <strong>Job Grade:</strong> ${payslip.jobGradeCode}</p>
  <table class="ref">
    <tbody>
      <tr><td>Gross Pay</td><td style="text-align:right">${fmtMoney(payslip.grossPay)}</td></tr>
      <tr><td>Allowances</td><td style="text-align:right">${fmtMoney(payslip.allowances)}</td></tr>
      <tr><td>PAYE Tax</td><td style="text-align:right">-${fmtMoney(payslip.taxAmount)}</td></tr>
      <tr><td>Other Deductions</td><td style="text-align:right">-${fmtMoney(payslip.otherDeductions)}</td></tr>
      <tr style="font-weight:700;font-size:14px;"><td>Net Pay</td><td style="text-align:right">${fmtMoney(payslip.netPay)}</td></tr>
    </tbody>
  </table>
  <p class="clause" style="font-size:11px;color:#9AAAB8;">Generated by ${payslip.generatedBy || 'HR System'}. This pay slip is issued electronically and is valid without signature.</p>
`;

// ─── Local-storage photo store (ID Card creator) ────────────────────────────
// Photos never leave the device: they're read via a file/camera input,
// downsized, and written straight to localStorage keyed by employee id.
const PHOTO_KEY = (employeeId) => `hr_photo_${employeeId}`;

const resizeImageFile = (file, maxDim = 320) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read the selected file.'));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not decode the selected image.'));
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const savePhotoLocal = (employeeId, dataUrl) => {
  try { window.localStorage.setItem(PHOTO_KEY(employeeId), dataUrl); return true; }
  catch { return false; }
};
const getPhotoLocal = (employeeId) => {
  try { return window.localStorage.getItem(PHOTO_KEY(employeeId)); }
  catch { return null; }
};
const removePhotoLocal = (employeeId) => {
  try { window.localStorage.removeItem(PHOTO_KEY(employeeId)); } catch { /* ignore */ }
};

const employeeFullName = (e) => `${e?.firstName || ''} ${e?.lastName || ''}`.trim();

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
        <div style={{ fontSize: 40, marginBottom: 14 }}>🧑‍💼</div>
        <h2 style={s.loginTitle}>HR Control Center</h2>
        <p style={s.loginSub}>Human Capital Management. Sign in with your HR credentials.</p>
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
        {email} is signed in but isn't provisioned for the HR Control Center. Ask the CEO admin to
        create an HR account or grant HR permissions from the CEO Control Center's User Provisioning tab.
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

const Avatar = ({ employeeId, name, size = 40 }) => {
  const [src, setSrc] = useState(null);
  useEffect(() => { setSrc(getPhotoLocal(employeeId)); }, [employeeId]);
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #E2E8F0' }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#EEF2FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.4, border: '1px solid #E2E8F0', flexShrink: 0 }}>
      {initials || '🙂'}
    </div>
  );
};

// ─── Employee Form Modal (Add / Edit) ────────────────────────────────────────
const EMPTY_EMPLOYEE = {
  firstName: '', lastName: '', email: '', phone: '', gender: GENDERS[0], dob: '',
  department: DEPARTMENTS[0], position: '', jobGradeCode: JOB_GRADES[0].code,
  contractType: CONTRACT_TYPES[0], hireDate: '', contractStart: '', contractEnd: '',
};

const EmployeeFormModal = ({ initial, onClose, onSave }) => {
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ? { ...EMPTY_EMPLOYEE, ...initial } : EMPTY_EMPLOYEE);
  const [photoPreview, setPhotoPreview] = useState(() => initial ? getPhotoLocal(initial.id) : null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const update = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      setPhotoDataUrl(dataUrl);
      setPhotoPreview(dataUrl);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('First and last name are required.'); return; }
    if (!form.hireDate) { setError('Hire date is required.'); return; }
    setSaving(true); setError('');
    const outcome = await onSave(form, photoDataUrl, isEdit);
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not save the employee record.');
    else onClose();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #7C3AED' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{isEdit ? 'Edit Employee' : 'New Employee Profile'}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Master directory · job grade · contract dates · ID photo</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={ms.body}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: '#F0F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #E2E8F0', flexShrink: 0 }}>
                {photoPreview ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 28 }}>🙂</span>}
              </div>
              <div>
                <input ref={fileRef} type="file" accept="image/*" capture="user" onChange={handlePhoto} style={{ display: 'none' }} />
                <button type="button" style={{ ...s.tab }} onClick={() => fileRef.current?.click()}>📷 Capture / Upload Photo</button>
                <p style={{ fontSize: 11, color: '#9AAAB8', margin: '6px 0 0' }}>Stored only in this browser's local storage — used for the ID card.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={cu.label}>First name</label><input style={s.loginInput} value={form.firstName} onChange={e => update('firstName', e.target.value)} disabled={saving} autoFocus /></div>
              <div><label style={cu.label}>Last name</label><input style={s.loginInput} value={form.lastName} onChange={e => update('lastName', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Email</label><input type="email" style={s.loginInput} value={form.email} onChange={e => update('email', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Phone</label><input style={s.loginInput} value={form.phone} onChange={e => update('phone', e.target.value)} disabled={saving} /></div>
              <div>
                <label style={cu.label}>Gender</label>
                <select style={cu.select} value={form.gender} onChange={e => update('gender', e.target.value)} disabled={saving}>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div><label style={cu.label}>Date of birth</label><input type="date" style={s.loginInput} value={form.dob} onChange={e => update('dob', e.target.value)} disabled={saving} /></div>

              <div>
                <label style={cu.label}>Department</label>
                <select style={cu.select} value={form.department} onChange={e => update('department', e.target.value)} disabled={saving}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div><label style={cu.label}>Position / Title</label><input style={s.loginInput} value={form.position} onChange={e => update('position', e.target.value)} disabled={saving} /></div>

              <div>
                <label style={cu.label}>Job grade</label>
                <select style={cu.select} value={form.jobGradeCode} onChange={e => update('jobGradeCode', e.target.value)} disabled={saving}>
                  {JOB_GRADES.map(g => <option key={g.code} value={g.code}>{g.code} · {g.title} ({fmtMoney(g.baseSalary)})</option>)}
                </select>
              </div>
              <div>
                <label style={cu.label}>Contract type</label>
                <select style={cu.select} value={form.contractType} onChange={e => update('contractType', e.target.value)} disabled={saving}>
                  {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div><label style={cu.label}>Hire date</label><input type="date" style={s.loginInput} value={form.hireDate} onChange={e => update('hireDate', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Contract start</label><input type="date" style={s.loginInput} value={form.contractStart} onChange={e => update('contractStart', e.target.value)} disabled={saving} /></div>
              <div><label style={cu.label}>Contract end (blank = open-ended)</label><input type="date" style={s.loginInput} value={form.contractEnd} onChange={e => update('contractEnd', e.target.value)} disabled={saving} /></div>
            </div>

            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#7C3AED', color: '#fff' }} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '➕ Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── ID Card Modal ────────────────────────────────────────────────────────────
// Loads an image and resolves to null on failure instead of rejecting, so a
// missing logo/photo doesn't block the rest of the card from rendering.
const loadImageSafe = (src) => new Promise((resolve) => {
  if (!src) { resolve(null); return; }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

// ID cards are valid for ID_CARD_VALIDITY_YEARS from issue date, or until the
// contract end date if that comes sooner.
const computeIdExpiry = (employee) => {
  const issued = new Date();
  const byValidity = new Date(issued);
  byValidity.setFullYear(byValidity.getFullYear() + ID_CARD_VALIDITY_YEARS);
  const contractEnd = toDateObj(employee.contractEnd);
  return (contractEnd && contractEnd < byValidity) ? contractEnd : byValidity;
};

const IdCardModal = ({ employee, onClose }) => {
  const canvasRef = useRef(null);
  const grade = gradeByCode(employee.jobGradeCode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = 440, H = 700;
    canvas.width = W; canvas.height = H;
    const cx = W / 2;

    const expiry = computeIdExpiry(employee);
    const qrPayload = [
      `${COMPANY_INFO.name} — Employee ID`,
      `S/N: ${employee.employeeCode || '—'}`,
      `Name: ${employeeFullName(employee)}`,
      `Expires: ${expiry.toLocaleDateString('en-UG')}`,
      COMPANY_INFO.website,
    ].join('\n');

    Promise.all([
      loadImageSafe(getPhotoLocal(employee.id)),
      loadImageSafe(COMPANY_INFO.logo),
      QRCode.toDataURL(qrPayload, { width: 300, margin: 1, color: { dark: '#1A3C5E', light: '#FFFFFF' } })
        .then(loadImageSafe).catch(() => null),
    ]).then(([photoImg, logoImg, qrImg]) => {
      if (cancelled) return;

      // Outer gradient frame + inset white card
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1A3C5E'); grad.addColorStop(1, '#7C3AED');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.fillRect(14, 14, W - 28, H - 28);

      // Header band (logo + company name, centered)
      ctx.fillStyle = '#1A3C5E'; ctx.fillRect(14, 14, W - 28, 150);
      if (logoImg) ctx.drawImage(logoImg, cx - 24, 26, 48, 48);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.font = 'bold 19px sans-serif';
      ctx.fillText(COMPANY_INFO.name.toUpperCase(), cx, logoImg ? 100 : 88);
      ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText('EMPLOYEE IDENTIFICATION CARD', cx, logoImg ? 120 : 108);

      // Photo (circular)
      const pcy = 259, pr = 78;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, pcy, pr, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      ctx.fillStyle = '#F0F4F8'; ctx.fillRect(cx - pr, pcy - pr, pr * 2, pr * 2);
      if (photoImg) ctx.drawImage(photoImg, cx - pr, pcy - pr, pr * 2, pr * 2);
      ctx.restore();
      ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, pcy, pr, 0, Math.PI * 2); ctx.stroke();

      // Name / Position / Department (stacked, centered)
      ctx.fillStyle = '#1A3C5E'; ctx.font = 'bold 20px sans-serif';
      ctx.fillText(employeeFullName(employee), cx, pcy + pr + 34);
      ctx.fillStyle = '#7C3AED'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText(employee.position || '—', cx, pcy + pr + 56);
      ctx.fillStyle = '#7A8A9A'; ctx.font = '12px sans-serif';
      ctx.fillText(`${employee.department || '—'}${grade ? ' · ' + grade.code : ''}`, cx, pcy + pr + 76);

      // Divider
      ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(40, pcy + pr + 97); ctx.lineTo(W - 40, pcy + pr + 97); ctx.stroke();

      // QR code (bottom): Employee S/N, ID expiry date, company website
      const qrSize = 130, qrY = pcy + pr + 113;
      if (qrImg) ctx.drawImage(qrImg, cx - qrSize / 2, qrY, qrSize, qrSize);
      ctx.fillStyle = '#1A3C5E'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`S/N: ${employee.employeeCode || '—'}`, cx, qrY + qrSize + 20);
      ctx.fillStyle = '#9AAAB8'; ctx.font = '11px sans-serif';
      ctx.fillText(`Valid until ${expiry.toLocaleDateString('en-UG')}`, cx, qrY + qrSize + 36);
      ctx.fillStyle = '#7C3AED'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(COMPANY_INFO.website.replace('https://', ''), cx, qrY + qrSize + 52);

      ctx.textAlign = 'left';
      setReady(true);
    });

    return () => { cancelled = true; };
  }, [employee]);

  const download = () => {
    const canvas = canvasRef.current;
    const a = document.createElement('a');
    a.download = `${employee.employeeCode || 'employee'}-id-card.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #7C3AED' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Employee ID Card</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{employeeFullName(employee)}</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <div style={{ ...ms.body, textAlign: 'center' }}>
          <canvas ref={canvasRef} style={{ width: '100%', maxWidth: 320, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }} />
          {!getPhotoLocal(employee.id) && (
            <p style={{ fontSize: 12, color: '#B45309', marginTop: 10 }}>No photo on this device yet — capture one from the employee's Edit form to complete the card.</p>
          )}
        </div>
        <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
          <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Close</button>
          <button style={{ ...ms.actionBtn, background: '#7C3AED', color: '#fff' }} onClick={download} disabled={!ready}>⬇ Download PNG</button>
        </div>
      </div>
    </div>
  );
};

// ─── Contract Action Modal (Renew / Terminate / Resign) ─────────────────────
const ContractActionModal = ({ employee, action, onClose, onConfirm }) => {
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEndDate, setNewEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const titleMap = { renew: 'Renew Contract', terminate: 'Terminate Contract', resign: 'Log Resignation' };
  const accentMap = { renew: '#3B82F6', terminate: '#EF4444', resign: '#64748B' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (action === 'renew' && !newEndDate) { setError('Please set the new contract end date.'); return; }
    if (action !== 'renew' && !reason.trim()) { setError('Please give a reason for the record.'); return; }
    setSaving(true); setError('');
    const outcome = await onConfirm({ action, effectiveDate, newEndDate, reason });
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not save this change.');
    else onClose();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: `4px solid ${accentMap[action]}` }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{titleMap[action]}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{employeeFullName(employee)} · {employee.employeeCode}</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={ms.body}>
            <label style={cu.label}>Effective date</label>
            <input type="date" style={s.loginInput} value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} disabled={saving} />
            {action === 'renew' && (
              <>
                <label style={{ ...cu.label, marginTop: 12 }}>New contract end date</label>
                <input type="date" style={s.loginInput} value={newEndDate} onChange={e => setNewEndDate(e.target.value)} disabled={saving} />
              </>
            )}
            {action !== 'renew' && (
              <>
                <label style={{ ...cu.label, marginTop: 12 }}>Reason / notes</label>
                <textarea style={{ ...s.loginInput, minHeight: 80, resize: 'vertical' }} value={reason} onChange={e => setReason(e.target.value)} disabled={saving} />
              </>
            )}
            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: accentMap[action], color: '#fff' }} disabled={saving}>
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Employee Profile Modal (details, history, attendance) ──────────────────
const EmployeeProfileModal = ({ employee, attendanceRows, loadingAttendance, onClose, onEdit, onIdCard, onDownloadContract, onDownloadAppointmentLetter }) => {
  const grade = gradeByCode(employee.jobGradeCode);
  const status = deriveContractStatus(employee);
  const history = [...(employee.employmentHistory || [])].sort((a, b) => (toDateObj(b.date) || 0) - (toDateObj(a.date) || 0));

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #7C3AED' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar employeeId={employee.id} name={employeeFullName(employee)} size={48} />
            <div>
              <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{employeeFullName(employee)}</h3>
              <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{employee.employeeCode} · {employee.department} · {employee.position || '—'}</p>
            </div>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>

        <div style={{ ...ms.actionBar, borderTop: 'none', flexWrap: 'wrap' }}>
          <button style={{ ...ms.actionBtn, background: '#EFF6FF', color: '#1D4ED8' }} onClick={() => onEdit(employee)}>✎ Edit Profile</button>
          <button style={{ ...ms.actionBtn, background: '#F3E8FF', color: '#7C3AED' }} onClick={() => onIdCard(employee)}>🪪 ID Card</button>
          <button style={{ ...ms.actionBtn, background: '#ECFDF5', color: '#065F46' }} onClick={() => onDownloadContract(employee)}>📄 Download Contract</button>
          <button style={{ ...ms.actionBtn, background: '#FFF7ED', color: '#9A3412' }} onClick={() => onDownloadAppointmentLetter(employee)}>📄 Download Appointment Letter</button>
        </div>

        <div style={ms.body}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
            <div style={cu.credRow}><span style={cu.credLabel}>Contract Status</span><ContractStatusBadge status={status} /></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Job Grade</span><span style={cu.credVal}>{grade ? `${grade.code} · ${grade.title}` : '—'}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Base Salary</span><span style={cu.credVal}>{fmtMoney(grade?.baseSalary)}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Contract Type</span><span style={cu.credVal}>{employee.contractType || '—'}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Hire Date</span><span style={cu.credVal}>{fmtDate(employee.hireDate)}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Contract Ends</span><span style={cu.credVal}>{employee.contractEnd ? fmtDate(employee.contractEnd) : 'Open-ended'}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Email</span><span style={cu.credVal}>{employee.email || '—'}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Phone</span><span style={cu.credVal}>{employee.phone || '—'}</span></div>
            <div style={cu.credRow}><span style={cu.credLabel}>Leave Balance (Annual)</span><span style={cu.credVal}>{(employee.leaveBalance?.Annual ?? DEFAULT_LEAVE_BALANCES.Annual)} days</span></div>
          </div>

          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1A3C5E', margin: '0 0 10px' }}>Employment History</h4>
          {history.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9AAAB8' }}>No history recorded yet.</p>
          ) : (
            <div style={{ marginBottom: 22 }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #F0F4F8' }}>
                  <div style={{ width: 90, flexShrink: 0, fontSize: 11.5, color: '#9AAAB8' }}>{fmtDate(h.date)}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A3C5E' }}>{h.event}</div>
                    {h.note && <div style={{ fontSize: 12.5, color: '#5A7A9A' }}>{h.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1A3C5E', margin: '0 0 10px' }}>
            Attendance (read-only — synced from the phone fingerprint check-in module)
          </h4>
          {loadingAttendance ? (
            <p style={{ fontSize: 13, color: '#9AAAB8' }}>Loading attendance…</p>
          ) : attendanceRows.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9AAAB8' }}>No attendance events found for this employee yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={rm.th}>Date</th><th style={rm.th}>Clock In</th><th style={rm.th}>Clock Out</th><th style={rm.th}>Method</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
                    <td style={{ padding: '8px 12px' }}>{fmtDate(r.date)}</td>
                    <td style={{ padding: '8px 12px' }}>{r.clockIn || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{r.clockOut || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>{r.method || 'Fingerprint'}</td>
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

// ─── Leave Request Modal ─────────────────────────────────────────────────────
const LeaveRequestModal = ({ employees, onClose, onSubmit }) => {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [type, setType] = useState(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const days = useMemo(() => {
    const d = daysBetween(startDate, endDate);
    return d === null ? 0 : d + 1;
  }, [startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId) { setError('Select an employee.'); return; }
    if (!startDate || !endDate || days <= 0) { setError('Pick a valid date range.'); return; }
    setSaving(true); setError('');
    const outcome = await onSubmit({ employeeId, type, startDate, endDate, days, reason });
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not submit the request.');
    else onClose();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #7C3AED' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Leave Request</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Logged on behalf of the employee for HR review.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={ms.body}>
            <label style={cu.label}>Employee</label>
            <select style={cu.select} value={employeeId} onChange={e => setEmployeeId(e.target.value)} disabled={saving}>
              {employees.map(e => <option key={e.id} value={e.id}>{employeeFullName(e)} · {e.employeeCode}</option>)}
            </select>

            <label style={{ ...cu.label, marginTop: 12 }}>Leave type</label>
            <select style={cu.select} value={type} onChange={e => setType(e.target.value)} disabled={saving}>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1 }}><label style={cu.label}>Start date</label><input type="date" style={s.loginInput} value={startDate} onChange={e => setStartDate(e.target.value)} disabled={saving} /></div>
              <div style={{ flex: 1 }}><label style={cu.label}>End date</label><input type="date" style={s.loginInput} value={endDate} onChange={e => setEndDate(e.target.value)} disabled={saving} /></div>
            </div>
            <p style={{ fontSize: 12, color: '#5A7A9A', margin: '8px 0 0' }}>{days > 0 ? `${days} day(s) requested` : ''}</p>

            <label style={{ ...cu.label, marginTop: 12 }}>Reason (optional)</label>
            <textarea style={{ ...s.loginInput, minHeight: 70, resize: 'vertical' }} value={reason} onChange={e => setReason(e.target.value)} disabled={saving} />

            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#7C3AED', color: '#fff' }} disabled={saving}>{saving ? 'Submitting…' : 'Submit Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Payslip Modal ────────────────────────────────────────────────────────────
const PayslipModal = ({ payslip, onClose }) => (
  <div style={ms.overlay} onClick={onClose}>
    <div style={{ ...ms.modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
      <div style={{ ...ms.header, borderTop: '4px solid #059669' }}>
        <div>
          <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>Digital Pay Slip</h3>
          <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>{payslip.employeeName} · {payslip.period}</p>
        </div>
        <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
      </div>
      <div style={ms.body}>
        <div style={cu.credRow}><span style={cu.credLabel}>Job Grade</span><span style={cu.credVal}>{payslip.jobGradeCode}</span></div>
        <div style={cu.credRow}><span style={cu.credLabel}>Gross Pay</span><span style={cu.credVal}>{fmtMoney(payslip.grossPay)}</span></div>
        <div style={cu.credRow}><span style={cu.credLabel}>Allowances</span><span style={cu.credVal}>{fmtMoney(payslip.allowances)}</span></div>
        <div style={cu.credRow}><span style={cu.credLabel}>PAYE Tax</span><span style={{ ...cu.credVal, color: '#B91C1C' }}>-{fmtMoney(payslip.taxAmount)}</span></div>
        <div style={cu.credRow}><span style={cu.credLabel}>Other Deductions</span><span style={{ ...cu.credVal, color: '#B91C1C' }}>-{fmtMoney(payslip.otherDeductions)}</span></div>
        <div style={{ ...cu.credRow, borderBottom: 'none', paddingTop: 14 }}>
          <span style={cu.credLabel}>Net Pay</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>{fmtMoney(payslip.netPay)}</span>
        </div>
        <p style={{ fontSize: 11, color: '#9AAAB8', marginTop: 14 }}>Generated {fmtDateTime(payslip.generatedAt)} by {payslip.generatedBy}</p>
      </div>
      <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
        <button style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Close</button>
        <button style={{ ...ms.actionBtn, background: '#059669', color: '#fff' }} onClick={() => openPrintWindow(`Pay Slip — ${payslip.employeeName} — ${payslip.period}`, buildPayslipHtml(payslip))}>⬇ Download PDF</button>
      </div>
    </div>
  </div>
);

// ─── Performance Review Modal ────────────────────────────────────────────────
const PerformanceReviewModal = ({ employees, onClose, onSubmit }) => {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [scores, setScores] = useState(() => PERFORMANCE_CRITERIA.reduce((a, c) => { a[c.key] = 3; return a; }, {}));
  const [comments, setComments] = useState('');
  const [recommendation, setRecommendation] = useState('None');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const overall = useMemo(() => {
    const vals = Object.values(scores);
    return vals.length ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length) : 0;
  }, [scores]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId) { setError('Select an employee.'); return; }
    setSaving(true); setError('');
    const outcome = await onSubmit({ employeeId, period, scores, overallScore: overall, comments, recommendation });
    setSaving(false);
    if (!outcome.success) setError(outcome.error || 'Could not save this review.');
    else onClose();
  };

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={{ ...ms.modal, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: '4px solid #7C3AED' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>New Performance Review</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>Score matrix drives the promote / demote recommendation.</p>
          </div>
          <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={ms.body}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 2 }}>
                <label style={cu.label}>Employee</label>
                <select style={cu.select} value={employeeId} onChange={e => setEmployeeId(e.target.value)} disabled={saving}>
                  {employees.map(e => <option key={e.id} value={e.id}>{employeeFullName(e)} · {e.employeeCode}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={cu.label}>Period</label>
                <input type="month" style={s.loginInput} value={period} onChange={e => setPeriod(e.target.value)} disabled={saving} />
              </div>
            </div>

            <h4 style={{ fontSize: 12.5, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, margin: '18px 0 8px' }}>Score Matrix (1 – 5)</h4>
            {PERFORMANCE_CRITERIA.map(c => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 13, color: '#1A3C5E' }}>{c.label}</span>
                <input type="range" min="1" max="5" step="1" value={scores[c.key]} onChange={e => setScores(prev => ({ ...prev, [c.key]: Number(e.target.value) }))} disabled={saving} style={{ flex: 2 }} />
                <span style={{ width: 20, textAlign: 'center', fontWeight: 700, color: '#7C3AED' }}>{scores[c.key]}</span>
              </div>
            ))}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A3C5E', margin: '10px 0 0' }}>Overall score: {overall.toFixed(1)} / 5</p>

            <label style={{ ...cu.label, marginTop: 14 }}>Comments</label>
            <textarea style={{ ...s.loginInput, minHeight: 70, resize: 'vertical' }} value={comments} onChange={e => setComments(e.target.value)} disabled={saving} />

            <label style={{ ...cu.label, marginTop: 12 }}>Recommendation</label>
            <select style={cu.select} value={recommendation} onChange={e => setRecommendation(e.target.value)} disabled={saving}>
              {RECOMMENDATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {error && <p style={s.loginErr}>{error}</p>}
          </div>
          <div style={{ ...ms.actionBar, borderTop: '1px solid #E2E8F0', borderBottom: 'none', justifyContent: 'flex-end' }}>
            <button type="button" style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#5A7A9A' }} onClick={onClose}>Cancel</button>
            <button type="submit" style={{ ...ms.actionBtn, background: '#7C3AED', color: '#fff' }} disabled={saving}>{saving ? 'Saving…' : '💾 Save Review'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ─── Main Component ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const HrManager = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [profile, setProfile] = useState(null);       // teamUsers/{uid}
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');

  // Employees
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeesError, setEmployeesError] = useState(null);
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('All');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);
  const [idCardTarget, setIdCardTarget] = useState(null);
  const [busyEmployeeId, setBusyEmployeeId] = useState(null);

  // Attendance (read-only, for the profile modal)
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Contracts
  const [contractFilter, setContractFilter] = useState('All');
  const [contractAction, setContractAction] = useState(null); // { employee, action }

  // Leave
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeave, setLoadingLeave] = useState(true);
  const [leaveError, setLeaveError] = useState(null);
  const [leaveTab, setLeaveTab] = useState('pending');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [busyLeaveId, setBusyLeaveId] = useState(null);

  // Payroll
  const [payslips, setPayslips] = useState([]);
  const [loadingPayslips, setLoadingPayslips] = useState(true);
  const [payslipsError, setPayslipsError] = useState(null);
  const [payrollPeriod, setPayrollPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [runningPayroll, setRunningPayroll] = useState(false);
  const [payslipTarget, setPayslipTarget] = useState(null);

  // Performance
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [busyReviewId, setBusyReviewId] = useState(null);

  // Idle session
  const [idleWarning, setIdleWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());

  const isCeo = !!user && user.email?.toLowerCase() === CEO_EMAIL;
  const hrPerms = profile?.permissions?.hr || {};
  const isHrStaff = !!profile && profile.status !== 'suspended' && (profile.department === 'HR' || Object.values(hrPerms).some(Boolean));
  const isAuthorized = isCeo || isHrStaff;
  const canWrite = isCeo || !!hrPerms.write || profile?.department === 'HR';
  const canEdit = isCeo || !!hrPerms.edit || profile?.department === 'HR';
  const canDelete = isCeo || !!hrPerms.delete;
  const canApprove = isCeo || !!hrPerms.approve || profile?.department === 'HR';

  // ── Auth listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // ── HR profile listener (provisioned by CEO Control Center) ───────────
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

  // ── Employees listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) { setEmployees([]); return; }
    setLoadingEmployees(true);
    const unsub = onSnapshot(
      collection(db, 'employees'),
      (snap) => { setEmployeesError(null); setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingEmployees(false); },
      (err) => {
        console.error('employees listen error:', err);
        setEmployeesError(err.code === 'permission-denied' ? 'Permission denied reading employee records.' : 'Could not load employees: ' + err.message);
        setLoadingEmployees(false);
      }
    );
    return unsub;
  }, [isAuthorized]);

  // ── Leave requests listener ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) { setLeaveRequests([]); return; }
    setLoadingLeave(true);
    const unsub = onSnapshot(
      query(collection(db, 'leaveRequests'), orderBy('requestedAt', 'desc'), limit(300)),
      (snap) => { setLeaveError(null); setLeaveRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingLeave(false); },
      (err) => {
        console.error('leaveRequests listen error:', err);
        setLeaveError(err.code === 'permission-denied' ? 'Permission denied reading leave requests.' : 'Could not load leave requests: ' + err.message);
        setLoadingLeave(false);
      }
    );
    return unsub;
  }, [isAuthorized]);

  // ── Payslips listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) { setPayslips([]); return; }
    setLoadingPayslips(true);
    const unsub = onSnapshot(
      query(collection(db, 'payslips'), orderBy('generatedAt', 'desc'), limit(300)),
      (snap) => { setPayslipsError(null); setPayslips(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingPayslips(false); },
      (err) => {
        console.error('payslips listen error:', err);
        setPayslipsError(err.code === 'permission-denied' ? 'Permission denied reading pay slips.' : 'Could not load pay slips: ' + err.message);
        setLoadingPayslips(false);
      }
    );
    return unsub;
  }, [isAuthorized]);

  // ── Performance reviews listener ───────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) { setReviews([]); return; }
    setLoadingReviews(true);
    const unsub = onSnapshot(
      query(collection(db, 'performanceReviews'), orderBy('reviewedAt', 'desc'), limit(300)),
      (snap) => { setReviewsError(null); setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingReviews(false); },
      (err) => {
        console.error('performanceReviews listen error:', err);
        setReviewsError(err.code === 'permission-denied' ? 'Permission denied reading performance reviews.' : 'Could not load reviews: ' + err.message);
        setLoadingReviews(false);
      }
    );
    return unsub;
  }, [isAuthorized]);

  // ── Attendance for the open profile (read-only, written elsewhere) ─────
  useEffect(() => {
    if (!profileTarget) { setAttendanceRows([]); return; }
    setLoadingAttendance(true);
    const unsub = onSnapshot(
      query(collection(db, 'attendance'), where('employeeId', '==', profileTarget.id), orderBy('date', 'desc'), limit(10)),
      (snap) => { setAttendanceRows(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoadingAttendance(false); },
      (err) => { console.warn('attendance listen error (non-fatal):', err.message); setAttendanceRows([]); setLoadingAttendance(false); }
    );
    return unsub;
  }, [profileTarget]);

  // ── Idle auto sign-out ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) return;
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
  }, [isAuthorized]);

  const handleLogout = useCallback(async () => {
    const confirmed = window.confirm('Sign out of the HR Control Center?');
    if (!confirmed) return;
    setLoggingOut(true);
    try {
      setEmployees([]); setLeaveRequests([]); setPayslips([]); setReviews([]);
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

  // ── Employee CRUD ──────────────────────────────────────────────────────
  const handleSaveEmployee = useCallback(async (form, photoDataUrl, isEdit) => {
    try {
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      if (isEdit) {
        const before = employees.find(e => e.id === form.id);
        const gradeChanged = before && before.jobGradeCode !== form.jobGradeCode;
        const historyAdd = gradeChanged
          ? [{ date: new Date().toISOString().slice(0, 10), event: 'Job grade updated', note: `${before.jobGradeCode} → ${form.jobGradeCode}` }]
          : [];
        await updateDoc(doc(db, 'employees', form.id), {
          firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(),
          phone: form.phone, gender: form.gender, dob: form.dob, department: form.department,
          position: form.position, jobGradeCode: form.jobGradeCode, contractType: form.contractType,
          hireDate: form.hireDate, contractStart: form.contractStart, contractEnd: form.contractEnd || null,
          ...(historyAdd.length ? { employmentHistory: [...(before.employmentHistory || []), ...historyAdd] } : {}),
        });
        if (photoDataUrl) savePhotoLocal(form.id, photoDataUrl);
        await logAudit('Updated employee profile', name);
      } else {
        const employeeCode = generateEmployeeCode();
        const ref = doc(collection(db, 'employees'));
        await setDoc(ref, {
          employeeCode, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(),
          phone: form.phone, gender: form.gender, dob: form.dob, department: form.department, position: form.position,
          jobGradeCode: form.jobGradeCode, contractType: form.contractType, hireDate: form.hireDate,
          contractStart: form.contractStart || form.hireDate, contractEnd: form.contractEnd || null,
          contractStatus: 'active', status: 'active',
          leaveBalance: { ...DEFAULT_LEAVE_BALANCES }, leaveUsed: { Annual: 0, Sick: 0, Compassionate: 0 },
          employmentHistory: [{ date: form.hireDate, event: 'Hired', note: `${form.position || form.department} · ${form.jobGradeCode}` }],
          createdAt: serverTimestamp(), createdBy: auth.currentUser?.email || 'unknown',
        });
        if (photoDataUrl) savePhotoLocal(ref.id, photoDataUrl);
        await logAudit('Created employee profile', name, employeeCode);
      }
      return { success: true };
    } catch (err) {
      console.error('Save employee error:', err);
      return { success: false, error: err.message };
    }
  }, [employees, logAudit]);

  const handleDeleteEmployee = useCallback(async (employee) => {
    const confirmed = window.confirm(`Permanently delete ${employeeFullName(employee)}'s profile? This cannot be undone.`);
    if (!confirmed) return;
    setBusyEmployeeId(employee.id);
    try {
      await deleteDoc(doc(db, 'employees', employee.id));
      removePhotoLocal(employee.id);
      await logAudit('Deleted employee profile', employeeFullName(employee));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setBusyEmployeeId(null);
    }
  }, [logAudit]);

  // ── Contract lifecycle actions ─────────────────────────────────────────
  const handleContractAction = useCallback(async ({ action, effectiveDate, newEndDate, reason }) => {
    const employee = contractAction?.employee;
    if (!employee) return { success: false, error: 'No employee selected.' };
    try {
      const eventLabel = { renew: 'Contract Renewed', terminate: 'Contract Terminated', resign: 'Resigned' }[action];
      const statusValue = { renew: 'active', terminate: 'terminated', resign: 'resigned' }[action];
      const patch = {
        contractStatus: statusValue,
        employmentHistory: [
          ...(employee.employmentHistory || []),
          { date: effectiveDate, event: eventLabel, note: action === 'renew' ? `New end date: ${fmtDate(newEndDate)}` : reason },
        ],
      };
      if (action === 'renew') { patch.contractEnd = newEndDate; }
      if (action === 'terminate' || action === 'resign') { patch.status = 'inactive'; }
      await updateDoc(doc(db, 'employees', employee.id), patch);
      await logAudit(eventLabel, employeeFullName(employee), reason || `Effective ${fmtDate(effectiveDate)}`);
      return { success: true };
    } catch (err) {
      console.error('Contract action error:', err);
      return { success: false, error: err.message };
    }
  }, [contractAction, logAudit]);

  // ── Leave actions ──────────────────────────────────────────────────────
  const handleSubmitLeave = useCallback(async ({ employeeId, type, startDate, endDate, days, reason }) => {
    try {
      const employee = employees.find(e => e.id === employeeId);
      await addDoc(collection(db, 'leaveRequests'), {
        employeeId, employeeName: employee ? employeeFullName(employee) : 'Unknown',
        type, startDate, endDate, days, reason, status: 'pending',
        requestedAt: serverTimestamp(), requestedBy: auth.currentUser?.email || 'unknown',
      });
      await logAudit('Submitted leave request', employee ? employeeFullName(employee) : employeeId, `${type} · ${days} day(s)`);
      return { success: true };
    } catch (err) {
      console.error('Submit leave error:', err);
      return { success: false, error: err.message };
    }
  }, [employees, logAudit]);

  const decideLeave = useCallback(async (request, decision) => {
    setBusyLeaveId(request.id);
    try {
      await updateDoc(doc(db, 'leaveRequests', request.id), {
        status: decision, decidedAt: serverTimestamp(), decidedBy: auth.currentUser?.email || 'unknown',
      });
      if (decision === 'approved' && request.type in DEFAULT_LEAVE_BALANCES) {
        const employee = employees.find(e => e.id === request.employeeId);
        if (employee) {
          const balances = { ...DEFAULT_LEAVE_BALANCES, ...(employee.leaveBalance || {}) };
          const used = { Annual: 0, Sick: 0, Compassionate: 0, ...(employee.leaveUsed || {}) };
          balances[request.type] = Math.max(0, (balances[request.type] ?? 0) - request.days);
          used[request.type] = (used[request.type] ?? 0) + request.days;
          await updateDoc(doc(db, 'employees', employee.id), { leaveBalance: balances, leaveUsed: used });
        }
      }
      await logAudit(decision === 'approved' ? 'Approved leave request' : 'Rejected leave request', request.employeeName, `${request.type} · ${request.days} day(s)`);
    } catch (err) {
      alert('Could not update the leave request: ' + err.message);
    } finally {
      setBusyLeaveId(null);
    }
  }, [employees, logAudit]);

  // ── Payroll engine ─────────────────────────────────────────────────────
  const runPayroll = useCallback(async () => {
    const activeEmployees = employees.filter(e => (e.status || 'active') === 'active');
    if (activeEmployees.length === 0) { alert('No active employees to run payroll for.'); return; }
    const already = payslips.some(p => p.period === payrollPeriod);
    if (already && !window.confirm(`Pay slips already exist for ${payrollPeriod}. Run again and add more?`)) return;
    setRunningPayroll(true);
    try {
      for (const emp of activeEmployees) {
        const grade = gradeByCode(emp.jobGradeCode);
        const gross = grade?.baseSalary || 0;
        const allowances = Math.round(gross * 0.05); // transport/airtime allowance, illustrative
        const tax = computeTax(gross + allowances);
        const otherDeductions = Math.round(gross * 0.05); // NSSF-style 5% employee contribution, illustrative
        const netPay = gross + allowances - tax - otherDeductions;
        await addDoc(collection(db, 'payslips'), {
          employeeId: emp.id, employeeName: employeeFullName(emp), jobGradeCode: emp.jobGradeCode,
          period: payrollPeriod, grossPay: gross, allowances, taxAmount: tax, otherDeductions, netPay,
          generatedAt: serverTimestamp(), generatedBy: auth.currentUser?.email || 'unknown',
        });
      }
      await logAudit('Ran payroll', payrollPeriod, `${activeEmployees.length} pay slip(s) generated`);
    } catch (err) {
      alert('Payroll run failed: ' + err.message);
    } finally {
      setRunningPayroll(false);
    }
  }, [employees, payslips, payrollPeriod, logAudit]);

  // ── Performance actions ────────────────────────────────────────────────
  const handleSubmitReview = useCallback(async ({ employeeId, period, scores, overallScore, comments, recommendation }) => {
    try {
      const employee = employees.find(e => e.id === employeeId);
      await addDoc(collection(db, 'performanceReviews'), {
        employeeId, employeeName: employee ? employeeFullName(employee) : 'Unknown',
        period, scores, overallScore, comments, recommendation,
        actioned: false, actionTaken: null,
        reviewedAt: serverTimestamp(), reviewedBy: auth.currentUser?.email || 'unknown',
      });
      await logAudit('Logged performance review', employee ? employeeFullName(employee) : employeeId, `${period} · score ${overallScore.toFixed(1)}`);
      return { success: true };
    } catch (err) {
      console.error('Submit review error:', err);
      return { success: false, error: err.message };
    }
  }, [employees, logAudit]);

  const actionReview = useCallback(async (review, action) => {
    const employee = employees.find(e => e.id === review.employeeId);
    if (!employee) { alert('Employee record not found.'); return; }
    const target = action === 'promote' ? nextGrade(employee.jobGradeCode) : prevGrade(employee.jobGradeCode);
    if (!target) { alert(action === 'promote' ? 'Employee is already at the top grade.' : 'Employee is already at the entry grade.'); return; }
    const confirmed = window.confirm(
      `${action === 'promote' ? 'Promote' : 'Demote'} ${employeeFullName(employee)} from ${employee.jobGradeCode} to ${target.code} (${target.title}, ${fmtMoney(target.baseSalary)})?`
    );
    if (!confirmed) return;
    setBusyReviewId(review.id);
    try {
      await updateDoc(doc(db, 'employees', employee.id), {
        jobGradeCode: target.code,
        employmentHistory: [
          ...(employee.employmentHistory || []),
          { date: new Date().toISOString().slice(0, 10), event: action === 'promote' ? 'Promoted' : 'Demoted', note: `${employee.jobGradeCode} → ${target.code} (review ${review.period})` },
        ],
      });
      await updateDoc(doc(db, 'performanceReviews', review.id), {
        actioned: true, actionTaken: action === 'promote' ? 'Promote' : 'Demote',
      });
      await logAudit(action === 'promote' ? 'Promoted employee' : 'Demoted employee', employeeFullName(employee), `${target.code} · ${fmtMoney(target.baseSalary)}`);
    } catch (err) {
      alert('Could not apply this action: ' + err.message);
    } finally {
      setBusyReviewId(null);
    }
  }, [employees, logAudit]);

  // ── Derived data ────────────────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return employees.filter(e => {
      const matchesQ = !q || employeeFullName(e).toLowerCase().includes(q) || e.employeeCode?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q);
      const matchesDept = empDeptFilter === 'All' || e.department === empDeptFilter;
      return matchesQ && matchesDept;
    });
  }, [employees, empSearch, empDeptFilter]);

  const employeesWithStatus = useMemo(() => employees.map(e => ({ ...e, _status: deriveContractStatus(e) })), [employees]);
  const expiringSoon = useMemo(() => employeesWithStatus.filter(e => e._status === 'expiring_soon'), [employeesWithStatus]);
  const contractCounts = useMemo(() => {
    const c = { All: employeesWithStatus.length };
    Object.keys(CONTRACT_STATUS_CONFIG).forEach(k => { c[k] = employeesWithStatus.filter(e => e._status === k).length; });
    return c;
  }, [employeesWithStatus]);
  const filteredContracts = useMemo(
    () => contractFilter === 'All' ? employeesWithStatus : employeesWithStatus.filter(e => e._status === contractFilter),
    [employeesWithStatus, contractFilter]
  );

  const filteredLeave = useMemo(() => leaveRequests.filter(l => l.status === leaveTab), [leaveRequests, leaveTab]);
  const leaveCounts = useMemo(() => ({
    pending: leaveRequests.filter(l => l.status === 'pending').length,
    approved: leaveRequests.filter(l => l.status === 'approved').length,
    rejected: leaveRequests.filter(l => l.status === 'rejected').length,
  }), [leaveRequests]);

  const gradeDistribution = useMemo(() => {
    const dist = {};
    JOB_GRADES.forEach(g => { dist[g.code] = 0; });
    employees.forEach(e => { if (dist[e.jobGradeCode] !== undefined) dist[e.jobGradeCode]++; });
    return dist;
  }, [employees]);

  const exportEmployeesCSV = () => downloadCSV('slirus_employees.csv', toCSV(filteredEmployees, [
    { label: 'Employee Code', get: e => e.employeeCode },
    { label: 'Name', get: e => employeeFullName(e) },
    { label: 'Department', get: e => e.department },
    { label: 'Position', get: e => e.position },
    { label: 'Job Grade', get: e => e.jobGradeCode },
    { label: 'Contract Type', get: e => e.contractType },
    { label: 'Contract Status', get: e => CONTRACT_STATUS_CONFIG[deriveContractStatus(e)]?.label },
    { label: 'Hire Date', get: e => fmtDate(e.hireDate) },
    { label: 'Contract End', get: e => e.contractEnd ? fmtDate(e.contractEnd) : 'Open-ended' },
  ]));

  const exportPayslipsCSV = () => downloadCSV(`slirus_payroll_${payrollPeriod}.csv`, toCSV(payslips.filter(p => p.period === payrollPeriod), [
    { label: 'Employee', get: p => p.employeeName },
    { label: 'Grade', get: p => p.jobGradeCode },
    { label: 'Gross Pay', get: p => p.grossPay },
    { label: 'Allowances', get: p => p.allowances },
    { label: 'Tax', get: p => p.taxAmount },
    { label: 'Other Deductions', get: p => p.otherDeductions },
    { label: 'Net Pay', get: p => p.netPay },
  ]));

  // ── Render gates ────────────────────────────────────────────────────────
  if (authLoading || (user && !profileLoaded)) {
    return <div style={s.loginBg}><p style={{ color: '#5A7A9A' }}>Loading…</p></div>;
  }
  if (!user) return <LoginScreen />;
  if (!isAuthorized) return <AccessDenied email={user.email} onLogout={() => signOut(auth)} />;

  return (
    <Layout>
      <div style={s.page}>
        {idleWarning && <div style={s.errorBanner}>⏳ You've been idle a while — you'll be signed out automatically in a couple of minutes for security.</div>}
        {expiringSoon.length > 0 && activeTab !== 'contracts' && (
          <div style={{ ...s.errorBanner, background: '#FEF3C7', borderColor: '#F59E0B', cursor: 'pointer' }} onClick={() => { setActiveTab('contracts'); setContractFilter('expiring_soon'); }}>
            ⚠️ {expiringSoon.length} contract{expiringSoon.length === 1 ? '' : 's'} expiring within {EXPIRING_SOON_WINDOW_DAYS} days — click to review.
          </div>
        )}
        {employeesError && activeTab === 'employees' && <div style={s.errorBanner}>⚠️ {employeesError}</div>}
        {leaveError && activeTab === 'leave' && <div style={s.errorBanner}>⚠️ {leaveError}</div>}
        {payslipsError && activeTab === 'payroll' && <div style={s.errorBanner}>⚠️ {payslipsError}</div>}
        {reviewsError && activeTab === 'performance' && <div style={s.errorBanner}>⚠️ {reviewsError}</div>}

        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>HR Control Center</h1>
            <p style={s.pageSub}>{employees.length} employees · {expiringSoon.length} expiring soon · {leaveCounts.pending} leave request(s) pending · signed in as {user.email}</p>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} disabled={loggingOut}>{loggingOut ? 'Signing out…' : 'Sign Out ⎋'}</button>
        </div>

        <div style={s.dashSwitcher}>
          <button style={{ ...s.dashTab, ...(activeTab === 'dashboard' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('dashboard')}>📊 Dashboard</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'employees' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('employees')}>🧑‍🤝‍🧑 Employees <span style={s.tabCount}>{employees.length}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'contracts' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('contracts')}>📄 Contracts {expiringSoon.length > 0 && <span style={{ ...s.tabCount, background: '#FEF3C7', color: '#92400E' }}>{expiringSoon.length}</span>}</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'payroll' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('payroll')}>💵 Payroll & Grades</button>
          <button style={{ ...s.dashTab, ...(activeTab === 'leave' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('leave')}>🌴 Leave <span style={s.tabCount}>{leaveCounts.pending}</span></button>
          <button style={{ ...s.dashTab, ...(activeTab === 'performance' ? s.dashTabActive : {}) }} onClick={() => setActiveTab('performance')}>📈 Performance</button>
        </div>

        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <>
            <h2 style={s.sectionHead}>Workforce Snapshot</h2>
            <div style={{ ...s.trackGrid, marginBottom: 28 }}>
              <StatCard label="Total Employees" value={employees.length} accent="#7C3AED" sub={`${employees.filter(e => (e.status || 'active') === 'active').length} active`} />
              <StatCard label="Expiring Soon" value={expiringSoon.length} accent="#F59E0B" sub={`Within ${EXPIRING_SOON_WINDOW_DAYS} days`} />
              <StatCard label="Pending Leave" value={leaveCounts.pending} accent="#3B82F6" sub={`${leaveCounts.approved} approved this log`} />
              <StatCard label="Pay Slips (this period)" value={payslips.filter(p => p.period === payrollPeriod).length} accent="#059669" sub={payrollPeriod} />
            </div>

            <h2 style={s.sectionHead}>Headcount by Job Grade</h2>
            <div style={{ ...gd.card, textAlign: 'left', marginBottom: 24 }}>
              {JOB_GRADES.map(g => (
                <MetricBar key={g.code} label={`${g.code} · ${g.title}`} value={gradeDistribution[g.code] || 0} max={Math.max(...Object.values(gradeDistribution), 1)} accent="#7C3AED" />
              ))}
            </div>

            <h2 style={s.sectionHead}>Departments</h2>
            <div style={{ ...s.trackGrid }}>
              {DEPARTMENTS.map(d => (
                <StatCard key={d} label={d} value={employees.filter(e => e.department === d).length} accent="#2E6DA4" sub="employees" />
              ))}
            </div>
          </>
        )}

        {/* ── Employees ── */}
        {activeTab === 'employees' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Employee Master Directory</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.tab} onClick={exportEmployeesCSV}>⬇ Export CSV</button>
                {canWrite && (
                  <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#7C3AED' }} onClick={() => { setEditingEmployee(null); setShowEmployeeForm(true); }}>
                    ➕ New Employee
                  </button>
                )}
              </div>
            </div>

            <div style={s.toolbar}>
              <select style={{ ...cu.select, width: 'auto' }} value={empDeptFilter} onChange={e => setEmpDeptFilter(e.target.value)}>
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input style={s.searchInput} placeholder="Search name, code, or email…" value={empSearch} onChange={e => setEmpSearch(e.target.value)} />
            </div>

            <div style={s.tableWrap}>
              {loadingEmployees ? (
                <div style={s.tableMsg}>Loading employees…</div>
              ) : filteredEmployees.length === 0 ? (
                <div style={s.tableMsg}>No employees match your filters.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Employee</th><th style={s.th}>Department</th><th style={s.th}>Grade</th>
                      <th style={s.th}>Contract</th><th style={s.th}>Status</th><th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map(e => (
                      <tr key={e.id} style={s.tr}>
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar employeeId={e.id} name={employeeFullName(e)} size={34} />
                            <div>
                              <span style={{ fontWeight: 700, color: '#1A3C5E', cursor: 'pointer' }} onClick={() => setProfileTarget(e)}>{employeeFullName(e)}</span>
                              <div style={{ fontSize: 12, color: '#7A8A9A' }}>{e.employeeCode}</div>
                            </div>
                          </div>
                        </td>
                        <td style={s.td}>{e.department}</td>
                        <td style={s.td}>{e.jobGradeCode}</td>
                        <td style={s.td}>{e.contractType}</td>
                        <td style={s.td}><ContractStatusBadge status={deriveContractStatus(e)} /></td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button style={s.btnView} onClick={() => setProfileTarget(e)}>View</button>
                            {canEdit && <button style={s.btnView} onClick={() => { setEditingEmployee(e); setShowEmployeeForm(true); }}>Edit</button>}
                            <button style={s.btnShortlist} onClick={() => setIdCardTarget(e)}>ID Card</button>
                            <button style={s.btnShortlist} onClick={() => openPrintWindow(`Contract of Employment — ${employeeFullName(e)}`, buildContractHtml(e))}>Contract</button>
                            <button style={s.btnShortlist} onClick={() => openPrintWindow(`Appointment Letter — ${employeeFullName(e)}`, buildAppointmentLetterHtml(e))}>Letter</button>
                            {canDelete && <button style={s.btnDelete} onClick={() => handleDeleteEmployee(e)} disabled={busyEmployeeId === e.id}>Delete</button>}
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

        {/* ── Contracts (Lifecycle) ── */}
        {activeTab === 'contracts' && (
          <>
            <h2 style={{ ...s.sectionHead, margin: '0 0 4px' }}>Automated Lifecycle Management</h2>
            <p style={{ ...s.pageSub, margin: '0 0 14px' }}>Active ➔ Expiring Soon ➔ Renewed / Terminated / Resigned / Expired</p>

            <div style={s.toolbar}>
              <div style={s.tabs}>
                {['All', ...Object.keys(CONTRACT_STATUS_CONFIG)].map(k => (
                  <button key={k} style={{ ...s.tab, ...(contractFilter === k ? s.tabActive : {}) }} onClick={() => setContractFilter(k)}>
                    {k === 'All' ? 'All' : CONTRACT_STATUS_CONFIG[k].label} <span style={s.tabCount}>{contractCounts[k] || 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.tableWrap}>
              {filteredContracts.length === 0 ? (
                <div style={s.tableMsg}>No contracts in this state.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>Employee</th><th style={s.th}>Contract Type</th><th style={s.th}>Ends</th>
                      <th style={s.th}>Status</th><th style={s.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map(e => (
                      <tr key={e.id} style={s.tr}>
                        <td style={s.td}><span style={{ fontWeight: 700, color: '#1A3C5E' }}>{employeeFullName(e)}</span><div style={{ fontSize: 12, color: '#7A8A9A' }}>{e.employeeCode}</div></td>
                        <td style={s.td}>{e.contractType}</td>
                        <td style={s.td}>{e.contractEnd ? fmtDate(e.contractEnd) : 'Open-ended'}</td>
                        <td style={s.td}><ContractStatusBadge status={e._status} /></td>
                        <td style={s.td}>
                          {canWrite ? (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {e._status !== 'terminated' && e._status !== 'resigned' && (
                                <button style={s.btnView} onClick={() => setContractAction({ employee: e, action: 'renew' })}>Renew</button>
                              )}
                              {e._status !== 'terminated' && e._status !== 'resigned' && (
                                <button style={s.btnDelete} onClick={() => setContractAction({ employee: e, action: 'terminate' })}>Terminate</button>
                              )}
                              {e._status !== 'terminated' && e._status !== 'resigned' && (
                                <button style={s.btnReject} onClick={() => setContractAction({ employee: e, action: 'resign' })}>Resign</button>
                              )}
                            </div>
                          ) : <span style={{ fontSize: 12, color: '#9AAAB8' }}>Read-only</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Payroll & Grades ── */}
        {activeTab === 'payroll' && (
          <>
            <h2 style={{ ...s.sectionHead, margin: '0 0 14px' }}>Job Grades</h2>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr style={s.thead}><th style={s.th}>Code</th><th style={s.th}>Title</th><th style={s.th}>Base Salary (monthly)</th><th style={s.th}>Headcount</th></tr></thead>
                <tbody>
                  {JOB_GRADES.map(g => (
                    <tr key={g.code} style={s.tr}>
                      <td style={s.td}><strong>{g.code}</strong></td>
                      <td style={s.td}>{g.title}</td>
                      <td style={s.td}>{fmtMoney(g.baseSalary)}</td>
                      <td style={s.td}>{gradeDistribution[g.code] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 0 14px', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ ...s.sectionHead, margin: 0 }}>Automated Payroll Engine</h2>
                <p style={{ ...s.pageSub, margin: '4px 0 0' }}>Grade base pay + allowances − PAYE tax − deductions = net pay, per employee.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="month" style={s.loginInput} value={payrollPeriod} onChange={e => setPayrollPeriod(e.target.value)} />
                <button style={s.tab} onClick={exportPayslipsCSV}>⬇ Export CSV</button>
                {canWrite && (
                  <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#059669' }} onClick={runPayroll} disabled={runningPayroll}>
                    {runningPayroll ? 'Running…' : '⚙ Run Payroll'}
                  </button>
                )}
              </div>
            </div>

            <div style={s.tableWrap}>
              {loadingPayslips ? (
                <div style={s.tableMsg}>Loading pay slips…</div>
              ) : payslips.filter(p => p.period === payrollPeriod).length === 0 ? (
                <div style={s.tableMsg}>No pay slips generated for {payrollPeriod} yet.</div>
              ) : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Employee</th><th style={s.th}>Grade</th><th style={s.th}>Gross</th><th style={s.th}>Tax</th><th style={s.th}>Net Pay</th><th style={s.th}></th></tr></thead>
                  <tbody>
                    {payslips.filter(p => p.period === payrollPeriod).map(p => (
                      <tr key={p.id} style={s.tr}>
                        <td style={s.td}>{p.employeeName}</td>
                        <td style={s.td}>{p.jobGradeCode}</td>
                        <td style={s.td}>{fmtMoney(p.grossPay)}</td>
                        <td style={s.td}>{fmtMoney(p.taxAmount)}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: '#059669' }}>{fmtMoney(p.netPay)}</td>
                        <td style={s.td}><button style={s.btnView} onClick={() => setPayslipTarget(p)}>View Slip</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Leave ── */}
        {activeTab === 'leave' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Leave Management Workflow</h2>
              {canWrite && (
                <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#7C3AED' }} onClick={() => setShowLeaveForm(true)}>➕ New Request</button>
              )}
            </div>

            <div style={s.toolbar}>
              <div style={s.tabs}>
                {['pending', 'approved', 'rejected'].map(k => (
                  <button key={k} style={{ ...s.tab, ...(leaveTab === k ? s.tabActive : {}) }} onClick={() => setLeaveTab(k)}>
                    {k[0].toUpperCase() + k.slice(1)} <span style={s.tabCount}>{leaveCounts[k]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={s.tableWrap}>
              {loadingLeave ? (
                <div style={s.tableMsg}>Loading leave requests…</div>
              ) : filteredLeave.length === 0 ? (
                <div style={s.tableMsg}>No {leaveTab} requests.</div>
              ) : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Employee</th><th style={s.th}>Type</th><th style={s.th}>Dates</th><th style={s.th}>Days</th><th style={s.th}>Status</th><th style={s.th}>Actions</th></tr></thead>
                  <tbody>
                    {filteredLeave.map(l => (
                      <tr key={l.id} style={s.tr}>
                        <td style={s.td}>{l.employeeName}</td>
                        <td style={s.td}>{l.type}</td>
                        <td style={s.td}>{fmtDate(l.startDate)} → {fmtDate(l.endDate)}</td>
                        <td style={s.td}>{l.days}</td>
                        <td style={s.td}><LeaveStatusBadge status={l.status} /></td>
                        <td style={s.td}>
                          {l.status === 'pending' && canApprove ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button style={s.btnShortlist} onClick={() => decideLeave(l, 'approved')} disabled={busyLeaveId === l.id}>✓ Approve</button>
                              <button style={s.btnReject} onClick={() => decideLeave(l, 'rejected')} disabled={busyLeaveId === l.id}>✕ Reject</button>
                            </div>
                          ) : <span style={{ fontSize: 12, color: '#9AAAB8' }}>{l.decidedBy || '—'}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <h2 style={{ ...s.sectionHead, margin: '28px 0 14px' }}>Leave Balances</h2>
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead><tr style={s.thead}><th style={s.th}>Employee</th><th style={s.th}>Annual</th><th style={s.th}>Sick</th><th style={s.th}>Compassionate</th></tr></thead>
                <tbody>
                  {employees.map(e => {
                    const b = { ...DEFAULT_LEAVE_BALANCES, ...(e.leaveBalance || {}) };
                    return (
                      <tr key={e.id} style={s.tr}>
                        <td style={s.td}>{employeeFullName(e)}</td>
                        <td style={s.td}>{b.Annual} days</td>
                        <td style={s.td}>{b.Sick} days</td>
                        <td style={s.td}>{b.Compassionate} days</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Performance ── */}
        {activeTab === 'performance' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ ...s.sectionHead, margin: 0 }}>Performance & Appraisal</h2>
              {canWrite && (
                <button style={{ ...s.loginBtn, width: 'auto', padding: '9px 16px', marginTop: 0, background: '#7C3AED' }} onClick={() => setShowReviewForm(true)}>➕ New Review</button>
              )}
            </div>

            <div style={s.tableWrap}>
              {loadingReviews ? (
                <div style={s.tableMsg}>Loading performance reviews…</div>
              ) : reviews.length === 0 ? (
                <div style={s.tableMsg}>No reviews logged yet.</div>
              ) : (
                <table style={s.table}>
                  <thead><tr style={s.thead}><th style={s.th}>Employee</th><th style={s.th}>Period</th><th style={s.th}>Score</th><th style={s.th}>Recommendation</th><th style={s.th}>Action</th></tr></thead>
                  <tbody>
                    {reviews.map(r => (
                      <tr key={r.id} style={s.tr}>
                        <td style={s.td}>{r.employeeName}</td>
                        <td style={s.td}>{r.period}</td>
                        <td style={s.td}><strong>{Number(r.overallScore).toFixed(1)}</strong> / 5</td>
                        <td style={s.td}>{r.recommendation}</td>
                        <td style={s.td}>
                          {r.actioned ? (
                            <span style={{ fontSize: 12, fontWeight: 700, color: r.actionTaken === 'Promote' ? '#065F46' : '#991B1B' }}>{r.actionTaken}d</span>
                          ) : canApprove ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button style={s.btnShortlist} onClick={() => actionReview(r, 'promote')} disabled={busyReviewId === r.id}>⬆ Promote</button>
                              <button style={s.btnReject} onClick={() => actionReview(r, 'demote')} disabled={busyReviewId === r.id}>⬇ Demote</button>
                            </div>
                          ) : <span style={{ fontSize: 12, color: '#9AAAB8' }}>—</span>}
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

      {showEmployeeForm && (
        <EmployeeFormModal
          initial={editingEmployee}
          onClose={() => { setShowEmployeeForm(false); setEditingEmployee(null); }}
          onSave={handleSaveEmployee}
        />
      )}
      {profileTarget && (
        <EmployeeProfileModal
          employee={profileTarget}
          attendanceRows={attendanceRows}
          loadingAttendance={loadingAttendance}
          onClose={() => setProfileTarget(null)}
          onEdit={(e) => { setProfileTarget(null); setEditingEmployee(e); setShowEmployeeForm(true); }}
          onIdCard={(e) => { setIdCardTarget(e); }}
          onDownloadContract={(e) => openPrintWindow(`Contract of Employment — ${employeeFullName(e)}`, buildContractHtml(e))}
          onDownloadAppointmentLetter={(e) => openPrintWindow(`Appointment Letter — ${employeeFullName(e)}`, buildAppointmentLetterHtml(e))}
        />
      )}
      {idCardTarget && <IdCardModal employee={idCardTarget} onClose={() => setIdCardTarget(null)} />}
      {contractAction && (
        <ContractActionModal
          employee={contractAction.employee}
          action={contractAction.action}
          onClose={() => setContractAction(null)}
          onConfirm={handleContractAction}
        />
      )}
      {showLeaveForm && (
        <LeaveRequestModal employees={employees} onClose={() => setShowLeaveForm(false)} onSubmit={handleSubmitLeave} />
      )}
      {payslipTarget && <PayslipModal payslip={payslipTarget} onClose={() => setPayslipTarget(null)} />}
      {showReviewForm && (
        <PerformanceReviewModal employees={employees} onClose={() => setShowReviewForm(false)} onSubmit={handleSubmitReview} />
      )}
    </Layout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  errorBanner: { background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E', fontWeight: 600 },

  loginBg:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' },
  loginCard:  { background: '#fff', borderRadius: 14, padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', textAlign: 'center', width: '100%', maxWidth: 380, border: '1px solid #E2E8F0', borderTop: '4px solid #7C3AED' },
  loginTitle: { fontSize: 22, fontWeight: 700, color: '#1A3C5E', margin: '0 0 8px' },
  loginSub:   { color: '#5A7A9A', fontSize: 14, margin: '0 0 28px' },
  loginInput: { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  loginErr:   { color: '#EF4444', fontSize: 13, margin: '10px 0 0', textAlign: 'left' },
  loginBtn:   { width: '100%', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },

  page:        { padding: '36px 5%', maxWidth: 1280, margin: '0 auto' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle:   { fontSize: 26, fontWeight: 700, color: '#1A3C5E', margin: 0 },
  pageSub:     { color: '#5A7A9A', margin: '4px 0 0', fontSize: 14 },
  logoutBtn:   { padding: '8px 16px', background: '#fff', border: '1.5px solid #C5CDD6', color: '#4A6B8A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  dashSwitcher: { display: 'flex', gap: 8, marginBottom: 28, borderBottom: '2px solid #E2E8F0', paddingBottom: 0, flexWrap: 'wrap' },
  dashTab:      { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '10px 4px 12px', fontSize: 14, fontWeight: 700, color: '#7A8A9A', cursor: 'pointer', marginBottom: -2 },
  dashTabActive:{ color: '#7C3AED', borderBottomColor: '#7C3AED' },

  sectionHead: { fontSize: 15, fontWeight: 700, color: '#1A3C5E', margin: '0 0 14px' },
  trackGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },

  toolbar:     { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' },
  tabs:        { display: 'flex', gap: 4, flexWrap: 'wrap' },
  tab:         { background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 7, padding: '7px 12px', fontSize: 13, color: '#5A7A9A', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 },
  tabActive:   { background: '#7C3AED', color: '#fff', borderColor: '#7C3AED' },
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
  th: { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #E2E8F0' },
};

const cu = {
  label:  { display: 'block', fontSize: 12, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6, textAlign: 'left' },
  select: { width: '100%', padding: '11px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' },
  credRow:{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 0', borderBottom: '1px solid #F0F4F8' },
  credLabel: { fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4 },
  credVal:   { fontSize: 15, fontWeight: 600, color: '#1A3C5E' },
};

export default HrManager;