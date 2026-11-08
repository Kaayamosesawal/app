/**
 * financePdfs.js – Branded PDF documents for HR payroll and Accounts.
 *
 * Every document here (pay slip, payroll summary, tax invoice, invoice, receipt,
 * payment voucher, dividend certificate, loan note, CIT computation, financial
 * statements, expense reimbursement statement, table exports) is built with jsPDF
 * on top of pdfBrand.js, so it carries exactly the same navy letterhead, logo badge,
 * contact details and footer as the appointment letters, contracts and application PDFs.
 *
 * Nothing here talks to Firestore: callers pass plain data in.
 */

import { drawLetterhead, drawFooter, loadLogoDataUrl, COMPANY_INFO } from './pdfBrand';

const NAVY = [26, 60, 94];
const GREY = [122, 138, 154];
const LIGHT = [247, 249, 252];
const RULE = [208, 220, 232];
const GREEN_BG = [240, 253, 244];
const RED_BG = [254, 242, 242];

// jsPDF's built-in fonts only cover Latin-1.
const safe = (v) => String(v ?? '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-').replace(/…/g, '...')
  .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, '?');

export const money = (n) => 'UGX ' + Math.round(Number(n) || 0).toLocaleString('en-UG');
const dateStr = (ts) => {
  if (!ts) return '-';
  if (ts?.toDate) return ts.toDate().toLocaleDateString('en-UG');
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-UG');
};
const dateTimeStr = (ts) => {
  if (!ts) return '-';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('en-UG');
};
const fileSafe = (s) => String(s || 'document').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');

// ─── Core document builder ─────────────────────────────────────────────────
const startDoc = async ({ eyebrow, rightLines = [], landscape = false, footerNote, confidential = false }) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' });
  const logoDataUrl = await loadLogoDataUrl();
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const M = 20;
  const CW = PW - M * 2;
  const header = () => drawLetterhead(pdf, { logoDataUrl, eyebrow, rightLines, margin: M });
  let y = header();
  const ensure = (h) => { if (y + h > PH - 22) { pdf.addPage(); y = header(); } };

  const doc = {
    pdf, CW, M,
    title(text) {
      ensure(18);
      pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.6);
      pdf.line(M, y, M + CW, y);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12.5); pdf.setTextColor(...NAVY);
      pdf.text(safe(text).toUpperCase(), PW / 2, y + 7.5, { align: 'center' });
      pdf.line(M, y + 11, M + CW, y + 11);
      y += 18;
    },
    section(text) {
      ensure(14);
      y += 2;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5); pdf.setTextColor(...NAVY);
      pdf.text(safe(text), M, y + 4);
      pdf.setDrawColor(...RULE); pdf.setLineWidth(0.3); pdf.line(M, y + 6, M + CW, y + 6);
      y += 10;
    },
    para(text, { size = 9.5, color = NAVY, italic = false, bold = false } = {}) {
      pdf.setFont('helvetica', bold ? 'bold' : italic ? 'italic' : 'normal'); pdf.setFontSize(size); pdf.setTextColor(...color);
      pdf.splitTextToSize(safe(text), CW).forEach((line) => { ensure(5.5); pdf.text(line, M, y + 3.6); y += size * 0.5 + 0.9; });
      y += 2;
    },
    // rows: [[label, value], ...]  laid out in `cols` columns
    kv(rows, cols = 2) {
      const colW = (CW - (cols - 1) * 6) / cols;
      for (let i = 0; i < rows.length; i += cols) {
        const chunk = rows.slice(i, i + cols);
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
        const prepared = chunk.map(([l, v]) => ({ l, lines: pdf.splitTextToSize(safe(v === 0 ? '0' : (v || '-')), colW) }));
        const h = 4 + Math.max(...prepared.map((p) => p.lines.length)) * 4.8 + 2;
        ensure(h);
        prepared.forEach((p, idx) => {
          const x = M + idx * (colW + 6);
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(...GREY);
          pdf.text(safe(p.l).toUpperCase(), x, y + 2.6);
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(...NAVY);
          pdf.text(p.lines, x, y + 7.2);
        });
        y += h;
      }
      y += 2;
    },
    // columns: [{ label, align:'left'|'right', w: weight }], rows/foot: arrays of arrays
    table({ columns, rows, foot = [], emptyText = 'No records', fontSize = 8.8 }) {
      const totalW = columns.reduce((s, c) => s + (c.w || 1), 0);
      const widths = columns.map((c) => (CW * (c.w || 1)) / totalW);
      const pad = 1.8;
      const cellX = (i, align) => {
        const x0 = M + widths.slice(0, i).reduce((a, b) => a + b, 0);
        return align === 'right' ? x0 + widths[i] - pad : x0 + pad;
      };
      const drawHead = () => {
        ensure(10);
        pdf.setFillColor(...LIGHT); pdf.rect(M, y, CW, 7, 'F');
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.8); pdf.setTextColor(...GREY);
        columns.forEach((c, i) => pdf.text(safe(c.label).toUpperCase(), cellX(i, c.align), y + 4.7, { align: c.align === 'right' ? 'right' : 'left' }));
        pdf.setDrawColor(...RULE); pdf.setLineWidth(0.3); pdf.line(M, y + 7, M + CW, y + 7);
        y += 7;
      };
      const drawRow = (cells, { bold = false, fill = null } = {}) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(fontSize);
        const wrapped = cells.map((c, i) => pdf.splitTextToSize(safe(c === 0 ? '0' : (c ?? '')), widths[i] - pad * 2));
        const h = Math.max(...wrapped.map((w) => w.length)) * (fontSize * 0.47 + 0.4) + 3.2;
        if (y + h > PH - 22) { pdf.addPage(); y = header(); drawHead(); }
        if (fill) { pdf.setFillColor(...fill); pdf.rect(M, y, CW, h, 'F'); }
        pdf.setFont('helvetica', bold ? 'bold' : 'normal'); pdf.setFontSize(fontSize); pdf.setTextColor(...NAVY);
        wrapped.forEach((lines, i) => pdf.text(lines, cellX(i, columns[i].align), y + 4.2, { align: columns[i].align === 'right' ? 'right' : 'left' }));
        pdf.setDrawColor(238, 242, 247); pdf.setLineWidth(0.2); pdf.line(M, y + h, M + CW, y + h);
        y += h;
      };
      drawHead();
      if (!rows.length) {
        pdf.setFont('helvetica', 'italic'); pdf.setFontSize(9); pdf.setTextColor(...GREY);
        ensure(8); pdf.text(safe(emptyText), PW / 2, y + 5, { align: 'center' }); y += 9;
      } else rows.forEach((r) => drawRow(r));
      foot.forEach((r) => drawRow(r.cells || r, { bold: true, fill: r.fill || LIGHT }));
      y += 4;
    },
    // Right-aligned summary lines: [[label, value, { bold, fill }]]
    totals(lines, width = 92) {
      const x0 = M + CW - width;
      lines.forEach(([label, value, opt = {}]) => {
        const h = opt.bold ? 9 : 7;
        ensure(h);
        if (opt.fill) { pdf.setFillColor(...opt.fill); pdf.rect(x0, y, width, h, 'F'); }
        pdf.setFont('helvetica', opt.bold ? 'bold' : 'normal'); pdf.setFontSize(opt.bold ? 10.5 : 9.5); pdf.setTextColor(...NAVY);
        pdf.text(safe(label), x0 + 2, y + h / 2 + 1.4);
        pdf.text(safe(value), x0 + width - 2, y + h / 2 + 1.4, { align: 'right' });
        pdf.setDrawColor(...RULE); pdf.setLineWidth(0.2); pdf.line(x0, y + h, x0 + width, y + h);
        y += h;
      });
      y += 5;
    },
    signatures(left, right) {
      ensure(32);
      y += 16;
      const half = (CW - 14) / 2;
      pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.3);
      pdf.line(M, y, M + half, y); pdf.line(M + half + 14, y, M + CW, y);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...GREY);
      pdf.text(safe(left), M, y + 4.5); pdf.text(safe(right), M + half + 14, y + 4.5);
      y += 12;
    },
    gap(h = 4) { y += h; },
    finish(filename) {
      drawFooter(pdf, { note: footerNote || COMPANY_INFO.name, confidential, margin: M });
      pdf.save(`${fileSafe(filename)}.pdf`);
    },
  };
  return doc;
};

// ═══════════════════════════════════════════════════════════════════════════
// HR — payroll documents
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pay slip. `payslip` fields: employeeName, jobGradeCode, period, grossPay (basic salary),
 * allowances (taxable cash allowances, usually 0), taxAmount (PAYE), otherDeductions (employee
 * NSSF 5%), nssfCompany (employer 10%), netPay, generatedAt, generatedBy.
 */
export const downloadPayslipPdf = async (payslip) => {
  const basic = Number(payslip.grossPay) || 0;
  const allowances = Number(payslip.allowances) || 0;
  const taxable = basic + allowances;
  const doc = await startDoc({
    eyebrow: 'Pay Slip',
    rightLines: [`Period: ${payslip.period}`, `Generated: ${dateStr(payslip.generatedAt)}`],
    footerNote: 'Pay slip - issued electronically, valid without signature',
    confidential: true,
  });
  doc.title('Digital Pay Slip');
  doc.kv([
    ['Employee', payslip.employeeName],
    ['Job grade', payslip.jobGradeCode],
    ['Pay period', payslip.period],
    ['Payment', 'Monthly, by bank transfer'],
  ]);
  doc.section('Earnings');
  doc.table({
    columns: [{ label: 'Description', w: 3 }, { label: 'Amount', align: 'right', w: 1 }],
    rows: [
      ['Basic monthly salary', money(basic)],
      ...(allowances > 0 ? [['Cash allowances (taxable - included in PAYE and NSSF)', money(allowances)]] : []),
    ],
    foot: [['Gross pay (PAYE and NSSF base)', money(taxable)]],
  });
  doc.section('Statutory deductions');
  doc.table({
    columns: [{ label: 'Description', w: 3 }, { label: 'Amount', align: 'right', w: 1 }],
    rows: [
      ['PAYE income tax', `-${money(payslip.taxAmount)}`],
      ['NSSF - employee contribution (5% of gross pay)', `-${money(payslip.otherDeductions)}`],
    ],
  });
  doc.totals([['Net pay', money(payslip.netPay), { bold: true, fill: GREEN_BG }]]);
  doc.para(`Employer NSSF contribution (10% of gross pay, paid by ${COMPANY_INFO.name} on top of salary, not deducted from you): ${money(payslip.nssfCompany)}.`, { size: 8.5, color: GREY });
  doc.para('Business expenses (internet, client-site transport, software, equipment, communication and supplies) are not part of pay. They are paid to suppliers or reimbursed against receipts under the IT Operations and Business Expense Policy and are accounted for separately.', { size: 8.5, color: GREY, italic: true });
  doc.finish(`payslip-${payslip.employeeName}-${payslip.period}`);
};

/** One-page payroll run summary used by Finance for posting and for PAYE/NSSF remittance. */
export const downloadPayrollSummaryPdf = async (d, payslips = []) => {
  const doc = await startDoc({
    eyebrow: 'Payroll Summary',
    rightLines: [`Period: ${d.period}`, `Employees: ${d.employeeCount}`],
    footerNote: 'Payroll summary', confidential: true,
  });
  doc.title(`Payroll Summary - ${d.period}`);
  doc.section('Employees paid');
  doc.table({
    columns: [
      { label: 'Employee', w: 3 }, { label: 'Grade', w: 1 },
      { label: 'Gross', align: 'right', w: 1.5 }, { label: 'PAYE', align: 'right', w: 1.2 },
      { label: 'NSSF 5%', align: 'right', w: 1.3 }, { label: 'Net pay', align: 'right', w: 1.5 },
    ],
    rows: payslips.map((p) => [p.employeeName, p.jobGradeCode, money((Number(p.grossPay) || 0) + (Number(p.allowances) || 0)), money(p.taxAmount), money(p.otherDeductions), money(p.netPay)]),
    foot: [['Total', '', money(d.totalGross), money(d.totalPAYE), money(d.totalNSSFEmployee), money(d.totalNetPay)]],
  });
  doc.section('Amounts to remit and cost to company');
  doc.totals([
    ['PAYE payable to URA', money(d.totalPAYE)],
    ['NSSF payable (5% + 10%)', money((Number(d.totalNSSFEmployee) || 0) + (Number(d.totalNSSFCompany) || 0))],
    ['Net salaries payable to staff', money(d.totalNetPay)],
    ['Total cost to company', money(d.totalCostToCompany), { bold: true, fill: LIGHT }],
  ]);
  doc.para('PAYE and NSSF are due to URA and NSSF by the 15th of the month following the payroll period.', { size: 8.5, color: GREY, italic: true });
  doc.finish(`payroll-summary-${d.period}`);
};

// ═══════════════════════════════════════════════════════════════════════════
// Accounts documents
// ═══════════════════════════════════════════════════════════════════════════

/** Generic table export (ledger, journal, assets, invoices ...). */
export const downloadTablePdf = async (title, rows, columns) => {
  const doc = await startDoc({ eyebrow: title, rightLines: [`Generated: ${dateStr(new Date())}`], landscape: true, footerNote: title });
  doc.title(title);
  doc.table({
    columns: columns.map((c) => ({ label: c.label, align: c.align, w: c.w || 1 })),
    rows: rows.map((r) => columns.map((c) => c.get(r))),
    fontSize: 8,
  });
  doc.finish(title);
};

export const downloadTaxInvoicePdf = async (txn, vatStandard, vatRate) => {
  const vatOn = txn.vatTreatment === vatStandard;
  const doc = await startDoc({
    eyebrow: 'Tax Invoice / Sales Record',
    rightLines: [`Invoice Ref: ${txn.ref || '-'}`, `Date: ${dateStr(txn.date)}`],
    footerNote: 'Tax invoice / sales record',
  });
  doc.title('Tax Invoice / Sales Record');
  doc.kv([
    ['Billed to', `${txn.counterpartyName || '-'}${txn.counterpartyTIN ? ` (TIN: ${txn.counterpartyTIN})` : ''}`],
    ['Business object', txn.object || '-'],
  ]);
  doc.table({
    columns: [{ label: 'Description', w: 3 }, { label: 'Category', w: 2 }, { label: 'Amount', align: 'right', w: 1.3 }],
    rows: [[txn.description || '-', txn.category || '-', money(txn.grossAmount)]],
  });
  doc.totals([
    ['Subtotal', money(txn.grossAmount)],
    [`VAT (${txn.vatTreatment || '-'}${vatOn ? `, ${Math.round(vatRate * 100)}%` : ''})`, vatOn ? money(txn.vatAmount) : '-'],
    [`Total${vatOn ? ' (VAT-inclusive)' : ''}`, money((Number(txn.grossAmount) || 0) + (vatOn ? Number(txn.vatAmount) || 0 : 0)), { bold: true, fill: LIGHT }],
  ]);
  doc.section('Withholding Tax');
  doc.para(txn.whtWithheld
    ? `The payer withheld 6% Withholding Tax of ${money(txn.whtAmount)} at source${txn.whtCertificateNo ? `, certificate no. ${txn.whtCertificateNo}` : ''}. This amount is claimed as a credit against ${COMPANY_INFO.name}'s annual Corporate Income Tax.`
    : 'No Withholding Tax was deducted at source on this transaction. The full amount is declared as gross revenue for Corporate Income Tax purposes.');
  doc.section('EFRIS Fiscalization');
  doc.kv([['FDN', '__________________'], ['Anti-fake code', '__________________'], ['QR ref', '__________________']], 3);
  doc.para('To be completed after fiscalizing this sale through the URA EFRIS portal/device. This record supports internal bookkeeping and EFRIS entry; it is not itself a fiscalized URA document.', { size: 8.5, color: GREY, italic: true });
  doc.finish(`tax-invoice-${txn.ref}`);
};

export const downloadInvoicePdf = async (invoice) => {
  const doc = await startDoc({
    eyebrow: 'Invoice',
    rightLines: [`Invoice: ${invoice.invoiceNo}`, `Issued: ${dateStr(invoice.issueDate)}  Due: ${dateStr(invoice.dueDate)}`],
    footerNote: `Invoice ${invoice.invoiceNo}`,
  });
  doc.title('Invoice');
  doc.kv([
    ['Bill to', `${invoice.customerName}${invoice.customerEmail ? ` - ${invoice.customerEmail}` : ''}`],
    ['Status', String(invoice.status || '').toUpperCase()],
  ]);
  doc.table({
    columns: [{ label: 'Description', w: 4 }, { label: 'Qty', align: 'right', w: 0.8 }, { label: 'Rate', align: 'right', w: 1.4 }, { label: 'Amount', align: 'right', w: 1.5 }],
    rows: (invoice.items || []).map((i) => [i.description, i.qty, money(i.rate), money(i.amount)]),
  });
  doc.totals([
    ['Subtotal', money(invoice.subtotal)],
    [`Tax (${invoice.taxRate || 0}%)`, money(invoice.taxAmount)],
    ['Total due', money(invoice.total), { bold: true, fill: LIGHT }],
  ]);
  doc.para(`Business object: ${invoice.businessObject || '-'}   |   VAT treatment: ${invoice.vatTreatment || '-'}`, { size: 8.5, color: GREY });
  doc.finish(`invoice-${invoice.invoiceNo}`);
};

export const downloadReceiptPdf = async (r) => {
  const doc = await startDoc({
    eyebrow: 'Payment Receipt',
    rightLines: [`Receipt: ${r.receiptNo}`, `Date: ${dateStr(r.date)}`],
    footerNote: `Receipt ${r.receiptNo}`,
  });
  doc.title('Payment Receipt');
  doc.kv([['Received from', r.customerName], ['Against invoice', r.invoiceNo], ['Payment method', r.method]]);
  doc.totals([
    ...(r.whtWithheld ? [['Withholding Tax (6%) deducted at source', money(r.whtAmount)]] : []),
    ['Cash amount received', money(r.amount), { bold: true, fill: GREEN_BG }],
  ], 110);
  doc.para('Auto-posted to both the Double-Entry Books and the Tax Ledger for Corporate Income Tax purposes.', { size: 8.5, color: GREY, italic: true });
  doc.finish(`receipt-${r.receiptNo}`);
};

export const downloadVoucherPdf = async (v, contractorName) => {
  const net = (Number(v.amount) || 0) - (v.whtWithheld ? Number(v.whtAmount) || 0 : 0);
  const doc = await startDoc({
    eyebrow: 'Internal Payment Voucher',
    rightLines: [`Voucher Ref: ${v.ref || '-'}`, `Date: ${dateStr(v.date)}`],
    footerNote: 'Internal payment voucher - retain for 5 years',
  });
  doc.title('Internal Payment Voucher');
  doc.kv([['Service provider', contractorName], ['National ID (NIN)', v.nin], ['Payment type', v.voucherType], ['Payment method', v.paymentMethod]]);
  doc.kv([['Task / deliverable', v.taskDescription]], 1);
  doc.totals([
    ['Amount', money(v.amount)],
    ...(v.whtWithheld ? [['Withholding Tax (6%) deducted', `-${money(v.whtAmount)}`]] : []),
    ['Net amount disbursed', money(net), { bold: true, fill: LIGHT }],
  ]);
  doc.para(`I acknowledge receipt of the above amount in full settlement for the task/deliverable described, under the Independent Service and Task Execution Agreement between myself and ${COMPANY_INFO.name}.`);
  doc.signatures('Service provider signature / thumbprint & date', 'Paid by (company representative) & date');
  doc.finish(`voucher-${v.ref}`);
};

export const downloadDividendPdf = async (d) => {
  const doc = await startDoc({
    eyebrow: 'Dividend Certificate',
    rightLines: [`Ref: ${d.ref || '-'}`, `Date: ${dateStr(d.date)}`],
    footerNote: 'Dividend certificate - retain with board resolution for 5 years',
  });
  doc.title('Dividend Distribution & Withholding Tax Certificate');
  doc.para(`Pursuant to a resolution of the Director/Shareholder of ${COMPANY_INFO.name} dated ${dateStr(d.date)}${d.resolutionRef ? ` (Resolution Ref: ${d.resolutionRef})` : ''}, a dividend is declared and paid to ${d.shareholder || '-'} as follows:`);
  doc.totals([
    ['Gross dividend declared', money(d.amount)],
    ['Withholding Tax (15%, final tax)', `-${money(d.whtAmount)}`],
    ['Net amount paid to shareholder', money((Number(d.amount) || 0) - (Number(d.whtAmount) || 0)), { bold: true, fill: LIGHT }],
  ], 110);
  doc.para(`The 15% Withholding Tax above is remitted by ${COMPANY_INFO.name} to the URA as final tax on this dividend income.`, { size: 8.5, color: GREY, italic: true });
  doc.signatures(`For ${COMPANY_INFO.name}  -  Name & date`, `Received by shareholder: ${d.shareholder || ''}  -  Date`);
  doc.finish(`dividend-${d.ref}`);
};

export const downloadLoanPdf = async (l) => {
  const doc = await startDoc({
    eyebrow: 'Loan Facility Note',
    rightLines: [`Ref: ${l.ref || '-'}`, `Date: ${dateStr(l.disbursedDate)}`],
    footerNote: 'Loan facility & security summary note',
  });
  doc.title('Loan Facility & Security Summary Note');
  doc.kv([
    ['Lender', l.lender], ['Status', l.status],
    ['Principal (non-taxable liability)', money(l.principal)], ['Annual interest rate', l.interestRate ? `${l.interestRate}%` : '-'],
    ['Disbursement date', dateStr(l.disbursedDate)], ['Term (months)', l.termMonths],
    ['Outstanding balance', money(l.outstandingBalance)], ['Interest paid to date (deductible)', money(l.interestPaidTotal)],
    ['URSB debenture registration', l.debentureRegistered ? `Yes - Ref: ${l.debentureRegNo || '-'}` : 'No / unsecured'],
  ]);
  doc.para('Loan principal is a balance-sheet liability, not taxable income. Interest paid is an allowable deduction against Corporate Income Tax. Any debenture or mortgage securing this facility should be registered with the URSB Security Interest Registry, generally within 21-42 days of creation.', { size: 8.5, color: GREY, italic: true });
  doc.para(`Notes: ${l.notes || '-'}`, { size: 9 });
  doc.finish(`loan-${l.ref || l.lender}`);
};

export const downloadCitPdf = async (summary, assetsForYear = [], assetClassLabel = () => '') => {
  const txns = summary.transactions || [];
  const inc = txns.filter((t) => t.type === 'Income');
  const exp = txns.filter((t) => t.type === 'Expense');
  const sum = (l) => l.reduce((s, t) => s + (Number(t.grossAmount) || 0), 0);
  const withAllowance = assetsForYear.filter((a) => a._dep?.acquired);
  const totalAllow = withAllowance.reduce((s, a) => s + (a._dep.depreciation || 0), 0);
  const doc = await startDoc({
    eyebrow: 'Corporate Income Tax Computation',
    rightLines: [`Fiscal year: ${summary.label}`, `Generated: ${dateStr(new Date())}`],
    footerNote: `CIT computation FY ${summary.label} - working paper, review before filing`,
  });
  doc.title('Annual Corporate Income Tax Computation');
  doc.section(`1. Income & expense transactions - Tax Ledger, FY ${summary.label}`);
  doc.table({
    columns: [{ label: 'Ref', w: 1.3 }, { label: 'Date', w: 1.1 }, { label: 'Type', w: 0.9 }, { label: 'Object', w: 1.6 }, { label: 'Description', w: 2.6 }, { label: 'Amount', align: 'right', w: 1.3 }],
    rows: txns.map((t) => [t.ref, dateStr(t.date), t.type, t.object, t.description, money(t.grossAmount)]),
    foot: [[`Total gross income (${inc.length})`, '', '', '', '', money(sum(inc))], [`Total allowable expenses (${exp.length})`, '', '', '', '', money(sum(exp))]],
    emptyText: 'No transactions recorded for this fiscal year', fontSize: 7.8,
  });
  doc.section(`2. Capital allowances - Fixed Asset Register, FY ${summary.label}`);
  doc.table({
    columns: [{ label: 'Ref', w: 1 }, { label: 'Asset', w: 2 }, { label: 'Class', w: 2.2 }, { label: 'Opening BV', align: 'right', w: 1.3 }, { label: 'Allowance', align: 'right', w: 1.3 }, { label: 'Closing BV', align: 'right', w: 1.3 }],
    rows: withAllowance.map((a) => [a.ref, a.name, assetClassLabel(a.assetClass), money(a._dep.opening), money(a._dep.depreciation), money(a._dep.closing)]),
    foot: [['Total capital allowances', '', '', '', money(totalAllow), '']],
    emptyText: 'No depreciable assets held this fiscal year', fontSize: 7.8,
  });
  doc.section('3. Net profit for the financial year');
  doc.totals([
    ['Total gross income', money(summary.totalIncome)],
    ['Less: allowable operating expenses', `-${money(summary.totalExpenses)}`],
    ['Less: capital allowances', `-${money(summary.totalDepreciation)}`],
    ['Net profit (after capital allowances)', money(summary.netBeforeLoss), { bold: true, fill: GREEN_BG }],
  ], 120);
  doc.section('4. Loss relief & chargeable income');
  doc.totals([
    ['Loss brought forward', money(summary.lossCarriedIn)],
    ['Loss utilised this year', `-${money(summary.lossUtilised)}`],
    ['Chargeable income', money(summary.chargeable), { bold: true }],
    ['Loss carried forward', money(summary.lossCarriedOut)],
  ], 120);
  doc.section('5. Corporate Income Tax payable');
  doc.totals([
    ['CIT @ 30% of chargeable income', money(summary.citGross)],
    ['Less: WHT credits already collected', `-${money(summary.totalWhtCredits)}`],
    ['Net CIT payable', money(summary.citPayable), { bold: true, fill: RED_BG }],
    ['Output VAT collected (reference)', money(summary.totalVatCollected)],
  ], 120);
  doc.para('This computation is generated from internally recorded transactions and the fixed asset register. It is a working paper to support your annual URA filing - have it reviewed by a qualified accountant before submission.', { size: 8.5, color: GREY, italic: true });
  doc.finish(`cit-computation-${summary.label}`);
};

const statementTable = (doc, heading, rows, totalLabel, total, extraRows = []) => {
  doc.section(heading);
  doc.table({
    columns: [{ label: 'Code', w: 1 }, { label: 'Account', w: 4 }, { label: 'Balance', align: 'right', w: 1.6 }],
    rows: [...rows.map((a) => [a.code, a.name, money(a.balance)]), ...extraRows],
    foot: [['', totalLabel, money(total)]],
    emptyText: 'No accounts in this section',
  });
};

export const downloadBalanceSheetPdf = async (bs, is) => {
  const doc = await startDoc({ eyebrow: 'Balance Sheet', rightLines: [`As at: ${dateStr(new Date())}`], footerNote: 'Balance sheet' });
  doc.title('Balance Sheet');
  statementTable(doc, 'Assets', bs.assets, 'Total assets', bs.totalAssets);
  statementTable(doc, 'Liabilities', bs.liabilities, 'Total liabilities', bs.totalLiabilities);
  statementTable(doc, 'Equity', bs.equity, 'Total equity', bs.totalEquity, [['', 'Current-period earnings', money(is.netIncome)]]);
  doc.para(Math.abs(bs.balances) < 1
    ? 'Balance sheet balances (Assets = Liabilities + Equity).'
    : `Out of balance by ${money(Math.abs(bs.balances))} - check for unposted or misclassified entries.`, { size: 9, color: GREY, italic: true });
  doc.finish('balance-sheet');
};

export const downloadIncomeStatementPdf = async (is) => {
  const doc = await startDoc({ eyebrow: 'Income Statement', rightLines: [`Generated: ${dateStr(new Date())}`], footerNote: 'Income statement' });
  doc.title('Income Statement');
  statementTable(doc, 'Revenue', is.revenue, 'Total revenue', is.totalRevenue);
  statementTable(doc, 'Expenses', is.expenses, 'Total expenses', is.totalExpenses);
  doc.totals([['Net income', money(is.netIncome), { bold: true, fill: is.netIncome >= 0 ? GREEN_BG : RED_BG }]], 110);
  doc.finish('income-statement');
};

/** Monthly IT Operations & Business Expense statement (budget ceiling vs approved/reimbursed claims). */
export const downloadExpenseStatementPdf = async ({ period, budgetLines, claims, ceiling, spent }) => {
  const doc = await startDoc({
    eyebrow: 'IT Operations & Business Expense Statement',
    rightLines: [`Period: ${period}`, `Generated: ${dateStr(new Date())}`],
    footerNote: 'Business expense statement - separate from employee remuneration',
  });
  doc.title(`Expense Statement - ${period}`);
  doc.section('Budget vs actual by category');
  doc.table({
    columns: [{ label: 'Category', w: 3.5 }, { label: 'Ceiling', align: 'right', w: 1.3 }, { label: 'Spent', align: 'right', w: 1.3 }, { label: 'Remaining', align: 'right', w: 1.3 }],
    rows: budgetLines.map((b) => [b.category, money(b.ceiling), money(b.spent), money(b.ceiling - b.spent)]),
    foot: [['Total', money(ceiling), money(spent), money(ceiling - spent)]],
  });
  doc.section('Approved and paid claims');
  doc.table({
    columns: [{ label: 'Ref', w: 1.2 }, { label: 'Date', w: 1 }, { label: 'Category', w: 2 }, { label: 'Paid to / claimant', w: 1.8 }, { label: 'Receipt', w: 1.2 }, { label: 'Amount', align: 'right', w: 1.2 }],
    rows: claims.map((c) => [c.ref, dateStr(c.date), c.category, c.payee, c.receiptRef || '-', money(c.amount)]),
    emptyText: 'No claims this period', fontSize: 8,
  });
  doc.para('Budget ceilings are spending limits, not entitlements. Unspent amounts remain company funds. Every claim must be supported by an invoice or receipt.', { size: 8.5, color: GREY, italic: true });
  doc.finish(`expense-statement-${period}`);
};