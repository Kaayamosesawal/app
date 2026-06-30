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
//
//  Anti-spam enforcement layers applied:
//  1. Full HTML5 DOCTYPE + XML namespaces (Outlook MSO compatibility)
//  2. Preheader text — controls the snippet Gmail/Outlook show in the inbox
//     list view, making the email look legitimate before it is even opened
//  3. Table-only layout — CSS-heavy DIV layouts score poorly in spam filters
//  4. Physical mailing address in footer (CAN-SPAM / GDPR requirement)
//  5. Visible unsubscribe link (CAN-SPAM / CASL requirement)
//  6. "You received this because…" explanation — removes the "Why am I
//     getting this?" confusion that causes spam reports
//  7. No spam-trigger words in subject/body helpers (handled at call sites)
//  8. Plain-text version sent alongside every email (see buildPlainText)
//  9. reply_to set to a real monitored inbox — "noreply@" hurts reputation
// 10. List-Unsubscribe + List-Unsubscribe-Post headers (Gmail one-click)
// 11. Precedence: transactional (not "bulk" which implies marketing)
// 12. X-Entity-Ref-ID per send — prevents duplicate-detection false positives
//
const buildEmailHtml = (title, bodyHtml, department = 'HR Department', recipientEmail = '') => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <!--[if !mso]><!-->
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <!--<![endif]-->
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Preheader: hidden text that appears as inbox snippet in Gmail/Outlook.
       Pad with spaces/zero-width chars so nothing bleeds into the visible email. -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;
              font-size:1px;line-height:1px;color:#f4f4f5;">
    ${title} — Slirus Holding Limited · Official Correspondence
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
         style="background-color:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">

      <!-- Email card -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560"
             style="max-width:560px;background-color:#ffffff;border-radius:12px;
                    overflow:hidden;border:1px solid #e2e8f0;">

        <!-- ── HEADER / LOGO ── -->
        <tr>
          <td align="center" style="padding:32px 24px 16px;background-color:#ffffff;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:10px;vertical-align:middle;">
                  <img src="https://raw.githubusercontent.com/Kaayamosesawal/images/main/slirus_1.png"
                       alt="Slirus Holding"
                       width="48" height="48"
                       style="display:block;border-radius:50%;border:2px solid #e2e8f0;
                              object-fit:cover;outline:none;text-decoration:none;
                              -ms-interpolation-mode:bicubic;" />
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:17px;font-weight:700;color:#1e293b;
                            letter-spacing:-0.3px;font-family:Arial,Helvetica,sans-serif;">
                    Slirus <span style="color:#475569;font-weight:400;">Holding</span>
                  </p>
                  <p style="margin:2px 0 0;font-size:10px;font-weight:700;letter-spacing:2px;
                            color:#94a3b8;text-transform:uppercase;
                            font-family:Arial,Helvetica,sans-serif;">
                    ${department}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 24px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="border-top:1px solid #f1f5f9;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- ── TITLE ── -->
        <tr>
          <td style="padding:24px 32px 8px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#1e293b;
                       line-height:1.3;font-family:Arial,Helvetica,sans-serif;">
              ${title}
            </h1>
          </td>
        </tr>

        <!-- ── BODY ── -->
        <tr>
          <td style="padding:16px 32px 32px;color:#475569;font-size:15px;
                     line-height:1.75;font-family:Arial,Helvetica,sans-serif;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <!--
          CAN-SPAM / CASL compliance:
          - Physical mailing address of sender
          - Clear identification of sender
          - Reason recipient is receiving this email
          - Visible unsubscribe mechanism
        -->
        <tr>
          <td style="padding:20px 32px 24px;text-align:center;
                     background-color:#f8fafc;border-top:1px solid #f1f5f9;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#475569;
                      font-family:Arial,Helvetica,sans-serif;">
              Slirus Holding Limited
            </p>
            <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.6;
                      font-family:Arial,Helvetica,sans-serif;">
              Plot 14, Parliament Avenue, Kampala, Uganda &nbsp;&middot;&nbsp; info@slirus.com
            </p>
            <p style="margin:0 0 10px;font-size:11px;color:#94a3b8;line-height:1.6;
                      font-family:Arial,Helvetica,sans-serif;">
              &copy; ${new Date().getFullYear()} Slirus Holding Limited. All rights reserved.
            </p>
            <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;line-height:1.6;
                      font-family:Arial,Helvetica,sans-serif;">
              You are receiving this email because you submitted an inquiry or application
              through <a href="https://slirus.com" style="color:#94a3b8;text-decoration:underline;">slirus.com</a>.
              If this was not you, please disregard this message.
            </p>
            ${recipientEmail ? `
            <p style="margin:0;font-size:11px;color:#cbd5e1;font-family:Arial,Helvetica,sans-serif;">
              <a href="https://slirus.com/unsubscribe?email=${encodeURIComponent(recipientEmail)}"
                 style="color:#cbd5e1;text-decoration:underline;">Unsubscribe</a>
              &nbsp;&middot;&nbsp;
              <a href="https://slirus.com/privacy"
                 style="color:#cbd5e1;text-decoration:underline;">Privacy Policy</a>
            </p>` : ''}
          </td>
        </tr>

      </table>
      <!-- /Email card -->

    </td></tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>`;

// ─── Plain-text fallback builder ─────────────────────────────────────────────
//
//  Sending a text/plain alternative alongside the HTML part is one of the
//  single most effective anti-spam measures. HTML-only emails with no text
//  part are a strong spam signal in SpamAssassin, Gmail, and Outlook filters.
//
const buildPlainText = (title, name, program, type, department) => {
  const year = new Date().getFullYear();
  const divider = '─'.repeat(56);

  const bodies = {
    application_received: [
      `Dear ${name},`,
      '',
      `We have successfully received your application for the ${program} position`,
      'at Slirus Holding. Thank you for the time and effort you invested.',
      '',
      'Our hiring team is reviewing all profiles and will contact you directly',
      'if your background aligns with our current needs.',
      '',
      'Thank you for your patience and for considering a career with Slirus Holding.',
    ],
    shortlisted: [
      `Dear ${name},`,
      '',
      `Congratulations — you have been nominated for the ${program} position`,
      'at Slirus Holding.',
      '',
      'A member of our HR team will contact you shortly to discuss next steps,',
      'including scheduling an interview.',
      '',
      'We look forward to speaking with you soon.',
    ],
    unqualified: [
      `Dear ${name},`,
      '',
      `Thank you for applying for the ${program} position at Slirus Holding.`,
      '',
      'After careful review, we regret to inform you that your application will',
      'not be progressing further at this time, as your current background does',
      'not fully align with the specific requirements for this role.',
      '',
      'We encourage you to monitor our careers page for future openings.',
      'We wish you the very best in your professional endeavours.',
    ],
    position_closed: [
      `Dear ${name},`,
      '',
      `Thank you for your interest in the ${program} position at Slirus Holding.`,
      '',
      'We regret to inform you that we are no longer accepting applications for',
      'this role, as the recruitment process has been formally closed.',
      '',
      'We encourage you to visit our careers page for future openings.',
    ],
    project_request_received: [
      `Dear ${name},`,
      '',
      `Thank you for submitting your project request: ${program}.`,
      '',
      'We have received your request and our project review team will carefully',
      'assess the scope, timeline, and requirements you shared. We aim to respond',
      'with a tailored proposal within 2–3 business days.',
      '',
      'Feel free to reply to this email with any additional details.',
    ],
    project_accepted: [
      `Dear ${name},`,
      '',
      `Great news — we have accepted your project: ${program}.`,
      '',
      'A member of our team will be in touch shortly to discuss next steps,',
      'including scope confirmation, timeline alignment, and contract details.',
      '',
      'Thank you for trusting Slirus Holding with your project.',
    ],
    project_declined: [
      `Dear ${name},`,
      '',
      `Thank you for considering Slirus Holding for: ${program}.`,
      '',
      'After careful review, we are not able to take on this particular project',
      'at this time. This is in no way a reflection of the value of your project.',
      '',
      'We would welcome the chance to work together on future projects.',
    ],
  };

  const bodyLines = bodies[type] ?? [`Dear ${name},`, '', 'Thank you for contacting Slirus Holding.'];

  return [
    title.toUpperCase(),
    divider,
    '',
    ...bodyLines,
    '',
    `Warm regards,`,
    `Slirus Holding — ${department}`,
    '',
    divider,
    `© ${year} Slirus Holding Limited`,
    'Plot 14, Parliament Avenue, Kampala, Uganda',
    'info@slirus.com  |  https://slirus.com',
    '',
    'You received this because you submitted an inquiry or application at slirus.com.',
    'To unsubscribe: https://slirus.com/unsubscribe',
  ].join('\n');
};

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
    const html      = buildEmailHtml(content.title, content.body, department, to);
    const text      = buildPlainText(content.title, name, program, type, department);
    const messageId = `slirus-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const replyTo   = isProjectEmail ? 'info@slirus.com' : 'hr@slirus.com';

    const { data, error } = await resend.emails.send({
      from:     senderAddress,
      to,
      reply_to: replyTo,        // Real monitored inbox — "noreply" hurts deliverability
      subject:  content.subject,
      html,
      text,                     // Plain-text alternative — HTML-only emails score as spam
      headers: {
        // Marks email as transactional (not bulk/marketing) — respected by Gmail & Outlook
        'Precedence':              'transactional',
        // One-click unsubscribe button in Gmail/Outlook inbox header (RFC 8058)
        'List-Unsubscribe':        `<https://slirus.com/unsubscribe?email=${encodeURIComponent(to)}>, <mailto:${replyTo}?subject=Unsubscribe>`,
        'List-Unsubscribe-Post':   'List-Unsubscribe=One-Click',
        // Unique per-message ID prevents duplicate-detection false positives
        'X-Entity-Ref-ID':         messageId,
        // Identifies the sending system — helps corporate mail gateways trust the source
        'X-Mailer':                'Slirus-Email-API/1.0',
      },
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
  console.log('  Deliverability checklist (DNS required):');
  console.log('  ✉  SPF   — TXT record on your sending domain');
  console.log('             e.g. "v=spf1 include:amazonses.com ~all"');
  console.log('             (Resend adds this when you verify a domain)');
  console.log('  🔑 DKIM  — CNAME records from Resend domain settings');
  console.log('  🛡  DMARC — TXT _dmarc.<domain>');
  console.log('             e.g. "v=DMARC1; p=quarantine; rua=mailto:dmarc@slirus.com"');
  console.log('  Without all three, mail WILL land in spam regardless of code.');
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