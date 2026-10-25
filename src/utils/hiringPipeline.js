/**
 * hiringPipeline.js – shared contract for the Applicant → Employee → Team Account pipeline.
 *
 * One document per hire in `hiringApprovals/{applicationId}` moves through three
 * owners, in strict order:
 *
 *   1. Admin.jsx        approves a candidate who passed BOTH interview rounds
 *                       (online + in-person)                → stage 'awaiting_hr'
 *   2. HrManager.jsx    creates the employee profile and the background record,
 *                       pre-filled from the applicant's CV   → stage 'awaiting_account'
 *   3. CeoManager.jsx   provisions the login account; only the access level is
 *                       left to decide, everything else is pulled in → stage 'completed'
 *
 * The document is a self-contained snapshot of what was on the CV, so HR never
 * needs read access to the public `applications` collection.
 *
 * KEEP IN SYNC with the `hiringApprovals` block in firestore.rules.
 */

export const HIRING_COLLECTION = 'hiringApprovals';

export const HIRING_STAGES = {
  AWAITING_HR: 'awaiting_hr',
  AWAITING_ACCOUNT: 'awaiting_account',
  COMPLETED: 'completed',
};

export const HIRING_STAGE_META = {
  awaiting_hr:      { label: 'Awaiting HR onboarding', short: 'With HR',        bg: '#EDE9FE', color: '#5B21B6', dot: '#7C3AED', step: 2 },
  awaiting_account: { label: 'Awaiting login account', short: 'With CEO',       bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B', step: 3 },
  completed:        { label: 'Onboarded',               short: 'Onboarded',      bg: '#D1FAE5', color: '#065F46', dot: '#10B981', step: 4 },
};

// The four steps shown in every stepper (Admin, HR and CEO use the same wording).
export const HIRING_STEPS = ['Interviews passed', 'Employee profile', 'Login account', 'Onboarded'];

// Lists mirrored from HrManager.jsx so Admin can propose valid values.
export const HR_DEPARTMENTS = [
  'Sales', 'HR', 'Finance', 'Operations', 'Engineering', 'Marketing', 'Executive',
  'Fashions', 'AgriSolutions', 'Logistics', 'Customer Support', 'Administration',
];
export const HR_CONTRACT_TYPES = ['Probation', 'Fixed-Term', 'Permanent', 'Learning-Based Intern', 'Consultant'];
export const INTERN_CONTRACT = 'Learning-Based Intern';
export const SENIORITY_LEVELS = ['Staff', 'Team Lead', 'Manager', 'Director'];

// Career track → where the person works (HR department) and which CeoManager
// job role (portal + permissions) fits. Admin can override both on approval.
export const TRACK_PLACEMENT = {
  softwareDev:      { department: 'Engineering',      role: 'Technical Staff' },
  accounts:         { department: 'Finance',          role: 'Accountant' },
  sales:            { department: 'Sales',            role: 'Sales Officer' },
  secretary:        { department: 'Administration',   role: 'Secretary' },
  customerSupport:  { department: 'Customer Support', role: 'Operations Officer' },
  agronomist:       { department: 'AgriSolutions',    role: 'Operations Officer' },
  fashionDesigner:  { department: 'Fashions',         role: 'Operations Officer' },
  ecommerce:        { department: 'Sales',            role: 'Sales Officer' },
  logistics:        { department: 'Logistics',        role: 'Operations Officer' },
  cybersecurity:    { department: 'Engineering',      role: 'Technical Staff' },
  internTechnology: { department: 'Engineering',      role: 'Technical Staff' },
  internFashions:   { department: 'Fashions',         role: 'Operations Officer' },
  internAgri:       { department: 'AgriSolutions',    role: 'Operations Officer' },
  internTrade:      { department: 'Operations',       role: 'Operations Officer' },
  internCorporate:  { department: 'Administration',   role: 'Operations Officer' },
};
export const placementForTrack = (trackKey) =>
  TRACK_PLACEMENT[trackKey] || { department: 'Operations', role: 'Operations Officer' };

// ── Small parsing helpers ────────────────────────────────────────────────────
const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const splitName = (fullName = '') => {
  const parts = str(fullName, 200).split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const isoDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) ? v.trim() : '');

const normaliseGender = (g) => {
  const x = str(g, 40).toLowerCase();
  if (x.startsWith('f')) return 'Female';
  if (x.startsWith('m')) return 'Male';
  if (!x) return 'Prefer not to say';
  return x.includes('prefer') ? 'Prefer not to say' : 'Other';
};

// "2015 - 2018" → { yearFrom: '2015', yearTo: '2018' }; "2018" → yearTo only.
export const parseYears = (raw) => {
  const years = (String(raw || '').match(/(19[4-9]\d|20\d\d)/g) || []);
  if (!years.length) return { yearFrom: '', yearTo: '' };
  if (years.length === 1) return { yearFrom: years[0], yearTo: years[0] };
  return { yearFrom: years[0], yearTo: years[years.length - 1] };
};

// Reads a labelled answer out of the role-specific `extras` / `extraAnswers` on an application.
const findExtra = (app, pattern) => {
  const fromList = (Array.isArray(app.extraAnswers) ? app.extraAnswers : [])
    .find(a => a && pattern.test(String(a.label || '')) && str(a.value));
  if (fromList) return str(fromList.value, 200);
  const ex = app.extras && typeof app.extras === 'object' ? app.extras : {};
  const k = Object.keys(ex).find(key => pattern.test(key) && typeof ex[key] === 'string' && str(ex[key]));
  return k ? str(ex[k], 200) : '';
};

// ── Snapshot written by Admin.jsx when a candidate is approved ───────────────
// Everything is trimmed and size-capped to fit the firestore.rules limits.
export const buildApprovalSnapshot = (app, decision) => {
  const placement = placementForTrack(app.trackKey);
  const isIntern = app.type === 'Internship';
  return {
    applicationId: app.id,
    stage: HIRING_STAGES.AWAITING_HR,

    // Identity & contact (straight from the CV)
    fullName: str(app.fullName, 200),
    email: str(app.email, 320).toLowerCase(),
    phone: str(app.phone, 40),
    gender: str(app.gender, 40),
    dob: str(app.dob, 20),
    address: str(app.physicalAddress, 300),
    district: str(app.district, 100),

    // Position applied for
    trackKey: str(app.trackKey, 40),
    program: str(app.program, 200),
    type: isIntern ? 'Internship' : 'Job',
    division: str(app.division, 100),

    // CV content used to pre-fill the HR background record
    education: (Array.isArray(app.education) ? app.education : []).filter(e => e && e.institution).slice(0, 8)
      .map(e => ({ institution: str(e.institution, 200), year: str(e.year, 40), level: str(e.level, 100), award: str(e.award, 200) })),
    experience: (Array.isArray(app.experience) ? app.experience : []).filter(e => e && e.employer).slice(0, 10)
      .map(e => ({ employer: str(e.employer, 200), role: str(e.role, 200), period: str(e.period, 60), duties: str(e.duties, 600) })),
    referees: (Array.isArray(app.referees) ? app.referees : []).filter(r => r && r.name).slice(0, 5)
      .map(r => ({ name: str(r.name, 200), title: str(r.title, 200), contact: str(r.contact, 200) })),
    internInstitution: isIntern ? findExtra(app, /institution|university|college|school/i) : '',
    internProgramme:   isIntern ? findExtra(app, /programme|program|course|study/i) : '',
    internFocusArea:   isIntern ? findExtra(app, /area|learn|focus/i) : '',

    // Interview evidence (both rounds)
    onlineScorePercent: typeof app.interviewPercent === 'number' ? app.interviewPercent : null,
    round2Date: str(app.secondRoundDate, 20),
    round2Venue: str(app.secondRoundVenue, 200),
    round2Result: 'Passed',
    round2Notes: str(decision.notes, 1000),

    // Admin's proposal (HR may still adjust before saving the employee)
    proposedDepartment: decision.department || placement.department,
    proposedPosition: str(decision.position || app.program, 200),
    proposedContractType: decision.contractType || (isIntern ? INTERN_CONTRACT : 'Probation'),
    proposedStartDate: str(decision.startDate, 20),
    suggestedRole: decision.role || placement.role,
    suggestedLevel: decision.level || 'Staff',
  };
};

// ── Pre-fill for HrManager's EmployeeFormModal ───────────────────────────────
export const buildEmployeeDraft = (a) => {
  const { firstName, lastName } = splitName(a.fullName);
  const isIntern = a.proposedContractType === INTERN_CONTRACT;
  return {
    firstName, lastName,
    email: a.email || '',
    phone: a.phone || '',
    gender: normaliseGender(a.gender),
    dob: isoDate(a.dob),
    department: a.proposedDepartment || 'Operations',
    position: a.proposedPosition || a.program || '',
    contractType: a.proposedContractType || 'Probation',
    hireDate: isoDate(a.proposedStartDate),
    contractStart: isoDate(a.proposedStartDate),
    origin: a.district || '',
    placeOfWork: '',
    ...(isIntern ? {
      internInstitution: a.internInstitution || (a.education?.[0]?.institution || ''),
      internProgramme: a.internProgramme || (a.education?.[0]?.award || ''),
      internFocusArea: '',
    } : {}),
  };
};

// ── Pre-fill for the HR background record (partial; merged over the empty record) ──
export const buildBackgroundDraft = (a) => {
  const academics = (a.education || []).slice(0, 8).map((e) => {
    const { yearFrom, yearTo } = parseYears(e.year);
    return {
      schoolName: e.institution || '',
      poBox: '', district: '',             // not on a CV – HR completes from the certificate
      yearFrom, yearTo,
      qualification: [e.award, e.level].filter(Boolean).join(' – ') || e.level || '',
      certificateSerial: '',               // HR must verify against the original certificate
    };
  });

  const refLines = (a.referees || []).map((r, i) => `${i + 1}. ${[r.name, r.title, r.contact].filter(Boolean).join(' · ')}`);
  const expLines = (a.experience || []).map((e) => `${e.period ? e.period + ': ' : ''}${[e.employer, e.role].filter(Boolean).join(' – ')}`);
  const securityNotes = [
    `Imported from the job application (ref ${String(a.applicationId || '').slice(0, 12).toUpperCase()}). Unverified until HR checks originals.`,
    refLines.length ? `Referees given:\n${refLines.join('\n')}` : '',
    expLines.length ? `Previous employment declared:\n${expLines.join('\n')}` : '',
  ].filter(Boolean).join('\n\n').slice(0, 2000);

  return { academics, personal: { securityNotes, referencesVerified: false } };
};

// What HR still has to collect – shown as a checklist next to the prefilled form.
export const BACKGROUND_TODO = [
  'Next of kin (name, phone, address, relationship)',
  'Parents / guardian details and marital status',
  'Certificate serial numbers, school P.O. Box and district for each qualification',
  'Health declaration and consent, signed by the employee',
];

export const stageOf = (approval) => HIRING_STAGE_META[approval?.stage] || HIRING_STAGE_META.awaiting_hr;