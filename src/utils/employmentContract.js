/**
 * utils/employmentContract.js — Slirus Global Limited · Contract of Employment AND
 * Independent Service and Task Execution Agreement (PDF)
 *
 * Same approach as utils/appointmentLetter.js: both documents are built with jsPDF (same letterhead,
 * footer, fonts and layout as the Letter of Appointment) instead of a browser print window.
 *
 * Used by HrManager.jsx:
 *   downloadEmploymentContract(employee)
 *   downloadServiceAgreement(employee, { figures, endDate })
 *
 * • The tables that used to be in the HTML versions (termination notice periods, service fees) are
 *   now written as normal statements. Every other clause keeps its original wording.
 * • The company signature block is pre-filled with CONTRACT_SIGNATORY on both documents.
 * • The witness signing section has been removed from both documents.
 * • The document date is printed at the top of the page (letterhead, top-right, beside the Ref).
 */

import { loadLogoDataUrl, drawLetterhead, drawFooter, COMPANY_INFO } from './pdfBrand';
import { gradeByCode, fmtMoney, DEFAULT_PROBATION_MONTHS } from './appointmentLetter';

// Pre-filled on "Signed for and on behalf of the Employer / Company" in both documents.
export const CONTRACT_SIGNATORY = { name: 'Kaaya Moses Awal', title: 'Manager' };

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
const n = (t) => [t, false]; // normal segment
const b = (t) => [t, true];  // bold segment

/**
 * Shared page engine. `write(h)` receives helpers { rich, heading, specialConditions } and writes the
 * body; the title, signature block, disclaimer and footer are drawn here so both documents match.
 */
const buildDoc = async ({ eyebrow, title, ref, dateValue, partyLabel, partyName, disclaimer, footerNote, body }) => {
  const { jsPDF } = await import('jspdf');
  const logoDataUrl = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const PW = 210, M = 20, CW = PW - M * 2, BOTTOM = 268;

  // Ref + Date sit at the very top of the page, in the letterhead.
  let y = drawLetterhead(pdf, {
    logoDataUrl, eyebrow,
    rightLines: [`Ref: ${pdfSafe(ref)}`, `Date: ${fmtContractDate(dateValue)}`],
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

  const specialConditions = (text) => {
    if (text && String(text).trim()) {
      String(text).trim().split(/\n+/).forEach((p) => rich([[p, false]], { gap: 1.2 }));
      y += 1;
    } else { // two blank lines left for handwritten conditions
      pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.2);
      for (let i = 0; i < 2; i += 1) { ensure(8); y += 6; pdf.line(M, y, M + CW, y); }
      y += 4;
    }
  };

  // ── Title bar ──
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.7);
  pdf.line(M, y, M + CW, y); y += 7;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(title.length > 40 ? 12 : 14); pdf.setTextColor(...NAVY);
  pdf.text(title, PW / 2, y, { align: 'center' }); y += 4;
  pdf.line(M, y, M + CW, y); y += 8;

  body({ rich, heading, specialConditions });

  // ── Signatures (company side pre-filled; no witness section) ──
  ensure(48);
  y += 12;
  const half = (CW - 14) / 2;
  const x2 = M + half + 14;
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3);
  pdf.line(M, y, M + half, y);
  pdf.line(x2, y, M + CW, y);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...NAVY);
  pdf.text(pdfSafe(`Signed for and on behalf of the ${partyLabel.company}`), M, y + 4.6);
  pdf.text(pdfSafe(`Signed by the ${partyLabel.person}`), x2, y + 4.6);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...GREY);
  pdf.text(pdfSafe(`Name: ${CONTRACT_SIGNATORY.name}`), M, y + 9.4);
  pdf.text(pdfSafe(`Title: ${CONTRACT_SIGNATORY.title}, ${COMPANY_INFO.name}`), M, y + 14);
  pdf.text('Date: ____________________', M, y + 18.6);
  pdf.text(pdfSafe(`Name: ${partyName}`), x2, y + 9.4);
  pdf.text('Date: ____________________', x2, y + 14);
  y += 28;

  // ── Original template disclaimer ──
  ensure(14);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...GREY);
  pdf.splitTextToSize(pdfSafe(disclaimer), CW).forEach((l) => { pdf.text(l, M, y); y += 3.6; });

  drawFooter(pdf, { note: pdfSafe(footerNote), confidential: false });
  return pdf;
};

const safeFile = (name, fallback) => String(name).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || fallback;
const fullName = (e) => pdfSafe(`${e.firstName || ''} ${e.lastName || ''}`.trim());

// ═══ Contract of Employment ════════════════════════════════════════════════
export const buildEmploymentContractPdf = async (employee) => {
  const e = employee || {};
  const grade = gradeByCode(e.jobGradeCode);
  const name = fullName(e) || 'Employee';
  const startDate = e.contractStart || e.hireDate;
  const ref = e.employeeCode || '-';

  const pdf = await buildDoc({
    eyebrow: 'Contract of Employment',
    title: 'CONTRACT OF EMPLOYMENT',
    ref, dateValue: startDate,
    partyLabel: { company: 'Employer', person: 'Employee' },
    partyName: name,
    disclaimer: 'This document is a general-purpose contract template generated from HR system records. It is not a substitute for review by a qualified legal/HR advisor before use, and should be adapted to the specific role and any collective agreements in force.',
    footerNote: `${COMPANY_INFO.name} · Contract of Employment · ${ref}`,
    body: ({ rich, heading, specialConditions }) => {
      rich([
        n('THIS CONTRACT OF EMPLOYMENT is made between '), b(COMPANY_INFO.name),
        n(` of ${COMPANY_INFO.address} (`), b('"the Employer"'), n(') and '), b(name),
        n(' of '), [e.origin || BLANK, !!e.origin], n(' ('), b('"the Employee"'),
        n('), and made in accordance with the Employment Act, 2006 of the Republic of Uganda and its subsidiary regulations.'),
      ]);

      heading('1. Position & Duties');
      rich([
        n('The Employee is engaged as '), b(e.position || '[Job Title]'), n(' in the '), b(e.department || ''),
        n(' department, Job Grade '), b(grade ? `${grade.code} - ${grade.title}` : '[Grade]'),
        n(', reporting to the '), b(e.reportsTo || '[Manager/HoD]'),
        n('. The Employee shall perform the duties of this position and any other reasonable duties assigned by the Employer from time to time.'),
      ]);

      heading('2. Commencement & Duration');
      rich([
        n('This Contract commences on '), b(fmtContractDate(startDate)), n(' and is a '), b(e.contractType || '[Contract Type]'), n(' contract'),
        ...(e.contractEnd
          ? [n(', ending on '), b(fmtContractDate(e.contractEnd)), n(' unless renewed or lawfully terminated earlier')]
          : [n(', continuing until lawfully terminated by either party in accordance with Clause 7')]),
        n('.'),
      ]);
      if (e.contractType === 'Probation') {
        rich([
          n('The Employee shall serve an initial probationary period of '), b(`${DEFAULT_PROBATION_MONTHS} months`),
          n(' from the Commencement Date, during which either party may terminate this Contract by giving '), b("2 weeks'"),
          n(' written notice. The Employer may, by written agreement with the Employee, extend the probationary period once, provided the total probationary period does not exceed six (6) months, in line with the Employment Act, 2006.'),
        ]);
      }

      heading('3. Place of Work');
      rich([
        n("The Employee's normal place of work shall be "), [e.placeOfWork || BLANK, !!e.placeOfWork],
        n(', or such other location as the Employer may reasonably require within the Republic of Uganda.'),
      ]);

      heading('4. Hours of Work');
      rich([
        n('The Employee shall work '), b('48 hours'), n(' per week, from '), b('9:00 AM to 5:00 PM'),
        n(', with breaktime for breakfast at '), b('11:00 AM'), n(' and lunch at '), b('1:00 PM'),
        n(', and at least one rest day per week, in accordance with the Employment Act, 2006.'),
      ]);

      heading('5. Remuneration');
      rich([
        n('The Employee shall be paid a gross monthly salary of '), b(grade ? fmtMoney(grade.baseSalary) : '-'),
        n(` (Job Grade ${grade?.code || '-'}), payable monthly in arrears by bank transfer to account number `),
        [e.bankAccountNumber || BLANK, !!e.bankAccountNumber], n(' at '), b('Housing Finance Bank'),
        n(', subject to statutory deductions including PAYE and NSSF contributions.'),
      ]);

      heading('6. Leave Entitlement');
      rich([n("The Employee is entitled to twenty-one (21) working days of paid annual leave for each period of twelve (12) months' continuous service, in addition to public holidays. Sick leave, maternity/paternity leave, and compassionate leave shall be granted in accordance with the Employment Act, 2006 and the Employer's leave policy.")]);

      // Notice-period table → statement
      heading('7. Termination & Notice');
      const last = NOTICE_PERIODS.length - 1;
      rich([
        n("Either party may terminate this Contract by giving written notice according to the Employee's length of continuous service, or payment in lieu of notice. The minimum notice period is "),
        ...NOTICE_PERIODS.flatMap((r, i) => [
          n(i === 0 ? '' : (i === last ? ', and ' : ', ')), b(r.notice),
          n(i === 0 ? ` for continuous service of ${r.tenure}` : ` for ${r.tenure}`),
        ]),
        n('.'),
      ]);
      rich([n('The Employer may summarily dismiss the Employee without notice for gross misconduct, as defined under the Employment Act, 2006.')]);

      heading('8. Confidentiality & Code of Conduct');
      rich([n("The Employee shall not, during or after employment, disclose any confidential business, financial, or client information belonging to the Employer, and shall abide by the Employer's code of conduct and policies as amended from time to time.")]);

      heading('9. Governing Law');
      rich([n('This Contract is governed by the laws of the Republic of Uganda, including the Employment Act, 2006, the Employment (Standard Wage) Order, and the NSSF Act, as amended.')]);

      heading('10. Special Conditions');
      specialConditions(e.specialConditions);
    },
  });

  return { pdf, filename: `Contract_of_Employment_${safeFile(name, 'employee')}.pdf` };
};

export const downloadEmploymentContract = async (employee) => {
  const { pdf, filename } = await buildEmploymentContractPdf(employee);
  pdf.save(filename);
};

// ═══ Independent Service and Task Execution Agreement ══════════════════════
// `figures` = gradeBreakdown(grade) from HrManager.jsx (so amounts never drift from the salary
// structure); `endDate` = contractEnd, or start + SERVICE_TERM_MONTHS computed by HrManager.
export const buildServiceAgreementPdf = async (employee, { figures, endDate } = {}) => {
  const e = employee || {};
  const grade = gradeByCode(e.jobGradeCode);
  const bd = figures || null;
  const name = fullName(e) || 'Service Provider';
  const startDate = e.contractStart || e.hireDate;
  const ref = e.employeeCode || '-';

  const weeklyToken = bd?.weeklyAllowance || 0;
  const monthlyBalance = (bd?.base || 0) + (bd?.welfare || 0);
  const totalMonthly = (bd?.base || 0) + (bd?.welfare || 0) + (bd?.weeklyAllowanceMonthly || 0);

  const pdf = await buildDoc({
    eyebrow: 'Independent Service Agreement',
    title: 'INDEPENDENT SERVICE AND TASK EXECUTION AGREEMENT',
    ref, dateValue: startDate,
    partyLabel: { company: 'Company', person: 'Service Provider' },
    partyName: name,
    disclaimer: 'This document is a general-purpose independent service agreement template generated from system records. It is not a substitute for review by a qualified legal advisor before use, and should be adapted to the specific project scope and any applicable regulations in force.',
    footerNote: `${COMPANY_INFO.name} · Independent Service Agreement · ${ref}`,
    body: ({ rich, heading, specialConditions }) => {
      rich([
        n('THIS INDEPENDENT SERVICE AND TASK EXECUTION AGREEMENT ("Agreement") is made between '), b('Slirus Global Limited'),
        n(` of ${COMPANY_INFO.address} (`), b('"the Company"'), n(') and '), b(name),
        n(' of '), [e.origin || BLANK, !!e.origin], n(' ('), b('"the Service Provider"'), n('), collectively "the Parties."'),
      ]);

      heading('1. Nature of Relationship');
      rich([n('The Parties acknowledge that this Agreement creates a principal-to-principal commercial relationship. The Service Provider is an independent contractor engaged to deliver specified outputs and shall not be considered an employee, agent, partner, or representative of the Company for any purpose under Ugandan law. The Service Provider is solely responsible for their own personal tax obligations, social security contributions, and any statutory registrations arising from this Agreement.')]);

      heading('2. Scope of Services');
      rich([
        n('The Service Provider shall deliver the following operational outputs and project deliverables, in the capacity of '), b(e.position || '[Engagement Title]'),
        n(' supporting the '), b(e.department || ''), n(' function, Reference Grade '), b(grade ? `${grade.code} - ${grade.title}` : '[Grade]'),
        n(": periodic technical field support, digital asset updates, and inventory tracking as assigned per project phase, together with such further task-based deliverables as the Company may specify in writing from time to time. Coordination on task scheduling and deliverable review shall be with the Company's "),
        b(e.reportsTo || '[Project Coordinator]'), n('.'),
      ]);

      heading('3. Term and Expiration');
      rich([
        n('This Agreement shall run for a fixed term of six (6) months from '), b(fmtContractDate(startDate)),
        n(', ending on '), b(endDate ? fmtContractDate(endDate) : '[End Date]'),
        n(', after which it shall automatically expire unless reviewed, renegotiated, and renewed in writing by both Parties based on ongoing project requirements. This Agreement does not create any expectation of continued engagement beyond its stated term.'),
      ]);

      heading('4. Project Location');
      rich([
        n('Tasks under this Agreement shall generally be executed at or from '), [e.placeOfWork || BLANK, !!e.placeOfWork],
        n(", or such other project site as a given task may require, at the Service Provider's own discretion as to method and route of execution."),
      ]);

      // Fees table → statement
      heading('5. Service Fees and Payment Structure');
      rich([
        n('In consideration for the timely execution of the specified tasks, the Company shall disburse project facilitation fees and milestone service payments, structured as a weekly operational token and a final monthly project completion balance, upon presentation of verified task execution vouchers. Fees are disbursed to account number '),
        [e.bankAccountNumber || BLANK, !!e.bankAccountNumber], n(' at '), b('Housing Finance Bank'),
        n('. No amount payable under this Agreement constitutes a salary, wage, or payroll payment.'),
      ]);
      rich([
        n('The fees comprise a '), b('Weekly Operational Token'), n(', paid each Saturday in 4 disbursements per month, of '),
        b(`${fmtMoney(weeklyToken)} x 4 = ${fmtMoney(bd?.weeklyAllowanceMonthly)}`),
        n('; and a '), b('Monthly Project Completion Balance'), n(' (base facilitation plus project resource allowance), paid on the last Saturday of the month, of '),
        b(`${fmtMoney(bd?.base)} + ${fmtMoney(bd?.welfare)} = ${fmtMoney(monthlyBalance)}`),
        n('. The '), b('Total Monthly Project Budget'), n(' is therefore '), b(fmtMoney(totalMonthly)), n('.'),
      ]);

      heading('6. Autonomy and Non-Exclusivity');
      rich([n("The Service Provider retains full discretion over the means, manner, and timeline used to achieve the agreed task outputs, provided deliverables meet the quality and deadlines specified per project phase. The Service Provider is not bound by fixed office hours, is not structurally subject to the Company's internal staff conduct rules, and is free to render similar services to other clients, provided this does not create a conflict with active task deliverables owed to the Company under this Agreement.")]);

      heading('7. Tools, Materials and Vouchers');
      rich([n('Except where the Company supplies specific equipment or digital assets for a task, the Service Provider shall furnish their own tools and resources necessary to execute the deliverables. Each disbursement under Clause 5 is conditioned on the Service Provider presenting a verified task execution voucher confirming completion of the corresponding deliverable.')]);

      heading('8. Confidentiality');
      rich([n('The Service Provider shall not, during or after the term of this Agreement, disclose any confidential business, financial, project, or client information belonging to the Company obtained in the course of executing tasks under this Agreement.')]);

      heading('9. Termination');
      rich([
        n('Either Party may terminate this Agreement prior to its stated expiration by giving '), b("2 weeks'"),
        n(' written notice, or immediately in the event of material breach, including failure to deliver verified task outputs. Termination does not entitle the Service Provider to any facilitation fee or balance beyond deliverables verified up to the effective date of termination.'),
      ]);

      heading('10. Governing Law');
      rich([n('This Agreement is governed by the laws of the Republic of Uganda applicable to commercial service contracts between independent parties, including the Contracts Act, 2010. Nothing in this Agreement shall be construed to create rights or obligations under the Employment Act, 2006.')]);

      heading('11. Special Conditions');
      specialConditions(e.specialConditions);
    },
  });

  return { pdf, filename: `Independent_Service_Agreement_${safeFile(name, 'provider')}.pdf` };
};

export const downloadServiceAgreement = async (employee, opts) => {
  const { pdf, filename } = await buildServiceAgreementPdf(employee, opts);
  pdf.save(filename);
};