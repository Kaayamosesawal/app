/**
 * utils/employmentContract.js — Slirus Global Limited · Contract of Employment (PDF)
 *
 * Same approach as utils/appointmentLetter.js: the contract is built with jsPDF (same letterhead,
 * footer, fonts and layout as the Letter of Appointment) instead of opening a browser print window.
 *
 * Used by HrManager.jsx → downloadEmploymentContract(employee).
 *
 * The termination-notice TABLE that used to be in the HTML contract is now written as a normal
 * statement (clause 7). Every other clause keeps its original wording.
 */

import { loadLogoDataUrl, drawLetterhead, drawFooter, COMPANY_INFO } from './pdfBrand';
import { gradeByCode, fmtMoney, DEFAULT_PROBATION_MONTHS } from './appointmentLetter';

// General reference only — not legal advice. Termination notice periods commonly applied under
// Uganda's Employment Act, 2006 scale with length of continuous service. Confirm current figures
// with a qualified labour-law advisor before relying on this for an actual contract.
export const NOTICE_PERIODS = [
  { tenure: 'less than 6 months', notice: '2 weeks' },
  { tenure: '6 months to 1 year', notice: '1 month' },
  { tenure: '1 to 5 years', notice: '2 months' },
  { tenure: '5 to 10 years', notice: '3 months' },
  { tenure: 'more than 10 years', notice: '6 months' },
];

// Employee dates can be Firestore Timestamps, Date objects or 'YYYY-MM-DD' strings.
const toDateObj = (v) => {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
export const fmtContractDate = (v) => {
  const d = toDateObj(v);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
};

// jsPDF's built-in fonts only cover Latin-1.
const pdfSafe = (v) => String(v ?? '')
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
  .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '?');

const NAVY = [26, 60, 94];
const GREY = [90, 122, 154];
const BLANK = '____________________'; // printed where the system holds no value (for wet-ink completion)

/** Builds the contract as a jsPDF document. `employee` = the employee record from HrManager. */
export const buildEmploymentContractPdf = async (employee) => {
  const { jsPDF } = await import('jspdf');
  const logoDataUrl = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const PW = 210, M = 20, CW = PW - M * 2, BOTTOM = 268;
  const e = employee || {};
  const grade = gradeByCode(e.jobGradeCode);
  const name = pdfSafe(`${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Employee');
  const startDate = e.contractStart || e.hireDate;
  const isProbation = e.contractType === 'Probation';
  const ref = pdfSafe(e.employeeCode || '-');

  let y = drawLetterhead(pdf, {
    logoDataUrl,
    eyebrow: 'Contract of Employment',
    rightLines: [`Ref: ${ref}`, `Date: ${fmtContractDate(startDate)}`],
  });
  y += 4;

  const ensure = (h) => { if (y + h > BOTTOM) { pdf.addPage(); y = 22; } };

  // Measure character by character: getTextWidth() applies kerning but pdf.text() does not,
  // which made words run together (same fix as appointmentLetter.js).
  const widthCache = new Map();
  const measure = (text, bold, size) => {
    let total = 0;
    for (const ch of text) {
      const key = `${bold ? 'b' : 'n'}${size}${ch}`;
      let cw = widthCache.get(key);
      if (cw === undefined) { pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(size); cw = pdf.getTextWidth(ch); widthCache.set(key, cw); }
      total += cw;
    }
    return total;
  };

  // Wraps mixed bold / normal text: segs = [[text, isBold], ...]
  const rich = (segs, { size = 10, lh = 5.1, gap = 2.2, x = M, w = CW } = {}) => {
    pdf.setFontSize(size);
    const words = [];
    segs.forEach(([text, bold]) => pdfSafe(text).split(/(\s+)/).forEach((tok) => { if (tok !== '') words.push({ tok, bold: !!bold }); }));
    const lines = []; let line = []; let lw = 0;
    words.forEach((wd) => {
      const width = measure(wd.tok, wd.bold, size);
      const space = /^\s+$/.test(wd.tok);
      if (space && !line.length) return;
      if (!space && lw + width > w && line.length) { lines.push(line); line = []; lw = 0; }
      line.push({ ...wd, width }); lw += width;
    });
    if (line.length) lines.push(line);
    lines.forEach((ln) => {
      ensure(lh);
      let cx = x;
      while (ln.length && /^\s+$/.test(ln[ln.length - 1].tok)) ln.pop();
      ln.forEach((wd) => {
        pdf.setFont('helvetica', wd.bold ? 'bold' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(...NAVY);
        pdf.text(wd.tok, cx, y); cx += wd.width;
      });
      y += lh;
    });
    y += gap;
  };

  const heading = (text) => {
    ensure(14);
    y += 1.5;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5); pdf.setTextColor(...NAVY);
    pdf.text(pdfSafe(text), M, y); y += 5.2;
  };

  // ── Title bar ──
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.7);
  pdf.line(M, y, M + CW, y); y += 7;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14); pdf.setTextColor(...NAVY);
  pdf.text('CONTRACT OF EMPLOYMENT', PW / 2, y, { align: 'center' }); y += 4;
  pdf.line(M, y, M + CW, y); y += 8;

  // ── Parties ──
  rich([
    ['THIS CONTRACT OF EMPLOYMENT is made between ', false], [COMPANY_INFO.name, true],
    [` of ${COMPANY_INFO.address} (`, false], ['"the Employer"', true], [') and ', false], [name, true],
    [' of ', false], [e.origin || BLANK, !!e.origin], [' (', false], ['"the Employee"', true],
    ['), and made in accordance with the Employment Act, 2006 of the Republic of Uganda and its subsidiary regulations.', false],
  ]);

  // ── 1 ──
  heading('1. Position & Duties');
  rich([
    ['The Employee is engaged as ', false], [e.position || '[Job Title]', true], [' in the ', false], [e.department || '', true],
    [' department, Job Grade ', false], [grade ? `${grade.code} - ${grade.title}` : '[Grade]', true],
    [', reporting to the ', false], [e.reportsTo || '[Manager/HoD]', true],
    ['. The Employee shall perform the duties of this position and any other reasonable duties assigned by the Employer from time to time.', false],
  ]);

  // ── 2 ──
  heading('2. Commencement & Duration');
  rich([
    ['This Contract commences on ', false], [fmtContractDate(startDate), true], [' and is a ', false], [e.contractType || '[Contract Type]', true], [' contract', false],
    ...(e.contractEnd
      ? [[', ending on ', false], [fmtContractDate(e.contractEnd), true], [' unless renewed or lawfully terminated earlier', false]]
      : [[', continuing until lawfully terminated by either party in accordance with Clause 7', false]]),
    ['.', false],
  ]);
  if (isProbation) {
    rich([
      ['The Employee shall serve an initial probationary period of ', false], [`${DEFAULT_PROBATION_MONTHS} months`, true],
      [' from the Commencement Date, during which either party may terminate this Contract by giving ', false], ["2 weeks'", true],
      [' written notice. The Employer may, by written agreement with the Employee, extend the probationary period once, provided the total probationary period does not exceed six (6) months, in line with the Employment Act, 2006.', false],
    ]);
  }

  // ── 3 ──
  heading('3. Place of Work');
  rich([
    ["The Employee's normal place of work shall be ", false], [e.placeOfWork || BLANK, !!e.placeOfWork],
    [', or such other location as the Employer may reasonably require within the Republic of Uganda.', false],
  ]);

  // ── 4 ──
  heading('4. Hours of Work');
  rich([
    ['The Employee shall work ', false], ['48 hours', true], [' per week, from ', false], ['9:00 AM to 5:00 PM', true],
    [', with breaktime for breakfast at ', false], ['11:00 AM', true], [' and lunch at ', false], ['1:00 PM', true],
    [', and at least one rest day per week, in accordance with the Employment Act, 2006.', false],
  ]);

  // ── 5 ──
  heading('5. Remuneration');
  rich([
    ['The Employee shall be paid a gross monthly salary of ', false], [grade ? fmtMoney(grade.baseSalary) : '-', true],
    [` (Job Grade ${grade?.code || '-'}), payable monthly in arrears by bank transfer to account number `, false],
    [e.bankAccountNumber || BLANK, !!e.bankAccountNumber], [' at ', false], ['Housing Finance Bank', true],
    [', subject to statutory deductions including PAYE and NSSF contributions.', false],
  ]);

  // ── 6 ──
  heading('6. Leave Entitlement');
  rich([[
    "The Employee is entitled to twenty-one (21) working days of paid annual leave for each period of twelve (12) months' continuous service, in addition to public holidays. Sick leave, maternity/paternity leave, and compassionate leave shall be granted in accordance with the Employment Act, 2006 and the Employer's leave policy.",
    false,
  ]]);

  // ── 7 (notice table → statement) ──
  heading('7. Termination & Notice');
  const last = NOTICE_PERIODS.length - 1;
  rich([
    ['Either party may terminate this Contract by giving written notice according to the Employee\'s length of continuous service, or payment in lieu of notice. The minimum notice period is ', false],
    ...NOTICE_PERIODS.flatMap((r, i) => [
      [i === 0 ? '' : (i === last ? ', and ' : ', '), false],
      [r.notice, true],
      [i === 0 ? ` for continuous service of ${r.tenure}` : ` for ${r.tenure}`, false],
    ]),
    ['.', false],
  ]);
  rich([['The Employer may summarily dismiss the Employee without notice for gross misconduct, as defined under the Employment Act, 2006.', false]]);

  // ── 8 ──
  heading('8. Confidentiality & Code of Conduct');
  rich([[
    "The Employee shall not, during or after employment, disclose any confidential business, financial, or client information belonging to the Employer, and shall abide by the Employer's code of conduct and policies as amended from time to time.",
    false,
  ]]);

  // ── 9 ──
  heading('9. Governing Law');
  rich([[
    'This Contract is governed by the laws of the Republic of Uganda, including the Employment Act, 2006, the Employment (Standard Wage) Order, and the NSSF Act, as amended.',
    false,
  ]]);

  // ── 10 ──
  heading('10. Special Conditions');
  if (e.specialConditions && String(e.specialConditions).trim()) {
    String(e.specialConditions).trim().split(/\n+/).forEach((p) => rich([[p, false]], { gap: 1.2 }));
    y += 1;
  } else {
    // Two blank lines left for handwritten conditions.
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.2);
    for (let i = 0; i < 2; i += 1) { ensure(8); y += 6; pdf.line(M, y, M + CW, y); }
    y += 4;
  }

  // ── Signatures (kept together on one page) ──
  ensure(62);
  y += 12;
  const half = (CW - 14) / 2;
  const x2 = M + half + 14;
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3);
  pdf.line(M, y, M + half, y);
  pdf.line(x2, y, M + CW, y);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...NAVY);
  pdf.text('Signed for and on behalf of the Employer', M, y + 4.6);
  pdf.text('Signed by the Employee', x2, y + 4.6);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...GREY);
  pdf.text('Name: ____________________', M, y + 9.4);
  pdf.text('Date: ____________________', M, y + 14);
  pdf.text(pdfSafe(`Name: ${name}`), x2, y + 9.4);
  pdf.text('Date: ____________________', x2, y + 14);
  y += 28;
  pdf.setDrawColor(...NAVY);
  pdf.line(M, y, M + half, y);
  pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...NAVY);
  pdf.text('Witness', M, y + 4.6);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...GREY);
  pdf.text('Name: ____________________', M, y + 9.4);
  pdf.text('Signature: ________________', M, y + 14);
  y += 22;

  // ── Original template disclaimer ──
  const disclaimer = 'This document is a general-purpose contract template generated from HR system records. It is not a substitute for review by a qualified legal/HR advisor before use, and should be adapted to the specific role and any collective agreements in force.';
  ensure(14);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...GREY);
  pdf.splitTextToSize(pdfSafe(disclaimer), CW).forEach((l) => { pdf.text(l, M, y); y += 3.6; });

  drawFooter(pdf, { note: `${COMPANY_INFO.name} · Contract of Employment · ${ref}`, confidential: false });

  const safe = name.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'employee';
  return { pdf, filename: `Contract_of_Employment_${safe}.pdf` };
};

// Saves the PDF to the user's computer.
export const downloadEmploymentContract = async (employee) => {
  const { pdf, filename } = await buildEmploymentContractPdf(employee);
  pdf.save(filename);
};