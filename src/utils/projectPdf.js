/**
 * projectPdf.js – PDF generators for Slirus Holdings project intake.
 *
 * Two documents are produced from the same `project` data shape (the
 * ProjectRequest.jsx form values, or a Firestore `projectRequests` doc):
 *
 *  - generateProjectRequestPDF(project) → "Project Request Summary"
 *    A clean record of exactly what the client submitted. Downloadable by
 *    the client right after submission, and by admins from the dashboard.
 *
 *  - generateProjectProposalPDF(project) → "Project Proposal"
 *    A polished, cover-paged business proposal document (executive summary,
 *    scope of work, timeline & investment, success metrics, next steps, and
 *    a signature block) built from the same submitted data, ready to send
 *    to the client for sign-off.
 *
 * Both share the Slirus Holdings letterhead/footer from ./pdfBrand.
 */

import { loadLogoDataUrl, drawLetterhead, drawFooter, hexToRgb } from './pdfBrand';

const BRAND = '#1A3C5E';
const ACCENT = '#2E6DA4';

const fmtDate = (value) => {
  if (!value) return new Date().toLocaleDateString('en-UG');
  if (value?.toDate) return value.toDate().toLocaleDateString('en-UG');
  if (value instanceof Date) return value.toLocaleDateString('en-UG');
  return String(value);
};

const refCode = (project) => (project?.id ? String(project.id).slice(0, 12).toUpperCase() : '—');

// ─── 1. Project Request Summary ────────────────────────────────────────────
export const generateProjectRequestPDF = async (project) => {
  const { jsPDF } = await import('jspdf');
  const logoDataUrl = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, M = 20, CW = PW - M * 2;
  let y = 20;

  const newPage = () => { pdf.addPage(); y = 20; };
  const checkY  = (n = 10) => { if (y + n > 275) newPage(); };

  y = drawLetterhead(pdf, {
    logoDataUrl,
    eyebrow: 'Project Request Summary',
    rightLines: [`Reference: ${refCode(project)}`, `Submitted: ${fmtDate(project.submittedAt)}`],
  });
  y += 4;

  const [ar, ag, ab] = hexToRgb(BRAND);
  pdf.setDrawColor(ar, ag, ab); pdf.setLineWidth(0.8);
  pdf.line(M, y, PW - M, y); y += 8;

  pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
  pdf.text(project.projectTitle || 'Untitled Project', M, y); y += 6;
  pdf.setFontSize(10.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(90, 122, 154);
  pdf.text(`Submitted by ${project.companyName || '—'}`, M, y); y += 10;

  const section = (title) => {
    checkY(14);
    pdf.setFillColor(240, 244, 248);
    pdf.rect(M, y, CW, 7, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(title.toUpperCase(), M + 3, y + 5); y += 10;
  };
  const row = (label, value) => {
    if (!value) return;
    checkY(7);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
    pdf.text(label + ':', M, y);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
    const lines = pdf.splitTextToSize(String(value), CW - 48);
    pdf.text(lines, M + 46, y); y += lines.length * 5 + 2;
  };
  const multiRow = (label, value) => {
    if (!value) return;
    checkY(10);
    if (label) {
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
      pdf.text(label + ':', M, y); y += 5;
    }
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
    pdf.splitTextToSize(String(value), CW).forEach(l => { checkY(5); pdf.text(l, M, y); y += 5; });
    y += 2;
  };
  const bulletList = (label, items) => {
    const clean = (items || []).filter(Boolean);
    if (!clean.length) return;
    checkY(8);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
    pdf.text(label + ':', M, y); y += 5;
    clean.forEach((item, i) => {
      checkY(6);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
      const lines = pdf.splitTextToSize(`${i + 1}. ${item}`, CW - 4);
      pdf.text(lines, M + 2, y); y += lines.length * 5 + 1;
    });
    y += 2;
  };

  section('Client & Contact');
  row('Company', project.companyName);
  row('Website', project.companyWebsite);
  row('Contact', [project.contactName, project.contactEmail, project.contactPhone].filter(Boolean).join(' · '));
  if (project.signatoryName) {
    row('Signatory', `${project.signatoryName}${project.signatoryTitle ? ' — ' + project.signatoryTitle : ''}`);
  }
  y += 2;

  section('Project Overview');
  multiRow('Description', project.projectDescription);
  bulletList('Goals', project.objectives);
  multiRow('Target Audience', project.targetAudience);
  multiRow('Current Challenges', project.currentChallenges);

  section('Scope');
  bulletList('Deliverables', project.deliverables);
  multiRow('Technical Requirements', project.technicalRequirements);
  multiRow('Brand Assets', project.brandAssets);

  section('Timeline & Budget');
  row('Start Date', project.startDate);
  row('Deadline', project.hardDeadline);
  row('Budget Range', project.budgetRange);

  section('Success Metrics');
  multiRow('KPIs', project.kpis);
  bulletList('Inspiration', project.inspirationLinks);

  section('Logistics');
  row('Referral Source', project.referralSource);
  if (project.fileName) row('Attachment', project.fileName);

  section('Submission');
  row('Reference', refCode(project));
  row('Submitted', fmtDate(project.submittedAt));
  row('Status', project.status || 'New');

  drawFooter(pdf, { note: 'Slirus Holdings · Project Request' });

  const safe = (project.companyName || project.projectTitle || 'request').replace(/\s+/g, '_');
  pdf.save(`Slirus_Project_Request_${safe}.pdf`);
};

// ─── 2. Project Proposal ────────────────────────────────────────────────────
export const generateProjectProposalPDF = async (project) => {
  const { jsPDF } = await import('jspdf');
  const logoDataUrl = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, M = 20, CW = PW - M * 2;

  // ── Cover page ────────────────────────────────────────────────────────
  pdf.setFillColor(26, 60, 94);
  pdf.rect(0, 0, PW, PH, 'F');

  if (logoDataUrl) {
    const size = 34;
    try {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(PW / 2 - size / 2 - 2, 55, size + 4, size + 4, 3, 3, 'F');
      pdf.addImage(logoDataUrl, 'PNG', PW / 2 - size / 2, 57, size, size);
    } catch (e) { /* continue without logo */ }
  }

  pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(180, 202, 224);
  pdf.text('SLIRUS HOLDINGS LIMITED', PW / 2, 108, { align: 'center' });

  pdf.setFontSize(28); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
  pdf.text('PROJECT PROPOSAL', PW / 2, 140, { align: 'center' });

  pdf.setDrawColor(255, 255, 255); pdf.setLineWidth(0.6);
  pdf.line(PW / 2 - 30, 148, PW / 2 + 30, 148);

  pdf.setFontSize(15); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(230, 238, 246);
  const titleLines = pdf.splitTextToSize(project.projectTitle || 'Untitled Project', CW - 20);
  pdf.text(titleLines, PW / 2, 162, { align: 'center' });

  pdf.setFontSize(11); pdf.setTextColor(180, 202, 224);
  pdf.text(`Prepared for ${project.companyName || 'Client'}`, PW / 2, 162 + titleLines.length * 7 + 4, { align: 'center' });

  const metaY = 250;
  const meta = [
    ['Prepared For', `${project.contactName || '—'}${project.contactEmail ? ' · ' + project.contactEmail : ''}`],
    ['Reference',    refCode(project)],
    ['Date',         fmtDate(project.submittedAt)],
    ['Prepared By',  'Slirus Holdings Limited'],
  ];
  meta.forEach(([label, value], i) => {
    pdf.setFontSize(9.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(150, 178, 204);
    pdf.text(label.toUpperCase(), M, metaY + i * 7);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(230, 238, 246);
    pdf.text(String(value), M + 42, metaY + i * 7);
  });

  // ── Body pages ────────────────────────────────────────────────────────
  pdf.addPage();
  let y = 20;
  const newPage = () => { pdf.addPage(); y = 20; };
  const checkY  = (n = 10) => { if (y + n > 268) newPage(); };

  y = drawLetterhead(pdf, {
    logoDataUrl,
    eyebrow: `Proposal for ${project.companyName || 'Client'}`,
    rightLines: [`Ref: ${refCode(project)}`, fmtDate(project.submittedAt)],
  });
  y += 6;

  const h2 = (title, num) => {
    checkY(16);
    pdf.setFillColor(26, 60, 94);
    pdf.rect(M, y, 7, 7, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
    pdf.text(String(num), M + 3.5, y + 5, { align: 'center' });
    pdf.setFontSize(12); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(title, M + 11, y + 5.5);
    y += 12;
  };
  const subHead = (title) => {
    checkY(8);
    pdf.setFontSize(9.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(title, M, y); y += 6;
  };
  const body = (text) => {
    if (!text) return;
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(60, 80, 100);
    pdf.splitTextToSize(String(text), CW).forEach(l => { checkY(6); pdf.text(l, M, y); y += 5.5; });
    y += 4;
  };
  const bullets = (items) => {
    const clean = (items || []).filter(Boolean);
    clean.forEach((item) => {
      checkY(7);
      pdf.setFillColor(46, 109, 164);
      pdf.circle(M + 1.5, y - 1.2, 1, 'F');
      pdf.setFontSize(10); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(60, 80, 100);
      const lines = pdf.splitTextToSize(String(item), CW - 8);
      pdf.text(lines, M + 6, y); y += lines.length * 5.5 + 1;
    });
    y += 3;
  };
  const infoGrid = (pairs) => {
    pairs.filter(([, v]) => v).forEach(([label, value]) => {
      checkY(7);
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
      pdf.text(label + ':', M, y);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
      const lines = pdf.splitTextToSize(String(value), CW - 48);
      pdf.text(lines, M + 46, y); y += lines.length * 5 + 2;
    });
    y += 2;
  };

  h2('Executive Summary', 1);
  body(project.projectDescription);
  if ((project.objectives || []).filter(Boolean).length) {
    subHead('Key Goals');
    bullets(project.objectives);
  }
  if (project.targetAudience) {
    subHead('Target Audience');
    body(project.targetAudience);
  }

  h2('Scope of Work', 2);
  if ((project.deliverables || []).filter(Boolean).length) {
    subHead('Deliverables');
    bullets(project.deliverables);
  }
  if (project.technicalRequirements) {
    subHead('Technical Requirements');
    body(project.technicalRequirements);
  }
  if (project.brandAssets) {
    subHead('Brand Assets Provided');
    body(project.brandAssets);
  }
  if (project.currentChallenges) {
    subHead('Challenges Being Addressed');
    body(project.currentChallenges);
  }

  h2('Timeline & Investment', 3);
  infoGrid([
    ['Proposed Start', project.startDate],
    ['Target Completion', project.hardDeadline || 'To be agreed'],
    ['Estimated Investment', project.budgetRange],
  ]);
  checkY(8);
  pdf.setFontSize(8.5); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(140, 140, 140);
  pdf.text('Final timeline and pricing to be confirmed once the scope above is agreed in writing.', M, y);
  y += 10;

  h2('Success Metrics', 4);
  body(project.kpis);
  if ((project.inspirationLinks || []).filter(Boolean).length) {
    subHead('Reference Examples');
    bullets(project.inspirationLinks);
  }

  h2('Next Steps', 5);
  bullets([
    'Review this proposal and share any questions or requested changes.',
    'Sign and return the agreement to confirm scope, timeline, and budget.',
    'Slirus Holdings schedules a kickoff call to begin the engagement.',
  ]);

  // ── Signature block ─────────────────────────────────────────────────
  checkY(50);
  y += 6;
  pdf.setDrawColor(220, 226, 232); pdf.setLineWidth(0.4);
  pdf.line(M, y, PW - M, y); y += 10;
  pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
  pdf.text('Agreed & Accepted', M, y); y += 12;

  const sigColW = CW / 2 - 6;
  const sigY = y;
  pdf.setDrawColor(150, 150, 150); pdf.setLineWidth(0.3);
  pdf.line(M, sigY, M + sigColW, sigY);
  pdf.line(M + sigColW + 12, sigY, PW - M, sigY);

  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(90, 122, 154);
  pdf.text(project.signatoryName || project.contactName || 'Client Signatory', M, sigY + 6);
  pdf.text(project.signatoryTitle || project.companyName || '', M, sigY + 11);
  pdf.text('For Slirus Holdings Limited', M + sigColW + 12, sigY + 6);
  pdf.text('Authorized Representative', M + sigColW + 12, sigY + 11);

  drawFooter(pdf, { note: `Slirus Holdings · Proposal for ${project.companyName || 'Client'}`, confidential: true });

  const safe = (project.companyName || project.projectTitle || 'proposal').replace(/\s+/g, '_');
  pdf.save(`Slirus_Proposal_${safe}.pdf`);
};