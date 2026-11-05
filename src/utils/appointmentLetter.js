/**
 * utils/appointmentLetter.js — Slirus Global Limited · Letter of Appointment
 *
 * ONE source of truth for the appointment letter, shared by:
 *   • Admin.jsx      – CREATES the letter (form → Firestore `appointmentLetters/{applicationId}`),
 *                      generates the PDF and emails it to the applicant as an attachment.
 *   • HrManager.jsx  – can only DOWNLOAD the letter Admin issued (never create or edit it).
 *   • server.js      – receives the very same PDF bytes and attaches them to the email.
 *
 * Because the PDF is rebuilt from the stored letter fields with this one function, the file HR
 * downloads is identical to the file the applicant received.
 *
 * The salary table below (JOB_GRADES) is the official "Slirus Salary Structure". HrManager.jsx
 * imports it from here, so Admin and HR can never quote different salaries.
 */

import { loadLogoDataUrl, drawLetterhead, drawFooter, COMPANY_INFO } from './pdfBrand';

export const LETTER_COLLECTION = 'appointmentLetters';

// Company details now live in pdfBrand.js (printed in every PDF header); re-exported for existing imports.
export { COMPANY_INFO };

export const DEFAULT_PROBATION_MONTHS = 6; // statutory maximum for a single probation period
export const REPORTS_TO_OPTIONS = ['Manager', 'HoD'];

// Official "Slirus Salary Structure" (moved here from HrManager.jsx so both pages share it).
export const JOB_GRADES = [
  { code: 'SHR-G1', title: 'SHR-Support', level: 1, baseSalary: 150000, welfare: 80000, weeklyAllowance: 30000, bonuses: 0 },
  { code: 'SHR-G2', title: 'SHR-Junior',  level: 2, baseSalary: 285000, welfare: 80000, weeklyAllowance: 60000, bonuses: 65000 },
  { code: 'SHR-G3', title: 'SHR-Senior',  level: 3, baseSalary: 325000, welfare: 80000, weeklyAllowance: 90000, bonuses: 100000 },
];
export const gradeByCode = (code) => JOB_GRADES.find((g) => g.code === code) || null;

export const fmtMoney = (n) => 'UGX ' + Math.round(Number(n) || 0).toLocaleString('en-UG');

// 'YYYY-MM-DD' → "4 November 2026" (letters store plain date strings so they regenerate identically).
export const fmtLetterDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Stable reference number per applicant: SGL/HR/APT/2026/AB12C
export const letterRefNo = (applicationId, isoDate) =>
  `SGL/HR/APT/${(isoDate || todayISO()).slice(0, 4)}/${String(applicationId || '').slice(0, 5).toUpperCase()}`;

// What HR's employee form should start with, so the employee record matches the issued letter.
export const letterToEmployeeDraft = (letter) => {
  if (!letter) return {};
  const draft = {
    position: letter.position, department: letter.department, contractType: letter.contractType,
    hireDate: letter.startDate, contractStart: letter.startDate, contractEnd: letter.contractEnd || '',
    jobGradeCode: letter.jobGradeCode, reportsTo: letter.reportsTo, placeOfWork: letter.placeOfWork,
  };
  Object.keys(draft).forEach((k) => { if (draft[k] === undefined || draft[k] === null || draft[k] === '') delete draft[k]; });
  return draft;
};

// jsPDF's built-in fonts only cover Latin-1.
const pdfSafe = (v) => String(v ?? '')
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
  .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '?');

const NAVY = [26, 60, 94];
const GREY = [90, 122, 154];
const LINE = [208, 220, 232];

/**
 * Builds the letter as a jsPDF document.
 * `letter` = the fields stored in appointmentLetters/{applicationId} (see Admin.jsx → LetterModal).
 */
export const buildAppointmentLetterPdf = async (letter) => {
  const { jsPDF } = await import('jspdf');
  const logoDataUrl = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const PW = 210, M = 20, CW = PW - M * 2, BOTTOM = 268;
  const grade = gradeByCode(letter.jobGradeCode);
  const isProbation = letter.contractType === 'Probation';
  const name = pdfSafe(letter.name || 'Applicant');
  const position = pdfSafe(letter.position || '[Job Title]');
  const department = pdfSafe(letter.department || '');

  let y = drawLetterhead(pdf, {
    logoDataUrl,
    eyebrow: 'Letter of Appointment',
    rightLines: [`Ref: ${pdfSafe(letter.refNo || '-')}`, `Date: ${fmtLetterDate(letter.issueDate)}`],
  });
  y += 4;

  const ensure = (h) => { if (y + h > BOTTOM) { pdf.addPage(); y = 22; } };

  // jsPDF's getTextWidth() applies font kerning, but pdf.text() draws WITHOUT it — so measuring whole
  // words made the next word start too early ("Youremployment"). Measure character by character.
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
  pdf.text('LETTER OF APPOINTMENT', PW / 2, y, { align: 'center' }); y += 4;
  pdf.line(M, y, M + CW, y); y += 8;

  // ── Addressee ──
  rich([[name, true]], { gap: 0 });
  if (letter.email) rich([[letter.email, false]], { size: 9, gap: 4 });
  rich([['Dear ' + (letter.name || 'Applicant') + ',', false]], { gap: 3 });
  rich([[`RE: OFFER OF APPOINTMENT - ${letter.position || '[Job Title]'}`, true]], { gap: 3 });

  rich([
    ['Following your successful online and in-person interviews, we are pleased to confirm your appointment as ', false],
    [position, true], [' in the ', false], [department, true],
    [` department of ${COMPANY_INFO.name}, on the following terms:`, false],
  ]);

  // ── Summary box ──
  const cells = [
    ['Position', letter.position], ['Department', letter.department],
    ['Start date', fmtLetterDate(letter.startDate)], ['Contract', letter.contractType],
    ['Job grade', grade ? `${grade.code} - ${grade.title}` : '-'], ['Gross monthly salary', grade ? fmtMoney(grade.baseSalary) : '-'],
  ];
  ensure(40);
  pdf.setFillColor(247, 249, 252); pdf.setDrawColor(...LINE); pdf.setLineWidth(0.3);
  pdf.roundedRect(M, y, CW, 35, 1.5, 1.5, 'FD');
  cells.forEach(([label, value], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = M + 5 + col * (CW / 2), cy = y + 8 + row * 10.5;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(...GREY);
    pdf.text(pdfSafe(label).toUpperCase(), cx, cy);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(...NAVY);
    pdf.text(pdf.splitTextToSize(pdfSafe(value || '-'), CW / 2 - 8)[0], cx, cy + 4.4);
  });
  y += 41;

  // ── Terms ──
  heading('1. Commencement');
  rich([
    ['Your employment shall commence on ', false], [fmtLetterDate(letter.startDate), true],
    ['. You are required to report to the ', false], [letter.reportsTo || '[Manager/HoD]', true],
    [' at our offices at ', false], [letter.placeOfWork || '[Place of work]', true], [' on your first day at ', false], ['9:00 AM', true], ['.', false],
  ]);

  heading('2. Nature of Appointment');
  rich([
    ['This is a ', false], [letter.contractType || '[Contract Type]', true], [' appointment', false],
    ...(letter.contractEnd ? [[', running until ', false], [fmtLetterDate(letter.contractEnd), true]] : []),
    ['.', false],
    ...(isProbation ? [[` You will serve a probationary period of `, false], [`${letter.probationMonths || DEFAULT_PROBATION_MONTHS} months`, true],
      [', during which your performance will be reviewed before confirmation.', false]] : []),
  ]);

  heading('3. Job Grade & Remuneration');
  rich([
    ['You are placed on Job Grade ', false], [grade?.code || '-', true], [` (${grade?.title || '-'}), with a gross monthly salary of `, false],
    [grade ? fmtMoney(grade.baseSalary) : '-', true],
    [', subject to statutory deductions (PAYE, NSSF), payable monthly by bank transfer to the bank account you will declare to the HR office when you report.', false],
  ]);

  heading('4. Place of Work & Hours');
  rich([
    ['Your normal place of work shall be ', false], [letter.placeOfWork || '[Place of work]', true],
    ['. Standard hours of work are ', false], ['48 hours', true], [' per week, from ', false], ['9:00 AM to 5:00 PM', true],
    [', with breaktime for breakfast at ', false], ['11:00 AM', true], [' and lunch at ', false], ['1:00 PM', true], ['.', false],
  ]);

  heading('5. Documents Required on Reporting');
  rich([[
    'Please bring the following on your first day: (a) a copy of your National ID / passport; (b) certified copies of academic and professional certificates; (c) two recent passport photographs; (d) bank account details; (e) NSSF number, if already registered; (f) contacts of two referees; (g) LC1 letter of resident place attached.',
    false,
  ]]);

  heading('6. General');
  rich([[
    'Your full terms of employment, including hours of work, leave entitlement, termination notice, and conduct obligations, are set out in the Contract of Employment that HR will issue to you on reporting, which forms part of this offer.',
    false,
  ]]);

  if (letter.specialConditions && String(letter.specialConditions).trim()) {
    heading('7. Special Conditions');
    String(letter.specialConditions).trim().split(/\n+/).forEach((p) => rich([[p, false]], { gap: 1.2 }));
    y += 1;
  }

  ensure(62); // acceptance paragraph + signature block stay together, never orphaned on their own page
  rich([
    ['Please indicate your acceptance of this offer by signing and returning a copy of this letter by ', false],
    [fmtLetterDate(letter.acceptBy), true],
    ['. We look forward to welcoming you to the team.', false],
  ], { gap: 4 });

  // ── Signatures ──
  y += 14;
  const half = (CW - 14) / 2;
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3);
  pdf.line(M, y, M + half, y);
  pdf.line(M + half + 14, y, M + CW, y);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...NAVY);
  pdf.text(pdfSafe(`For ${COMPANY_INFO.name}`), M, y + 4.6);
  pdf.text('Signed by Employee (accepted)', M + half + 14, y + 4.6);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...GREY);
  pdf.text(pdfSafe(`Name: ${letter.signatoryName || '____________________'}`), M, y + 9.4);
  pdf.text(pdfSafe(`Title: ${letter.signatoryTitle || '____________________'}`), M, y + 14);
  pdf.text(pdfSafe(`Name: ${letter.name || ''}`), M + half + 14, y + 9.4);
  pdf.text('Date: ____________________', M + half + 14, y + 14);
  y += 18;

  drawFooter(pdf, { note: `${COMPANY_INFO.name} · Letter of Appointment · ${pdfSafe(letter.refNo || '')}`, confidential: false });

  const safe = String(letter.name || 'applicant').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'applicant';
  return { pdf, filename: `Appointment_Letter_${safe}.pdf` };
};

// Saves the PDF to the user's computer (used by Admin AND HR).
export const downloadAppointmentLetter = async (letter) => {
  const { pdf, filename } = await buildAppointmentLetterPdf(letter);
  pdf.save(filename);
};

// Base64 of the PDF (no data-URL prefix) — what Admin sends to the server to attach to the email.
export const appointmentLetterBase64 = async (letter) => {
  const { pdf, filename } = await buildAppointmentLetterPdf(letter);
  const uri = pdf.output('datauristring');
  return { filename, base64: uri.slice(uri.indexOf('base64,') + 7) };
};