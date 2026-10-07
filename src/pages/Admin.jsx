/**
 * Admin.jsx – Slirus Global Limited Applications Dashboard
 *
 * Features:
 *  - Firebase Auth login / logout (email + password)
 *  - Realtime listener on applications collection and settings/applicationStatus
 *  - Toggle open/closed status per career track
 *  - Filter applications by track, status, and free-text search
 *  - Inline status update (Shortlist / Reject) — calls POST /api/send-email
 *    (server.js → Nodemailer + Mailtrap API) to notify the applicant by email
 *  - Detail modal with full applicant data + status actions + PDF download
 *  - Admin-copy PDF generation (jsPDF, lazy-loaded)
 *
 * No prop drilling issues — state lives at Admin level and is passed explicitly.
 * All Firebase calls are try/catch with user-friendly error feedback.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, updateDoc, deleteDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout';
import { CAREER_TRACKS } from './careerTracks';
import { loadLogoDataUrl, drawLetterhead, drawFooter, hexToRgb } from '../utils/pdfBrand';
import { generateProjectRequestPDF, generateProjectProposalPDF } from '../utils/projectPdf';
import {
  SERVICE_CATEGORIES, CONTRACT_STATUS_CONFIG, CONTRACT_TYPE_FIELDS, CONTRACT_TYPE_SECTION_TITLE,
  generateContractPDF, generateBothContractCopies,
} from '../utils/contractPdf';

// ─── API Base URL ─────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || '';

// ─── PDF Generator (Admin Copy) ───────────────────────────────────────────────
const generateAdminPDF = async (app) => {
  const { jsPDF } = await import('jspdf');
  const track    = CAREER_TRACKS.find(t => t.key === app.trackKey);
  const hexColor = app.trackColor || track?.color || '#1A3C5E';
  const logoDataUrl = await loadLogoDataUrl();
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, M = 20, CW = PW - M * 2;
  let y = 20;

  const newPage = () => { pdf.addPage(); y = 20; };
  const checkY  = (n = 10) => { if (y + n > 275) newPage(); };

  const submittedDate = app.submittedAt?.toDate
    ? app.submittedAt.toDate().toLocaleDateString('en-UG') : '—';

  // Header (logo + letterhead)
  y = drawLetterhead(pdf, {
    logoDataUrl,
    eyebrow: 'Employment Application — Admin Copy',
    rightLines: [`Position: ${app.program || '—'}`, `Submitted: ${submittedDate}`],
  });
  y += 4;

  const [cr, cg, cb] = hexToRgb(hexColor);
  pdf.setDrawColor(cr, cg, cb); pdf.setLineWidth(0.8);
  pdf.line(M, y, PW - M, y); y += 6;

  // Status badge
  const statusMap = { Shortlisted: [16, 185, 129], Unqualified: [239, 68, 68], Pending: [245, 158, 11] };
  const [sr, sg, sb] = statusMap[app.status] || statusMap.Pending;
  pdf.setFillColor(sr, sg, sb);
  pdf.roundedRect(M, y, 38, 7, 2, 2, 'F');
  pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(255, 255, 255);
  pdf.text((app.status || 'Pending').toUpperCase(), M + 19, y + 5, { align: 'center' });
  y += 14;

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
  row('Full Name', app.fullName); row('Date of Birth', app.dob);
  row('Age', app.age); row('Gender', app.gender); y += 2;

  section('2. Contact Information');
  row('Phone', app.phone); row('Email', app.email);
  row('Address', app.physicalAddress); row('District', app.district); y += 2;

  if (app.coverNote?.trim()) { section('3. Cover Note'); multiRow('', app.coverNote); y += 2; }

  section('4. Education History');
  (app.education || []).forEach((e, i) => {
    if (!e.institution) return;
    checkY(18);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(`${i + 1}. ${e.institution}`, M + 2, y); y += 5;
    row('  Year', e.year); row('  Level', e.level); row('  Award', e.award); y += 1;
  });

  section('5. Work Experience');
  const hasExp = (app.experience || []).some(e => e.employer);
  if (hasExp) {
    (app.experience || []).forEach((e, i) => {
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

  const hobbies = (app.hobbies || []).filter(Boolean);
  if (hobbies.length) { section('6. Hobbies & Interests'); multiRow('', hobbies.join(', ')); y += 2; }

  section('7. Professional Referees');
  (app.referees || []).forEach((r, i) => {
    if (!r.name) return;
    checkY(18);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(26, 60, 94);
    pdf.text(`${i + 1}. ${r.name}`, M + 2, y); y += 5;
    row('  Title', r.title); row('  Contact', r.contact); y += 1;
  });

  drawFooter(pdf, { note: 'Slirus Global Limited · Admin Copy', confidential: true });

  const safe = (app.fullName || 'applicant').replace(/\s+/g, '_');
  pdf.save(`Slirus_Admin_${safe}_${app.trackKey || 'app'}.pdf`);
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:     { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  Shortlisted: { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  Unqualified: { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const Badge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status || 'Pending'}
    </span>
  );
};

// ─── Track Toggle Card ────────────────────────────────────────────────────────
const TrackToggle = ({ track, isOpen, onToggle, toggling, appCount }) => (
  <div style={{ ...tt.card, borderTop: `3px solid ${track.color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
      {track.tag && <span style={{ ...tt.tag, background: track.lightBg || '#EFF6FF', color: track.color }}>{track.tag}</span>}
      <span style={{ fontSize: 12, color: '#7A8A9A', fontWeight: 600, marginLeft: 'auto' }}>{appCount} applied</span>
    </div>
    <h4 style={{ ...tt.title, color: track.color }}>{track.title}</h4>
    {track.description && <p style={tt.desc}>{track.description}</p>}
    <div style={tt.footer}>
      <span style={{ ...tt.status, color: isOpen ? '#065F46' : '#991B1B' }}>
        {isOpen ? '● Open' : '● Closed'}
      </span>
      <button
        style={{ ...tt.btn, background: isOpen ? '#FEE2E2' : '#D1FAE5', color: isOpen ? '#991B1B' : '#065F46' }}
        onClick={() => onToggle(track.key, isOpen)}
        disabled={toggling === track.key}
      >
        {toggling === track.key ? '…' : isOpen ? 'Close' : 'Open'}
      </button>
    </div>
  </div>
);

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ app, onClose, onStatusChange, statusUpdating }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(app?.status);

  useEffect(() => { setLocalStatus(app?.status); }, [app?.status]);

  if (!app) return null;

  const track = CAREER_TRACKS.find(t => t.key === app.trackKey);
  const tc = app.trackColor || track?.color || '#2E6DA4';

  const handleStatusChange = async (newStatus) => {
    setLocalStatus(newStatus);
    await onStatusChange(app.id, newStatus);
  };

  const handlePDF = async () => {
    setPdfLoading(true);
    try { await generateAdminPDF({ ...app, status: localStatus }); }
    catch (err) { alert('PDF error: ' + err.message); }
    finally { setPdfLoading(false); }
  };

  const Sec = ({ title, children }) => (
    <div style={ms.section}>
      <h4 style={{ ...ms.secTitle, color: tc }}>{title}</h4>
      {children}
    </div>
  );
  const Row = ({ label, val }) => val
    ? <div style={ms.row}><span style={ms.label}>{label}</span><span style={ms.val}>{val}</span></div>
    : null;

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ ...ms.header, borderTop: `4px solid ${tc}` }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{app.fullName}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>
              {app.program}{app.type ? ` · ${app.type}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge status={localStatus} />
            <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* Action bar */}
        <div style={ms.actionBar}>
          <button
            style={{ ...ms.actionBtn, background: '#D1FAE5', color: '#065F46', opacity: localStatus === 'Shortlisted' ? 0.45 : 1 }}
            onClick={() => handleStatusChange('Shortlisted')}
            disabled={localStatus === 'Shortlisted' || statusUpdating}
          >
            ✅ Shortlist
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#FEE2E2', color: '#991B1B', opacity: localStatus === 'Unqualified' ? 0.45 : 1 }}
            onClick={() => handleStatusChange('Unqualified')}
            disabled={localStatus === 'Unqualified' || statusUpdating}
          >
            ✗ Reject
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#EFF6FF', color: '#1D4ED8' }}
            onClick={handlePDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? '⏳ Generating…' : '⬇ Download PDF'}
          </button>
        </div>

        {/* Scrollable body */}
        <div style={ms.body}>
          <Sec title="Personal">
            <Row label="Date of Birth" val={app.dob} />
            <Row label="Age"           val={app.age} />
            <Row label="Gender"        val={app.gender} />
          </Sec>
          <Sec title="Contact">
            <Row label="Phone"   val={app.phone} />
            <Row label="Email"   val={app.email} />
            <Row label="Address" val={app.physicalAddress} />
            <Row label="District" val={app.district} />
          </Sec>
          {app.coverNote?.trim() && (
            <Sec title="Cover Note">
              <p style={{ fontSize: 14, color: '#1A3C5E', lineHeight: 1.7, margin: 0 }}>{app.coverNote}</p>
            </Sec>
          )}
          {(app.education || []).some(e => e.institution) && (
            <Sec title="Education">
              {(app.education || []).map((e, i) =>
                e.institution ? <Row key={i} label={e.year || `#${i + 1}`} val={[e.institution, e.level, e.award].filter(Boolean).join(' · ')} /> : null
              )}
            </Sec>
          )}
          {(app.experience || []).some(e => e.employer) && (
            <Sec title="Experience">
              {(app.experience || []).map((e, i) => e.employer ? (
                <div key={i} style={{ marginBottom: 10 }}>
                  <Row label={e.period || `#${i + 1}`} val={[e.employer, e.role].filter(Boolean).join(' · ')} />
                  {e.duties && <p style={{ fontSize: 13, color: '#5A7A9A', margin: '3px 0 0 124px', lineHeight: 1.5 }}>{e.duties}</p>}
                </div>
              ) : null)}
            </Sec>
          )}
          {(app.hobbies || []).filter(Boolean).length > 0 && (
            <Sec title="Hobbies">
              <p style={{ fontSize: 14, color: '#1A3C5E', margin: 0 }}>{app.hobbies.filter(Boolean).join(', ')}</p>
            </Sec>
          )}
          {(app.referees || []).some(r => r.name) && (
            <Sec title="Referees">
              {(app.referees || []).map((r, i) => r.name
                ? <Row key={i} label={r.name} val={[r.title, r.contact].filter(Boolean).join(' · ')} />
                : null
              )}
            </Sec>
          )}
          <Sec title="Submission">
            <Row label="Reference" val={app.id?.slice(0, 12).toUpperCase()} />
            <Row label="Submitted" val={app.submittedAt?.toDate ? app.submittedAt.toDate().toLocaleString('en-UG') : '—'} />
            <Row label="Status"    val={localStatus} />
          </Sec>
        </div>
      </div>
    </div>
  );
};

// ─── Project Request Status Badge ──────────────────────────────────────────────
const PROJECT_STATUS_CONFIG = {
  New:        { bg: '#DBEAFE', color: '#1D4ED8', dot: '#3B82F6' },
  Reviewing:  { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B' },
  Accepted:   { bg: '#D1FAE5', color: '#065F46', dot: '#10B981' },
  Declined:   { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
};

const ProjectBadge = ({ status }) => {
  const cfg = PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.New;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status || 'New'}
    </span>
  );
};

// ─── Project Request Detail Modal ──────────────────────────────────────────────
const ProjectDetailModal = ({ project, onClose, onStatusChange, statusUpdating }) => {
  const [localStatus, setLocalStatus] = useState(project?.status);
  const [reqPdfLoading, setReqPdfLoading] = useState(false);
  const [propPdfLoading, setPropPdfLoading] = useState(false);

  useEffect(() => { setLocalStatus(project?.status); }, [project?.status]);

  if (!project) return null;

  const tc = '#2E6DA4';

  const handleStatusChange = async (newStatus) => {
    setLocalStatus(newStatus);
    await onStatusChange(project.id, newStatus);
  };

  const handleRequestPDF = async () => {
    setReqPdfLoading(true);
    try { await generateProjectRequestPDF({ ...project, status: localStatus }); }
    catch (err) { alert('PDF error: ' + err.message); }
    finally { setReqPdfLoading(false); }
  };

  const handleProposalPDF = async () => {
    setPropPdfLoading(true);
    try { await generateProjectProposalPDF({ ...project, status: localStatus }); }
    catch (err) { alert('PDF error: ' + err.message); }
    finally { setPropPdfLoading(false); }
  };

  const Sec = ({ title, children }) => (
    <div style={ms.section}>
      <h4 style={{ ...ms.secTitle, color: tc }}>{title}</h4>
      {children}
    </div>
  );
  const Row = ({ label, val }) => val
    ? <div style={ms.row}><span style={ms.label}>{label}</span><span style={ms.val}>{val}</span></div>
    : null;

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ ...ms.header, borderTop: `4px solid ${tc}` }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{project.projectTitle}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>
              {project.companyName} · {project.contactName}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ProjectBadge status={localStatus} />
            <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* Action bar */}
        <div style={ms.actionBar}>
          <button
            style={{ ...ms.actionBtn, background: '#FEF3C7', color: '#92400E', opacity: localStatus === 'Reviewing' ? 0.45 : 1 }}
            onClick={() => handleStatusChange('Reviewing')}
            disabled={localStatus === 'Reviewing' || statusUpdating}
          >
            🔍 Reviewing
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#D1FAE5', color: '#065F46', opacity: localStatus === 'Accepted' ? 0.45 : 1 }}
            onClick={() => handleStatusChange('Accepted')}
            disabled={localStatus === 'Accepted' || statusUpdating}
          >
            ✅ Accept
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#FEE2E2', color: '#991B1B', opacity: localStatus === 'Declined' ? 0.45 : 1 }}
            onClick={() => handleStatusChange('Declined')}
            disabled={localStatus === 'Declined' || statusUpdating}
          >
            ✗ Decline
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#EFF6FF', color: '#1D4ED8' }}
            onClick={handleRequestPDF}
            disabled={reqPdfLoading}
          >
            {reqPdfLoading ? '⏳ Generating…' : '⬇ Request PDF'}
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#EDE9FE', color: '#5B21B6' }}
            onClick={handleProposalPDF}
            disabled={propPdfLoading}
          >
            {propPdfLoading ? '⏳ Generating…' : '⬇ Proposal PDF'}
          </button>
          {project.fileUrl && (
            <a
              href={project.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#4A6B8A', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              📎 View Attachment
            </a>
          )}
        </div>

        {/* Scrollable body */}
        <div style={ms.body}>
          <Sec title="Client & Contact">
            <Row label="Company"   val={project.companyName} />
            <Row label="Website"   val={project.companyWebsite} />
            <Row label="Contact"   val={`${project.contactName} · ${project.contactEmail} · ${project.contactPhone}`} />
            {project.signatoryName && (
              <Row label="Signatory" val={`${project.signatoryName}${project.signatoryTitle ? ' — ' + project.signatoryTitle : ''}`} />
            )}
          </Sec>

          <Sec title="Project Overview">
            <Row label="Service"      val={project.serviceCategory} />
            <Row label="Specific Services" val={(project.specificServices || []).join(' · ')} />
            <Row label="Description"  val={project.projectDescription} />
            <Row label="Objectives"   val={(project.objectives || []).join(' · ')} />
            <Row label="Audience"     val={project.targetAudience} />
            <Row label="Challenges"   val={project.currentChallenges} />
          </Sec>

          <Sec title="Scope">
            <Row label="Deliverables"     val={(project.deliverables || []).join(' · ')} />
            <Row
              label={['Slirus Fashions', 'Slirus AgriSolutions', 'Slirus General Trade'].includes(project.serviceCategory) ? 'Specifications' : 'Technical Reqs'}
              val={project.technicalRequirements}
            />
            <Row label="Brand Assets"     val={project.brandAssets} />
          </Sec>

          <Sec title="Timeline & Budget">
            <Row label="Start Date" val={project.startDate} />
            <Row label="Deadline"   val={project.hardDeadline} />
            <Row label="Budget"     val={project.budgetRange} />
          </Sec>

          <Sec title="Success Metrics">
            <Row label="KPIs"        val={project.kpis} />
            <Row label="Inspiration" val={(project.inspirationLinks || []).join(' · ')} />
          </Sec>

          <Sec title="Logistics">
            <Row label="Referral Source" val={project.referralSource} />
            <Row label="Attachment"      val={project.fileName} />
          </Sec>

          <Sec title="Submission">
            <Row label="Reference" val={project.id?.slice(0, 12).toUpperCase()} />
            <Row label="Submitted" val={project.submittedAt?.toDate ? project.submittedAt.toDate().toLocaleString('en-UG') : '—'} />
            <Row label="Status"    val={localStatus} />
          </Sec>
        </div>
      </div>
    </div>
  );
};

// ─── Contract Status Badge ──────────────────────────────────────────────────
const ContractBadge = ({ status }) => {
  const cfg = CONTRACT_STATUS_CONFIG[status] || CONTRACT_STATUS_CONFIG.Draft;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status || 'Draft'}
    </span>
  );
};

// ─── Contract / Agreement Detail Modal ─────────────────────────────────────
// Read/manage view over contracts created by the CEO Control Center
// (CeoManager.jsx). Same `contracts` Firestore collection, same
// utils/contractPdf.js generator — so PDFs downloaded here are byte-for-byte
// the same layout as the ones the CEO downloads.
const ContractDetailModal = ({ contract, onClose, onStatusChange, statusUpdating }) => {
  const [localStatus, setLocalStatus] = useState(contract?.status);
  const [clientPdfLoading, setClientPdfLoading] = useState(false);
  const [companyPdfLoading, setCompanyPdfLoading] = useState(false);
  const [bothPdfLoading, setBothPdfLoading] = useState(false);

  useEffect(() => { setLocalStatus(contract?.status); }, [contract?.status]);

  if (!contract) return null;

  const tc = '#1A3C5E';

  const handleStatusChange = async (newStatus) => {
    setLocalStatus(newStatus);
    await onStatusChange(contract.id, newStatus);
  };

  const handleClientPDF = async () => {
    setClientPdfLoading(true);
    try { await generateContractPDF({ ...contract, status: localStatus }, 'Client Copy'); }
    catch (err) { alert('PDF error: ' + err.message); }
    finally { setClientPdfLoading(false); }
  };

  const handleCompanyPDF = async () => {
    setCompanyPdfLoading(true);
    try { await generateContractPDF({ ...contract, status: localStatus }, 'Company Copy'); }
    catch (err) { alert('PDF error: ' + err.message); }
    finally { setCompanyPdfLoading(false); }
  };

  const handleBothPDFs = async () => {
    setBothPdfLoading(true);
    try { await generateBothContractCopies({ ...contract, status: localStatus }); }
    catch (err) { alert('PDF error: ' + err.message); }
    finally { setBothPdfLoading(false); }
  };

  const Sec = ({ title, children }) => (
    <div style={ms.section}>
      <h4 style={{ ...ms.secTitle, color: tc }}>{title}</h4>
      {children}
    </div>
  );
  const Row = ({ label, val }) => val
    ? <div style={ms.row}><span style={ms.label}>{label}</span><span style={ms.val}>{val}</span></div>
    : null;

  return (
    <div style={ms.overlay} onClick={onClose}>
      <div style={ms.modal} onClick={e => e.stopPropagation()}>
        <div style={{ ...ms.header, borderTop: `4px solid ${tc}` }}>
          <div>
            <h3 style={{ margin: 0, color: '#1A3C5E', fontSize: 17 }}>{contract.contractTitle || contract.contractType}</h3>
            <p style={{ margin: '4px 0 0', color: '#5A7A9A', fontSize: 13 }}>
              {contract.clientCompanyName} · {contract.contractType}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ContractBadge status={localStatus} />
            <button style={ms.closeBtn} onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        <div style={ms.actionBar}>
          <button
            style={{ ...ms.actionBtn, background: '#D1FAE5', color: '#065F46', opacity: localStatus === 'Active' ? 0.45 : 1 }}
            onClick={() => handleStatusChange('Active')}
            disabled={localStatus === 'Active' || statusUpdating}
          >
            ✅ Activate
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#FEE2E2', color: '#991B1B', opacity: localStatus === 'Terminated' ? 0.45 : 1 }}
            onClick={() => handleStatusChange('Terminated')}
            disabled={localStatus === 'Terminated' || statusUpdating}
          >
            ✗ Terminate
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#EFF6FF', color: '#1D4ED8' }}
            onClick={handleClientPDF}
            disabled={clientPdfLoading}
          >
            {clientPdfLoading ? '⏳ Generating…' : '⬇ Client Copy PDF'}
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#EDE9FE', color: '#5B21B6' }}
            onClick={handleCompanyPDF}
            disabled={companyPdfLoading}
          >
            {companyPdfLoading ? '⏳ Generating…' : '⬇ Company Copy PDF'}
          </button>
          <button
            style={{ ...ms.actionBtn, background: '#F0F4F8', color: '#4A6B8A' }}
            onClick={handleBothPDFs}
            disabled={bothPdfLoading}
          >
            {bothPdfLoading ? '⏳ Generating…' : '⬇ Both Copies'}
          </button>
        </div>

        <div style={ms.body}>
          <Sec title="Agreement">
            <Row label="Type"     val={contract.contractType} />
            <Row label="Category" val={contract.serviceCategory} />
            <Row label="Effective" val={contract.effectiveDate} />
            <Row label="Expiry"    val={contract.expiryDate} />
            <Row label="Value"     val={contract.contractValue} />
            <Row label="Payment Terms" val={contract.paymentTerms} />
          </Sec>

          <Sec title="Client & Contact">
            <Row label="Company"  val={contract.clientCompanyName} />
            <Row label="Contact"  val={[contract.clientContactName, contract.clientEmail, contract.clientPhone].filter(Boolean).join(' · ')} />
            <Row label="Address"  val={contract.clientAddress} />
            <Row label="Client Signatory" val={`${contract.clientSignatoryName || '—'}${contract.clientSignatoryTitle ? ' — ' + contract.clientSignatoryTitle : ''}`} />
            <Row label="Company Signatory" val={`${contract.companySignatoryName || '—'}${contract.companySignatoryTitle ? ' — ' + contract.companySignatoryTitle : ''}`} />
          </Sec>

          {(() => {
            const typeFields = CONTRACT_TYPE_FIELDS[contract.contractType] || [];
            const sectionTitle = CONTRACT_TYPE_SECTION_TITLE[contract.contractType];
            const hasAnyValue = typeFields.some(f => f.type === 'list'
              ? (contract[f.key] || []).some(v => v && v.trim())
              : !!contract[f.key]);
            if (!typeFields.length || !sectionTitle || !hasAnyValue) return null;
            return (
              <Sec title={sectionTitle}>
                {typeFields.map(f => f.type === 'list' ? (
                  (contract[f.key] || []).filter(v => v && v.trim()).length > 0 && (
                    <div key={f.key} style={ms.row}>
                      <span style={ms.label}>{f.label}</span>
                      <ul style={{ margin: '2px 0 0', paddingLeft: 18, color: '#1A3C5E', fontSize: 13.5, lineHeight: 1.6 }}>
                        {contract[f.key].filter(v => v && v.trim()).map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    </div>
                  )
                ) : (
                  <Row key={f.key} label={f.label} val={contract[f.key]} />
                ))}
              </Sec>
            );
          })()}

          {contract.scopeSummary && (
            <Sec title="Scope of Work">
              <Row label="Summary" val={contract.scopeSummary} />
            </Sec>
          )}

          {(contract.conditions || []).length > 0 && (
            <Sec title="Terms & Conditions">
              <ul style={{ margin: 0, paddingLeft: 18, color: '#1A3C5E', fontSize: 13.5, lineHeight: 1.7 }}>
                {contract.conditions.map((cond, i) => <li key={i}>{cond}</li>)}
              </ul>
            </Sec>
          )}

          <Sec title="Record">
            <Row label="Reference" val={contract.id?.slice(0, 12).toUpperCase()} />
            <Row label="Created" val={contract.createdAt?.toDate ? contract.createdAt.toDate().toLocaleString('en-UG') : '—'} />
            <Row label="Created By" val={contract.createdBy} />
            <Row label="Status" val={localStatus} />
          </Sec>
        </div>
      </div>
    </div>
  );
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLogin?.();
    } catch (err) {
      const friendly = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(err.code);
      setError(friendly ? 'Invalid email or password. Please try again.' : 'Sign-in failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.loginBg}>
      <div style={s.loginCard}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
        <h2 style={s.loginTitle}>Admin Portal</h2>
        <p style={s.loginSub}>Enter your credentials to access the dashboard.</p>
        <form onSubmit={handleSubmit} noValidate>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8' }}
            disabled={loading}
            autoFocus
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ ...s.loginInput, borderColor: error ? '#EF4444' : '#D0DCE8', marginTop: 10 }}
            disabled={loading}
            autoComplete="current-password"
          />
          {error && <p style={s.loginErr}>{error}</p>}
          <button type="submit" style={s.loginBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Main Admin Component ─────────────────────────────────────────────────────
const Admin = () => {
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [trackStatuses, setTrackStatuses] = useState({});
  const [toggling, setToggling]       = useState(null);
  const [selected, setSelected]       = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loadingApps, setLoadingApps] = useState(true);
  const [trackFilter, setTrackFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch]           = useState('');
  const [appsError, setAppsError]     = useState(null);
  const [settingsError, setSettingsError] = useState(null);

  // ── Top-level dashboard tab: Applications vs Project Requests ──────────────
  const [dashTab, setDashTab] = useState('applications'); // 'applications' | 'projects' | 'contracts'

  // ── Project Requests state (mirrors applications state) ───────────────────
  const [projectRequests, setProjectRequests]     = useState([]);
  const [loadingProjects, setLoadingProjects]     = useState(true);
  const [projectsError, setProjectsError]         = useState(null);
  const [selectedProject, setSelectedProject]     = useState(null);
  const [projectStatusFilter, setProjectStatusFilter] = useState('All');
  const [projectSearch, setProjectSearch]         = useState('');
  const [projectStatusUpdating, setProjectStatusUpdating] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);

  // ── Contracts & Agreements state (mirrors project requests state) ─────────
  const [contracts, setContracts]                 = useState([]);
  const [loadingContracts, setLoadingContracts]   = useState(true);
  const [contractsError, setContractsError]       = useState(null);
  const [selectedContract, setSelectedContract]   = useState(null);
  const [contractStatusFilter, setContractStatusFilter] = useState('All');
  const [contractCategoryFilter, setContractCategoryFilter] = useState('All');
  const [contractSearch, setContractSearch]       = useState('');
  const [contractStatusUpdating, setContractStatusUpdating] = useState(false);
  const [deletingContractId, setDeletingContractId] = useState(null);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); });
    return unsub;
  }, []);

  // Firestore listeners — only when logged in
  useEffect(() => {
    if (!user) {
      setApplications([]);
      setTrackStatuses({});
      setAppsError(null);
      setSettingsError(null);
      return;
    }
    setLoadingApps(true);

    const unsubApps = onSnapshot(
      collection(db, 'applications'),
      (snap) => {
        setAppsError(null);
        setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingApps(false);
      },
      (err) => {
        console.error('Applications listen error:', err);
        setAppsError(err.code === 'permission-denied'
          ? 'Permission denied reading applications. Check your Firestore Security Rules.'
          : 'Could not load applications: ' + err.message);
        setLoadingApps(false);
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'applicationStatus'),
      async (snap) => {
        setSettingsError(null);
        const data = snap.exists() ? snap.data() : {};

        // Auto-seed: write false for any CAREER_TRACKS key missing from Firestore.
        // Fixes the case where Firestore only has a subset of keys
        // (e.g. softwareDev + accounts but not sales or internship).
        const missing = {};
        CAREER_TRACKS.forEach(t => { if (!(t.key in data)) missing[t.key] = false; });
        if (Object.keys(missing).length > 0) {
          console.log('[Admin] Seeding missing track keys:', missing);
          try {
            await setDoc(
              doc(db, 'settings', 'applicationStatus'),
              missing,
              { merge: true }
            );
          } catch (seedErr) {
            console.warn('[Admin] Could not seed track keys:', seedErr.message);
          }
          // onSnapshot will fire again with the full data — skip setTrackStatuses here
          return;
        }

        setTrackStatuses(data);
      },
      (err) => {
        console.error('Settings listen error:', err);
        setSettingsError(err.code === 'permission-denied'
          ? 'Permission denied reading settings. Check your Firestore Security Rules.'
          : 'Could not load track settings: ' + err.message);
      }
    );

    return () => { unsubApps(); unsubSettings(); };
  }, [user]);

  // ── Project Requests listener — only when logged in ───────────────────────
  useEffect(() => {
    if (!user) {
      setProjectRequests([]);
      setProjectsError(null);
      return;
    }
    setLoadingProjects(true);

    const unsubProjects = onSnapshot(
      collection(db, 'projectRequests'),
      (snap) => {
        setProjectsError(null);
        setProjectRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingProjects(false);
      },
      (err) => {
        console.error('Project requests listen error:', err);
        setProjectsError(err.code === 'permission-denied'
          ? 'Permission denied reading project requests. Check your Firestore Security Rules.'
          : 'Could not load project requests: ' + err.message);
        setLoadingProjects(false);
      }
    );

    return () => unsubProjects();
  }, [user]);

  // ── Contracts listener — reads the same `contracts` collection that ───────
  // CeoManager.jsx writes to, so every SLA / Service Contract / agreement
  // created there shows up here immediately.
  useEffect(() => {
    if (!user) {
      setContracts([]);
      setContractsError(null);
      return;
    }
    setLoadingContracts(true);

    const unsubContracts = onSnapshot(
      collection(db, 'contracts'),
      (snap) => {
        setContractsError(null);
        setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingContracts(false);
      },
      (err) => {
        console.error('Contracts listen error:', err);
        setContractsError(err.code === 'permission-denied'
          ? 'Permission denied reading contracts. Check your Firestore Security Rules.'
          : 'Could not load contracts: ' + err.message);
        setLoadingContracts(false);
      }
    );

    return () => unsubContracts();
  }, [user]);

  // ── Secure sign-out ──────────────────────────────────────────────────────
  // 1. Confirms intent (prevents accidental sign-out mid-review).
  // 2. Clears all locally-held sensitive state BEFORE calling signOut, so
  //    no applicant/project data lingers in memory or briefly re-renders
  //    after the auth listener fires.
  // 3. Calls Firebase signOut, which invalidates the session token client-side
  //    and clears Firebase's persisted auth state (IndexedDB/localStorage).
  // 4. onAuthStateChanged (already wired above) will catch the null user and
  //    redirect to <LoginScreen /> automatically.
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    const confirmed = window.confirm('Sign out of the Admin Portal?');
    if (!confirmed) return;

    setLoggingOut(true);
    try {
      // Wipe sensitive state immediately — don't wait on the network call.
      setApplications([]);
      setProjectRequests([]);
      setTrackStatuses({});
      setSelected(null);
      setSelectedProject(null);
      setSearch('');
      setProjectSearch('');

      await signOut(auth);
      // user/auth listener will flip `user` to null and render LoginScreen.
    } catch (err) {
      console.error('Logout error:', err);
      alert('Sign out failed: ' + err.message + '\n\nPlease check your connection and try again.');
    } finally {
      setLoggingOut(false);
    }
  }, []);

  const toggleTrackStatus = async (trackKey, currentStatus) => {
    setToggling(trackKey);
    try {
      // Re-read the current Firebase Auth user at call time — never rely on
      // a stale closure. If auth.currentUser is null here the rules will block
      // the write with permission-denied even though the user "appears" logged in.
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('Session expired — please sign out and sign in again.');
        setToggling(null);
        return;
      }

      const newValue = !currentStatus;
      console.log(`[Toggle] ${trackKey}: ${currentStatus} → ${newValue} | uid: ${currentUser.uid} | email: ${currentUser.email}`);

      await setDoc(
        doc(db, 'settings', 'applicationStatus'),
        { [trackKey]: newValue },
        { merge: true }
      );

      console.log(`[Toggle] Firestore write success for ${trackKey}`);
    } catch (err) {
      console.error('toggleTrackStatus error:', err.code, err.message);
      if (err.code === 'permission-denied') {
        alert(`Permission denied.\n\nFirebase rejected the write for "${trackKey}".\n\nMake sure:\n1. You are logged in as kaayamosesawal@gmail.com\n2. Your Firestore rules allow this email to write to settings/applicationStatus`);
      } else {
        alert('Toggle failed: ' + err.message);
      }
    } finally {
      setToggling(null);
    }
  };

  const updateStatus = useCallback(async (id, status) => {
    setStatusUpdating(true);
    try {
      // 1. Update status in Firestore. onSnapshot keeps the table in sync.
      await updateDoc(doc(db, 'applications', id), { status });

      // Optimistic update so the modal badge flips instantly.
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);

      // 2. Send the appropriate email via server (Nodemailer + Mailtrap).
      //    Uses in-memory applications array — no extra Firestore read required.
      const app = applications.find(a => a.id === id);
      if (app && (status === 'Shortlisted' || status === 'Unqualified')) {
        const emailType = status === 'Shortlisted' ? 'shortlisted' : 'unqualified';
        fetch(`${API_URL}/api/send-email`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:    emailType,
            to:      app.email,
            name:    app.fullName,
            program: app.program,
          }),
        }).catch(err => console.warn('[Email] Status email failed:', err));
      }
    } catch (err) {
      console.error('updateStatus error:', err);
      alert('Status update failed: ' + err.message);
    } finally {
      setStatusUpdating(false);
    }
  }, [applications]);

  const updateProjectStatus = useCallback(async (id, status) => {
    setProjectStatusUpdating(true);
    try {
      await updateDoc(doc(db, 'projectRequests', id), { status });
      setSelectedProject(prev => prev?.id === id ? { ...prev, status } : prev);

      // Optional: notify the client by email on Accept/Decline
      const proj = projectRequests.find(p => p.id === id);
      if (proj && (status === 'Accepted' || status === 'Declined')) {
        const emailType = status === 'Accepted' ? 'project_accepted' : 'project_declined';
        fetch(`${API_URL}/api/send-email`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:    emailType,
            to:      proj.contactEmail,
            name:    proj.contactName,
            program: proj.projectTitle,
            service: proj.serviceCategory,
          }),
        }).catch(err => console.warn('[Email] Project status email failed:', err));
      }
    } catch (err) {
      console.error('updateProjectStatus error:', err);
      alert('Status update failed: ' + err.message);
    } finally {
      setProjectStatusUpdating(false);
    }
  }, [projectRequests]);

  const deleteApplication = useCallback(async (id, fullName) => {
    if (!window.confirm(`Delete the application from "${fullName || 'this applicant'}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'applications', id));
      // Close the modal if the deleted record is currently open.
      setSelected(prev => prev?.id === id ? null : prev);
    } catch (err) {
      console.error('deleteApplication error:', err);
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }, []);

  const deleteProject = useCallback(async (id, companyName) => {
    if (!window.confirm(`Delete the project request from "${companyName || 'this company'}"? This cannot be undone.`)) return;
    setDeletingProjectId(id);
    try {
      await deleteDoc(doc(db, 'projectRequests', id));
      setSelectedProject(prev => prev?.id === id ? null : prev);
    } catch (err) {
      console.error('deleteProject error:', err);
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingProjectId(null);
    }
  }, []);

  const updateContractStatus = useCallback(async (id, status) => {
    setContractStatusUpdating(true);
    try {
      await updateDoc(doc(db, 'contracts', id), { status });
      setSelectedContract(prev => prev?.id === id ? { ...prev, status } : prev);
    } catch (err) {
      console.error('updateContractStatus error:', err);
      alert('Status update failed: ' + err.message);
    } finally {
      setContractStatusUpdating(false);
    }
  }, []);

  const deleteContract = useCallback(async (id, clientCompanyName) => {
    if (!window.confirm(`Delete the contract for "${clientCompanyName || 'this client'}"? This cannot be undone.`)) return;
    setDeletingContractId(id);
    try {
      await deleteDoc(doc(db, 'contracts', id));
      setSelectedContract(prev => prev?.id === id ? null : prev);
    } catch (err) {
      console.error('deleteContract error:', err);
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingContractId(null);
    }
  }, []);

  // ── Loading auth ──
  if (authLoading) {
    return (
      <div style={s.loginBg}>
        <div style={{ color: '#1A3C5E', fontWeight: 600, fontSize: 15 }}>Loading Portal…</div>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!user) return <LoginScreen />;

  // ── Derived data ──
  const countForTrack = (key) => applications.filter(a => a.trackKey === key).length;

  const displayed = applications
    .filter(a => trackFilter  === 'All' || a.trackKey === trackFilter)
    .filter(a => statusFilter === 'All' || a.status   === statusFilter)
    .filter(a => {
      const q = search.trim().toLowerCase();
      return !q || a.fullName?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.submittedAt?.toDate?.() || 0) - (a.submittedAt?.toDate?.() || 0));

  const counts = {
    All:         applications.length,
    Pending:     applications.filter(a => a.status === 'Pending').length,
    Shortlisted: applications.filter(a => a.status === 'Shortlisted').length,
    Unqualified: applications.filter(a => a.status === 'Unqualified').length,
  };

  // ── Project Requests derived data ──────────────────────────────────────────
  const displayedProjects = projectRequests
    .filter(p => projectStatusFilter === 'All' || p.status === projectStatusFilter)
    .filter(p => {
      const q = projectSearch.trim().toLowerCase();
      return !q
        || p.companyName?.toLowerCase().includes(q)
        || p.contactName?.toLowerCase().includes(q)
        || p.contactEmail?.toLowerCase().includes(q)
        || p.projectTitle?.toLowerCase().includes(q)
        || p.serviceCategory?.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.submittedAt?.toDate?.() || 0) - (a.submittedAt?.toDate?.() || 0));

  const projectCounts = {
    All:        projectRequests.length,
    New:        projectRequests.filter(p => p.status === 'New').length,
    Reviewing:  projectRequests.filter(p => p.status === 'Reviewing').length,
    Accepted:   projectRequests.filter(p => p.status === 'Accepted').length,
    Declined:   projectRequests.filter(p => p.status === 'Declined').length,
  };

  // ── Contracts derived data ─────────────────────────────────────────────────
  const displayedContracts = contracts
    .filter(c => contractStatusFilter === 'All' || c.status === contractStatusFilter)
    .filter(c => contractCategoryFilter === 'All' || c.serviceCategory === contractCategoryFilter)
    .filter(c => {
      const q = contractSearch.trim().toLowerCase();
      return !q
        || c.clientCompanyName?.toLowerCase().includes(q)
        || c.contractTitle?.toLowerCase().includes(q)
        || c.clientContactName?.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));

  const contractCounts = {
    All:        contracts.length,
    Draft:      contracts.filter(c => c.status === 'Draft').length,
    Active:     contracts.filter(c => c.status === 'Active').length,
    Expired:    contracts.filter(c => c.status === 'Expired').length,
    Terminated: contracts.filter(c => c.status === 'Terminated').length,
  };

  return (
    <Layout>
      <div style={s.page}>
        {/* Permission / connection error banners */}
        {settingsError && dashTab === 'applications' && (
          <div style={s.errorBanner}>⚠️ Track Settings: {settingsError}</div>
        )}
        {appsError && dashTab === 'applications' && (
          <div style={s.errorBanner}>⚠️ Applications: {appsError}</div>
        )}
        {projectsError && dashTab === 'projects' && (
          <div style={s.errorBanner}>⚠️ Project Requests: {projectsError}</div>
        )}
        {contractsError && dashTab === 'contracts' && (
          <div style={s.errorBanner}>⚠️ Contracts: {contractsError}</div>
        )}

        {/* Top bar */}
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>
              {dashTab === 'applications' ? 'Applications Dashboard' : dashTab === 'projects' ? 'Project Proposals Dashboard' : 'Contracts & Agreements'}
            </h1>
            <p style={s.pageSub}>
              {dashTab === 'applications'
                ? `${counts.All} total · ${counts.Shortlisted} shortlisted · ${counts.Pending} pending · ${counts.Unqualified} unqualified`
                : dashTab === 'projects'
                ? `${projectCounts.All} total · ${projectCounts.New} new · ${projectCounts.Reviewing} reviewing · ${projectCounts.Accepted} accepted`
                : `${contractCounts.All} total · ${contractCounts.Active} active · ${contractCounts.Draft} draft · ${contractCounts.Expired} expired`}
            </p>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Sign Out ⎋'}
          </button>
        </div>

        {/* ── Top-level dashboard switcher ── */}
        <div style={s.dashSwitcher}>
          <button
            style={{ ...s.dashTab, ...(dashTab === 'applications' ? s.dashTabActive : {}) }}
            onClick={() => setDashTab('applications')}
          >
            👤 Applications <span style={s.tabCount}>{counts.All}</span>
          </button>
          <button
            style={{ ...s.dashTab, ...(dashTab === 'projects' ? s.dashTabActive : {}) }}
            onClick={() => setDashTab('projects')}
          >
            📋 Project Proposals <span style={s.tabCount}>{projectCounts.All}</span>
            {projectCounts.New > 0 && <span style={s.newPill}>{projectCounts.New} new</span>}
          </button>
          <button
            style={{ ...s.dashTab, ...(dashTab === 'contracts' ? s.dashTabActive : {}) }}
            onClick={() => setDashTab('contracts')}
          >
            📄 Contracts & Agreements <span style={s.tabCount}>{contractCounts.All}</span>
          </button>
        </div>

        {dashTab === 'applications' ? (
        <>

        {/* Intake control */}
        <h2 style={s.sectionHead}>Position Intake Control</h2>
        <div style={s.trackGrid}>
          {CAREER_TRACKS.map(track => (
            <TrackToggle
              key={track.key}
              track={track}
              isOpen={trackStatuses[track.key] === true}
              onToggle={toggleTrackStatus}
              toggling={toggling}
              appCount={countForTrack(track.key)}
            />
          ))}
        </div>

        {/* Applications table */}
        <h2 style={{ ...s.sectionHead, marginTop: 36 }}>Received Applications</h2>

        {/* Filters toolbar */}
        <div style={s.toolbar}>
          <div style={s.tabs}>
            <button
              style={{ ...s.tab, ...(trackFilter === 'All' ? s.tabActive : {}) }}
              onClick={() => setTrackFilter('All')}
            >
              All Tracks <span style={s.tabCount}>{counts.All}</span>
            </button>
            {CAREER_TRACKS.map(t => (
              <button
                key={t.key}
                style={{ ...s.tab, ...(trackFilter === t.key ? { ...s.tabActive, background: t.color, borderColor: t.color } : {}) }}
                onClick={() => setTrackFilter(t.key)}
              >
                {t.title.split(' ')[0]}
                <span style={s.tabCount}>{countForTrack(t.key)}</span>
              </button>
            ))}
          </div>

          <div style={s.tabs}>
            {['All', 'Pending', 'Shortlisted', 'Unqualified'].map(st => {
              const cfg = STATUS_CONFIG[st];
              return (
                <button
                  key={st}
                  style={{ ...s.tab, ...(statusFilter === st ? (cfg ? { background: cfg.bg, color: cfg.color, borderColor: cfg.dot } : s.tabActive) : {}) }}
                  onClick={() => setStatusFilter(st)}
                >
                  {st} <span style={s.tabCount}>{counts[st]}</span>
                </button>
              );
            })}
          </div>

          <input
            style={s.searchInput}
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div style={s.tableWrap}>
          {loadingApps ? (
            <div style={s.tableMsg}>Loading applications…</div>
          ) : displayed.length === 0 ? (
            <div style={s.tableMsg}>No applications match your filters.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Applicant</th>
                  <th style={s.th}>Track</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Submitted</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(app => {
                  const appTrack = CAREER_TRACKS.find(t => t.key === app.trackKey);
                  return (
                    <tr key={app.id} style={s.tr}>
                      <td style={s.td}>
                        <button style={s.nameBtn} onClick={() => setSelected(app)}>
                          {app.fullName}
                        </button>
                        <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{app.email}</div>
                      </td>
                      <td style={s.td}>
                        <span style={{ fontSize: 13, color: appTrack?.color || '#1A3C5E', fontWeight: 600 }}>
                          {appTrack?.title || app.program || '—'}
                        </span>
                      </td>
                      <td style={s.td}><Badge status={app.status} /></td>
                      <td style={{ ...s.td, fontSize: 12, color: '#7A8A9A', whiteSpace: 'nowrap' }}>
                        {app.submittedAt?.toDate ? app.submittedAt.toDate().toLocaleDateString('en-UG') : '—'}
                      </td>
                      <td style={s.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            style={{ ...s.btnShortlist, opacity: app.status === 'Shortlisted' ? 0.45 : 1 }}
                            onClick={() => updateStatus(app.id, 'Shortlisted')}
                            disabled={app.status === 'Shortlisted' || statusUpdating}
                          >
                            Shortlist
                          </button>
                          <button
                            style={{ ...s.btnReject, opacity: app.status === 'Unqualified' ? 0.45 : 1 }}
                            onClick={() => updateStatus(app.id, 'Unqualified')}
                            disabled={app.status === 'Unqualified' || statusUpdating}
                          >
                            Reject
                          </button>
                          <button style={s.btnView} onClick={() => setSelected(app)}>View</button>
                          <button
                            style={{ ...s.btnDelete, opacity: deletingId === app.id ? 0.5 : 1 }}
                            onClick={() => deleteApplication(app.id, app.fullName)}
                            disabled={deletingId === app.id}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        </>
        ) : dashTab === 'projects' ? (
        <>

        {/* ── PROJECT REQUESTS TAB ── */}
        <h2 style={s.sectionHead}>Received Project Proposals</h2>

        {/* Filters toolbar */}
        <div style={s.toolbar}>
          <div style={s.tabs}>
            {['All', 'New', 'Reviewing', 'Accepted', 'Declined'].map(st => {
              const cfg = PROJECT_STATUS_CONFIG[st];
              return (
                <button
                  key={st}
                  style={{ ...s.tab, ...(projectStatusFilter === st ? (cfg ? { background: cfg.bg, color: cfg.color, borderColor: cfg.dot } : s.tabActive) : {}) }}
                  onClick={() => setProjectStatusFilter(st)}
                >
                  {st} <span style={s.tabCount}>{projectCounts[st]}</span>
                </button>
              );
            })}
          </div>

          <input
            style={s.searchInput}
            placeholder="Search company, contact, project, or service…"
            value={projectSearch}
            onChange={e => setProjectSearch(e.target.value)}
          />
        </div>

        {/* Project Requests table */}
        <div style={s.tableWrap}>
          {loadingProjects ? (
            <div style={s.tableMsg}>Loading project requests…</div>
          ) : displayedProjects.length === 0 ? (
            <div style={s.tableMsg}>No project proposals match your filters.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Company / Project</th>
                  <th style={s.th}>Contact</th>
                  <th style={s.th}>Budget</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Submitted</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedProjects.map(proj => (
                  <tr key={proj.id} style={s.tr}>
                    <td style={s.td}>
                      <button style={s.nameBtn} onClick={() => setSelectedProject(proj)}>
                        {proj.companyName}
                      </button>
                      <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{proj.projectTitle}</div>
                      {proj.serviceCategory && (
                        <div style={{ fontSize: 11, color: '#2E6DA4', fontWeight: 600, marginTop: 2 }}>{proj.serviceCategory}</div>
                      )}
                    </td>
                    <td style={s.td}>
                      <span style={{ fontSize: 13, color: '#1A3C5E', fontWeight: 600 }}>{proj.contactName}</span>
                      <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{proj.contactEmail}</div>
                    </td>
                    <td style={{ ...s.td, fontSize: 13, whiteSpace: 'nowrap' }}>{proj.budgetRange || '—'}</td>
                    <td style={s.td}><ProjectBadge status={proj.status} /></td>
                    <td style={{ ...s.td, fontSize: 12, color: '#7A8A9A', whiteSpace: 'nowrap' }}>
                      {proj.submittedAt?.toDate ? proj.submittedAt.toDate().toLocaleDateString('en-UG') : '—'}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={{ ...s.btnShortlist, opacity: proj.status === 'Accepted' ? 0.45 : 1 }}
                          onClick={() => updateProjectStatus(proj.id, 'Accepted')}
                          disabled={proj.status === 'Accepted' || projectStatusUpdating}
                        >
                          Accept
                        </button>
                        <button
                          style={{ ...s.btnReject, opacity: proj.status === 'Declined' ? 0.45 : 1 }}
                          onClick={() => updateProjectStatus(proj.id, 'Declined')}
                          disabled={proj.status === 'Declined' || projectStatusUpdating}
                        >
                          Decline
                        </button>
                        <button style={s.btnView} onClick={() => setSelectedProject(proj)}>View</button>
                        <button
                          style={{ ...s.btnDelete, opacity: deletingProjectId === proj.id ? 0.5 : 1 }}
                          onClick={() => deleteProject(proj.id, proj.companyName)}
                          disabled={deletingProjectId === proj.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </>
        ) : (
        <>

        {/* ── CONTRACTS & AGREEMENTS TAB ── */}
        {/* Read/manage view — contracts themselves are created from the CEO
            Control Center form; this mirrors the same `contracts` collection
            and PDF-generation logic so nothing here is duplicated. */}
        <h2 style={s.sectionHead}>SLAs, Service Contracts & Professional Agreements</h2>

        {/* Filters toolbar */}
        <div style={s.toolbar}>
          <div style={s.tabs}>
            {['All', 'Draft', 'Active', 'Expired', 'Terminated'].map(st => {
              const cfg = CONTRACT_STATUS_CONFIG[st];
              return (
                <button
                  key={st}
                  style={{ ...s.tab, ...(contractStatusFilter === st ? (cfg ? { background: cfg.bg, color: cfg.color, borderColor: cfg.dot } : s.tabActive) : {}) }}
                  onClick={() => setContractStatusFilter(st)}
                >
                  {st} <span style={s.tabCount}>{st === 'All' ? contractCounts.All : contractCounts[st]}</span>
                </button>
              );
            })}
          </div>

          <select
            style={{ ...s.loginInput, width: 'auto', padding: '9px 12px' }}
            value={contractCategoryFilter}
            onChange={e => setContractCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            {SERVICE_CATEGORIES.map(c => <option key={c.key} value={c.label}>{c.label}</option>)}
          </select>

          <input
            style={s.searchInput}
            placeholder="Search client, title, or contact…"
            value={contractSearch}
            onChange={e => setContractSearch(e.target.value)}
          />
        </div>

        {/* Contracts table */}
        <div style={s.tableWrap}>
          {loadingContracts ? (
            <div style={s.tableMsg}>Loading contracts…</div>
          ) : displayedContracts.length === 0 ? (
            <div style={s.tableMsg}>No contracts match your filters.</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr style={s.thead}>
                  <th style={s.th}>Client / Title</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Category</th>
                  <th style={s.th}>Value</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedContracts.map(c => (
                  <tr key={c.id} style={s.tr}>
                    <td style={s.td}>
                      <button style={s.nameBtn} onClick={() => setSelectedContract(c)}>
                        {c.clientCompanyName}
                      </button>
                      <div style={{ fontSize: 12, color: '#7A8A9A', marginTop: 2 }}>{c.contractTitle}</div>
                    </td>
                    <td style={{ ...s.td, fontSize: 13 }}>{c.contractType}</td>
                    <td style={{ ...s.td, fontSize: 13 }}>{c.serviceCategory}</td>
                    <td style={{ ...s.td, fontSize: 13, whiteSpace: 'nowrap' }}>{c.contractValue || '—'}</td>
                    <td style={s.td}><ContractBadge status={c.status} /></td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button style={s.btnView} onClick={() => setSelectedContract(c)}>View</button>
                        <button
                          style={{ ...s.btnDelete, opacity: deletingContractId === c.id ? 0.5 : 1 }}
                          onClick={() => deleteContract(c.id, c.clientCompanyName)}
                          disabled={deletingContractId === c.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        </>
        )}
      </div>

      {/* Detail modals */}
      <DetailModal
        app={selected}
        onClose={() => setSelected(null)}
        onStatusChange={updateStatus}
        statusUpdating={statusUpdating}
      />
      <ProjectDetailModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onStatusChange={updateProjectStatus}
        statusUpdating={projectStatusUpdating}
      />
      <ContractDetailModal
        contract={selectedContract}
        onClose={() => setSelectedContract(null)}
        onStatusChange={updateContractStatus}
        statusUpdating={contractStatusUpdating}
      />
    </Layout>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  errorBanner: { background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E', fontWeight: 600 },

  loginBg:    { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F4F8' },
  loginCard:  { background: '#fff', borderRadius: 14, padding: '48px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', textAlign: 'center', width: '100%', maxWidth: 380, border: '1px solid #E2E8F0', borderTop: '4px solid #1A3C5E' },
  loginTitle: { fontSize: 22, fontWeight: 700, color: '#1A3C5E', margin: '0 0 8px' },
  loginSub:   { color: '#5A7A9A', fontSize: 14, margin: '0 0 28px' },
  loginInput: { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1.5px solid #D0DCE8', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  loginErr:   { color: '#EF4444', fontSize: 13, margin: '10px 0 0', textAlign: 'left' },
  loginBtn:   { width: '100%', background: '#1A3C5E', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 16 },

  page:        { padding: '36px 5%', maxWidth: 1280, margin: '0 auto' },
  topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  pageTitle:   { fontSize: 26, fontWeight: 700, color: '#1A3C5E', margin: 0 },
  pageSub:     { color: '#5A7A9A', margin: '4px 0 0', fontSize: 14 },
  logoutBtn:   { padding: '8px 16px', background: '#fff', border: '1.5px solid #C5CDD6', color: '#4A6B8A', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: 1, transition: 'opacity 0.15s' },

  dashSwitcher: { display: 'flex', gap: 8, marginBottom: 28, borderBottom: '2px solid #E2E8F0', paddingBottom: 0 },
  dashTab:      { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '10px 4px 12px', fontSize: 14, fontWeight: 700, color: '#7A8A9A', cursor: 'pointer', marginBottom: -2 },
  dashTabActive:{ color: '#1A3C5E', borderBottomColor: '#1A3C5E' },
  newPill:      { background: '#FEE2E2', color: '#991B1B', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 },

  sectionHead: { fontSize: 15, fontWeight: 700, color: '#1A3C5E', margin: '0 0 14px' },
  trackGrid:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },

  toolbar:     { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14, alignItems: 'center' },
  tabs:        { display: 'flex', gap: 4, flexWrap: 'wrap' },
  tab:         { background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 7, padding: '7px 12px', fontSize: 13, color: '#5A7A9A', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 },
  tabActive:   { background: '#1A3C5E', color: '#fff', borderColor: '#1A3C5E' },
  tabCount:    { background: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: '1px 7px', fontSize: 11 },
  searchInput: { flex: 1, minWidth: 200, padding: '9px 14px', border: '1.5px solid #D0DCE8', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit' },

  tableWrap:   { background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'auto' },
  tableMsg:    { padding: 56, textAlign: 'center', color: '#5A7A9A', fontSize: 14 },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead:       { background: '#F7F9FC' },
  th:          { padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7A8A9A', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' },
  tr:          { borderBottom: '1px solid #F0F4F8' },
  td:          { padding: '11px 14px', verticalAlign: 'middle', color: '#1A3C5E' },
  nameBtn:     { background: 'none', border: 'none', color: '#2E6DA4', fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' },
  btnShortlist:{ background: '#D1FAE5', color: '#065F46', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnReject:   { background: '#FEE2E2', color: '#991B1B', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnView:     { background: '#EFF6FF', color: '#1D4ED8', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnDelete:   { background: '#FEE2E2', color: '#B91C1C', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
};

const tt = {
  card:   { background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  tag:    { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '3px 8px', letterSpacing: 0.4, textTransform: 'uppercase' },
  title:  { fontSize: 15, fontWeight: 700, margin: '6px 0 4px' },
  desc:   { fontSize: 12, color: '#5A7A9A', lineHeight: 1.5, margin: '0 0 14px' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  status: { fontSize: 12, fontWeight: 700 },
  btn:    { border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
};

const ms = {
  overlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal:     { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
  header:    { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #E2E8F0', background: '#F7F9FC', borderRadius: '12px 12px 0 0', flexShrink: 0 },
  actionBar: { display: 'flex', gap: 8, padding: '12px 24px', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', flexShrink: 0 },
  actionBtn: { border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  body:      { overflowY: 'auto', padding: '20px 24px', flex: 1 },
  closeBtn:  { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#7A8A9A', lineHeight: 1, padding: 4 },
  section:   { marginBottom: 18 },
  secTitle:  { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px', borderBottom: '1px solid #E8F0F8', paddingBottom: 5 },
  row:       { display: 'flex', gap: 10, padding: '4px 0', fontSize: 14 },
  label:     { minWidth: 120, color: '#7A8A9A', fontWeight: 600, fontSize: 13, flexShrink: 0 },
  val:       { color: '#1A3C5E', flex: 1, wordBreak: 'break-word' },
};

export default Admin;