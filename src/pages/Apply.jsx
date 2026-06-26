/**
 * Apply.jsx – Slirus Holdings Career Application
 *
 * Fully self-contained multi-step application form.
 * Steps: Track Selection → Personal → Contact → Education → Experience → Review & Submit
 *
 * Firebase: reads settings/applicationStatus (realtime), writes to applications collection.
 * Email: after addDoc, calls POST /api/send-email (server.js → Nodemailer + Mailtrap API)
 *        to dispatch a confirmation email to the applicant.
 *
 * Dependencies: firebase/firestore, jspdf (lazy), CAREER_TRACKS, Layout
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase/firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import Layout from '../components/Layout';
import { CAREER_TRACKS } from './careerTracks';

// ─── API Base URL ─────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || '';

// ─── PDF Generator ────────────────────────────────────────────────────────────
const generateApplicationPDF = async (form, track) => {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, M = 20, CW = PW - M * 2;
  let y = 20;

  const newPage = () => { pdf.addPage(); y = 20; };
  const checkY = (n = 10) => { if (y + n > 275) newPage(); };

  // Header
  pdf.setFillColor(26, 60, 94);
  pdf.rect(0, 0, PW, 28, 'F');
  pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
  pdf.text('SLIRUS HOLDINGS LIMITED', M, 12);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
  pdf.text('Employment Application Form', M, 19);
  pdf.text(`Position: ${track.title}`, PW - M, 12, { align: 'right' });
  pdf.text(`Date: ${new Date().toLocaleDateString('en-UG')}`, PW - M, 19, { align: 'right' });
  y = 36;

  const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [26, 60, 94];
  };
  const [cr, cg, cb] = hexToRgb(track.color || '#1A3C5E');
  pdf.setDrawColor(cr, cg, cb); pdf.setLineWidth(0.8);
  pdf.line(M, y, PW - M, y); y += 6;

  const section = (title) => {
    checkY(14);
    pdf.setFillColor(240, 244, 248);
    pdf.rect(M, y, CW, 7, 'F');
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(title.toUpperCase(), M + 3, y + 5); y += 10;
  };
  const row = (label, value) => {
    if (!value) return;
    checkY(7);
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
    pdf.text(label + ':', M, y);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
    const lines = pdf.splitTextToSize(String(value), CW - 45);
    pdf.text(lines, M + 44, y); y += lines.length * 5 + 2;
  };
  const multiRow = (label, value) => {
    if (!value) return;
    checkY(10);
    if (label) {
      pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(90, 122, 154);
      pdf.text(label + ':', M, y); y += 5;
    }
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(26, 60, 94);
    pdf.splitTextToSize(String(value), CW).forEach(l => { checkY(5); pdf.text(l, M, y); y += 5; });
    y += 2;
  };

  section('1. Personal Information');
  row('Full Name', form.fullName); row('Date of Birth', form.dob);
  row('Age', form.age); row('Gender', form.gender); y += 2;

  section('2. Contact Information');
  row('Phone', form.phone); row('Email', form.email);
  row('Address', form.physicalAddress); row('District', form.district); y += 2;

  if (form.coverNote?.trim()) { section('3. Cover Note'); multiRow('', form.coverNote); y += 2; }

  section('4. Education History');
  form.education.forEach((e, i) => {
    if (!e.institution) return;
    checkY(18);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(`${i + 1}. ${e.institution}`, M + 2, y); y += 5;
    row('  Year', e.year); row('  Level', e.level); row('  Award', e.award); y += 1;
  });

  section('5. Work Experience');
  if (form.experience.some(e => e.employer)) {
    form.experience.forEach((e, i) => {
      if (!e.employer) return;
      checkY(20);
      pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
      pdf.text(`${i + 1}. ${e.employer} — ${e.role}`, M + 2, y); y += 5;
      row('  Period', e.period);
      if (e.duties) multiRow('  Duties', e.duties); y += 1;
    });
  } else {
    pdf.setFontSize(9); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(150, 150, 150);
    pdf.text('No work experience provided.', M + 2, y); y += 7;
  }

  if (form.hobbies.filter(Boolean).length) {
    section('6. Hobbies & Interests');
    multiRow('', form.hobbies.filter(Boolean).join(', ')); y += 2;
  }

  section('7. Professional Referees');
  form.referees.forEach((r, i) => {
    if (!r.name) return;
    checkY(18);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(`${i + 1}. ${r.name}`, M + 2, y); y += 5;
    row('  Title', r.title); row('  Contact', r.contact); y += 1;
  });

  // Footer on every page
  const total = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(160, 160, 160);
    pdf.line(M, 285, PW - M, 285);
    pdf.text(`Slirus Holdings Limited · Page ${p} of ${total}`, PW / 2, 290, { align: 'center' });
  }

  pdf.save(`Slirus_Application_${(form.fullName || 'applicant').replace(/\s+/g, '_')}_${track.key}.pdf`);
};

// ─── Field helpers ────────────────────────────────────────────────────────────
const Field = ({ label, required, error, children }) => (
  <div style={s.fieldWrap}>
    <label style={s.label}>{label}{required && <span style={{ color: '#C0392B' }}> *</span>}</label>
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
const STEPS = ['Personal', 'Contact', 'Education', 'Experience', 'Review'];

const StepBar = ({ step, trackColor }) => (
  <div style={s.stepBar}>
    {STEPS.map((label, i) => {
      const done = i < step, active = i === step;
      const circleColor = done || active ? trackColor : '#CBD5E0';
      const textColor   = done || active ? trackColor : '#94A3B8';
      return (
        <React.Fragment key={label}>
          {i > 0 && <div style={{ ...s.stepLine, background: i <= step ? trackColor : '#E2E8F0' }} />}
          <div style={s.stepItem}>
            <div style={{ ...s.stepCircle, background: done ? trackColor : active ? '#EFF6FF' : '#F8FAFC', border: `2px solid ${circleColor}`, color: done ? '#fff' : textColor }}>
              {done ? '✓' : i + 1}
            </div>
            <span style={{ ...s.stepLabel, color: textColor, fontWeight: active ? 700 : 400 }}>{label}</span>
          </div>
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Track Grid Skeleton ──────────────────────────────────────────────────────
const TrackSkeleton = () => (
  <div style={s.trackGrid}>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} style={{ ...s.trackCard, borderTop: '4px solid #E2E8F0' }}>
        <div style={{ height: 20, width: '40%', background: '#E2E8F0', borderRadius: 4, marginBottom: 10 }} />
        <div style={{ height: 18, width: '70%', background: '#EEF2F7', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 13, width: '90%', background: '#F3F6F9', borderRadius: 4, marginBottom: 4 }} />
        <div style={{ height: 13, width: '75%', background: '#F3F6F9', borderRadius: 4, marginBottom: 20 }} />
        <div style={{ height: 38, background: '#E2E8F0', borderRadius: 8, marginTop: 'auto' }} />
      </div>
    ))}
  </div>
);

// ─── Track Selector ───────────────────────────────────────────────────────────
const TrackSelector = ({ trackStatuses, statusLoading, onSelect }) => (
  <div style={s.selectorWrap}>
    <div style={s.selectorHeader}>
      <h1 style={s.selectorTitle}>Careers at Slirus Holdings</h1>
      <p style={s.selectorSub}>Select a position below to begin your application. Open positions are accepting submissions now.</p>
    </div>
    {statusLoading ? (
      <TrackSkeleton />
    ) : (
    <div style={s.trackGrid}>
      {CAREER_TRACKS.map(track => {
        const open = trackStatuses[track.key] === true;
        return (
          <div key={track.key} style={{ ...s.trackCard, borderTop: `4px solid ${track.color}`, opacity: open ? 1 : 0.6 }}>
            {track.tag && (
              <span style={{ ...s.trackTag, background: track.lightBg || '#EFF6FF', color: track.color }}>
                {track.tag}
              </span>
            )}
            <h3 style={{ ...s.trackTitle, color: track.color }}>{track.title}</h3>
            {track.description && <p style={s.trackDesc}>{track.description}</p>}
            <div style={{ marginTop: 'auto', paddingTop: 14 }}>
              {open ? (
                <button
                  style={{ ...s.trackApplyBtn, background: track.color }}
                  onClick={() => onSelect(track)}
                >
                  Apply Now →
                </button>
              ) : (
                <span style={s.trackClosedBadge}>🔒 Closed</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
    )}
  </div>
);

// ─── Closed Notice ────────────────────────────────────────────────────────────
const ClosedNotice = ({ track, onBack }) => (
  <div style={s.centreWrap}>
    <div style={{ ...s.noticeCard, borderTop: `4px solid ${track?.color || '#C0392B'}` }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
      <h2 style={s.noticeTitle}>{track?.title} Applications Are Closed</h2>
      <p style={s.noticeBody}>This position is not currently accepting applications. Check back soon or explore other openings.</p>
      <button style={{ ...s.trackApplyBtn, background: '#1A3C5E', display: 'inline-block', width: 'auto', padding: '10px 24px' }} onClick={onBack}>
        ← View Other Positions
      </button>
    </div>
  </div>
);

// ─── Success Screen ───────────────────────────────────────────────────────────
const SuccessScreen = ({ form, track, docId, onBack }) => {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handlePDF = async () => {
    setPdfLoading(true);
    try { await generateApplicationPDF(form, track); }
    catch (err) { alert('Could not generate PDF: ' + err.message); }
    finally { setPdfLoading(false); }
  };

  return (
    <div style={s.centreWrap}>
      <div style={{ ...s.noticeCard, borderTop: `4px solid ${track.color}` }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
        <h2 style={{ ...s.noticeTitle, color: '#065F46' }}>Application Submitted!</h2>
        <p style={s.noticeBody}>
          Thank you, <strong>{form.fullName}</strong>. Your application for <strong>{track.title}</strong> has been received.
          A confirmation email has been sent to <strong>{form.email}</strong>.
        </p>
        <div style={{ ...s.refBox, margin: '0 auto 24px', display: 'inline-flex' }}>
          <span style={s.refLabel}>Reference&nbsp;</span>
          <span style={s.refValue}>{docId?.slice(0, 12).toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            style={{ ...s.trackApplyBtn, background: track.color, width: 'auto', padding: '10px 24px' }}
            onClick={handlePDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? '⏳ Generating…' : '⬇ Download PDF Copy'}
          </button>
          <button
            style={{ ...s.trackApplyBtn, background: '#1A3C5E', width: 'auto', padding: '10px 24px' }}
            onClick={onBack}
          >
            ← Back to Positions
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Step 0: Personal Info ────────────────────────────────────────────────────
const StepPersonal = ({ form, errors, onChange }) => (
  <div>
    <h3 style={s.sectionTitle}>Personal Information</h3>
    <div style={s.row2}>
      <Field label="Full Name" required error={errors.fullName}>
        <Input value={form.fullName} error={errors.fullName} onChange={e => onChange('fullName', e.target.value)} placeholder="e.g. Aisha Nakamya" />
      </Field>
      <Field label="Date of Birth" required error={errors.dob}>
        <Input type="date" value={form.dob} error={errors.dob} onChange={e => {
          const val = e.target.value;
          const age = val ? Math.floor((Date.now() - new Date(val)) / 31557600000) : '';
          onChange('dob', val);
          onChange('age', String(age));
        }} />
      </Field>
    </div>
    <div style={s.row2}>
      <Field label="Age">
        <Input value={form.age} readOnly style={{ ...s.input, background: '#F0F4F8', cursor: 'not-allowed' }} placeholder="Auto-calculated" />
      </Field>
      <Field label="Gender" required error={errors.gender}>
        <Select value={form.gender} error={errors.gender} onChange={e => onChange('gender', e.target.value)}>
          <option value="">Select gender…</option>
          <option>Male</option>
          <option>Female</option>
          <option>Prefer not to say</option>
        </Select>
      </Field>
    </div>
  </div>
);

// ─── Step 1: Contact ──────────────────────────────────────────────────────────
const StepContact = ({ form, errors, onChange }) => (
  <div>
    <h3 style={s.sectionTitle}>Contact Information</h3>
    <div style={s.row2}>
      <Field label="Phone Number" required error={errors.phone}>
        <Input type="tel" value={form.phone} error={errors.phone} onChange={e => onChange('phone', e.target.value)} placeholder="+256 7XX XXX XXX" />
      </Field>
      <Field label="Email Address" required error={errors.email}>
        <Input type="email" value={form.email} error={errors.email} onChange={e => onChange('email', e.target.value)} placeholder="you@example.com" />
      </Field>
    </div>
    <div style={s.row2}>
      <Field label="Physical Address" required error={errors.physicalAddress}>
        <Input value={form.physicalAddress} error={errors.physicalAddress} onChange={e => onChange('physicalAddress', e.target.value)} placeholder="e.g. Plot 12, Entebbe Road" />
      </Field>
      <Field label="District" required error={errors.district}>
        <Input value={form.district} error={errors.district} onChange={e => onChange('district', e.target.value)} placeholder="e.g. Kampala" />
      </Field>
    </div>
    <Field label="Cover Note / Motivation (Optional)">
      <Textarea value={form.coverNote} onChange={e => onChange('coverNote', e.target.value)} placeholder="Briefly describe why you're applying and what makes you a strong candidate…" rows={5} />
    </Field>
  </div>
);

// ─── Step 2: Education ────────────────────────────────────────────────────────
const StepEducation = ({ form, errors, onChangeArr, onAddRow, onRemoveRow }) => (
  <div>
    <h3 style={s.sectionTitle}>Education History</h3>
    <p style={s.sectionHint}>List your academic qualifications, most recent first.</p>
    {form.education.map((e, i) => (
      <div key={i} style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color: '#1A3C5E', fontSize: 13 }}>Education #{i + 1}</span>
          {form.education.length > 1 && (
            <button style={s.removeBtn} onClick={() => onRemoveRow('education', i)}>✕ Remove</button>
          )}
        </div>
        <div style={s.row2}>
          <Field label="Institution" required={i === 0} error={errors[`edu_${i}_institution`]}>
            <Input value={e.institution} error={errors[`edu_${i}_institution`]} onChange={ev => onChangeArr('education', i, 'institution', ev.target.value)} placeholder="School / University name" />
          </Field>
          <Field label="Year Completed">
            <Input value={e.year} onChange={ev => onChangeArr('education', i, 'year', ev.target.value)} placeholder="e.g. 2021" />
          </Field>
        </div>
        <div style={s.row2}>
          <Field label="Level / Qualification">
            <Select value={e.level} onChange={ev => onChangeArr('education', i, 'level', ev.target.value)}>
              <option value="">Select level…</option>
              <option>Primary</option>
              <option>O-Level (UCE)</option>
              <option>A-Level (UACE)</option>
              <option>Certificate</option>
              <option>Diploma</option>
              <option>Bachelor's Degree</option>
              <option>Postgraduate Diploma</option>
              <option>Master's Degree</option>
              <option>Doctorate (PhD)</option>
              <option>Other</option>
            </Select>
          </Field>
          <Field label="Award / Grade">
            <Input value={e.award} onChange={ev => onChangeArr('education', i, 'award', ev.target.value)} placeholder="e.g. Second Class Upper" />
          </Field>
        </div>
      </div>
    ))}
    <button style={s.addBtn} onClick={() => onAddRow('education', { year: '', institution: '', level: '', award: '' })}>
      + Add Another Qualification
    </button>
  </div>
);

// ─── Step 3: Experience & Referees ───────────────────────────────────────────
const StepExperience = ({ form, errors, onChangeArr, onAddRow, onRemoveRow, onChange }) => (
  <div>
    <h3 style={s.sectionTitle}>Work Experience</h3>
    <p style={s.sectionHint}>Leave blank if you have no prior work experience — that's completely fine.</p>
    {form.experience.map((e, i) => (
      <div key={i} style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color: '#1A3C5E', fontSize: 13 }}>Position #{i + 1}</span>
          {form.experience.length > 1 && (
            <button style={s.removeBtn} onClick={() => onRemoveRow('experience', i)}>✕ Remove</button>
          )}
        </div>
        <div style={s.row2}>
          <Field label="Employer / Organisation">
            <Input value={e.employer} onChange={ev => onChangeArr('experience', i, 'employer', ev.target.value)} placeholder="Organisation name" />
          </Field>
          <Field label="Role / Job Title">
            <Input value={e.role} onChange={ev => onChangeArr('experience', i, 'role', ev.target.value)} placeholder="e.g. Sales Associate" />
          </Field>
        </div>
        <div style={s.row2}>
          <Field label="Period">
            <Input value={e.period} onChange={ev => onChangeArr('experience', i, 'period', ev.target.value)} placeholder="e.g. Jan 2022 – Dec 2023" />
          </Field>
        </div>
        <Field label="Key Duties">
          <Textarea value={e.duties} onChange={ev => onChangeArr('experience', i, 'duties', ev.target.value)} placeholder="Briefly describe your main responsibilities…" rows={3} />
        </Field>
      </div>
    ))}
    <button style={s.addBtn} onClick={() => onAddRow('experience', { period: '', employer: '', role: '', duties: '' })}>
      + Add Another Position
    </button>

    <h3 style={{ ...s.sectionTitle, marginTop: 28 }}>Hobbies & Interests</h3>
    {form.hobbies.map((h, i) => (
      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <Input value={h} onChange={ev => onChangeArr('hobbies', i, null, ev.target.value)} placeholder={`Hobby ${i + 1}`} style={{ ...s.input, flex: 1 }} />
        {form.hobbies.length > 1 && (
          <button style={{ ...s.removeBtn, margin: 0 }} onClick={() => onRemoveRow('hobbies', i)}>✕</button>
        )}
      </div>
    ))}
    <button style={s.addBtn} onClick={() => onAddRow('hobbies', '')}>+ Add Hobby</button>

    <h3 style={{ ...s.sectionTitle, marginTop: 28 }}>Professional Referees</h3>
    <p style={s.sectionHint}>Please provide at least one referee who is not a family member.</p>
    {form.referees.map((r, i) => (
      <div key={i} style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color: '#1A3C5E', fontSize: 13 }}>Referee #{i + 1}</span>
          {form.referees.length > 1 && (
            <button style={s.removeBtn} onClick={() => onRemoveRow('referees', i)}>✕ Remove</button>
          )}
        </div>
        <div style={s.row3}>
          <Field label="Full Name" required={i === 0} error={errors[`ref_${i}_name`]}>
            <Input value={r.name} error={errors[`ref_${i}_name`]} onChange={ev => onChangeArr('referees', i, 'name', ev.target.value)} placeholder="Referee name" />
          </Field>
          <Field label="Title / Position">
            <Input value={r.title} onChange={ev => onChangeArr('referees', i, 'title', ev.target.value)} placeholder="e.g. Director" />
          </Field>
          <Field label="Phone / Email">
            <Input value={r.contact} onChange={ev => onChangeArr('referees', i, 'contact', ev.target.value)} placeholder="Contact details" />
          </Field>
        </div>
      </div>
    ))}
    <button style={s.addBtn} onClick={() => onAddRow('referees', { name: '', title: '', contact: '' })}>
      + Add Referee
    </button>
  </div>
);

// ─── Step 4: Review ───────────────────────────────────────────────────────────
const ReviewRow = ({ label, val }) => val
  ? <div style={s.rrRow}><span style={s.rrLabel}>{label}</span><span style={s.rrVal}>{val}</span></div>
  : null;

const StepReview = ({ form, track }) => (
  <div>
    <div style={{ ...s.trackBanner, borderColor: track.color, background: track.lightBg || '#EFF6FF', marginBottom: 20 }}>
      <span style={{ fontSize: 18, marginRight: 10 }}>📋</span>
      <div>
        <div style={{ fontWeight: 700, color: track.color, fontSize: 14 }}>{track.title}</div>
        <div style={{ fontSize: 12, color: '#4A6B8A' }}>Review your details before submitting. Go back to make changes.</div>
      </div>
    </div>

    {[ 
      { title: '1. Personal', rows: [['Full Name', form.fullName], ['Date of Birth', form.dob], ['Age', form.age], ['Gender', form.gender]] },
      { title: '2. Contact',  rows: [['Phone', form.phone], ['Email', form.email], ['Address', form.physicalAddress], ['District', form.district]] },
    ].map(sec => (
      <div key={sec.title} style={s.rrSection}>
        <p style={s.rrHead}>{sec.title}</p>
        {sec.rows.map(([l, v]) => <ReviewRow key={l} label={l} val={v} />)}
      </div>
    ))}

    {form.coverNote?.trim() && (
      <div style={s.rrSection}>
        <p style={s.rrHead}>3. Cover Note</p>
        <p style={{ fontSize: 13, color: '#1A3C5E', lineHeight: 1.7, margin: 0 }}>{form.coverNote}</p>
      </div>
    )}

    <div style={s.rrSection}>
      <p style={s.rrHead}>4. Education</p>
      {form.education.filter(e => e.institution).map((e, i) => (
        <ReviewRow key={i} label={e.year || `#${i + 1}`} val={[e.institution, e.level, e.award].filter(Boolean).join(' · ')} />
      ))}
    </div>

    {form.experience.some(e => e.employer) && (
      <div style={s.rrSection}>
        <p style={s.rrHead}>5. Experience</p>
        {form.experience.filter(e => e.employer).map((e, i) => (
          <ReviewRow key={i} label={e.period || `#${i + 1}`} val={[e.employer, e.role].filter(Boolean).join(' · ')} />
        ))}
      </div>
    )}

    {form.referees.some(r => r.name) && (
      <div style={s.rrSection}>
        <p style={s.rrHead}>6. Referees</p>
        {form.referees.filter(r => r.name).map((r, i) => (
          <ReviewRow key={i} label={r.name} val={[r.title, r.contact].filter(Boolean).join(' · ')} />
        ))}
      </div>
    )}
  </div>
);

// ─── Main Apply Component ─────────────────────────────────────────────────────
const Apply = () => {
  // ── Bootstrap fix: initialise to {} so the track selector renders immediately.
  // The onSnapshot below will update it once Firestore responds (or stay {} if
  // the document doesn't exist yet — all tracks then show as Closed until an
  // admin opens them, which is the correct safe default).
  const [trackStatuses, setTrackStatuses]   = useState({});
  const [statusLoading, setStatusLoading]   = useState(true);
  const [selectedTrack, setSelectedTrack]   = useState(null);
  const [step, setStep]     = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submittedDocId, setSubmittedDocId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});
  const topRef = useRef(null);

  const [form, setForm] = useState({
    fullName: '', dob: '', age: '', gender: '',
    phone: '', email: '', physicalAddress: '', district: '',
    coverNote: '',
    education:  [{ year: '', institution: '', level: '', award: '' }],
    experience: [{ period: '', employer: '', role: '', duties: '' }],
    hobbies:    [''],
    referees:   [{ name: '', title: '', contact: '' }],
  });

  const [settingsError, setSettingsError] = useState(null);

  // Live-listen to application status from Firestore.
  // Bootstrap fix: trackStatuses starts as {} so the UI renders immediately.
  // If the document doesn't exist yet, snap.exists() is false and we stay on
  // {} (all tracks closed) — correct safe default until an admin seeds it.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'applicationStatus'),
      (snap) => {
        setSettingsError(null);
        setTrackStatuses(snap.exists() ? snap.data() : {});
        setStatusLoading(false);
      },
      (err) => {
        console.error('Settings listen error:', err);
        // Surface permission errors so the page doesn't silently look broken.
        if (err.code === 'permission-denied') {
          setSettingsError('permission-denied');
        }
        // Keep {} so the UI remains functional (all tracks show as Closed).
        setTrackStatuses({});
        setStatusLoading(false);
      }
    );
    return unsub;
  }, []);

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

  // Validation per step
  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.fullName.trim()) e.fullName = 'Full name is required.';
      if (!form.dob)             e.dob      = 'Date of birth is required.';
      if (!form.gender)          e.gender   = 'Please select a gender.';
    }
    if (step === 1) {
      if (!form.phone.trim())           e.phone           = 'Phone number is required.';
      if (!form.email.trim())           e.email           = 'Email address is required.';
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Please enter a valid email.';
      if (!form.physicalAddress.trim()) e.physicalAddress = 'Address is required.';
      if (!form.district.trim())        e.district        = 'District is required.';
    }
    if (step === 2) {
      form.education.forEach((e_, i) => {
        if (i === 0 && !e_.institution.trim()) e[`edu_${i}_institution`] = 'At least one institution is required.';
      });
    }
    // Step 3 is the Experience + Referees step. Work experience fields
    // (employer, role, period) are intentionally not validated here because
    // experience is optional — users may leave all fields blank. Only the
    // first referee's name is required.
    if (step === 3) {
      if (!form.referees[0]?.name?.trim()) e[`ref_0_name`] = 'At least one referee name is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate()) { setStep(s => s + 1); scrollTop(); }
  };
  const back = () => { setStep(s => s - 1); setErrors({}); scrollTop(); };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // 1. Save application to Firestore
      const docRef = await addDoc(collection(db, 'applications'), {
        ...form,
        type:        selectedTrack.type  || '',
        program:     selectedTrack.title,
        trackKey:    selectedTrack.key,
        trackColor:  selectedTrack.color,
        status:      'Pending',
        submittedAt: serverTimestamp(),
      });

      // 2. Send confirmation email via server (Nodemailer + Mailtrap)
      //    Fire-and-forget — don't block success screen on email delivery.
      fetch(`${API_URL}/api/send-email`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:    'application_received',
          to:      form.email,
          name:    form.fullName,
          program: selectedTrack.title,
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

  // ── No track chosen yet ──
  if (!selectedTrack) {
    return (
      <Layout>
        {settingsError === 'permission-denied' && (
          <div style={{ background: '#FEF3C7', borderBottom: '1px solid #F59E0B', padding: '10px 20px', fontSize: 13, color: '#92400E', textAlign: 'center' }}>
            ⚠️ Could not load position availability — please check your Firestore Security Rules for the <code>settings</code> collection.
          </div>
        )}
        <TrackSelector trackStatuses={trackStatuses} statusLoading={statusLoading} onSelect={setSelectedTrack} />
      </Layout>
    );
  }

  // ── Track was closed between selection and loading ──
  if (trackStatuses[selectedTrack.key] === false) {
    return (
      <Layout>
        <ClosedNotice track={selectedTrack} onBack={() => setSelectedTrack(null)} />
      </Layout>
    );
  }

  // ── Success ──
  if (submitted) {
    return (
      <Layout>
        <SuccessScreen form={form} track={selectedTrack} docId={submittedDocId} onBack={() => { setSelectedTrack(null); setSubmitted(false); setStep(0); }} />
      </Layout>
    );
  }

  const stepContent = [
    <StepPersonal  key="p" form={form} errors={errors} onChange={set} />,
    <StepContact   key="c" form={form} errors={errors} onChange={set} />,
    <StepEducation key="e" form={form} errors={errors} onChangeArr={changeArr} onAddRow={addRow} onRemoveRow={removeRow} />,
    <StepExperience key="x" form={form} errors={errors} onChangeArr={changeArr} onAddRow={addRow} onRemoveRow={removeRow} onChange={set} />,
    <StepReview    key="r" form={form} track={selectedTrack} />,
  ];

  const isLastStep = step === STEPS.length - 1;

  return (
    <Layout>
      <div style={s.pageWrap} ref={topRef}>
        {/* Page header */}
        <div style={s.pageHeader}>
          <button style={s.backToTracks} onClick={() => setSelectedTrack(null)}>← All Positions</button>
          <span style={{ ...s.trackPill, background: selectedTrack.lightBg || '#EFF6FF', color: selectedTrack.color }}>
            {selectedTrack.title}
          </span>
        </div>

        <div style={s.formCard}>
          {/* Accent bar */}
          <div style={{ ...s.formAccent, background: selectedTrack.color }} />

          {/* Step indicators */}
          <StepBar step={step} trackColor={selectedTrack.color} />

          {/* Form body */}
          <div style={s.formBody}>
            {stepContent[step]}
          </div>

          {/* Navigation */}
          <div style={s.navBar}>
            <div style={{ flex: 1 }}>
              {step > 0 && (
                <button style={s.backBtn} onClick={back}>← Back</button>
              )}
            </div>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Step {step + 1} of {STEPS.length}</span>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {isLastStep ? (
                <button
                  style={{ ...s.nextBtn, background: selectedTrack.color, minWidth: 130 }}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? '⏳ Submitting…' : '✓ Submit Application'}
                </button>
              ) : (
                <button
                  style={{ ...s.nextBtn, background: selectedTrack.color }}
                  onClick={next}
                >
                  Continue →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  centreWrap:      { minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' },
  spinner:         { width: 36, height: 36, borderRadius: '50%', border: '3px solid #E2E8F0', borderTopColor: '#2E6DA4', animation: 'spin 0.8s linear infinite' },

  noticeCard:      { maxWidth: 520, width: '100%', background: '#fff', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', border: '1px solid #E2E8F0', padding: '48px 40px', textAlign: 'center' },
  noticeTitle:     { fontSize: 22, fontWeight: 700, color: '#1A3C5E', margin: '0 0 12px' },
  noticeBody:      { fontSize: 15, color: '#4A6B8A', lineHeight: 1.7, margin: '0 0 24px' },
  refBox:          { display: 'inline-flex', alignItems: 'center', gap: 10, background: '#F0F4F8', borderRadius: 8, padding: '10px 18px', marginBottom: 20 },
  refLabel:        { fontSize: 12, fontWeight: 600, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.5 },
  refValue:        { fontSize: 14, fontWeight: 700, color: '#1A3C5E', fontFamily: 'monospace' },

  selectorWrap:    { maxWidth: 1000, margin: '0 auto', padding: '48px 20px 80px' },
  selectorHeader:  { marginBottom: 36 },
  selectorTitle:   { fontSize: 30, fontWeight: 700, color: '#1A3C5E', margin: 0 },
  selectorSub:     { color: '#5A7A9A', marginTop: 8, fontSize: 15 },
  trackGrid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 },
  trackCard:       { background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '24px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8 },
  trackTag:        { display: 'inline-block', fontSize: 11, fontWeight: 700, borderRadius: 4, padding: '3px 9px', letterSpacing: 0.4, textTransform: 'uppercase', alignSelf: 'flex-start' },
  trackTitle:      { fontSize: 17, fontWeight: 700, margin: 0 },
  trackDesc:       { fontSize: 13, color: '#5A7A9A', lineHeight: 1.6, margin: 0, flex: 1 },
  trackApplyBtn:   { border: 'none', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', textAlign: 'center' },
  trackClosedBadge:{ display: 'inline-block', background: '#F3F4F6', color: '#9CA3AF', borderRadius: 6, padding: '9px 16px', fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'center', boxSizing: 'border-box' },

  pageWrap:        { maxWidth: 820, margin: '0 auto', padding: '32px 20px 80px' },
  pageHeader:      { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  backToTracks:    { background: 'none', border: '1.5px solid #D0DCE8', color: '#4A6B8A', borderRadius: 7, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  trackPill:       { borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 600 },

  formCard:        { background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0', overflow: 'hidden' },
  formAccent:      { height: 4 },
  formBody:        { padding: '28px 32px' },
  navBar:          { display: 'flex', alignItems: 'center', padding: '16px 32px', borderTop: '1px solid #E2E8F0', background: '#F7F9FC', gap: 12 },

  stepBar:         { display: 'flex', alignItems: 'center', padding: '18px 32px 14px', borderBottom: '1px solid #E2E8F0', background: '#F7F9FC', overflowX: 'auto', gap: 0 },
  stepItem:        { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 58 },
  stepCircle:      { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginBottom: 4 },
  stepLabel:       { fontSize: 10, textAlign: 'center', whiteSpace: 'nowrap', color: '#94A3B8' },
  stepLine:        { flex: 1, height: 2, minWidth: 16, margin: '0 2px 14px' },

  sectionTitle:    { fontSize: 15, fontWeight: 700, color: '#1A3C5E', marginBottom: 6, marginTop: 0 },
  sectionHint:     { fontSize: 13, color: '#7A8A9A', marginBottom: 16, marginTop: 0 },
  row2:            { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 0 },
  row3:            { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 0 },
  fieldWrap:       { display: 'flex', flexDirection: 'column', marginBottom: 14 },
  label:           { fontSize: 12, fontWeight: 600, color: '#4A6B8A', marginBottom: 5, letterSpacing: 0.3 },
  input:           { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 7, border: '1.5px solid #D0DCE8', fontSize: 14, color: '#1A3C5E', background: '#F8FAFC', outline: 'none', fontFamily: 'inherit' },
  textarea:        { resize: 'vertical', minHeight: 90 },
  errMsg:          { fontSize: 11, color: '#C0392B', marginTop: 4, display: 'block' },
  card:            { background: '#F7F9FC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px 18px', marginBottom: 12 },
  addBtn:          { background: 'none', border: '1.5px dashed #2E6DA4', color: '#2E6DA4', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 4 },
  removeBtn:       { background: 'none', border: 'none', color: '#C0392B', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  backBtn:         { background: 'none', border: '1.5px solid #C5CDD6', color: '#4A6B8A', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  nextBtn:         { color: '#fff', border: 'none', borderRadius: 8, padding: '9px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },

  trackBanner:     { display: 'flex', alignItems: 'center', border: '1.5px solid', borderRadius: 8, padding: '10px 16px' },
  rrSection:       { background: '#F7F9FC', borderRadius: 8, border: '1px solid #E2E8F0', padding: '14px 18px', marginBottom: 10 },
  rrHead:          { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px', color: '#7A8A9A' },
  rrRow:           { display: 'flex', gap: 10, padding: '4px 0', fontSize: 14, borderBottom: '1px solid #EEF2F7' },
  rrLabel:         { minWidth: 120, color: '#7A8A9A', fontWeight: 600, fontSize: 13 },
  rrVal:           { color: '#1A3C5E', flex: 1 },
};

export default Apply;