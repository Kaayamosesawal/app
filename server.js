/**
 * server.js – Slirus Holdings API Server
 *
 * Responsibilities:
 *  - /api/send-email   → Sends transactional emails via Nodemailer + Mailtrap API
 *                        Called by Apply.jsx (on submission) and Admin.jsx (on status change)
 *  - Firebase (Firestore) is the database — this server has NO SQLite / file uploads.
 */

import 'dotenv/config';
import express    from 'express';
import nodemailer from 'nodemailer';
import cors       from 'cors';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',          // Vite dev server
    'http://localhost:3000',
    'https://slirus.web.app',
    'https://slirus.firebaseapp.com',
    process.env.CLIENT_ORIGIN,
  ].filter(Boolean),
}));
app.use(express.json());

// ─── Mailtrap SMTP transport ──────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.MAILTRAP_HOST,
  port: Number(process.env.MAILTRAP_PORT),
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});

// ─── HTML card email builder ──────────────────────────────────────────────────
const buildEmailHtml = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%"
         style="background:#f4f4f5;padding:24px;">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="520"
             style="background:#ffffff;border-radius:12px;overflow:hidden;
                    box-shadow:0 4px 16px rgba(0,0,0,0.10);">

        <!-- Logo -->
        <tr>
          <td align="center" style="padding:28px 20px 8px;">
            <img src="https://raw.githubusercontent.com/Kaayamosesawal/images/main/slirus_1.png"
                 alt="Slirus" width="72" height="72"
                 style="border-radius:50%;border:2px solid #e2e8f0;object-fit:cover;display:block;" />
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:8px 30px 4px;text-align:center;">
            <h2 style="color:#1e293b;margin:0;font-size:20px;">${title}</h2>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:16px 30px 24px;color:#475569;font-size:15px;line-height:1.7;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:14px;text-align:center;font-size:12px;color:#94a3b8;
                     background:#f8fafc;border-top:1px solid #e2e8f0;">
            &copy; ${new Date().getFullYear()} Slirus Holding Limited &nbsp;·&nbsp;
            <span style="color:#cbd5e1;">HR Department</span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── /api/send-email ──────────────────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  const { type, to, name, program } = req.body;

  if (!type || !to || !name || !program) {
    return res.status(400).json({ success: false, message: 'Missing required fields: type, to, name, program.' });
  }

  let subject, title, bodyHtml;

  if (type === 'application_received') {
    subject  = 'Application Received – Slirus Holding';
    title    = 'Application Received Successfully';
    bodyHtml = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>
        We are pleased to confirm that we have successfully received your application for the
        <strong>${program}</strong> position at Slirus Holding.
        We appreciate the time and effort you have invested in your application.
      </p>
      <p>
        Our hiring team is currently conducting a thorough review of all submitted profiles.
        Should your background meet our specific needs, a member of our Human Resources team
        will reach out to you directly via email or telephone to discuss the next steps.
      </p>
      <p style="margin-top:20px;">
        Thank you for your patience and for considering a career with Slirus Holding.
      </p>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">— Slirus HR Team</p>`;
  }

  else if (type === 'shortlisted') {
    subject  = 'Congratulations – You Have Been Nominated | Slirus Holding';
    title    = 'Congratulations!';
    bodyHtml = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>
        We are pleased to inform you that you have been <strong>Nominated</strong> for the
        <strong>${program}</strong> position at Slirus Holding.
      </p>
      <p>
        A member of our Human Resources team will contact you shortly to discuss the next
        steps in our recruitment process, including scheduling an interview.
      </p>
      <p style="margin-top:20px;">We look forward to speaking with you soon.</p>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">— Slirus HR Team</p>`;
  }

  else if (type === 'unqualified') {
    subject  = 'Update on Your Application | Slirus Holding';
    title    = 'Update on Your Application';
    bodyHtml = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>
        Thank you for your interest in Slirus Holding. After carefully reviewing your
        application for the <strong>${program}</strong> position, we have decided that your
        application will be <strong>Passed Over</strong> at this time.
      </p>
      <p>
        We truly appreciate the interest you have shown in our organisation and wish you
        the very best in your future professional endeavours.
      </p>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">— Slirus HR Team</p>`;
  }

  else if (type === 'position_closed') {
    subject  = 'Application Update | Slirus Holding';
    title    = 'Position Currently Closed';
    bodyHtml = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>
        Thank you for your interest in the <strong>${program}</strong> position at Slirus
        Holding. We are currently no longer accepting applications for this role as the
        recruitment process has been closed.
      </p>
      <p>
        We encourage you to monitor our careers page for future openings that may align
        with your expertise.
      </p>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">— Slirus HR Team</p>`;
  }

  else {
    return res.status(400).json({ success: false, message: `Unknown email type: "${type}"` });
  }

  try {
    await transporter.sendMail({
      from:    '"Slirus HR Team" <hr@slirus.com>',
      to,
      subject,
      html:    buildEmailHtml(title, bodyHtml),
    });
    console.log(`[Email] "${type}" sent to ${to}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Email] Delivery error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'Slirus Email API' }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Slirus Email Server running on http://localhost:${PORT}`));