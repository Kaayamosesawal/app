/**
 * utils/placementLetter.js — Slirus Global Limited · Internship Placement (Acceptance) Letter
 *
 * Mirror of utils/appointmentLetter.js, but for learning-based interns:
 *   • Admin.jsx      – CREATES the letter after the intern passes the ONLINE interview (interns have no
 *                      in-person round). Saves metadata to Firestore `placementLetters/{applicationId}`,
 *                      builds the PDF in the browser and sends the bytes to POST /api/placement/send,
 *                      which emails it to the intern as an attachment.
 *   • HrManager.jsx  – can only DOWNLOAD the issued letter (identical PDF to the emailed one).
 *
 * The PDF itself is never stored in Firestore (1 MiB doc limit) — it is rebuilt from the stored fields
 * with this one function, so Admin, HR and the intern's email always show the same document.
 * The letter is deliberately silent about salary, PAYE, NSSF and job grades: it is not employment.
 */

import { loadLogoDataUrl, drawLetterhead, drawFooter } from './pdfBrand';
import { COMPANY_INFO, REPORTS_TO_OPTIONS, fmtLetterDate, todayISO } from './appointmentLetter';

export { REPORTS_TO_OPTIONS };
export const PLACEMENT_COLLECTION = 'placementLetters';
export const INTERNSHIP_DURATION_WEEKS = 10;

// Mirrors the "Area you want to learn in" options on the careers Apply form / HrManager.
export const INTERN_FOCUS_AREAS = [
  'Software Development', 'Cybersecurity & Cloud',
  'Fashion Design & Production', 'E-commerce & Retail',
  'Agronomy & Farm Advisory', 'Agro-inputs & Machinery', 'Produce Handling & Quality',
  'Sales & Marketing', 'Logistics & Import/Export',
  'Accounts & Finance', 'Administration & Secretarial', 'Customer Support',
];

// 'YYYY-MM-DD' + n weeks → 'YYYY-MM-DD' (local-time safe).
export const addWeeksISO = (iso, weeks) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + weeks * 7);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Stable reference per applicant: SGL/HR/PLC/2026/AB12C
export const placementRefNo = (applicationId, isoDate) =>
  `SGL/HR/PLC/${(isoDate || todayISO()).slice(0, 4)}/${String(applicationId || '').slice(0, 5).toUpperCase()}`;

// What HR's employee form should start with so the intern's record matches the issued letter.
export const placementLetterToEmployeeDraft = (letter) => {
  if (!letter) return {};
  const draft = {
    position: letter.position, department: letter.department, contractType: 'Learning-Based Intern',
    hireDate: letter.startDate, contractStart: letter.startDate, contractEnd: letter.endDate || '',
    reportsTo: letter.reportsTo, placeOfWork: letter.placeOfWork, internFocusArea: letter.focusArea,
  };
  Object.keys(draft).forEach((k) => { if (draft[k] === undefined || draft[k] === null || draft[k] === '') delete draft[k]; });
  return draft;
};

const pdfSafe = (v) => String(v ?? '')
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...')
  .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '?');

const NAVY = [26, 60, 94];
const GREY = [90, 122, 154];
const LINE = [208, 220, 232];

/** `letter` = fields stored in placementLetters/{applicationId} (see Admin.jsx → PlacementLetterModal). */
export const buildPlacementLetterPdf = async (letter) => {
  const { jsPDF } = await import('jspdf');
  const logoDataUrl = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const PW = 210, M = 20, CW = PW - M * 2, BOTTOM = 268;
  const name = pdfSafe(letter.name || 'Intern');
  const position = pdfSafe(letter.position || 'Learning-Based Intern');
  const department = pdfSafe(letter.department || '');
  const endDate = letter.endDate || addWeeksISO(letter.startDate, INTERNSHIP_DURATION_WEEKS);

  let y = drawLetterhead(pdf, {
    logoDataUrl,
    eyebrow: 'Internship Placement Letter',
    rightLines: [`Ref: ${pdfSafe(letter.refNo || '-')}`, `Date: ${fmtLetterDate(letter.issueDate)}`],
  });
  y += 4;

  const ensure = (h) => { if (y + h > BOTTOM) { pdf.addPage(); y = 22; } };

  // Measure per character: jsPDF's getTextWidth applies kerning that pdf.text() does not.
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
  pdf.text('INTERNSHIP PLACEMENT LETTER', PW / 2, y, { align: 'center' }); y += 4;
  pdf.line(M, y, M + CW, y); y += 8;

  // ── Addressee ──
  rich([[name, true]], { gap: 0 });
  if (letter.email) rich([[letter.email, false]], { size: 9, gap: 4 });
  rich([['Dear ' + (letter.name || 'Intern') + ',', false]], { gap: 3 });
  rich([[`RE: ACCEPTANCE - LEARNING-BASED INTERNSHIP, ${(letter.department || '').toUpperCase()} DEPARTMENT`, true]], { gap: 3 });

  rich([
    ['Following your successful online interview, we are pleased to offer you a place on the ', false],
    ['Learning-Based Internship Programme', true], [` at ${COMPANY_INFO.name} as `, false], [position, true],
    [' in the ', false], [department, true], [' department', false],
    ...(letter.focusArea ? [[', focusing on ', false], [letter.focusArea, true]] : []),
    ['.', false],
  ]);

  // ── Summary box ──
  const cells = [
    ['Position', letter.position], ['Department', letter.department],
    ['Start date', fmtLetterDate(letter.startDate)], ['End date', fmtLetterDate(endDate)],
    ['Duration', `${INTERNSHIP_DURATION_WEEKS} weeks`], ['Reports to', letter.reportsTo],
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

  heading('1. Duration and Reporting');
  rich([
    ['The internship runs for ', false], [`${INTERNSHIP_DURATION_WEEKS} weeks`, true], [', from ', false], [fmtLetterDate(letter.startDate), true],
    [' to ', false], [fmtLetterDate(endDate), true], ['. You will report to the ', false], [letter.reportsTo || '[Manager/HoD]', true],
    [' at ', false], [letter.placeOfWork || '[Place of work]', true], [' on your first day at ', false], ['9:00 AM', true], ['.', false],
  ]);

  heading('2. Nature of the Placement');
  rich([
    ['This is a learning-based placement. It is ', false], ['not a contract of employment', true],
    [': you will not be placed on the payroll, no salary is payable, and no PAYE or NSSF deductions apply. Nothing in this letter guarantees later employment, although well-performing interns receive priority consideration when suitable vacancies open.', false],
  ]);

  heading('3. Your Role and Learning Plan');
  rich([[
    'You will shadow and support experienced staff, complete assigned learning tasks and small projects under supervision, keep a weekly logbook, attend team meetings and training sessions, and present a short report on what you have learned at the end of the programme.',
    false,
  ]]);

  heading('4. What We Provide');
  rich([[
    'Structured on-the-job training and mentorship; hands-on exposure to real company work; logbook and assessment sign-off for your institution; a Certificate of Completion on successful completion; and a recommendation letter where performance warrants. Any transport, lunch support, or allowance is offered at the Company\'s discretion and will be confirmed in writing.',
    false,
  ]]);

  heading('5. Conduct and Confidentiality');
  rich([[
    'You are expected to follow Company policies, observe professional conduct and the working hours set by your supervisor, and keep all Company and client information confidential, during and after the internship.',
    false,
  ]]);

  heading('6. Documents Required on Reporting');
  rich([[
    'Please bring: (a) a copy of your National ID / passport; (b) an introduction or placement letter from your institution, if required for academic credit; and (c) two recent passport photographs.',
    false,
  ]]);

  if (letter.specialConditions && String(letter.specialConditions).trim()) {
    heading('7. Special Conditions');
    String(letter.specialConditions).trim().split(/\n+/).forEach((p) => rich([[p, false]], { gap: 1.2 }));
    y += 1;
  }

  ensure(62); // acceptance paragraph + signature block stay together
  rich([
    ['Please indicate your acceptance by signing and returning a copy of this letter by ', false],
    [fmtLetterDate(letter.acceptBy), true], ['. We look forward to welcoming you.', false],
  ], { gap: 4 });

  // ── Signatures ──
  y += 14;
  const half = (CW - 14) / 2;
  pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3);
  pdf.line(M, y, M + half, y);
  pdf.line(M + half + 14, y, M + CW, y);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...NAVY);
  pdf.text(pdfSafe(`For ${COMPANY_INFO.name}`), M, y + 4.6);
  pdf.text('Accepted by Intern', M + half + 14, y + 4.6);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...GREY);
  pdf.text(pdfSafe(`Name: ${letter.signatoryName || '____________________'}`), M, y + 9.4);
  pdf.text(pdfSafe(`Title: ${letter.signatoryTitle || '____________________'}`), M, y + 14);
  pdf.text(pdfSafe(`Name: ${letter.name || ''}`), M + half + 14, y + 9.4);
  pdf.text('Date: ____________________', M + half + 14, y + 14);
  y += 18;

  drawFooter(pdf, { note: `${COMPANY_INFO.name} · Internship Placement Letter · ${pdfSafe(letter.refNo || '')}`, confidential: false });

  const safe = String(letter.name || 'intern').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'intern';
  return { pdf, filename: `Placement_Letter_${safe}.pdf` };
};

export const downloadPlacementLetter = async (letter) => {
  const { pdf, filename } = await buildPlacementLetterPdf(letter);
  pdf.save(filename);
};

// Base64 of the PDF (no data-URL prefix) — what Admin sends to the server to attach to the email.
export const placementLetterBase64 = async (letter) => {
  const { pdf, filename } = await buildPlacementLetterPdf(letter);
  const uri = pdf.output('datauristring');
  return { filename, base64: uri.slice(uri.indexOf('base64,') + 7) };
};