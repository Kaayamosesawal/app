/**
 * pdfBrand.js – Shared PDF branding utilities for Slirus Global Limited documents.
 *
 * Every downloadable PDF in the app (career applications, admin copies,
 * project requests, and project proposals) shares the same letterhead,
 * footer, and color-handling logic. Centralising it here keeps every
 * document visually consistent and carrying the Slirus Global Limited logo
 * (public/Slirus.png).
 */

const LOGO_PATH = '/Slirus.png';
// The logo is only drawn ~15 mm wide, so 256 px is already sharp when printed.
// Embedding the original (often several MB) is what made letter PDFs huge.
const LOGO_MAX_PX = 256;
let _logoCache = null;
let _logoPromise = null;

/**
 * Fetches the Slirus Global Limited logo from the public folder and returns it as
 * a base64 data URL suitable for jsPDF's addImage(). Cached after first load
 * so repeated PDF generations don't re-fetch it. Resolves to `null` (never
 * throws) if the logo can't be loaded, so PDF generation always continues
 * even if the image is missing.
 */
export const loadLogoDataUrl = async () => {
  if (_logoCache) return _logoCache;
  if (_logoPromise) return _logoPromise;

  _logoPromise = (async () => {
    try {
      const res = await fetch(LOGO_PATH);
      if (!res.ok) throw new Error(`Logo fetch failed (${res.status})`);
      const blob = await res.blob();
      const original = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read logo file'));
        reader.readAsDataURL(blob);
      });
      // Downscale to a small PNG (keeps transparency). Falls back to the original on any failure.
      let dataUrl = original;
      try {
        const img = await new Promise((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = () => reject(new Error('Could not decode logo'));
          im.src = original;
        });
        const scale = Math.min(1, LOGO_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight));
        if (scale < 1) {
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const small = canvas.toDataURL('image/png');
          if (small.length < original.length) dataUrl = small;
        }
      } catch (e) {
        console.warn('[PDF] Logo downscale skipped:', e.message);
      }
      _logoCache = dataUrl;
      return dataUrl;
    } catch (err) {
      console.warn('[PDF] Slirus logo could not be loaded — continuing without it:', err.message);
      return null;
    }
  })();

  return _logoPromise;
};

/** Converts a hex color string to an [r, g, b] triple, falling back to Slirus navy. */
export const hexToRgb = (hex) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [26, 60, 94];
};

/**
 * Draws the standard Slirus Global Limited letterhead across the top of the
 * current page: a navy header bar, the logo in a white badge (if available),
 * the company name, a document eyebrow line, and up to two right-aligned
 * meta lines (e.g. reference number, date, position).
 *
 * Returns the y-coordinate immediately below the header where the document
 * body can safely start.
 */
export const drawLetterhead = (pdf, {
  logoDataUrl,
  eyebrow,
  rightLines = [],
  height = 30,
  margin = 20,
} = {}) => {
  const PW = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(26, 60, 94);
  pdf.rect(0, 0, PW, height, 'F');

  let textX = margin;
  if (logoDataUrl) {
    const badge = height - 10;
    const badgeY = (height - badge) / 2;
    try {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, badgeY, badge, badge, 2, 2, 'F');
      pdf.addImage(logoDataUrl, 'PNG', margin + 1.4, badgeY + 1.4, badge - 2.8, badge - 2.8, 'slirus-logo', 'FAST');
      textX = margin + badge + 8;
    } catch (err) {
      textX = margin;
    }
  }

  pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
  pdf.text('SLIRUS GLOBAL LIMITED', textX, height / 2 - 1);

  if (eyebrow) {
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(210, 224, 238);
    pdf.text(eyebrow, textX, height / 2 + 6.5);
  }

  if (rightLines.length) {
    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(255, 255, 255);
    const startY = height / 2 - (rightLines.length - 1) * 3.5;
    rightLines.forEach((line, i) => {
      pdf.text(String(line), PW - margin, startY + i * 7, { align: 'right' });
    });
  }

  return height + 12;
};

/**
 * Stamps a consistent footer (divider line, left-hand note, page numbers)
 * onto every page currently in the document. Call once, after all content
 * has been added, right before pdf.save().
 */
export const drawFooter = (pdf, { note = 'Slirus Global Limited', confidential = false, margin = 20 } = {}) => {
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const total = pdf.internal.getNumberOfPages();
  const label = confidential ? `${note} · Confidential` : note;

  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(220, 226, 232); pdf.setLineWidth(0.4);
    pdf.line(margin, PH - 15, PW - margin, PH - 15);
    pdf.setFontSize(7.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(150, 150, 150);
    pdf.text(label, margin, PH - 10);
    pdf.text(`Page ${p} of ${total}`, PW - margin, PH - 10, { align: 'right' });
  }
};