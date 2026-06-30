/**
 * server.js – Slirus Holdings Email API Server
 *
 * Production-ready Node.js/Express server that handles all transactional
 * emails for the Slirus Holdings recruitment platform.
 *
 * Endpoints:
 *   POST /api/send-email  – Dispatch recruitment emails via Resend
 *   GET  /api/health      – Health check for uptime monitors & Render keep-alive
 *
 * Environment variables (set in Render dashboard, never commit to git):
 *   PORT              – HTTP port (Render sets this automatically)
 *   CLIENT_ORIGIN     – Production frontend URL (e.g. https://slirus.web.app)
 *   RESEND_API_KEY    – Your Resend API key
 *   RESEND_FROM       – Sender address (must match your verified sending domain)
 *   RENDER_EXTERNAL_URL – Set automatically by Render; used for keep-alive pings
 */

import 'dotenv/config';
import express    from 'express';
import { Resend } from 'resend';
import cors       from 'cors';

// ─── Validate required environment variables on startup ───────────────────────
const REQUIRED_ENV = ['RESEND_API_KEY'];
const missingEnv   = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`[Server] ❌ Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('[Server] Set them in your Render dashboard under Environment.');
  process.exit(1);
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PORT              = process.env.PORT              || 3001;
const FROM_ADDRESS      = process.env.RESEND_FROM      || 'Slirus HR Team <hr@slirus.com>';
// Project requests are sent on behalf of the general Slirus inbox, not HR.
const PROJECTS_FROM     = process.env.RESEND_FROM_PROJECTS || 'Slirus Holding <info@slirus.com>';
const NODE_ENV          = process.env.NODE_ENV           || 'development';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://slirus.com',
  'https://slirus.web.app',
  'https://slirus.firebaseapp.com',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

// ─── Valid email types ────────────────────────────────────────────────────────
const EMAIL_TYPES = new Set([
  'application_received',
  'shortlisted',
  'unqualified',
  'position_closed',
  // Project / proposal request lifecycle
  'project_request_received',
  'project_accepted',
  'project_declined',
]);

// Email types that should be sent from the general Slirus inbox (info@)
// rather than the HR inbox, since they relate to client/business inquiries.
const PROJECT_EMAIL_TYPES = new Set([
  'project_request_received',
  'project_accepted',
  'project_declined',
]);

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();

// IMPORTANT: Allow preflight OPTIONS requests for all routes (required for CORS)
app.options('*', cors());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin header) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked request from: ${origin}`);
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '16kb' }));

// ─── Resend client ────────────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('[Email] ✅ Resend client initialized');

// ─── Email HTML template ──────────────────────────────────────────────────────
const buildEmailHtml = (title, bodyHtml, department = 'HR Department') => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
         style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
             style="max-width:560px;background:#ffffff;border-radius:12px;
                    overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header / Logo -->
        <tr>
          <td align="center"
              style="padding:32px 24px 12px;background:#ffffff;">
            <img src="https://raw.githubusercontent.com/Kaayamosesawal/images/main/slirus_1.png"
                 alt="Slirus Holding" width="72" height="72"
                 style="display:block;border-radius:50%;
                        border:2px solid #e2e8f0;object-fit:cover;" />
            <p style="margin:12px 0 0;font-size:12px;font-weight:700;
                      letter-spacing:2px;color:#94a3b8;text-transform:uppercase;">
              Slirus Holding Limited
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 24px;">
            <hr style="border:none;border-top:1px solid #f1f5f9;margin:0;" />
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:24px 32px 8px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#1e293b;
                       line-height:1.3;">
              ${title}
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:16px 32px 32px;color:#475569;
                     font-size:15px;line-height:1.75;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;text-align:center;
                     background:#f8fafc;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              &copy; ${new Date().getFullYear()} Slirus Holding Limited &nbsp;&middot;&nbsp;
              ${department}<br />
              <span style="font-size:11px;color:#cbd5e1;">
                This is an automated message — please do not reply directly to this email.
              </span>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── Email content factory ────────────────────────────────────────────────────
const buildEmailContent = (type, name, program) => {
  switch (type) {

    case 'application_received':
      return {
        subject: `Application Received – ${program} | Slirus Holding`,
        title:   'Application Received Successfully',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            We are pleased to confirm that we have successfully received your application
            for the <strong>${program}</strong> position at Slirus Holding. We sincerely
            appreciate the time and effort you have invested in your application.
          </p>
          <p>
            Our hiring team is currently conducting a thorough review of all submitted
            profiles to ensure each candidate's qualifications align with our current
            organisational requirements. Please be advised that this review process may
            take several business days.
          </p>
          <p>
            Should your background and expertise meet our specific needs, a member of our
            Human Resources team will reach out to you directly via email or telephone to
            discuss the next steps in our recruitment process.
          </p>
          <p style="margin-top:24px;">
            Thank you for your patience and for considering a career with Slirus Holding.
            We wish you the very best in your professional endeavours.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Warm regards,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };

    case 'shortlisted':
      return {
        subject: `Congratulations — You Have Been Nominated | Slirus Holding`,
        title:   'Congratulations! 🎉',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            We are delighted to inform you that you have been <strong>Nominated</strong>
            for the <strong>${program}</strong> position at Slirus Holding.
          </p>
          <p>
            After a comprehensive review of your qualifications, our hiring team has
            identified your profile as a strong match for the requirements and values
            of our organisation.
          </p>
          <p>
            A member of our Human Resources team will contact you shortly via email or
            telephone to discuss the next steps in our recruitment process, including
            scheduling an interview at a mutually convenient time.
          </p>
          <p style="margin-top:24px;">
            We look forward to speaking with you soon and thank you for your continued
            interest in Slirus Holding.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Warm regards,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };

    case 'unqualified':
      return {
        subject: `Update on Your Application | Slirus Holding`,
        title:   'Update on Your Application',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Thank you for your interest in Slirus Holding and for taking the time to
            apply for the <strong>${program}</strong> position.
          </p>
          <p>
            After a careful and thorough review of all applications received, we regret
            to inform you that your application will not be progressing further at this
            time. This decision was made because your current background does not fully
            align with the specific requirements we are seeking for this particular role.
          </p>
          <p>
            We genuinely appreciate the effort you put into your application and encourage
            you to continue monitoring our careers page for future openings that may be a
            better match for your expertise and experience.
          </p>
          <p style="margin-top:24px;">
            We wish you the very best in your future professional endeavours.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Kind regards,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };

    case 'position_closed':
      return {
        subject: `Application Update — Position Closed | Slirus Holding`,
        title:   'Position Currently Closed',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Thank you for your interest in the <strong>${program}</strong> position at
            Slirus Holding. We genuinely appreciate the time, effort, and professional
            consideration you invested in your application.
          </p>
          <p>
            Please be advised that we are currently no longer accepting applications for
            this specific role, as the recruitment process for this position has been
            formally closed.
          </p>
          <p>
            We were impressed by your initiative and strongly encourage you to continue
            monitoring our careers page for future openings that may align with your
            expertise. We are constantly growing and would welcome the opportunity to
            review your profile for upcoming roles.
          </p>
          <p style="margin-top:24px;">
            Thank you again for considering a career with Slirus Holding.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Kind regards,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };

    // ── Project / Proposal Requests ─────────────────────────────────────────

    case 'project_request_received':
      return {
        subject: `We've Received Your Project Request — ${program} | Slirus Holding`,
        title:   'Thank You for Trusting Slirus',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Thank you for reaching out and choosing <strong>Slirus Holding</strong> to
            help bring <strong>${program}</strong> to life. We have successfully received
            your project request, and we sincerely appreciate the trust you've placed in
            our team to support your goals.
          </p>
          <p>
            Your submission is now with our project review team, who will carefully assess
            the scope, timeline, and requirements you've shared. We take every request
            seriously and aim to respond with a tailored proposal as quickly as possible,
            typically within 2–3 business days.
          </p>
          <p>
            In the meantime, if you'd like to share any additional details, references, or
            documents that could help us better understand your vision, feel free to reply
            to this email at any time.
          </p>
          <p style="margin-top:24px;">
            We're genuinely excited about the possibility of working together and thank you
            once again for considering Slirus for your project.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Warm regards,<br /><strong style="color:#475569;">The Slirus Team</strong>
          </p>`,
      };

    case 'project_accepted':
      return {
        subject: `Your Project Has Been Accepted — ${program} | Slirus Holding`,
        title:   'Great News — We\'re On Board! 🎉',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            We're delighted to let you know that after reviewing your request, our team
            has accepted <strong>${program}</strong> and we're excited to begin working
            with you.
          </p>
          <p>
            A member of our team will be in touch shortly to discuss next steps, including
            scope confirmation, timeline alignment, and contract details, so we can get
            started on delivering the best possible outcome for your business.
          </p>
          <p style="margin-top:24px;">
            Thank you again for trusting Slirus Holding with your project. We look forward
            to a successful partnership.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Warm regards,<br /><strong style="color:#475569;">The Slirus Team</strong>
          </p>`,
      };

    case 'project_declined':
      return {
        subject: `Update on Your Project Request — ${program} | Slirus Holding`,
        title:   'Update on Your Project Request',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Thank you for considering Slirus Holding for <strong>${program}</strong>, and
            for taking the time to share the details of your project with us.
          </p>
          <p>
            After careful review, we've determined that we're not able to take on this
            particular project at this time, whether due to current capacity, scope
            alignment, or other internal factors. This decision is in no way a reflection
            of the value of your project.
          </p>
          <p>
            We genuinely appreciate the opportunity to learn about your goals and would
            welcome the chance to work together on future projects that may be a better
            fit.
          </p>
          <p style="margin-top:24px;">
            Thank you again for your interest and trust in Slirus Holding.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Kind regards,<br /><strong style="color:#475569;">The Slirus Team</strong>
          </p>`,
      };

    default:
      return null;
  }
};

// ─── POST /api/send-email ─────────────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  const { type, to, name, program } = req.body ?? {};

  if (!type || !to || !name || !program) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields. Expected: type, to, name, program.',
    });
  }

  if (!EMAIL_TYPES.has(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid email type "${type}". Valid types: ${[...EMAIL_TYPES].join(', ')}.`,
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return res.status(400).json({ success: false, message: `Invalid recipient email: "${to}"` });
  }

  const content = buildEmailContent(type, name, program);
  if (!content) {
    return res.status(500).json({ success: false, message: 'Failed to build email content.' });
  }

  // Project-related emails come from the general inbox (info@) with a
  // matching footer label; recruitment emails keep the existing HR sender.
  const isProjectEmail = PROJECT_EMAIL_TYPES.has(type);
  const senderAddress  = isProjectEmail ? PROJECTS_FROM : FROM_ADDRESS;
  const department     = isProjectEmail ? 'Client Relations' : 'HR Department';

  try {
    const { data, error } = await resend.emails.send({
      from:    senderAddress,
      to,
      subject: content.subject,
      html:    buildEmailHtml(content.title, content.body, department),
    });

    if (error) {
      throw new Error(error.message || 'Resend API error');
    }

    console.log(`[Email] ✅ "${type}" → ${to} | from: ${senderAddress} | messageId: ${data.id}`);
    return res.status(200).json({ success: true, messageId: data.id });

  } catch (err) {
    console.error(`[Email] ❌ Failed to send "${type}" → ${to}:`, err.message);
    return res.status(500).json({
      success: false,
      message: NODE_ENV === 'production'
        ? 'Email delivery failed. Please try again later.'
        : err.message,
    });
  }
});

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status:    'ok',
    service:   'Slirus Email API',
    env:       NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({
    success: false,
    message: NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`  Slirus Email API`);
  console.log(`  Environment : ${NODE_ENV}`);
  console.log(`  Port        : ${PORT}`);
  console.log(`  Email via   : Resend`);
  console.log(`  From (HR)   : ${FROM_ADDRESS}`);
  console.log(`  From (Proj) : ${PROJECTS_FROM}`);
  console.log('─────────────────────────────────────────');
});

// ─── Render free-tier keep-alive ──────────────────────────────────────────────
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_URL) {
  const PING_INTERVAL = 14 * 60 * 1000;
  setInterval(async () => {
    try {
      const res = await fetch(`${RENDER_URL}/api/health`);
      console.log(`[Keep-alive] Ping → ${res.status}`);
    } catch (err) {
      console.warn('[Keep-alive] Ping failed:', err.message);
    }
  }, PING_INTERVAL);
  console.log(`[Keep-alive] Self-ping enabled → ${RENDER_URL}/api/health`);
}