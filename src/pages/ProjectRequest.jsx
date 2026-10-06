/**
 * ProjectRequest.jsx – Slirus Global Limited Project Request / Proposal Intake
 *
 * Multi-step client intake form covering:
 *  1. Your Details
 *  2. Your Project
 *  3. What You Need
 *  4. Timeline & Budget
 *  5. What Success Looks Like
 *  6. A Few Last Things
 *  7. Review & Submit
 *
 * Firebase: writes to `projectRequests` collection (Firestore).
 * Mirrors Apply.jsx's architecture so Admin.jsx can list these the same way
 * it lists `applications`.
 *
 * Email: after submission, fires POST /api/send-email (type: project_request_received)
 * — fire-and-forget, does not block the success screen.
 *
 * Dependencies: firebase/firestore, Layout
 */

import React, { useState, useCallback, useRef } from 'react';
import { db } from '../firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Layout from '../components/Layout';
import { generateProjectRequestPDF, generateProjectProposalPDF } from '../utils/projectPdf';

// ─── API Base URL ─────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || '';

// ─── Brand color (matches Slirus palette used across Apply.jsx / Admin.jsx) ──
const BRAND = '#1A3C5E';
const ACCENT = '#2E6DA4';

// ─── Field helpers (same pattern as Apply.jsx) ────────────────────────────────
const Field = ({ label, required, hint, error, children }) => (
  <div style={s.fieldWrap}>
    <label style={s.label}>
      {label}{required && <span style={{ color: '#C0392B' }}> *</span>}
    </label>
    {hint && <span style={s.hint}>{hint}</span>}
    {children}
    {error && <span style={s.errMsg}>{error}</span>}
  </div>
);

const Input = ({ error, ...props }) => (
  <input style={{ ...s.input, borderColor: error ? '#C0392B' : '#D0DCE8' }} {...props} />
);

const Select = ({ error, children, ...props }) => (
  <select style={{ ...s.input, borderColor: error ? '#C0392B' : '#D0DCE8' }} {...props}>
    {children}
  </select>
);

const Textarea = ({ error, ...props }) => (
  <textarea style={{ ...s.input, ...s.textarea, borderColor: error ? '#C0392B' : '#D0DCE8' }} {...props} />
);

// ─── Step Bar ─────────────────────────────────────────────────────────────────
const STEPS = ['Your Details', 'Your Project', 'What You Need', 'Timeline & Budget', 'What Success Looks Like', 'Last Step', 'Review'];

// ─── Service catalogue (mirrors Services.jsx: 4 tech services + Fashions, AgriSolutions, General Trade) ──
const SERVICE_CATEGORIES = [
  {
    id: 'Custom Software Development',
    blurb: 'Tailor-made web and mobile products, enterprise systems, and integrations.',
    subServices: ['Web Application Development', 'Mobile App Development', 'Enterprise Systems & Automation', 'API & Systems Integration'],
  },
  {
    id: 'IT Consulting & Digital Transformation',
    blurb: 'Technology strategy, audits, and cloud/digital transformation roadmaps.',
    subServices: ['IT Audits & System Assessments', 'Digital Transformation Roadmaps', 'Cloud Migration & Adoption', 'IT Corporate Training'],
  },
  {
    id: 'Network Infrastructure Management',
    blurb: 'Network design, server setup, cabling, and ongoing monitoring & support.',
    subServices: ['Network Design & Architecture', 'Server Setup & Management', 'Wireless & Structured Cabling', 'Network Monitoring & Support'],
  },
  {
    id: 'Cybersecurity & Data Protection',
    blurb: 'Security audits, endpoint protection, backups, and incident response.',
    subServices: ['Security Audits & Risk Assessments', 'Endpoint & Network Security', 'Data Backup & Disaster Recovery', 'Incident Response & Monitoring'],
  },
  {
    id: 'Slirus Fashions',
    kind: 'business',
    blurb: 'Fashion design, textile manufacturing, apparel and lifestyle products, and e-commerce.',
    subServices: [
      'Fashion Designing',
      'Textile Manufacturing',
      'Wholesale & Retail of Apparel and Lifestyle Products',
      'General Merchandise Import & Export',
      'E-commerce Operations',
    ],
  },
  {
    id: 'Slirus AgriSolutions',
    kind: 'business',
    blurb: 'Agricultural produce, farming inputs, and modern agricultural machinery.',
    subServices: [
      'Agricultural Production',
      'Produce Processing',
      'Wholesale & Retail of Agricultural Products and Farming Inputs',
      'Agricultural Import & Export',
      'Seeds, Fertilizers & Agro-Chemicals',
      'Modern Agricultural Machinery',
    ],
  },
  {
    id: 'Slirus General Trade',
    kind: 'business',
    blurb: 'General trade and commerce, partnerships, logistics, consultancy, real estate, and project management.',
    subServices: [
      'Manufacturing & Distribution of Goods',
      'Marketing, Import & Export',
      'Strategic Partnerships & Joint Ventures',
      'Intellectual Property Acquisition & Protection',
      'Logistics Services',
      'Consultancy Services',
      'Real Estate Services',
      'Project Management Services',
    ],
  },
];

// Technology services vs. the other Slirus divisions (used to tailor wording and the dropdown groups)
const isBusinessService = (id) => SERVICE_CATEGORIES.find(c => c.id === id)?.kind === 'business';

const StepBar = ({ step }) => (
  <div style={s.stepBar}>
    {STEPS.map((label, i) => {
      const done = i < step, active = i === step;
      const circleColor = done || active ? BRAND : '#CBD5E0';
      const textColor   = done || active ? BRAND : '#94A3B8';
      return (
        <React.Fragment key={label}>
          {i > 0 && <div style={{ ...s.stepLine, background: i <= step ? BRAND : '#E2E8F0' }} />}
          <div style={s.stepItem}>
            <div style={{ ...s.stepCircle, background: done ? BRAND : active ? '#EFF6FF' : '#F8FAFC', border: `2px solid ${circleColor}`, color: done ? '#fff' : textColor }}>
              {done ? '✓' : i + 1}
            </div>
            <span style={{ ...s.stepLabel, color: textColor, fontWeight: active ? 700 : 400 }}>{label}</span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Success Screen ───────────────────────────────────────────────────────────
const SuccessScreen = ({ form, docId, onReset }) => {
  const [reqLoading, setReqLoading] = useState(false);
  const [propLoading, setPropLoading] = useState(false);

  const buildProject = () => ({
    ...form,
    objectives: form.objectives.filter(Boolean),
    deliverables: form.deliverables.filter(Boolean),
    inspirationLinks: form.inspirationLinks.filter(Boolean),
    id: docId,
    status: 'New',
    submittedAt: new Date(),
  });

  const handleRequestPDF = async () => {
    setReqLoading(true);
    try { await generateProjectRequestPDF(buildProject()); }
    catch (err) { alert('Could not generate PDF: ' + err.message); }
    finally { setReqLoading(false); }
  };

  const handleProposalPDF = async () => {
    setPropLoading(true);
    try { await generateProjectProposalPDF(buildProject()); }
    catch (err) { alert('Could not generate PDF: ' + err.message); }
    finally { setPropLoading(false); }
  };

  return (
    <div style={s.centreWrap}>
      <div style={{ ...s.noticeCard, borderTop: `4px solid ${BRAND}` }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
        <h2 style={{ ...s.noticeTitle, color: '#065F46' }}>Thanks — we got your request!</h2>
        <p style={s.noticeBody}>
          Thank you, <strong>{form.contactName}</strong>. We've received your request for{' '}
          <strong>{form.companyName || 'your organization'}</strong>.
          Our team will look it over and get in touch at <strong>{form.contactEmail}</strong> soon.
        </p>
        <div style={{ ...s.refBox, margin: '0 auto 20px', display: 'inline-flex' }}>
          <span style={s.refLabel}>Reference&nbsp;</span>
          <span style={s.refValue}>{docId?.slice(0, 12).toUpperCase()}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 22 }}>
          <button style={s.pdfBtn} onClick={handleRequestPDF} disabled={reqLoading}>
            {reqLoading ? '⏳ Preparing…' : '⬇ Download Request Summary (PDF)'}
          </button>
          <button style={{ ...s.pdfBtn, background: '#EFF6FF', color: '#1D4ED8' }} onClick={handleProposalPDF} disabled={propLoading}>
            {propLoading ? '⏳ Preparing…' : '⬇ Download Project Proposal (PDF)'}
          </button>
        </div>

        <button style={{ ...s.submitBtn, width: 'auto', padding: '10px 24px' }} onClick={onReset}>
          ← Send Another Request
        </button>
      </div>
    </div>
  );
};

// ─── Step 1: Your Details ─────────────────────────────────────────────────────
const StepClient = ({ form, errors, onChange }) => (
  <div>
    <h3 style={s.sectionTitle}>Your Details</h3>
    <p style={s.sectionHint}>So we know who we're talking to, and how to reach you.</p>

    <div style={s.row2}>
      <Field label="Company or Business Name" required error={errors.companyName}>
        <Input value={form.companyName} error={errors.companyName} onChange={e => onChange('companyName', e.target.value)} placeholder="e.g. Acme Retail Ltd" />
      </Field>
      <Field label="Website" hint="Leave blank if you don't have one yet">
        <Input value={form.companyWebsite} onChange={e => onChange('companyWebsite', e.target.value)} placeholder="https://example.com" />
      </Field>
    </div>

    <h4 style={s.subHead}>Who Should We Talk To?</h4>
    <div style={s.row3}>
      <Field label="Your Name" required error={errors.contactName}>
        <Input value={form.contactName} error={errors.contactName} onChange={e => onChange('contactName', e.target.value)} placeholder="e.g. Jane Doe" />
      </Field>
      <Field label="Email Address" required error={errors.contactEmail}>
        <Input type="email" value={form.contactEmail} error={errors.contactEmail} onChange={e => onChange('contactEmail', e.target.value)} placeholder="you@company.com" />
      </Field>
      <Field label="Phone Number" required error={errors.contactPhone}>
        <Input type="tel" value={form.contactPhone} error={errors.contactPhone} onChange={e => onChange('contactPhone', e.target.value)} placeholder="+256 7XX XXX XXX" />
      </Field>
    </div>

    <h4 style={s.subHead}>Who Will Sign the Agreement? <span style={{ fontWeight: 400, color: '#94A3B8' }}>(only if it's someone else)</span></h4>
    <div style={s.row2}>
      <Field label="Their Name">
        <Input value={form.signatoryName} onChange={e => onChange('signatoryName', e.target.value)} placeholder="Who will sign on your behalf?" />
      </Field>
      <Field label="Their Job Title">
        <Input value={form.signatoryTitle} onChange={e => onChange('signatoryTitle', e.target.value)} placeholder="e.g. CEO, Operations Manager" />
      </Field>
    </div>
  </div>
);

// ─── Step 2: Your Project ──────────────────────────────────────────────────────
const StepOverview = ({ form, errors, onChange, onChangeArr }) => {
  const activeCategory = SERVICE_CATEGORIES.find(c => c.id === form.serviceCategory);

  const toggleSubService = (name) => {
    const has = form.specificServices.includes(name);
    onChange('specificServices', has ? form.specificServices.filter(name2 => name2 !== name) : [...form.specificServices, name]);
  };

  return (
  <div>
    <h3 style={s.sectionTitle}>Your Project</h3>
    <p style={s.sectionHint}>Tell us what you're trying to do, in your own words.</p>

    <Field label="Which Service Are You Interested In?" required hint="We cover technology services, fashion, agriculture, and general trade." error={errors.serviceCategory}>
      <Select
        value={form.serviceCategory}
        error={errors.serviceCategory}
        onChange={e => { onChange('serviceCategory', e.target.value); onChange('specificServices', []); }}
      >
        <option value="">Pick the service that fits best…</option>
        <optgroup label="Slirus Technologies">
          {SERVICE_CATEGORIES.filter(c => c.kind !== 'business').map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
        </optgroup>
        <optgroup label="Our Other Divisions">
          {SERVICE_CATEGORIES.filter(c => c.kind === 'business').map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
        </optgroup>
      </Select>
      {activeCategory && <span style={s.hint}>{activeCategory.blurb}</span>}
    </Field>

    {activeCategory && (
      <Field label="Specific Service(s) You Need" hint="Pick one or more, or leave blank if you're not sure yet — we can help you figure it out.">
        <div style={s.checkGrid}>
          {activeCategory.subServices.map(name => (
            <label key={name} style={s.checkItem}>
              <input type="checkbox" checked={form.specificServices.includes(name)} onChange={() => toggleSubService(name)} />
              <span>{name}</span>
            </label>
          ))}
        </div>
      </Field>
    )}

    <Field label="Give Your Project a Name" required error={errors.projectTitle}>
      <Input value={form.projectTitle} error={errors.projectTitle} onChange={e => onChange('projectTitle', e.target.value)} placeholder="A short name so we both know what to call this" />
    </Field>

    <Field label="What Do You Want to Achieve?" required error={errors.projectDescription}>
      <Textarea
        value={form.projectDescription}
        error={errors.projectDescription}
        onChange={e => onChange('projectDescription', e.target.value)}
        placeholder="Describe what you're looking for, as simply as you like…"
        rows={5}
      />
    </Field>

    <Field label="What Are Your Main Goals?" hint="List up to 3. For example: get more customers, launch a new product, fix a problem you're having." error={errors.obj_0}>
      {form.objectives.map((obj, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span style={s.numBadge}>{i + 1}</span>
          <Input
            value={obj}
            error={i === 0 ? errors.obj_0 : null}
            onChange={e => onChangeArr('objectives', i, null, e.target.value)}
            placeholder={`Goal #${i + 1}`}
          />
        </div>
      ))}
    </Field>

    <Field label="Who Is This For?" required error={errors.targetAudience}>
      <Textarea value={form.targetAudience} error={errors.targetAudience} onChange={e => onChange('targetAudience', e.target.value)} placeholder="Who will use this, or who is it aimed at?" rows={3} />
    </Field>

    <Field label="What Problem Are You Trying to Solve?" hint="Optional — but it helps us understand the full picture.">
      <Textarea value={form.currentChallenges} onChange={e => onChange('currentChallenges', e.target.value)} placeholder="What's going wrong, or what's missing right now?" rows={3} />
    </Field>
  </div>
  );
};

// ─── Step 3: What You Need ─────────────────────────────────────────────────────
const StepScope = ({ form, errors, onChangeArr, onAddRow, onRemoveRow, onChange }) => (
  <div>
    <h3 style={s.sectionTitle}>What You Need</h3>
    <p style={s.sectionHint}>This helps us stay focused on exactly what you're asking for.</p>

    <Field label="What Should We Create or Deliver?" hint={isBusinessService(form.serviceCategory)
      ? 'Be as specific as you can — e.g. "200 branded polo shirts" or "5 tonnes of maize seed" instead of "some stock."'
      : 'Be as specific as you can — e.g. "A new homepage and 3 landing pages" instead of "some website work."'} error={errors.deliv_0}>
      {form.deliverables.map((d, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
          <span style={s.numBadge}>{i + 1}</span>
          <Input
            value={d}
            error={i === 0 ? errors.deliv_0 : null}
            onChange={e => onChangeArr('deliverables', i, null, e.target.value)}
            placeholder={`Item #${i + 1}`}
          />
          {form.deliverables.length > 1 && (
            <button style={s.removeBtnInline} onClick={() => onRemoveRow('deliverables', i)}>✕</button>
          )}
        </div>
      ))}
      <button style={s.addBtn} onClick={() => onAddRow('deliverables', '')}>+ Add Another</button>
    </Field>

    <Field
      label={isBusinessService(form.serviceCategory) ? 'Any Specifications or Requirements?' : 'Anything It Needs to Work With?'}
      hint={isBusinessService(form.serviceCategory)
        ? 'For example, sizes, materials, quantities, quality or grade, packaging, or delivery location. Leave blank if you\'re not sure — we can figure it out together.'
        : "For example, a certain website platform, or a certain file type it needs to be delivered in. Leave blank if you're not sure — we can figure it out together."}
    >
      <Textarea value={form.technicalRequirements} onChange={e => onChange('technicalRequirements', e.target.value)} placeholder={isBusinessService(form.serviceCategory) ? 'Any sizes, materials, quantities, standards, or delivery details we should know about…' : 'Any specific platforms, formats, or tools this needs to work with…'} rows={4} />
    </Field>

    <Field label="Do You Already Have a Logo or Brand Materials?" hint="Colors, fonts, existing text, anything you'd like us to use.">
      <Textarea value={form.brandAssets} onChange={e => onChange('brandAssets', e.target.value)} placeholder="Tell us what you already have, or let us know if you're starting from scratch…" rows={3} />
    </Field>
  </div>
);

// ─── Step 4: Timeline & Budget ─────────────────────────────────────────────────
const BUDGET_RANGES = [
  'UGX 200,000 – 400,000',
  'Above UGX 400,000 – 800,000',
  'Above UGX 800,000 – 1,000,000+',
];

const StepTimeline = ({ form, errors, onChange }) => (
  <div>
    <h3 style={s.sectionTitle}>Timeline & Budget</h3>
    <p style={s.sectionHint}>This helps us plan and make sure we're a good fit.</p>

    <div style={s.row2}>
      <Field label="When Would You Like to Start?" required error={errors.startDate}>
        <Input type="date" value={form.startDate} error={errors.startDate} onChange={e => onChange('startDate', e.target.value)} />
      </Field>
      <Field label="Any Date You Need This Done By?" hint="Is there a launch date or event you need to hit? Leave blank if not.">
        <Input type="date" value={form.hardDeadline} onChange={e => onChange('hardDeadline', e.target.value)} />
      </Field>
    </div>

    <Field label="What's Your Budget?" required hint="All amounts are in Uganda Shillings (UGX)." error={errors.budgetRange}>
      <Select value={form.budgetRange} error={errors.budgetRange} onChange={e => onChange('budgetRange', e.target.value)}>
        <option value="">Pick the range that fits best…</option>
        {BUDGET_RANGES.map(r => <option key={r}>{r}</option>)}
      </Select>
    </Field>
  </div>
);

// ─── Step 5: What Success Looks Like ───────────────────────────────────────────
const StepMetrics = ({ form, errors, onChange, onChangeArr, onAddRow, onRemoveRow }) => (
  <div>
    <h3 style={s.sectionTitle}>What Success Looks Like</h3>
    <p style={s.sectionHint}>So we both know what "done and working" means to you.</p>

    <Field label="How Will You Know This Worked?" required hint="For example: more people signing up, more sales, more visitors, or simply that you're happy with the end result." error={errors.kpis}>
      <Textarea value={form.kpis} error={errors.kpis} onChange={e => onChange('kpis', e.target.value)} placeholder="Describe what success looks like to you…" rows={4} />
    </Field>

    <Field label="Any Examples You Like?" hint="Share 1–3 links to things you've seen and like the look or feel of.">
      {form.inspirationLinks.map((link, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span style={s.numBadge}>{i + 1}</span>
          <Input
            value={link}
            onChange={e => onChangeArr('inspirationLinks', i, null, e.target.value)}
            placeholder="https://example.com"
          />
          {form.inspirationLinks.length > 1 && (
            <button style={s.removeBtnInline} onClick={() => onRemoveRow('inspirationLinks', i)}>✕</button>
          )}
        </div>
      ))}
      {form.inspirationLinks.length < 3 && (
        <button style={s.addBtn} onClick={() => onAddRow('inspirationLinks', '')}>+ Add Another Link</button>
      )}
    </Field>
  </div>
);

// ─── Step 6: A Few Last Things ─────────────────────────────────────────────────
const REFERRAL_SOURCES = [
  'Google Search', 'Social Media', 'A Friend or Colleague Told Me',
  'LinkedIn', 'I\'ve Worked With You Before', 'Your Website', 'An Event or Conference', 'Other',
];

const StepLogistics = ({ form, errors, onChange }) => (
  <div>
    <h3 style={s.sectionTitle}>A Few Last Things</h3>

    <Field label="How Did You Hear About Us?" required error={errors.referralSource}>
      <Select value={form.referralSource} error={errors.referralSource} onChange={e => onChange('referralSource', e.target.value)}>
        <option value="">Pick one…</option>
        {REFERRAL_SOURCES.map(r => <option key={r}>{r}</option>)}
      </Select>
    </Field>
  </div>
);

// ─── Step 7: Review ─────────────────────────────────────────────────────────────
const RR = ({ label, value }) => value ? (
  <div style={s.rrRow}>
    <span style={s.rrLabel}>{label}</span>
    <span style={s.rrVal}>{value}</span>
  </div>
) : null;

const StepReview = ({ form }) => (
  <div>
    <h3 style={s.sectionTitle}>Check Your Answers</h3>
    <p style={s.sectionHint}>Take a quick look below, then submit when you're ready.</p>

    <div style={s.rrSection}>
      <h4 style={s.rrHead}>Your Details</h4>
      <RR label="Company" value={form.companyName} />
      <RR label="Website" value={form.companyWebsite} />
      <RR label="Contact" value={`${form.contactName} · ${form.contactEmail} · ${form.contactPhone}`} />
      {form.signatoryName && <RR label="Signs Agreement" value={`${form.signatoryName}${form.signatoryTitle ? ' — ' + form.signatoryTitle : ''}`} />}
    </div>

    <div style={s.rrSection}>
      <h4 style={s.rrHead}>Your Project</h4>
      <RR label="Service" value={form.serviceCategory} />
      <RR label="Specific Services" value={form.specificServices.join(' · ')} />
      <RR label="Name" value={form.projectTitle} />
      <RR label="Description" value={form.projectDescription} />
      <RR label="Goals" value={form.objectives.filter(Boolean).join(' · ')} />
      <RR label="Who It's For" value={form.targetAudience} />
      <RR label="Problem to Solve" value={form.currentChallenges} />
    </div>

    <div style={s.rrSection}>
      <h4 style={s.rrHead}>What You Need</h4>
      <RR label="To Deliver" value={form.deliverables.filter(Boolean).join(' · ')} />
      <RR label="Needs to Work With" value={form.technicalRequirements} />
      <RR label="Brand Materials" value={form.brandAssets} />
    </div>

    <div style={s.rrSection}>
      <h4 style={s.rrHead}>Timeline & Budget</h4>
      <RR label="Start Date" value={form.startDate} />
      <RR label="Deadline" value={form.hardDeadline} />
      <RR label="Budget" value={form.budgetRange} />
    </div>

    <div style={s.rrSection}>
      <h4 style={s.rrHead}>Success</h4>
      <RR label="Looks Like" value={form.kpis} />
      <RR label="Examples" value={form.inspirationLinks.filter(Boolean).join(' · ')} />
    </div>

    <div style={s.rrSection}>
      <h4 style={s.rrHead}>Last Things</h4>
      <RR label="Heard About Us" value={form.referralSource} />
    </div>
  </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────────
const ProjectRequest = () => {
  const [step, setStep]             = useState(0);
  const [submitted, setSubmitted]   = useState(false);
  const [submittedDocId, setSubmittedDocId] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState({});
  const topRef = useRef(null);

  const [form, setForm] = useState({
    // Step 1 — Your Details
    companyName: '', companyWebsite: '',
    contactName: '', contactEmail: '', contactPhone: '',
    signatoryName: '', signatoryTitle: '',
    // Step 2 — Your Project
    serviceCategory: '', specificServices: [],
    projectTitle: '', projectDescription: '',
    objectives: ['', '', ''],
    targetAudience: '', currentChallenges: '',
    // Step 3 — What You Need
    deliverables: [''],
    technicalRequirements: '', brandAssets: '',
    // Step 4 — Timeline & Budget
    startDate: '', hardDeadline: '', budgetRange: '',
    // Step 5 — What Success Looks Like
    kpis: '', inspirationLinks: [''],
    // Step 6 — A Few Last Things
    referralSource: '',
  });

  const set = useCallback((k, v) => setForm(p => ({ ...p, [k]: v })), []);

  const changeArr = useCallback((sec, idx, field, val) => {
    setForm(p => {
      const arr = [...p[sec]];
      arr[idx] = field === null ? val : { ...arr[idx], [field]: val };
      return { ...p, [sec]: arr };
    });
  }, []);

  const addRow    = useCallback((sec, empty) => setForm(p => ({ ...p, [sec]: [...p[sec], empty] })), []);
  const removeRow = useCallback((sec, idx)   => setForm(p => ({ ...p, [sec]: p[sec].filter((_, i) => i !== idx) })), []);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── Validation per step ──────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.companyName.trim())  e.companyName  = 'Please tell us your company or business name.';
      if (!form.contactName.trim())  e.contactName  = 'Please tell us your name.';
      if (!form.contactEmail.trim()) e.contactEmail = 'Please add an email address.';
      else if (!/\S+@\S+\.\S+/.test(form.contactEmail)) e.contactEmail = 'That email doesn\'t look quite right.';
      if (!form.contactPhone.trim()) e.contactPhone = 'Please add a phone number.';
    }
    if (step === 1) {
      if (!form.serviceCategory)           e.serviceCategory    = 'Please pick which service you\'re interested in.';
      if (!form.projectTitle.trim())       e.projectTitle       = 'Please give your project a name.';
      if (!form.projectDescription.trim()) e.projectDescription = 'Please tell us what you want to achieve.';
      if (!form.objectives[0]?.trim())     e.obj_0              = 'Please add at least one goal.';
      if (!form.targetAudience.trim())     e.targetAudience     = 'Please tell us who this is for.';
    }
    if (step === 2) {
      if (!form.deliverables[0]?.trim()) e.deliv_0 = 'Please add at least one thing you need.';
    }
    if (step === 3) {
      if (!form.startDate)   e.startDate   = 'Please pick a start date.';
      if (!form.budgetRange) e.budgetRange = 'Please pick a budget range.';
    }
    if (step === 4) {
      if (!form.kpis.trim()) e.kpis = 'Please tell us how you\'ll know this worked.';
    }
    if (step === 5) {
      if (!form.referralSource) e.referralSource = 'Please tell us how you heard about us.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) { setStep(s => s + 1); scrollTop(); } };
  const back = () => { setStep(s => s - 1); setErrors({}); scrollTop(); };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Save the project request to Firestore
      const docRef = await addDoc(collection(db, 'projectRequests'), {
        ...form,
        objectives:       form.objectives.filter(Boolean),
        deliverables:      form.deliverables.filter(Boolean),
        inspirationLinks:  form.inspirationLinks.filter(Boolean),
        status:            'New',
        submittedAt:       serverTimestamp(),
      });

      // Send confirmation email — fire-and-forget
      fetch(`${API_URL}/api/send-email`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:    'project_request_received',
          to:      form.contactEmail,
          name:    form.contactName,
          program: form.projectTitle,
          service: form.serviceCategory,
        }),
      }).catch(err => console.warn('[Email] Confirmation email failed:', err));

      setSubmittedDocId(docRef.id);
      setSubmitted(true);
      scrollTop();
    } catch (err) {
      alert('Submission failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      companyName: '', companyWebsite: '',
      contactName: '', contactEmail: '', contactPhone: '',
      signatoryName: '', signatoryTitle: '',
      serviceCategory: '', specificServices: [],
      projectTitle: '', projectDescription: '',
      objectives: ['', '', ''],
      targetAudience: '', currentChallenges: '',
      deliverables: [''],
      technicalRequirements: '', brandAssets: '',
      startDate: '', hardDeadline: '', budgetRange: '',
      kpis: '', inspirationLinks: [''],
      referralSource: '',
    });
    setStep(0);
    setSubmitted(false);
    setSubmittedDocId(null);
    setErrors({});
  };

  // ── Success screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <Layout>
        <SuccessScreen form={form} docId={submittedDocId} onReset={resetForm} />
      </Layout>
    );
  }

  const stepContent = [
    <StepClient    key="client"    form={form} errors={errors} onChange={set} />,
    <StepOverview  key="overview"  form={form} errors={errors} onChange={set} onChangeArr={changeArr} />,
    <StepScope     key="scope"     form={form} errors={errors} onChangeArr={changeArr} onAddRow={addRow} onRemoveRow={removeRow} onChange={set} />,
    <StepTimeline  key="timeline"  form={form} errors={errors} onChange={set} />,
    <StepMetrics   key="metrics"   form={form} errors={errors} onChange={set} onChangeArr={changeArr} onAddRow={addRow} onRemoveRow={removeRow} />,
    <StepLogistics key="logistics" form={form} errors={errors} onChange={set} />,
    <StepReview    key="review"    form={form} />,
  ];

  const isLastStep = step === STEPS.length - 1;

  return (
    <Layout>
      <div style={s.pageWrap} ref={topRef}>
        {/* Page header */}
        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>Start a Project</h1>
          <p style={s.pageSub}>Tell us a bit about what you need, and we'll get back to you with a plan.</p>
        </div>

        <div style={s.formCard}>
          <div style={{ ...s.formAccent, background: BRAND }} />
          <StepBar step={step} />

          <div style={s.formBody}>
            {stepContent[step]}
          </div>

          <div style={s.navBar}>
            <div style={{ flex: 1 }}>
              {step > 0 && <button style={s.backBtn} onClick={back}>← Back</button>}
            </div>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Step {step + 1} of {STEPS.length}</span>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {isLastStep ? (
                <button style={{ ...s.submitBtn, minWidth: 150 }} onClick={handleSubmit} disabled={loading}>
                  {loading ? '⏳ Sending…' : '✓ Send Request'}
                </button>
              ) : (
                <button style={s.submitBtn} onClick={next}>Continue →</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// ─── Styles (mirrors Apply.jsx's design system) ────────────────────────────────
const s = {
  centreWrap:   { minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  noticeCard:   { maxWidth: 520, width: '100%', background: '#fff', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', border: '1px solid #E2E8F0', padding: '48px 40px', textAlign: 'center' },
  noticeTitle:  { fontSize: 22, fontWeight: 700, color: BRAND, margin: '0 0 12px' },
  noticeBody:   { fontSize: 15, color: '#4A6B8A', lineHeight: 1.7, margin: '0 0 24px' },
  refBox:       { display: 'inline-flex', alignItems: 'center', gap: 10, background: '#F0F4F8', borderRadius: 8, padding: '10px 18px', marginBottom: 20 },
  refLabel:     { fontSize: 12, fontWeight: 600, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.5 },
  refValue:     { fontSize: 14, fontWeight: 700, color: BRAND, fontFamily: 'monospace' },

  pageWrap:     { maxWidth: 880, margin: '0 auto', padding: '40px 20px 80px' },
  pageHeader:   { marginBottom: 24 },
  pageTitle:    { fontSize: 30, fontWeight: 700, color: BRAND, margin: 0 },
  pageSub:      { color: '#5A7A9A', marginTop: 8, fontSize: 15 },

  formCard:     { background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0', overflow: 'hidden' },
  formAccent:   { height: 4 },
  formBody:     { padding: '28px 32px' },
  navBar:       { display: 'flex', alignItems: 'center', padding: '16px 32px', borderTop: '1px solid #E2E8F0', background: '#F7F9FC', gap: 12 },

  stepBar:      { display: 'flex', alignItems: 'center', padding: '18px 32px 14px', borderBottom: '1px solid #E2E8F0', background: '#F7F9FC', overflowX: 'auto', gap: 0 },
  stepItem:     { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 },
  stepCircle:   { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginBottom: 4 },
  stepLabel:    { fontSize: 10, textAlign: 'center', whiteSpace: 'nowrap', color: '#94A3B8' },
  stepLine:     { flex: 1, height: 2, minWidth: 16, margin: '0 2px 14px' },

  sectionTitle: { fontSize: 15, fontWeight: 700, color: BRAND, marginBottom: 6, marginTop: 0 },
  sectionHint:  { fontSize: 13, color: '#7A8A9A', marginBottom: 16, marginTop: 0 },
  subHead:      { fontSize: 13, fontWeight: 700, color: BRAND, margin: '20px 0 10px' },

  row2:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 0 },
  row3:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 0 },
  checkGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  checkItem:    { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: BRAND, background: '#F7F9FC', border: '1.5px solid #E2E8F0', borderRadius: 7, padding: '9px 12px', cursor: 'pointer' },
  fieldWrap:    { display: 'flex', flexDirection: 'column', marginBottom: 16 },
  label:        { fontSize: 12, fontWeight: 600, color: '#4A6B8A', marginBottom: 4, letterSpacing: 0.3 },
  hint:         { fontSize: 11.5, color: '#94A3B8', marginBottom: 6, lineHeight: 1.5 },
  input:        { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 7, border: '1.5px solid #D0DCE8', fontSize: 14, color: BRAND, background: '#F8FAFC', outline: 'none', fontFamily: 'inherit' },
  textarea:     { resize: 'vertical', minHeight: 90 },
  errMsg:       { fontSize: 11, color: '#C0392B', marginTop: 4, display: 'block' },

  numBadge:     { width: 26, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: ACCENT, background: '#EFF6FF', borderRadius: 7, flexShrink: 0 },
  addBtn:       { background: 'none', border: `1.5px dashed ${ACCENT}`, color: ACCENT, borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 2 },
  removeBtnInline: { background: '#FEE2E2', border: 'none', color: '#C0392B', borderRadius: 7, width: 38, height: 38, fontSize: 13, cursor: 'pointer', fontWeight: 700, flexShrink: 0 },

  backBtn:      { background: 'none', border: '1.5px solid #C5CDD6', color: '#4A6B8A', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  submitBtn:    { color: '#fff', background: BRAND, border: 'none', borderRadius: 8, padding: '9px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  pdfBtn:       { background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' },

  rrSection:    { background: '#F7F9FC', borderRadius: 8, border: '1px solid #E2E8F0', padding: '14px 18px', marginBottom: 10 },
  rrHead:       { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px', color: '#7A8A9A' },
  rrRow:        { display: 'flex', gap: 10, padding: '4px 0', fontSize: 14, borderBottom: '1px solid #EEF2F7' },
  rrLabel:      { minWidth: 130, color: '#7A8A9A', fontWeight: 600, fontSize: 13, flexShrink: 0 },
  rrVal:        { color: BRAND, flex: 1, wordBreak: 'break-word' },
};

export default ProjectRequest;