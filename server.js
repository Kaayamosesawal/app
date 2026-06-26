/**
 * server.js – Slirus Holdings API Server
 *
 * Responsibilities:
 *  - /api/send-email   → Sends transactional emails via Nodemailer + Mailtrap API
 *                        Called by Apply.jsx (on submission) and Admin.jsx (on status change)
 *  - Firebase (Firestore) is the database — this server has NO SQLite / file uploads.
 *
 * Mailtrap API key: a42b246827ddfb94583a1d28a30f06e7
 */

import express   from 'express';
import nodemailer from 'nodemailer';
import cors      from 'cors';

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://slirus.web.app',
    'https://slirus.firebaseapp.com'
  ]
}));
app.use(express.json());

// ─── Mailtrap SMTP transport (sending API) ────────────────────────────────────
// Uses Mailtrap's sending domain via their SMTP API endpoint.
const transporter = nodemailer.createTransport({
  host: 'live.smtp.mailtrap.io',
  port: 587,
  auth: {
    user: 'api',
    pass: 'a42b246827ddfb94583a1d28a30f06e7',
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
//
// Expected body:
// {
//   type:     'application_received' | 'shortlisted' | 'unqualified' | 'position_closed',
//   to:       'applicant@email.com',
//   name:     'Full Name',
//   program:  'Software Developer',
// }
//
app.post('/api/send-email', async (req, res) => {
  const { type, to, name, program } = req.body;

  if (!type || !to || !name || !program) {
    return res.status(400).json({ success: false, message: 'Missing required fields: type, to, name, program.' });
  }

  let subject, title, bodyHtml;

  // ── 1. Application received ──────────────────────────────────────────────
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
        Our hiring team is currently conducting a thorough review of all submitted profiles to
        ensure each candidate's qualifications align with our current organisational requirements.
        This review process may take several business days.
      </p>
      <p>
        Should your background meet our specific needs, a member of our Human Resources team
        will reach out to you directly via email or telephone to discuss the next steps.
      </p>
      <p style="margin-top:20px;">
        Thank you for your patience and for considering a career with Slirus Holding.<br/>
        We wish you the very best in your professional endeavours.
      </p>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
        — Slirus HR Team
      </p>`;
  }

  // ── 2. Shortlisted / Nominated ────────────────────────────────────────────
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
        After a comprehensive review of your qualifications, our hiring team has identified
        your profile as a strong match for the requirements and values of our organisation.
      </p>
      <p>
        A member of our Human Resources team will contact you shortly via email or telephone
        to discuss the next steps in our recruitment process, including scheduling an interview.
      </p>
      <p style="margin-top:20px;">
        Thank you for your continued interest in Slirus Holding. We look forward to speaking
        with you soon.
      </p>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
        — Slirus HR Team
      </p>`;
  }

  // ── 3. Unqualified / Passed Over ──────────────────────────────────────────
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
        This decision was made because your current background does not fully align with the
        specific technical or operational requirements we are seeking for this role.
      </p>
      <p>
        We truly appreciate the interest you have shown in our organisation and the effort
        you put into your application. We wish you the very best in your future professional
        endeavours and hope you will consider Slirus Holding for future openings that may be
        a better match for your expertise.
      </p>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
        — Slirus HR Team
      </p>`;
  }

  // ── 4. Position closed (submitted to a closed track) ─────────────────────
  else if (type === 'position_closed') {
    subject  = 'Application Update | Slirus Holding';
    title    = 'Position Currently Closed';
    bodyHtml = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>
        Thank you for your interest in the <strong>${program}</strong> position at Slirus
        Holding. We genuinely appreciate the time, effort, and professional consideration
        you invested in your application.
      </p>
      <p>
        Please be advised that we are currently no longer accepting applications for this
        specific role, as the recruitment process for this position has been closed.
      </p>
      <p>
        We were impressed by your background and encourage you to continue monitoring our
        careers page for future openings that may align with your expertise.
      </p>
      <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
        — Slirus HR Team
      </p>`;
  }

  // ── Unknown type ───────────────────────────────────────────────────────────
  else {
    return res.status(400).json({ success: false, message: `Unknown email type: "${type}"` });
  }

  // ── Send ───────────────────────────────────────────────────────────────────
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