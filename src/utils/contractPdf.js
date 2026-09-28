/**
 * contractPdf.js – SLA / Service Contract / Professional Agreement PDF generator
 *
 * Shared by CeoManager.jsx (creates + downloads contracts) and Admin.jsx
 * (views + re-downloads contracts already stored in Firestore). Keeping the
 * constants and PDF layout in one place means both pages always agree on
 * what a "contract" looks like, exactly like CAREER_TRACKS / projectPdf.js
 * are shared between the two dashboards today.
 *
 * Drop this file at: src/utils/contractPdf.js
 * (same folder as pdfBrand.js and projectPdf.js)
 */

import { loadLogoDataUrl, drawLetterhead, drawFooter, hexToRgb } from './pdfBrand';

// ─── Shared constants ───────────────────────────────────────────────────────
export const CONTRACT_TYPES = [
  'Service Level Agreement (SLA)',
  'Service Contract Agreement',
  'Master Service Agreement',
  'Statement of Work',
  'Non-Disclosure Agreement',
  'Other Professional Agreement',
];

// The four IT contractual-job categories this company offers.
export const SERVICE_CATEGORIES = [
  { key: 'software_development', label: 'Software Development' },
  { key: 'network_infrastructure', label: 'Network & Infrastructure' },
  { key: 'it_consultancy', label: 'IT Consultancy' },
  { key: 'cybersecurity', label: 'Other / IT Cybersecurity' },
];

export const CONTRACT_STATUSES = ['Draft', 'Active', 'Expired', 'Terminated'];

export const CONTRACT_STATUS_CONFIG = {
  Draft:      { bg: '#F0F4F8', color: '#5A7A9A', dot: '#9AAAB8' },
  Active:     { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  Expired:    { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  Terminated: { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

// ─── Per-type fields ────────────────────────────────────────────────────────
// Each contract type gets its own professional-format section — the fields
// a real SLA needs (uptime %, response/resolution times, service credits)
// are simply not the fields a real NDA needs (definition of confidential
// info, term, exclusions), so instead of one generic clause list we ask for
// the right structured fields per type and lay each one out in its own
// dedicated PDF section. 'list' fields render as their own bulleted group,
// separate from the catch-all "Terms & Conditions" bullets every contract
// still has for anything type-specific fields don't cover.
export const CONTRACT_TYPE_FIELDS = {
  'Service Level Agreement (SLA)': [
    { key: 'slaServiceDescription', label: 'Service(s) covered', type: 'textarea', placeholder: 'Describe the specific service(s) this SLA guarantees…' },
    { key: 'slaUptimeTarget', label: 'Uptime / availability target', type: 'text', placeholder: 'e.g. 99.9% monthly uptime' },
    { key: 'slaResponseTime', label: 'Response time commitment', type: 'text', placeholder: 'e.g. Critical: 1 hr · High: 4 hrs · Normal: 1 business day' },
    { key: 'slaResolutionTime', label: 'Resolution time commitment', type: 'text', placeholder: 'e.g. Critical: 8 hrs · High: 2 business days' },
    { key: 'slaMeasurementPeriod', label: 'Measurement period', type: 'text', placeholder: 'e.g. Calendar month' },
    { key: 'slaPenaltyCredits', label: 'Service credits / remedies for breach', type: 'textarea', placeholder: 'e.g. 5% monthly fee credit per 1% below target uptime…' },
    { key: 'slaExclusions', label: 'Exclusions', type: 'textarea', placeholder: 'e.g. Scheduled maintenance, force majeure, client-caused outages…' },
    { key: 'slaReviewSchedule', label: 'Service review schedule', type: 'text', placeholder: 'e.g. Quarterly service review meeting' },
  ],
  'Service Contract Agreement': [
    { key: 'deliverables', label: 'Deliverables', type: 'list', placeholder: 'e.g. Fully configured firewall with documented rule set' },
    { key: 'scaTimeline', label: 'Delivery timeline', type: 'text', placeholder: 'e.g. 8 weeks from the effective date, per milestone schedule' },
    { key: 'scaAcceptanceProcess', label: 'Acceptance / sign-off process', type: 'textarea', placeholder: 'How deliverables are reviewed and formally accepted…' },
    { key: 'scaWarranty', label: 'Warranty', type: 'textarea', placeholder: 'e.g. 90-day defect warranty on delivered work…' },
  ],
  'Master Service Agreement': [
    { key: 'msaGoverningLaw', label: 'Governing law', type: 'text', placeholder: 'e.g. Laws of the Republic of Uganda' },
    { key: 'msaLiabilityCap', label: 'Limitation of liability', type: 'text', placeholder: 'e.g. Capped at fees paid in the preceding 12 months' },
    { key: 'msaIndemnification', label: 'Indemnification', type: 'textarea', placeholder: 'Each party indemnifies the other against…' },
    { key: 'msaIpOwnership', label: 'Intellectual property ownership', type: 'textarea', placeholder: 'Ownership of pre-existing IP vs. newly developed IP…' },
    { key: 'msaTerminationNotice', label: 'Termination notice period', type: 'text', placeholder: 'e.g. 30 days written notice by either party' },
  ],
  'Statement of Work': [
    { key: 'milestones', label: 'Milestones', type: 'list', placeholder: 'e.g. Milestone 1: Discovery & requirements — 2 weeks' },
    { key: 'sowAcceptanceCriteria', label: 'Acceptance criteria', type: 'textarea', placeholder: 'Conditions under which each milestone/deliverable is accepted…' },
    { key: 'sowProjectTeam', label: 'Project team', type: 'text', placeholder: 'e.g. 1 Project Lead, 2 Engineers, 1 QA Analyst' },
    { key: 'sowReportingSchedule', label: 'Progress reporting schedule', type: 'text', placeholder: 'e.g. Weekly status report every Friday' },
  ],
  'Non-Disclosure Agreement': [
    { key: 'ndaConfidentialInfoDefinition', label: 'Definition of confidential information', type: 'textarea', placeholder: 'What counts as Confidential Information under this agreement…' },
    { key: 'ndaPurpose', label: 'Purpose of disclosure', type: 'text', placeholder: 'e.g. Evaluating a potential business relationship' },
    { key: 'ndaTerm', label: 'Term of confidentiality', type: 'text', placeholder: 'e.g. 3 years from the Effective Date' },
    { key: 'ndaExclusions', label: 'Exclusions from confidentiality', type: 'textarea', placeholder: 'e.g. Publicly known info, independently developed info…' },
    { key: 'ndaReturnObligation', label: 'Return / destruction of information', type: 'textarea', placeholder: 'Obligations on termination or on request…' },
  ],
  'Other Professional Agreement': [],
};

// PDF section heading used for each type's dedicated block.
export const CONTRACT_TYPE_SECTION_TITLE = {
  'Service Level Agreement (SLA)': 'Service Level Commitments',
  'Service Contract Agreement': 'Deliverables & Delivery Terms',
  'Master Service Agreement': 'Governing Terms',
  'Statement of Work': 'Statement of Work Details',
  'Non-Disclosure Agreement': 'Confidentiality Terms',
  'Other Professional Agreement': null,
};

export const emptyContractForm = () => {
  const base = {
    contractType: CONTRACT_TYPES[0],
    serviceCategory: SERVICE_CATEGORIES[0].label,
    contractTitle: '',
    clientCompanyName: '',
    clientContactName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    companySignatoryName: '',
    companySignatoryTitle: '',
    clientSignatoryName: '',
    clientSignatoryTitle: '',
    effectiveDate: '',
    expiryDate: '',
    contractValue: '',
    paymentTerms: '',
    scopeSummary: '',
    conditions: [''], // bulleted, editable catch-all list of clauses/conditions
    status: 'Draft',
  };
  // Seed every possible per-type field (across all types) with its correct
  // empty shape so the form component can switch contractType freely
  // without ever reading `undefined` from an uninitialized field.
  Object.values(CONTRACT_TYPE_FIELDS).flat().forEach(f => {
    base[f.key] = f.type === 'list' ? [''] : '';
  });
  return base;
};

// ─── Internal: draw one copy (Client or Company) ───────────────────────────
const drawContractPDF = async (pdf, contract, copyLabel, logoDataUrl) => {
  const PW = 210, M = 20, CW = PW - M * 2;
  let y = 20;

  const newPage = () => { pdf.addPage(); y = 20; };
  const checkY = (n = 10) => { if (y + n > 275) newPage(); };

  y = drawLetterhead(pdf, {
    logoDataUrl,
    eyebrow: `${contract.contractType || 'Professional Agreement'} — ${copyLabel}`,
    rightLines: [
      `Category: ${contract.serviceCategory || '—'}`,
      `Ref: ${(contract.id || '').slice(0, 10).toUpperCase() || '—'}`,
    ],
  });
  y += 4;

  const [cr, cg, cb] = hexToRgb('#1A3C5E');
  pdf.setDrawColor(cr, cg, cb); pdf.setLineWidth(0.8);
  pdf.line(M, y, PW - M, y); y += 6;

  // Copy-type badge (visually distinguishes Client vs Company copy)
  const badgeColor = copyLabel === 'Client Copy' ? [46, 109, 164] : [26, 60, 94];
  pdf.setFillColor(...badgeColor);
  pdf.roundedRect(M, y, 42, 7, 2, 2, 'F');
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
  pdf.text(copyLabel.toUpperCase(), M + 21, y + 5, { align: 'center' });

  if (contract.status) {
    const st = CONTRACT_STATUS_CONFIG[contract.status] || CONTRACT_STATUS_CONFIG.Draft;
    const [dr, dg, db] = hexToRgb(st.color);
    pdf.setDrawColor(dr, dg, db); pdf.setTextColor(dr, dg, db);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold');
    pdf.text(`STATUS: ${contract.status.toUpperCase()}`, PW - M, y + 5, { align: 'right' });
  }
  y += 14;

  // Title
  pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
  pdf.text(contract.contractTitle || contract.contractType || 'Professional Agreement', M, y);
  y += 9;

  const sectionHeader = (title) => {
    checkY(12);
    pdf.setFillColor(240, 244, 248);
    pdf.rect(M, y, CW, 7, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(title.toUpperCase(), M + 3, y + 5);
    y += 10;
  };

  const field = (label, value) => {
    if (!value) return;
    checkY(7);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
    pdf.text(label + ':', M, y);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
    const lines = pdf.splitTextToSize(String(value), CW - 45);
    pdf.text(lines, M + 44, y);
    y += lines.length * 5 + 2;
  };

  // Parties
  sectionHeader('Parties to This Agreement');
  field('Service Provider', 'Slirus Global Limited');
  field('Provider Signatory', `${contract.companySignatoryName || '—'}${contract.companySignatoryTitle ? ' — ' + contract.companySignatoryTitle : ''}`);
  field('Client', contract.clientCompanyName);
  field('Client Contact', [contract.clientContactName, contract.clientEmail, contract.clientPhone].filter(Boolean).join(' · '));
  field('Client Address', contract.clientAddress);
  field('Client Signatory', `${contract.clientSignatoryName || '—'}${contract.clientSignatoryTitle ? ' — ' + contract.clientSignatoryTitle : ''}`);
  y += 2;

  // Contract details
  sectionHeader('Contract Details');
  field('Contract Type', contract.contractType);
  field('Service Category', contract.serviceCategory);
  field('Effective Date', contract.effectiveDate);
  field('Expiry / Renewal', contract.expiryDate || 'Until terminated by either party');
  field('Contract Value', contract.contractValue);
  field('Payment Terms', contract.paymentTerms);
  y += 2;

  // Type-specific professional section — each contract type gets its own
  // fields/format here (SLA service levels, NDA confidentiality terms,
  // MSA governing terms, SOW milestones, Service Contract deliverables…).
  const typeFields = CONTRACT_TYPE_FIELDS[contract.contractType] || [];
  const typeSectionTitle = CONTRACT_TYPE_SECTION_TITLE[contract.contractType];
  if (typeFields.length && typeSectionTitle) {
    sectionHeader(typeSectionTitle);
    typeFields.forEach(f => {
      const val = contract[f.key];
      if (f.type === 'list') {
        const items = (val || []).filter(v => v && v.trim());
        if (!items.length) return;
        checkY(7);
        pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
        pdf.text(f.label + ':', M, y); y += 5;
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94); pdf.setFontSize(9.5);
        items.forEach(item => {
          const lines = pdf.splitTextToSize(item, CW - 8);
          checkY(lines.length * 5 + 2);
          pdf.setFont('helvetica', 'bold'); pdf.text('•', M, y);
          pdf.setFont('helvetica', 'normal'); pdf.text(lines, M + 6, y);
          y += lines.length * 5 + 2;
        });
        y += 2;
      } else {
        field(f.label, val);
      }
    });
    y += 2;
  }

  // Scope
  if (contract.scopeSummary) {
    sectionHeader('Scope of Work / Purpose');
    pdf.setFontSize(9.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
    pdf.splitTextToSize(contract.scopeSummary, CW).forEach(l => { checkY(5); pdf.text(l, M, y); y += 5; });
    y += 3;
  }

  // Bulleted conditions / clauses
  const conditions = (contract.conditions || []).filter(c => c && c.trim());
  if (conditions.length) {
    sectionHeader('Terms & Conditions');
    pdf.setFontSize(9.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
    conditions.forEach((cond, i) => {
      const lines = pdf.splitTextToSize(cond, CW - 8);
      checkY(lines.length * 5 + 2);
      pdf.setFont('helvetica', 'bold');
      pdf.text('•', M, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(lines, M + 6, y);
      y += lines.length * 5 + 2;
    });
    y += 2;
  }

  // Signature blocks
  checkY(46);
  y += 6;
  sectionHeader('Signatures');
  const colW = (CW - 10) / 2;
  const sigY = y + 18;
  pdf.setDrawColor(180, 190, 200); pdf.setLineWidth(0.4);
  pdf.line(M, sigY, M + colW, sigY);
  pdf.line(M + colW + 10, sigY, M + colW + 10 + colW, sigY);

  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
  pdf.text('For Slirus Global Limited', M, sigY + 6);
  pdf.text('For the Client', M + colW + 10, sigY + 6);
  pdf.setFont('helvetica', 'normal'); pdf.setTextColor(90, 122, 154); pdf.setFontSize(8.5);
  pdf.text(`${contract.companySignatoryName || '_______________________'}${contract.companySignatoryTitle ? ' · ' + contract.companySignatoryTitle : ''}`, M, sigY + 11);
  pdf.text(`${contract.clientSignatoryName || '_______________________'}${contract.clientSignatoryTitle ? ' · ' + contract.clientSignatoryTitle : ''}`, M + colW + 10, sigY + 11);
  pdf.text('Date: ____________________', M, sigY + 18);
  pdf.text('Date: ____________________', M + colW + 10, sigY + 18);

  drawFooter(pdf, {
    note: `Slirus Global Limited · ${copyLabel} · Confidential Professional Agreement`,
    confidential: true,
  });
};

// ─── Public API ─────────────────────────────────────────────────────────────
const safeName = (v) => String(v || 'Contract').replace(/[^a-z0-9]+/gi, '_').slice(0, 40);

/** Generates and downloads a single copy ('Client Copy' or 'Company Copy'). */
export const generateContractPDF = async (contract, copyLabel = 'Company Copy') => {
  const { jsPDF } = await import('jspdf');
  const logoDataUrl = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  await drawContractPDF(pdf, contract, copyLabel, logoDataUrl);
  const who = copyLabel === 'Client Copy' ? 'Client' : 'Company';
  pdf.save(`Slirus_${who}Copy_${safeName(contract.clientCompanyName)}_${safeName(contract.contractType)}.pdf`);
};

/** Generates and downloads BOTH the Client Copy and the Company Copy. */
export const generateBothContractCopies = async (contract) => {
  await generateContractPDF(contract, 'Client Copy');
  await generateContractPDF(contract, 'Company Copy');
};