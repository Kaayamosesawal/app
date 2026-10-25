/**
 * server.js – Slirus Global Limited Email API Server
 *
 * Production-ready Node.js/Express server that handles all transactional
 * emails for the Slirus Global Limited recruitment platform, plus the small set
 * of privileged Firebase Auth operations the CEO Control Center needs
 * (CeoManager.jsx) to provision team accounts.
 *
 * Endpoints:
 *   POST /api/send-email          – Dispatch recruitment/account emails via Resend
 *   POST /api/create-user         – (CEO-only) Create a Firebase Auth user + temp password
 *   POST /api/set-user-disabled   – (CEO-only) Enable/disable a Firebase Auth user
 *   POST /api/delete-user         – (CEO-only) Permanently delete a Firebase Auth user
 *   POST /api/interview/invite    – (CEO-only) Email a shortlisted applicant their private online-interview link
 *   POST /api/interview/start     – (Applicant) Verify link + email, start / resume the 30-minute timed interview
 *   POST /api/interview/save      – (Applicant) Autosave answers during the interview
 *   POST /api/interview/submit    – (Applicant) Finish; the server grades against the in-code answer key
 *   GET  /api/health              – Health check for uptime monitors & Render keep-alive
 *
 * "CEO-only" routes require an `Authorization: Bearer <Firebase ID token>` header.
 * The token is verified server-side with firebase-admin and the decoded email
 * must match CEO_EMAIL — this is the real authorization boundary; the matching
 * client-side check in CeoManager.jsx is a UX gate only, never trust it alone.
 *
 * Environment variables (set in Render dashboard, never commit to git):
 *   PORT                      – HTTP port (Render sets this automatically)
 *   CLIENT_ORIGIN             – Production frontend URL (e.g. https://slirus.web.app)
 *   RESEND_API_KEY            – Your Resend API key
 *   RESEND_FROM               – Sender address (must match your verified sending domain)
 *   RESEND_FROM_PROJECTS      – Sender for project emails, e.g. Slirus Operations Team <info@slirus.com>
 *                               (overrides the built-in default — set or remove it on your host)
 *   RENDER_EXTERNAL_URL       – Set automatically by Render; used for keep-alive pings
 *   CEO_EMAIL                 – Email allowed to call the user-management endpoints
 *   FIREBASE_SERVICE_ACCOUNT_KEY
 *       – JSON string (or base64 of it) of a Firebase service account key with
 *         Auth Admin rights. Generate via Firebase Console → Project Settings →
 *         Service Accounts → "Generate new private key". Without this set, the
 *         three user-management endpoints respond 503 and email sending still
 *         works normally.
 */

import 'dotenv/config';
import express    from 'express';
import { Resend } from 'resend';
import cors       from 'cors';
import { initializeApp as initFirebaseAdmin, cert as firebaseCert } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getFirebaseAdminFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import crypto from 'node:crypto';

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
// Project requests (received / accepted / declined) are sent by the Operations Team, not HR.
const PROJECTS_FROM     = process.env.RESEND_FROM_PROJECTS || 'Slirus Operations Team <info@slirus.com>';
const NODE_ENV          = process.env.NODE_ENV           || 'development';

// UX-gate email on the client (CeoManager.jsx) mirrors this — but this is the
// value that actually matters, since it's checked against a verified ID token.
const CEO_EMAIL = (process.env.CEO_EMAIL || 'kaayamosesawal@gmail.com').toLowerCase();

// Base URL of the deployed frontend, used to build the "Sign in" link in the
// account-provisioning email. Falls back to CLIENT_ORIGIN (already required
// for CORS) so no new env var is strictly needed in most deployments.
const PORTAL_BASE_URL = (process.env.PORTAL_BASE_URL || process.env.CLIENT_ORIGIN || 'https://slirus.com').replace(/\/$/, '');

// Department → portal route. Update these paths if your router uses
// different slugs; this is the single place that mapping lives.
const DEPARTMENT_PORTAL_PATHS = {
  Sales:          '/sales-manager',
  HR:             '/hr-manager',
  Finance:        '/accounts-manager',
  Administration: '/secretary-manager',
  Operations:     '/worker-log',
  Engineering:    '/worker-log',
  Marketing:      '/worker-log',
  Executive:      '/portals', // /ceo-manager is CEO-only; executives pick a portal from the menu
};

// Job role → portal route. The CEO console (CeoManager.jsx JOB_ROLES) provisions accounts
// by role, so the role decides where the welcome email sends the person; the department
// map above is only the fallback for older accounts. KEEP IN SYNC with JOB_ROLES there.
const ROLE_PORTAL_PATHS = {
  'Secretary':          '/secretary-manager',
  'Accountant':         '/accounts-manager',
  'HR Officer':         '/hr-manager',
  'Sales Officer':      '/sales-manager',
  'Marketing Officer':  '/sales-manager',
  'Operations Officer': '/worker-log',
  'Technical Staff':    '/worker-log',
  'Executive':          '/portals',
};
const portalUrlFor = (department, role) =>
  `${PORTAL_BASE_URL}${ROLE_PORTAL_PATHS[role] || DEPARTMENT_PORTAL_PATHS[department] || '/portals'}`;

// Escapes text before it is placed inside email HTML.
const escHtml = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// ── Round-2 (in-person interview) detail formatters ──
// The Admin form sends <input type="date"> (YYYY-MM-DD) and <input type="time"> (HH:MM);
// they are validated and turned into readable text here, so nothing raw reaches the email.
const cleanLine = (v, max) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const formatInterviewDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const formatInterviewTime = (v) => {
  const m = typeof v === 'string' ? v.match(/^([01]\d|2[0-3]):([0-5]\d)$/) : null;
  if (!m) return null;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

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
  'second_round',   // in-person (physical) interview, sent when Admin selects an applicant for round 2
  // Project / proposal request lifecycle
  'project_request_received',
  'project_accepted',
  'project_declined',
  // Internal team-account provisioning (CeoManager.jsx)
  'account_created',
]);

// Email types that should be sent from the general Slirus inbox (info@)
// rather than the HR inbox, since they relate to client/business inquiries.
const PROJECT_EMAIL_TYPES = new Set([
  'project_request_received',
  'project_accepted',
  'project_declined',
]);

// Email types that carry account credentials — routed through the
// Systems/IT sender identity instead of HR or the general inbox.
const ACCOUNT_EMAIL_TYPES = new Set([
  'account_created',
]);

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy — needed so rate limiting sees the real client IP

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
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '16kb' }));

// ─── Resend client ────────────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('[Email] ✅ Resend client initialized');

// ─── Firebase Admin (powers the CEO Control Center's user-management routes) ──
// Optional by design: if it's not configured, /api/send-email keeps working
// as normal and only the three user-management routes below respond 503.
let firebaseAdminReady = false;
let adminAuth = null;
let adminDb   = null;   // Firestore (Admin SDK) — used ONLY by the online-interview routes
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
  // Accept either a raw JSON string or a base64-encoded JSON string, since
  // some hosts mangle the multi-line "private_key" field in plain env vars.
  const jsonStr = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const serviceAccount = JSON.parse(jsonStr);
  const firebaseApp = initFirebaseAdmin({ credential: firebaseCert(serviceAccount) });
  adminAuth = getFirebaseAdminAuth(firebaseApp);
  adminDb   = getFirebaseAdminFirestore(firebaseApp);
  firebaseAdminReady = true;
  console.log('[Server] ✅ Firebase Admin initialized — user-management endpoints active');
} catch (err) {
  console.error('[Server] ⚠️  Firebase Admin not initialized — /api/create-user, /api/set-user-disabled, and /api/delete-user will respond 503:', err.message);
}

// Verifies the caller is signed in as the CEO before allowing a privileged
// user-management action. Never trust a client-side email check alone here.
const verifyCeoAuth = async (req, res, next) => {
  if (!firebaseAdminReady) {
    return res.status(503).json({ success: false, message: 'User management is not configured on this server.' });
  }
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing or malformed Authorization header.' });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if ((decoded.email || '').toLowerCase() !== CEO_EMAIL) {
      return res.status(403).json({ success: false, message: 'Only the CEO account may perform this action.' });
    }
    req.callerEmail = decoded.email;
    next();
  } catch (err) {
    console.warn('[Auth] ID token verification failed:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
  }
};

// ─── Email HTML template ──────────────────────────────────────────────────────
//
//  Anti-spam enforcement layers applied:
//  1. Full HTML5 DOCTYPE + XML namespaces (Outlook MSO compatibility)
//  2. Preheader text — controls the snippet Gmail/Outlook show in the inbox
//     list view, making the email look legitimate before it is even opened
//  3. Table-only layout — CSS-heavy DIV layouts score poorly in spam filters
//  4. Physical mailing address in footer (CAN-SPAM / GDPR requirement)
//  5. SPAM / CASL requirement
//  6. "You received this because…" explanation — removes the "Why am I
//     getting this?" confusion that causes spam reports
//  7. No spam-trigger words in subject/body helpers (handled at call sites)
//  8. Plain-text version sent alongside every email (see buildPlainText)
//  9. reply_to set to a real monitored inbox — "noreply@" hurts reputation
// 10. Precedence: transactional (not "bulk" which implies marketing)
// 11. X-Entity-Ref-ID per send — prevents duplicate-detection false positives
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
    ${title} - Slirus Global Limited · Official Correspondence
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
                       alt="Slirus Global Limited"
                       width="48" height="48"
                       style="display:block;border-radius:50%;border:2px solid #e2e8f0;
                              object-fit:cover;outline:none;text-decoration:none;
                              -ms-interpolation-mode:bicubic;" />
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:17px;font-weight:700;color:#1e293b;
                            letter-spacing:-0.3px;font-family:Arial,Helvetica,sans-serif;">
                    Slirus Global<span style="color:#475569;font-weight:400;"> Limited</span>
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
              Slirus Global Limited
            </p>
            <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.6;
                      font-family:Arial,Helvetica,sans-serif;">
              P.O Box 332485, Lira - Uganda &nbsp;&middot;&nbsp; info@slirus.com
            </p>
            <p style="margin:0 0 10px;font-size:11px;color:#94a3b8;line-height:1.6;
                      font-family:Arial,Helvetica,sans-serif;">
              &copy; ${new Date().getFullYear()} Slirus Global Limited. All rights reserved.
            </p>
            <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;line-height:1.6;
                      font-family:Arial,Helvetica,sans-serif;">
              You are receiving this email because you submitted an inquiry or application
              through <a href="https://slirus.com" style="color:#94a3b8;text-decoration:underline;">slirus.com</a>.
              If this was not you, please disregard this message.
            </p>
            ${recipientEmail ? `
            <p style="margin:0;font-size:11px;color:#cbd5e1;font-family:Arial,Helvetica,sans-serif;">
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

// ─── Service catalogue (mirrors Services.jsx / ProjectRequest.jsx) ───────────
// Keys must match the `serviceCategory` values sent by ProjectRequest.jsx.
// Only whitelisted keys are ever rendered, so client input is never injected
// into the email HTML. Unknown or missing services simply skip the paragraph.
const SERVICE_INFO = {
  'Custom Software Development': {
    division: 'Slirus Technologies',
    focus: 'Our software engineers will review the platforms, features, and integrations you described.',
  },
  'IT Consulting & Digital Transformation': {
    division: 'Slirus Technologies',
    focus: 'Our consultants will review your current systems and goals so we can shape a practical roadmap.',
  },
  'Network Infrastructure Management': {
    division: 'Slirus Technologies',
    focus: 'Our network engineers will review your infrastructure, coverage, and support needs.',
  },
  'Cybersecurity & Data Protection': {
    division: 'Slirus Technologies',
    focus: 'Our security specialists will review the systems and data you need protected.',
  },
  'Slirus Fashions': {
    division: 'Slirus Fashions',
    focus: 'Our fashion team will review the designs, materials, quantities, and delivery details you shared.',
  },
  'Slirus AgriSolutions': {
    division: 'Slirus AgriSolutions',
    focus: 'Our agribusiness team will review the produce, farming inputs, or machinery, along with the quantities and delivery details you shared.',
  },
  'Slirus General Trade': {
    division: 'Slirus General Trade',
    focus: 'Our trade and commerce team will review the goods, services, and logistics you described.',
  },
};

// HTML paragraph naming the requested service (empty string when unknown).
const serviceParagraph = (service) => {
  const info = SERVICE_INFO[service];
  if (!info) return '';
  return `
          <p>
            You've requested our <strong>${service}</strong> service, which is handled by
            <strong>${info.division}</strong>. ${info.focus}
          </p>`;
};

// Plain-text equivalent, returned as an array of lines (empty when unknown).
const serviceLines = (service) => {
  const info = SERVICE_INFO[service];
  if (!info) return [];
  return [
    `You've requested our ${service} service, handled by ${info.division}.`,
    info.focus,
    '',
  ];
};

// ─── Plain-text fallback builder ─────────────────────────────────────────────
//
//  Sending a text/plain alternative alongside the HTML part is one of the
//  single most effective anti-spam measures. HTML-only emails with no text
//  part are a strong spam signal in SpamAssassin, Gmail, and Outlook filters.
//
const buildPlainText = (title, name, program, type, department, extra = {}) => {
  const year = new Date().getFullYear();
  const divider = '─'.repeat(56);

  const bodies = {
    account_created: [
      `Dear ${name},`,
      '',
      `An account has been created for you on the Slirus Global Limited internal portal`,
      `(${extra.department || 'General'} · ${extra.role || 'Staff'}${extra.level ? ' · ' + extra.level : ''}).`,
      '',
      ...((extra.access || []).length
        ? ['Your access:', ...extra.access.map((a) => `  - ${a}`), '']
        : []),
      'Your login details:',
      `  Portal   : ${extra.portalUrl || PORTAL_BASE_URL}`,
      `  Email    : ${extra.to || ''}`,
      `  Password : ${extra.password || ''}`,
      '',
      'This is a temporary password. For your security, please sign in and',
      'change it immediately — do not share it or forward this email.',
      '',
      'If you were not expecting this account, please contact your',
      'administrator right away.',
    ],
    application_received: [
      `Dear ${name},`,
      '',
      `We have successfully received your application for the ${program} position`,
      'at Slirus Global Limited. Thank you for the time and effort you invested.',
      '',
      'Our hiring team is reviewing all profiles and will contact you directly',
      'if your background aligns with our current needs.',
      '',
      'Thank you for your patience and for considering a career with Slirus Global Limited.',
    ],
    shortlisted: [
      `Dear ${name},`,
      '',
      `Congratulations — you have been nominated for the ${program} position`,
      'at Slirus Global Limited.',
      '',
      'A member of our HR team will contact you shortly to discuss next steps,',
      'including scheduling an interview.',
      '',
      'We look forward to speaking with you soon.',
    ],
    unqualified: [
      `Dear ${name},`,
      '',
      `Thank you for applying for the ${program} position at Slirus Global Limited.`,
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
      `Thank you for your interest in the ${program} position at Slirus Global Limited.`,
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
      ...serviceLines(extra.service),
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
      ...serviceLines(extra.service),
      'A member of our team will be in touch shortly to discuss next steps,',
      'including scope confirmation, timeline alignment, and contract details.',
      '',
      'Thank you for trusting Slirus Global Limited with your project.',
    ],
    second_round: [
      `Dear ${name},`,
      '',
      ...(extra.isUpdate ? ['UPDATE: this message replaces any date, time or venue you were given before.', ''] : []),
      `Thank you for completing the online interview for the ${program} position`,
      'at Slirus Global Limited. You have been selected for the second round:',
      'a physical (in-person) interview with our hiring panel.',
      '',
      `Date  : ${extra.date || ''}`,
      `Time  : ${extra.time || ''}`,
      `Venue : ${extra.venue || ''}`,
      ...(extra.note ? ['', `Note from HR: ${extra.note}`] : []),
      '',
      'Please arrive about 15 minutes early.',
      '',
      'Please bring:',
      '  - A valid national ID or passport',
      '  - Original academic/professional certificates plus one photocopy of each',
      '  - Your updated CV',
      '  - Contact details of your referees',
      '',
      'If you cannot attend or need to reschedule, reply to this email as early as possible.',
      '',
      'Congratulations — we look forward to meeting you.',
    ],
    interview_invite: [
      `Dear ${name},`,
      '',
      `You have been shortlisted for the ${program} position and are invited to`,
      'complete the online interview (objective, multiple-choice, auto-marked).',
      '',
      `Time allowed : ${extra.minutes || 30} minutes (closes automatically)`,
      `Link valid   : ${extra.validDays || 7} days — one attempt only`,
      `Start here   : ${extra.link || ''}`,
      '',
      'Before you begin:',
      '  - The link is personal; you must confirm the email you applied with.',
      '  - The interview runs full-screen. Leaving the page is recorded.',
      '  - Copying, pasting and screenshots are not permitted.',
      '  - The timer cannot be paused or restarted once started.',
      '',
      'Do not share this email or link.',
    ],
    project_declined: [
      `Dear ${name},`,
      '',
      `Thank you for considering Slirus Global Limited for: ${program}.`,
      '',
      'After careful review, we are not able to take on this particular project',
      'at this time. This is in no way a reflection of the value of your project.',
      '',
      'We would welcome the chance to work together on future projects.',
    ],
  };

  const bodyLines = bodies[type] ?? [`Dear ${name},`, '', 'Thank you for contacting Slirus Global Limited.'];

  return [
    title.toUpperCase(),
    divider,
    '',
    ...bodyLines,
    '',
    `Warm regards,`,
    `Slirus Global Limited — ${department}`,
    '',
    divider,
    `© ${year} Slirus Global Limited`,
    'P.O Box 332485, Lira, Uganda',
    'info@slirus.com  |  https://slirus.com',
    '',
    type === 'account_created'
      ? 'You received this because a Slirus Global Limited administrator created an account for you.'
      : 'You received this because you submitted an inquiry or application at slirus.com.',

  ].join('\n');
};

// ─── Email content factory ────────────────────────────────────────────────────
// `extra` carries fields that don't apply to the recruitment/project emails
// (password, department, role, portalUrl) — only 'account_created' reads it.
const buildEmailContent = (type, name, program, extra = {}) => {
  switch (type) {

    case 'application_received':
      return {
        subject: `Application Received – ${program} | Slirus Global Limited`,
        title:   'Application Received Successfully',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            We are pleased to confirm that we have successfully received your application
            for the <strong>${program}</strong> position at Slirus Global Limited. We sincerely
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
            Thank you for your patience and for considering a career with Slirus Global Limited.
            We wish you the very best in your professional endeavours.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Warm regards,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };

    case 'shortlisted':
      return {
        subject: `Congratulations — You Have Been Nominated | Slirus Global Limited`,
        title:   'Congratulations! 🎉',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            We are delighted to inform you that you have been <strong>Nominated</strong>
            for the <strong>${program}</strong> position at Slirus Global Limited.
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
            interest in Slirus Global Limited.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Warm regards,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };

    case 'unqualified':
      return {
        subject: `Update on Your Application | Slirus Global Limited`,
        title:   'Update on Your Application',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Thank you for your interest in Slirus Global Limited and for taking the time to
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
        subject: `Application Update — Position Closed | Slirus Global Limited`,
        title:   'Position Currently Closed',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Thank you for your interest in the <strong>${program}</strong> position at
            Slirus Global Limited. We genuinely appreciate the time, effort, and professional
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
            Thank you again for considering a career with Slirus Global Limited.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Kind regards,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };

    // ── Project / Proposal Requests ─────────────────────────────────────────

    case 'project_request_received':
      return {
        subject: `We've Received Your Project Request — ${program} | Slirus Global Limited`,
        title:   'Thank You for Trusting Slirus',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Thank you for reaching out and choosing <strong>Slirus Global Limited</strong> to
            help bring <strong>${program}</strong> to life. We have successfully received
            your project request, and we sincerely appreciate the trust you've placed in
            our team to support your goals.
          </p>${serviceParagraph(extra.service)}
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
            Warm regards,<br /><strong style="color:#475569;">Slirus Operations Team</strong>
          </p>`,
      };

    case 'project_accepted':
      return {
        subject: `Your Project Has Been Accepted — ${program} | Slirus Global Limited`,
        title:   'Great News — We\'re On Board! 🎉',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            We're delighted to let you know that after reviewing your request, our team
            has accepted <strong>${program}</strong> and we're excited to begin working
            with you.
          </p>${serviceParagraph(extra.service)}
          <p>
            A member of our team will be in touch shortly to discuss next steps, including
            scope confirmation, timeline alignment, and contract details, so we can get
            started on delivering the best possible outcome for your business.
          </p>
          <p style="margin-top:24px;">
            Thank you again for trusting Slirus Global Limited with your project. We look forward
            to a successful partnership.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Warm regards,<br /><strong style="color:#475569;">Slirus Operations Team</strong>
          </p>`,
      };

    case 'project_declined':
      return {
        subject: `Update on Your Project Request — ${program} | Slirus Global Limited`,
        title:   'Update on Your Project Request',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Thank you for considering Slirus Global Limited for <strong>${program}</strong>, and
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
            Thank you again for your interest and trust in Slirus Global Limited.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Kind regards,<br /><strong style="color:#475569;">Slirus Operations Team</strong>
          </p>`,
      };

    // ── Internal team-account provisioning ──────────────────────────────

    case 'account_created': {
      const { password = '', department = 'General', role = 'Staff', level = '', access = [], portalUrl = PORTAL_BASE_URL } = extra;
      const accessHtml = access.length
        ? `<p style="margin:0 0 6px;"><strong>Your access:</strong></p>
          <ul style="margin:0 0 16px;padding-left:20px;color:#475569;">
            ${access.map((a) => `<li>${escHtml(a)}</li>`).join('')}
          </ul>`
        : '';
      return {
        subject: `Your Slirus Global Limited Account Is Ready | Sign-In Details Inside`,
        title:   'Your Account Has Been Created',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            An account has been created for you on the <strong>Slirus Global Limited</strong>
            internal portal, giving you access to the tools for your role in
            <strong>${department}</strong> as <strong>${role}</strong>${level ? ` (${escHtml(level)})` : ''}.
          </p>
          ${accessHtml}
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                 style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:20px 0;">
            <tr>
              <td style="padding:18px 20px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding:4px 0;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;width:120px;">Portal</td>
                    <td style="padding:4px 0;font-size:14px;color:#1e293b;"><a href="${portalUrl}" style="color:#1e293b;text-decoration:underline;">${portalUrl}</a></td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;">Email</td>
                    <td style="padding:4px 0;font-size:14px;color:#1e293b;">${extra.to || ''}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;">User Password</td>
                    <td style="padding:4px 0;font-size:15px;font-family:'Courier New',Courier,monospace;color:#1e293b;font-weight:700;letter-spacing:0.4px;">${password}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
            <tr>
              <td style="border-radius:8px;background-color:#1A3C5E;">
                <a href="${portalUrl}"
                   style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;
                          color:#ffffff;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
                  Sign In to the Portal
                </a>
              </td>
            </tr>
          </table>
          <p style="margin-top:8px;padding:12px 16px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;">
            🔒 For your security, please sign in and change this password immediately.
            Do not share it or forward this email to anyone.
          </p>
          <p style="margin-top:24px;">
            If you were not expecting this account, please contact your administrator
            right away.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Warm regards,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };
    }

    // ── Round 2: in-person (physical) interview ─────────────────────────────
    case 'second_round':
      return {
        subject: `${extra.isUpdate ? 'Updated: ' : ''}Invitation to In-Person Interview – ${program} | Slirus Global Limited`,
        title:   extra.isUpdate ? 'Updated Interview Details' : 'You Have Been Selected for the Next Stage 🎉',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          ${extra.isUpdate ? `<p style="margin:0 0 16px;padding:12px 16px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:14px;color:#92400E;">
            <strong>Please note:</strong> this message updates our earlier communication. The details below
            replace any date, time or venue you were given before.
          </p>` : ''}
          <p>
            Thank you for completing the online interview for the <strong>${program}</strong>
            position at Slirus Global Limited. We are pleased to inform you that you have been
            <strong>selected for the second round: a physical (in-person) interview</strong>
            with our hiring panel.
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                 style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:20px 0;">
            <tr><td style="padding:16px 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;width:80px;vertical-align:top;">Date</td>
                  <td style="padding:5px 0;font-size:15px;color:#1e293b;font-weight:700;">${escHtml(extra.date)}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;vertical-align:top;">Time</td>
                  <td style="padding:5px 0;font-size:15px;color:#1e293b;font-weight:700;">${escHtml(extra.time)}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;vertical-align:top;">Venue</td>
                  <td style="padding:5px 0;font-size:15px;color:#1e293b;font-weight:700;">${escHtml(extra.venue)}</td>
                </tr>
              </table>
            </td></tr>
          </table>${extra.note ? `
          <p style="margin:0 0 16px;padding:12px 16px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:14px;color:#1e3a8a;">
            <strong>Note from HR:</strong> ${escHtml(extra.note)}
          </p>` : ''}
          <p>
            Please arrive about 15 minutes early and keep your phone reachable in case HR needs to reach you.
          </p>
          <p style="margin:0 0 6px;"><strong>Please come prepared with:</strong></p>
          <ul style="margin:0 0 16px;padding-left:20px;color:#475569;">
            <li>A valid national ID or passport</li>
            <li>Original academic and professional certificates, plus one photocopy of each</li>
            <li>Your updated CV</li>
            <li>The contact details of your referees</li>
          </ul>
          <p>
            If you are unable to attend or need to reschedule, please reply to this email as early as possible.
          </p>
          <p style="margin-top:24px;">
            Congratulations once again, and we look forward to meeting you in person.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Warm regards,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };

    // ── Online interview invitation (sent ONLY by /api/interview/invite) ──
    case 'interview_invite': {
      const { link = '', minutes = 30, validDays = 7 } = extra;
      return {
        subject: `Online Interview Invitation – ${extra.rawProgram || 'Your Application'} | Slirus Global Limited`,
        title:   'Your Online Interview',
        body: `
          <p>Dear <strong>${name}</strong>,</p>
          <p>
            Following your shortlisting for the <strong>${program}</strong> position, you are invited
            to complete the first stage of our selection process: a short <strong>online interview</strong>.
          </p>
          <p>
            This stage evaluates objective data, logical reasoning, workplace compliance and
            fundamental entry requirements. It consists of multiple-choice questions and is
            marked automatically.
          </p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
                 style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:20px 0;">
            <tr><td style="padding:16px 20px;font-size:14px;color:#334155;line-height:1.8;">
              <strong>Time allowed:</strong> ${minutes} minutes (the interview closes automatically)<br />
              <strong>Link valid for:</strong> ${validDays} days &nbsp;·&nbsp; <strong>One attempt only</strong><br />
              <strong>Device:</strong> a laptop or desktop computer is strongly recommended
            </td></tr>
          </table>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;">
            <tr>
              <td style="border-radius:8px;background-color:#1A3C5E;">
                <a href="${link}"
                   style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;
                          color:#ffffff;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
                  Start Online Interview
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 6px;"><strong>Please read before you begin:</strong></p>
          <ul style="margin:0 0 16px;padding-left:20px;color:#475569;">
            <li>The link is personal to you. You will be asked to confirm the email address you applied with.</li>
            <li>The interview runs in full-screen. Leaving the page, switching tabs or exiting full-screen is recorded and may end your attempt.</li>
            <li>Copying, pasting, screenshots and screen recording are not permitted.</li>
            <li>Once started, the ${minutes}-minute timer cannot be paused or restarted.</li>
          </ul>
          <p style="margin-top:8px;padding:12px 16px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;">
            🔒 Do not share this email or link. It only works for the applicant it was issued to.
          </p>
          <p style="margin-top:24px;color:#94a3b8;font-size:13px;">
            Good luck,<br /><strong style="color:#475569;">Slirus HR Team</strong>
          </p>`,
      };
    }

    default:
      return null;
  }
};

// ─── POST /api/send-email ─────────────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  const { type, to, name, program, service, password, department, role, level, access, portalUrl, date, time, venue, note, isUpdate } = req.body ?? {};
  const isAccountEmail = ACCOUNT_EMAIL_TYPES.has(type);

  // account_created has its own required-field shape (no `program`, but
  // needs `password` + `department`); every other type keeps the original
  // {type, to, name, program} contract unchanged.
  if (!type || !to || !name || (isAccountEmail ? (!password || !department) : !program)) {
    return res.status(400).json({
      success: false,
      message: isAccountEmail
        ? 'Missing required fields. Expected: type, to, name, password, department.'
        : 'Missing required fields. Expected: type, to, name, program.',
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

  // Round 2 needs a valid date, time and venue from the Admin form.
  let round2 = null;
  if (type === 'second_round') {
    const d = formatInterviewDate(date), t = formatInterviewTime(time), v = cleanLine(venue, 200);
    if (!d || !t || !v) {
      return res.status(400).json({ success: false, message: 'second_round requires a valid date (YYYY-MM-DD), time (HH:MM) and venue.' });
    }
    round2 = { date: d, time: t, venue: v, note: cleanLine(note, 500), isUpdate: isUpdate === true };
  }

  const extra = isAccountEmail
    ? {
        to, password, department, role,
        level: typeof level === 'string' ? level.slice(0, 40) : '',
        access: Array.isArray(access)
          ? access.filter((a) => typeof a === 'string').slice(0, 12).map((a) => a.slice(0, 160))
          : [],
        portalUrl: portalUrl || portalUrlFor(department, role),
      }
    : type === 'second_round'
      ? round2
      : PROJECT_EMAIL_TYPES.has(type)
        ? { service }
        : {};

  const content = buildEmailContent(type, name, program, extra);
  if (!content) {
    return res.status(500).json({ success: false, message: 'Failed to build email content.' });
  }

  // Recruitment mail and account-provisioning mail both go out from HR;
  // client-facing project mail comes from the general inbox.
  const isProjectEmail = PROJECT_EMAIL_TYPES.has(type);
  const senderAddress  = isProjectEmail ? PROJECTS_FROM : FROM_ADDRESS;
  const department_    = isProjectEmail ? 'Operations Team' : 'HR Department';
  const replyToAddress = isProjectEmail ? 'info@slirus.com' : 'hr@slirus.com';

  try {
    const html      = buildEmailHtml(content.title, content.body, department_, to);
    const text      = buildPlainText(content.title, name, program, type, department_, extra);
    const messageId = `slirus-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const replyTo   = replyToAddress;

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

// ─── POST /api/create-user ─────────────────────────────────────────────────────
// Creates the Firebase Auth account for a new team member. The CEO Control
// Center generates the temporary password client-side and passes it here
// (rather than letting Admin SDK auto-generate one) so the exact same
// password can be shown once in the UI and emailed via /api/send-email.
app.post('/api/create-user', verifyCeoAuth, async (req, res) => {
  const { name, email, department, role, password } = req.body ?? {};

  if (!name || !email || !department || !role || !password) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields. Expected: name, email, department, role, password.',
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: `Invalid email address: "${email}"` });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
      disabled: false,
    });
    console.log(`[Users] ✅ Created "${email}" (uid: ${userRecord.uid}) — by ${req.callerEmail}`);
    return res.status(200).json({ success: true, uid: userRecord.uid });
  } catch (err) {
    console.error('[Users] ❌ Create user failed:', err.message);
    const isDuplicate = err.code === 'auth/email-already-exists';
    return res.status(isDuplicate ? 409 : 500).json({
      success: false,
      message: isDuplicate
        ? 'An account with this email already exists.'
        : (NODE_ENV === 'production' ? 'Could not create the account. Please try again.' : err.message),
    });
  }
});

// ─── POST /api/set-user-disabled ───────────────────────────────────────────────
// Mirrors a team member's `status` field in Firestore into their actual
// Firebase Auth account, so a "suspended" user is also locked out of sign-in.
app.post('/api/set-user-disabled', verifyCeoAuth, async (req, res) => {
  const { uid, disabled } = req.body ?? {};

  if (!uid || typeof disabled !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Missing required fields. Expected: uid, disabled (boolean).' });
  }

  try {
    await adminAuth.updateUser(uid, { disabled });
    console.log(`[Users] ${disabled ? '⛔ Disabled' : '✅ Re-enabled'} uid "${uid}" — by ${req.callerEmail}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Users] ❌ set-user-disabled failed:', err.message);
    return res.status(500).json({
      success: false,
      message: NODE_ENV === 'production' ? 'Could not update the account.' : err.message,
    });
  }
});

// ─── POST /api/delete-user ──────────────────────────────────────────────────────
// Permanently removes a Firebase Auth account. The Firestore `teamUsers` doc
// is deleted separately, client-side, before this call is made.
app.post('/api/delete-user', verifyCeoAuth, async (req, res) => {
  const { uid } = req.body ?? {};

  if (!uid) {
    return res.status(400).json({ success: false, message: 'Missing required field: uid.' });
  }

  try {
    await adminAuth.deleteUser(uid);
    console.log(`[Users] 🗑️  Deleted uid "${uid}" — by ${req.callerEmail}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Users] ❌ delete-user failed:', err.message);
    return res.status(500).json({
      success: false,
      message: NODE_ENV === 'production' ? 'Could not delete the account.' : err.message,
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  ONLINE INTERVIEW  (Admin.jsx "Online" button → email → Interview.jsx)
// ═════════════════════════════════════════════════════════════════════════════
//  Why this lives on the server and not in Interview.jsx:
//   • The ANSWER KEY below never leaves this file. Anything shipped inside a
//     React bundle can be read by any applicant with DevTools.
//   • Grading, the 30-minute clock and "one attempt only" are enforced here,
//     so refreshing, editing the page or changing the PC clock cannot buy time.
//   • Applicants have no Firebase accounts, so Firestore rules (default-deny on
//     `interviews`) keep the collection private; only this server (Admin SDK)
//     reads/writes it.
//  Firestore documents used:
//   interviews/{secretToken}  – invite, session, saved answers, result
//   applications/{id}         – mirrored fields Admin.jsx listens to:
//        interviewStatus ('invited' | 'in_progress' | 'completed'),
//        interviewScore, interviewTotal, interviewPercent, interviewViolations,
//        interviewAutoClosed, interviewReason, interviewInvitedAt, interviewCompletedAt
// ─────────────────────────────────────────────────────────────────────────────
const INTERVIEW_MINUTES        = 30;
const INTERVIEW_TOTAL_MS       = INTERVIEW_MINUTES * 60 * 1000;
const INTERVIEW_GRACE_MS       = 20 * 1000;              // network slack for the final auto-submit
const INTERVIEW_INVITE_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // link valid 7 days if never started
const INTERVIEW_MAX_VIOLATIONS = 3;
const INTERVIEW_MAX_BAD_EMAIL  = 5;

// Each question = 1 mark. `answer` is the index into `options` as written here.
// Options are shuffled per applicant before sending, so positions here don't matter.
const INTERVIEW_BANK = [
  { id: 'q01', q: 'You notice a colleague has left their computer unlocked with confidential client records open. What should you do first?',
    options: ['Read the records to check nothing is missing', 'Lock the screen and let your colleague know', 'Ignore it, it is not your responsibility', 'Post a photo of the screen in the staff group chat'], answer: 1 },
  { id: 'q02', q: 'Which of these is the most professional email subject line?',
    options: ['Hi', 'URGENT!!! READ NOW', 'Request: Approval of Q3 budget – reply by Friday 5 PM', 'Question'], answer: 2 },
  { id: 'q03', q: 'All managers attend the Monday meeting. Grace attends the Monday meeting. Which statement must be true?',
    options: ['Grace is a manager', 'Every person at the meeting is a manager', 'If Grace is a manager, she attends the Monday meeting', 'Grace is not a manager'], answer: 2 },
  { id: 'q04', q: 'What number comes next?  2, 6, 18, 54, ?',
    options: ['108', '148', '162', '216'], answer: 2 },
  { id: 'q05', q: 'An employee earns UGX 1,200,000 per month and a 10% statutory deduction applies. What is the take-home amount?',
    options: ['UGX 1,000,000', 'UGX 1,080,000', 'UGX 1,100,000', 'UGX 1,120,000'], answer: 1 },
  { id: 'q06', q: 'A task takes 4 people 6 days. Working at the same rate, how many days will 8 people need?',
    options: ['2 days', '3 days', '4 days', '12 days'], answer: 1 },
  { id: 'q07', q: 'Your supervisor gives an instruction that appears to conflict with written company policy. What is the best response?',
    options: ['Follow it without saying anything', 'Ignore the instruction', 'Politely raise the conflict and ask for clarification before proceeding', 'Discuss the problem with colleagues instead'], answer: 2 },
  { id: 'q08', q: 'Using the urgent-versus-important approach, which task should you do FIRST?',
    options: ['Reply to a newsletter due next month', 'Correct an error in a payment that must be sent today', 'Tidy your desk', "Plan next year's training calendar"], answer: 1 },
  { id: 'q09', q: 'If today is Wednesday, what day of the week was it 100 days ago?',
    options: ['Monday', 'Tuesday', 'Friday', 'Sunday'], answer: 0 },
  { id: 'q10', q: 'No contractors are permanent staff. Some drivers are contractors. Which statement must be true?',
    options: ['Some drivers are not permanent staff', 'All drivers are contractors', 'No driver is permanent staff', 'Some permanent staff are drivers'], answer: 0 },
  { id: 'q11', q: "A caller says they are from a client company and asks for another client's phone number. What should you do?",
    options: ['Give it, they sound genuine', 'Decline to share it and follow the data-protection and verification policy', 'Give only half of the number', 'Ask a colleague to give it instead'], answer: 1 },
  { id: 'q12', q: 'A conflict of interest arises when:',
    options: ["An employee's personal interests could improperly influence their work duties", 'Two employees disagree about a method', 'The company has many clients', 'An employee goes on approved leave'], answer: 0 },
  { id: 'q13', q: 'Sales rose from 400 units to 500 units. What is the percentage increase?',
    options: ['20%', '25%', '100%', '125%'], answer: 1 },
  { id: 'q14', q: 'Which item does not belong with the others?',
    options: ['Invoice', 'Receipt', 'Purchase order', 'Meeting room'], answer: 3 },
  { id: 'q15', q: 'A small fire has just started in the office. What is your first priority?',
    options: ['Collect your personal belongings', 'Raise the alarm and alert others; only tackle it if it is safe and you are trained', 'Wait to see if it goes out', 'Film it for the incident report'], answer: 1 },
  { id: 'q16', q: 'Staff are split between Operations and Sales in the ratio 3:5. There are 40 staff in total. How many are in Sales?',
    options: ['15', '20', '25', '30'], answer: 2 },
  { id: 'q17', q: 'A is taller than B. C is shorter than B. D is taller than A. Who is the shortest?',
    options: ['A', 'B', 'C', 'D'], answer: 2 },
  { id: 'q18', q: 'You will be 15 minutes late because of an unavoidable transport problem. What is the best action?',
    options: ['Slip in quietly and hope nobody notices', 'Inform your supervisor as early as possible and agree how to make up the time', 'Blame a colleague', 'Go home for the day'], answer: 1 },
  { id: 'q19', q: 'Which password is the strongest?',
    options: ['Slirus123', 'password', 'Tr!ee#Lamp9$Rain', '12345678'], answer: 2 },
  { id: 'q20', q: 'Which file format is best for sharing a finished document that should not be edited?',
    options: ['.docx', '.pdf', '.xlsx', '.txt'], answer: 1 },
  { id: 'q21', q: 'What is 15% of 2,000?',
    options: ['150', '200', '300', '350'], answer: 2 },
  { id: 'q22', q: 'A job requires applicants to be at least 18 and to hold a valid national ID. An applicant is 19 and has an expired ID. Do they meet the requirements?',
    options: ['Yes, age is all that matters', 'No, the ID is not valid', 'Yes, an expired ID is acceptable', 'Yes, if they promise to renew it later'], answer: 1 },
  { id: 'q23', q: 'Two colleagues disagree about the method for a task and ask for your input. What is the best approach?',
    options: ['Side with the colleague you like most', 'Listen to both and recommend the option best supported by facts and the task goal', 'Avoid the discussion', 'Escalate immediately without speaking to either'], answer: 1 },
  { id: 'q24', q: 'All Bloops are Razzies, and all Razzies are Lazzies. Which statement must be true?',
    options: ['All Lazzies are Bloops', 'All Bloops are Lazzies', 'No Razzies are Bloops', 'Some Lazzies are not Razzies'], answer: 1 },
  { id: 'q25', q: 'What is the average of 4, 6, 8, 10 and 12?',
    options: ['7', '8', '9', '10'], answer: 1 },
];
const INTERVIEW_QMAP = new Map(INTERVIEW_BANK.map((q) => [q.id, q]));

// Deterministic per-token shuffle so a resumed session sees the same paper.
const seededRng = (str) => {
  let a = crypto.createHash('sha256').update(str).digest().readUInt32LE(0);
  return () => {            // mulberry32
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const shuffled = (arr, rnd) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
// The paper sent to the browser: NO answers. Option `id` is the original index.
const buildPaper = (token) => {
  const rnd = seededRng(token);
  return shuffled(INTERVIEW_BANK, rnd).map((q) => ({
    id: q.id,
    q: q.q,
    options: shuffled(q.options.map((text, id) => ({ id, text })), rnd),
  }));
};
const sanitizeAnswers = (raw) => {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [qid, v] of Object.entries(raw)) {
    const q = INTERVIEW_QMAP.get(qid);
    if (q && Number.isInteger(v) && v >= 0 && v < q.options.length) out[qid] = v;
  }
  return out;
};
const gradeAnswers = (answers) => {
  let score = 0;
  for (const q of INTERVIEW_BANK) if (answers[q.id] === q.answer) score++;
  const total = INTERVIEW_BANK.length;
  return { score, total, percent: Math.round((score / total) * 1000) / 10 };
};

// ── tiny in-memory rate limiter (per IP) for the public interview routes ──
const ivHits = new Map();
const interviewLimiter = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || 'x';
  const rec = ivHits.get(key) || { n: 0, reset: now + 60_000 };
  if (now > rec.reset) { rec.n = 0; rec.reset = now + 60_000; }
  rec.n++; ivHits.set(key, rec);
  if (rec.n > 90) return res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' });
  res.set('Cache-Control', 'no-store');
  next();
};
setInterval(() => { const n = Date.now(); for (const [k, v] of ivHits) if (n > v.reset) ivHits.delete(k); }, 5 * 60_000).unref?.();

const requireDb = (_req, res, next) =>
  adminDb ? next() : res.status(503).json({ success: false, message: 'Online interviews are not configured on this server.' });

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const loadInterview = async (token) => {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
  const ref  = adminDb.collection('interviews').doc(token);
  const snap = await ref.get();
  return snap.exists ? { ref, token, data: snap.data() } : null;
};
const sameSecret = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};
const BAD_LINK = { success: false, code: 'invalid', message: 'This interview link is not valid.' };

// Grades and closes an interview exactly once (transaction-guarded, so a
// manual submit racing the timeout sweeper cannot double-post a result).
const finalizeInterview = async (token, { answers, reason, violations }) =>
  adminDb.runTransaction(async (tx) => {
    const ref  = adminDb.collection('interviews').doc(token);
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const d = snap.data();
    if (d.status === 'completed') return d;
    const appRef  = adminDb.collection('applications').doc(d.applicationId);
    const appSnap = await tx.get(appRef);

    const finalAnswers = answers ?? d.answers ?? {};
    const { score, total, percent } = gradeAnswers(finalAnswers);
    const v = Math.min(99, Math.max(d.violations || 0, violations || 0));
    const autoClosed = reason !== 'manual';

    tx.update(ref, {
      status: 'completed', answers: finalAnswers, score, total, percent,
      violations: v, reason, autoClosed, completedAt: FieldValue.serverTimestamp(), completedAtMs: Date.now(),
    });
    if (appSnap.exists) {
      tx.update(appRef, {
        interviewStatus: 'completed', interviewScore: score, interviewTotal: total,
        interviewPercent: percent, interviewViolations: v, interviewAutoClosed: autoClosed,
        interviewReason: reason, interviewCompletedAt: FieldValue.serverTimestamp(),
      });
    }
    return { ...d, score, total, percent };
  });

// ── POST /api/interview/invite  (CEO/Admin only) ─────────────────────────────
app.post('/api/interview/invite', verifyCeoAuth, requireDb, async (req, res) => {
  const { applicationId } = req.body ?? {};
  if (typeof applicationId !== 'string' || !applicationId || applicationId.includes('/')) {
    return res.status(400).json({ success: false, message: 'Missing required field: applicationId.' });
  }
  try {
    const appRef  = adminDb.collection('applications').doc(applicationId);
    const appSnap = await appRef.get();
    if (!appSnap.exists) return res.status(404).json({ success: false, message: 'Application not found.' });
    const a = appSnap.data();
    if (a.status !== 'Shortlisted') {
      return res.status(409).json({ success: false, message: 'Only shortlisted applicants can be invited to the online interview.' });
    }
    if (!a.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) {
      return res.status(400).json({ success: false, message: 'This application has no valid email address.' });
    }

    // One interview per application. Resend is allowed only until it is started.
    const existing = await adminDb.collection('interviews').where('applicationId', '==', applicationId).limit(1).get();
    let token, ivRef;
    if (!existing.empty) {
      const doc = existing.docs[0];
      if (doc.data().status !== 'invited') {
        return res.status(409).json({ success: false, message: 'The applicant has already started or completed the online interview.' });
      }
      token = doc.id; ivRef = doc.ref;
      await ivRef.update({ expiresAtMs: Date.now() + INTERVIEW_INVITE_TTL_MS, failedAttempts: 0, lastInvitedBy: req.callerEmail, reinvitedAt: FieldValue.serverTimestamp() });
    } else {
      token = crypto.randomBytes(32).toString('base64url');
      ivRef = adminDb.collection('interviews').doc(token);
      await ivRef.set({
        applicationId, email: String(a.email).trim().toLowerCase(), name: a.fullName || '', program: a.program || '',
        status: 'invited', createdAt: FieldValue.serverTimestamp(), expiresAtMs: Date.now() + INTERVIEW_INVITE_TTL_MS,
        invitedBy: req.callerEmail, failedAttempts: 0, violations: 0, answers: {},
      });
    }

    const link  = `${PORTAL_BASE_URL}/interview?t=${encodeURIComponent(token)}`;
    const name  = a.fullName || 'Applicant';
    const prog  = a.program  || 'the advertised';
    const extra = { link, minutes: INTERVIEW_MINUTES, validDays: Math.round(INTERVIEW_INVITE_TTL_MS / 86_400_000), rawProgram: String(prog).replace(/[\r\n]+/g, ' ').slice(0, 120) };
    const content = buildEmailContent('interview_invite', escHtml(name), escHtml(prog), extra);
    const html    = buildEmailHtml(content.title, content.body, 'HR Department', a.email);
    const text    = buildPlainText(content.title, name, prog, 'interview_invite', 'HR Department', extra);

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS, to: a.email, reply_to: 'hr@slirus.com',
      subject: content.subject, html, text,
      headers: { 'Precedence': 'transactional', 'X-Entity-Ref-ID': `slirus-interview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, 'X-Mailer': 'Slirus-Email-API/1.0' },
    });
    if (error) throw new Error(error.message || 'Resend API error');

    await appRef.update({ interviewStatus: 'invited', interviewInvitedAt: FieldValue.serverTimestamp() });
    console.log(`[Interview] ✉️  Invite → ${a.email} (application ${applicationId}) by ${req.callerEmail} | messageId: ${data.id}`);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Interview] ❌ invite failed:', err.message);
    return res.status(500).json({ success: false, message: NODE_ENV === 'production' ? 'Could not send the interview invitation.' : err.message });
  }
});

// ── POST /api/interview/start  (applicant) ───────────────────────────────────
app.post('/api/interview/start', interviewLimiter, requireDb, async (req, res) => {
  try {
    const { token, email } = req.body ?? {};
    const iv = await loadInterview(token);
    if (!iv) return res.status(404).json(BAD_LINK);
    const d = iv.data;

    if ((d.failedAttempts || 0) >= INTERVIEW_MAX_BAD_EMAIL) {
      return res.status(423).json({ success: false, code: 'locked', message: 'This link has been locked after too many failed attempts. Please contact HR.' });
    }
    if (typeof email !== 'string' || email.trim().toLowerCase() !== d.email) {
      await iv.ref.update({ failedAttempts: FieldValue.increment(1) });
      return res.status(403).json({ success: false, code: 'email', message: 'We could not verify these details. Use the exact email address you applied with.' });
    }
    if (d.status === 'completed') {
      return res.status(410).json({ success: false, code: 'completed', message: 'This interview has already been completed.' });
    }

    const now = Date.now();
    const sessionKey = crypto.randomBytes(24).toString('base64url');

    if (d.status === 'invited') {
      if (now > d.expiresAtMs) {
        return res.status(410).json({ success: false, code: 'expired', message: 'This interview link has expired. Please contact HR.' });
      }
      await iv.ref.update({ status: 'in_progress', startedAtMs: now, endsAtMs: now + INTERVIEW_TOTAL_MS, startedAt: FieldValue.serverTimestamp(), sessionKey });
      await adminDb.collection('applications').doc(d.applicationId).update({ interviewStatus: 'in_progress' }).catch(() => {});
      d.endsAtMs = now + INTERVIEW_TOTAL_MS; d.answers = {}; d.violations = 0;
    } else {
      // in_progress → resume (timer never resets). Newest session wins; older tab is cut off.
      if (now > d.endsAtMs + INTERVIEW_GRACE_MS) {
        await finalizeInterview(iv.token, { reason: 'timeout' });
        return res.status(410).json({ success: false, code: 'completed', message: 'Your 30 minutes have ended and the interview has been closed.' });
      }
      await iv.ref.update({ sessionKey });
    }

    return res.status(200).json({
      success: true, sessionKey, name: d.name,
      remainingMs: Math.max(0, d.endsAtMs - now), totalMs: INTERVIEW_TOTAL_MS,
      maxViolations: INTERVIEW_MAX_VIOLATIONS,
      questions: buildPaper(iv.token), answers: d.answers || {}, violations: d.violations || 0,
    });
  } catch (err) {
    console.error('[Interview] start failed:', err.message);
    return res.status(500).json({ success: false, message: 'Could not start the interview. Please try again.' });
  }
});

// Shared guard for save/submit: valid token + live session.
const loadLiveSession = async (req, res) => {
  const { token, sessionKey } = req.body ?? {};
  const iv = await loadInterview(token);
  if (!iv) { res.status(404).json(BAD_LINK); return null; }
  if (iv.data.status === 'completed') { res.status(410).json({ success: false, code: 'completed', message: 'This interview has already been completed.' }); return null; }
  if (iv.data.status !== 'in_progress' || !sameSecret(sessionKey, iv.data.sessionKey)) {
    res.status(409).json({ success: false, code: 'session', message: 'This interview is open in another window. Only one session is allowed.' });
    return null;
  }
  return iv;
};

// ── POST /api/interview/save  (autosave) ─────────────────────────────────────
app.post('/api/interview/save', interviewLimiter, requireDb, async (req, res) => {
  try {
    const iv = await loadLiveSession(req, res);
    if (!iv) return;
    const now = Date.now();
    if (now > iv.data.endsAtMs + INTERVIEW_GRACE_MS) {
      await finalizeInterview(iv.token, { reason: 'timeout' });
      return res.status(200).json({ success: true, done: true });
    }
    const patch = { answers: sanitizeAnswers(req.body.answers) };
    const v = Number.isInteger(req.body.violations) ? Math.min(99, Math.max(0, req.body.violations)) : 0;
    if (v > (iv.data.violations || 0)) patch.violations = v;
    await iv.ref.update(patch);
    return res.status(200).json({ success: true, remainingMs: Math.max(0, iv.data.endsAtMs - now) });
  } catch (err) {
    console.error('[Interview] save failed:', err.message);
    return res.status(500).json({ success: false, message: 'Could not save.' });
  }
});

// ── POST /api/interview/submit ───────────────────────────────────────────────
app.post('/api/interview/submit', interviewLimiter, requireDb, async (req, res) => {
  try {
    const iv = await loadLiveSession(req, res);
    if (!iv) return;
    const late = Date.now() > iv.data.endsAtMs + INTERVIEW_GRACE_MS;
    const reasonIn = ['manual', 'timeout', 'violations'].includes(req.body.reason) ? req.body.reason : 'manual';
    await finalizeInterview(iv.token, {
      // After the deadline only what was autosaved in time counts.
      answers: late ? undefined : sanitizeAnswers(req.body.answers),
      reason: late ? 'timeout' : reasonIn,
      violations: Number.isInteger(req.body.violations) ? req.body.violations : 0,
    });
    return res.status(200).json({ success: true }); // applicants are never shown their score
  } catch (err) {
    console.error('[Interview] submit failed:', err.message);
    return res.status(500).json({ success: false, message: 'Could not submit. Please try again.' });
  }
});

// Closes interviews whose applicant simply walked away (browser closed, power cut…).
// Grades whatever was autosaved so the result still reaches the Admin dashboard.
if (adminDb) {
  setInterval(async () => {
    try {
      const snap = await adminDb.collection('interviews').where('status', '==', 'in_progress').get();
      const now = Date.now();
      for (const doc of snap.docs) {
        if (now > (doc.data().endsAtMs || 0) + INTERVIEW_GRACE_MS) {
          await finalizeInterview(doc.id, { reason: 'timeout' });
          console.log(`[Interview] ⏱  Auto-closed expired interview for application ${doc.data().applicationId}`);
        }
      }
    } catch (err) {
      console.warn('[Interview] sweeper error:', err.message);
    }
  }, 30_000).unref?.();
}

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status:    'ok',
    service:   'Slirus Email API',
    env:       NODE_ENV,
    userManagement: firebaseAdminReady ? 'enabled' : 'disabled',
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
  console.log(`  Portal base : ${PORTAL_BASE_URL}`);
  console.log(`  User mgmt   : ${firebaseAdminReady ? 'enabled (Firebase Admin)' : 'disabled — set FIREBASE_SERVICE_ACCOUNT_KEY'}`);
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