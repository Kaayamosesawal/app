/**
 * Career.jsx – Slirus Holdings Careers & Internships
 *
 * Fixes applied:
 *  1. Subscribes to settings/applicationStatus (Firestore) — Apply Now is
 *     disabled and shows a "Closed" badge when the track is not open.
 *  2. Job data is no longer duplicated here. Full detail (qualifications,
 *     experience, responsibilities, description, etc.) is read from
 *     CAREER_TRACKS so careerTracks.js is the single source of truth.
 *  3. Apply Now passes { state: { trackKey } } so Apply.jsx can pre-select
 *     the track the user just read — no double-picking.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Layout from '../components/Layout';
import { CAREER_TRACKS } from './careerTracks';

// ─── Derived data ─────────────────────────────────────────────────────────────
// Split CAREER_TRACKS into jobs (type='Job') and internships (type='Internship').
// All detail fields (description, qualifications, experience, responsibilities,
// eligibility, benefits, duration) must now live in careerTracks.js.
const jobTracks      = CAREER_TRACKS.filter(t => t.type === 'Job');
const internshipTracks = CAREER_TRACKS.filter(t => t.type === 'Internship');

// ─── JobCard ──────────────────────────────────────────────────────────────────
const JobCard = ({ track, isOpen, statusLoading }) => {
  const [expanded, setExpanded] = useState(false);

  const applyDisabled = statusLoading || !isOpen;

  return (
    <div className="job-card" style={{ borderTop: `3px solid ${track.color}` }}>
      <div className="job-card-header">
        <div className="job-card-title-row">
          <div className="job-icon-wrap" style={{ background: track.lightBg }}>
            <i className={track.icon} style={{ color: track.color }}></i>
          </div>
          <div>
            <h3 className="job-title">{track.title}</h3>
            <div className="job-meta">
              {track.location && (
                <span><i className="fas fa-map-marker-alt"></i> {track.location}</span>
              )}
              {track.employment && (
                <span><i className="fas fa-clock"></i> {track.employment}</span>
              )}
              <span
                className={`track-status-badge ${isOpen ? 'open' : 'closed'}`}
                style={isOpen
                  ? { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }
                  : { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }
                }
              >
                {statusLoading ? '…' : isOpen ? '● Accepting Applications' : '🔒 Closed'}
              </span>
            </div>
          </div>
        </div>

        {track.description && (
          <p className="job-description">{track.description}</p>
        )}

        <div className="job-card-footer">
          <button className="toggle-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show Less' : 'View Details'}
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
          </button>

          {applyDisabled ? (
            <span className="apply-btn-disabled">
              {statusLoading ? 'Loading…' : '🔒 Applications Closed'}
            </span>
          ) : (
            <Link
              to="/apply"
              state={{ trackKey: track.key }}
              className="apply-btn"
              style={{ background: track.color }}
            >
              Apply Now <i className="fas fa-arrow-right"></i>
            </Link>
          )}
        </div>
      </div>

      {expanded && (
        <div className="job-card-body">
          {(track.qualifications?.length || track.experience?.length) && (
            <div className="job-detail-grid">
              {track.qualifications?.length > 0 && (
                <div className="job-detail-block">
                  <h4 style={{ color: track.color }}>
                    <i className="fas fa-graduation-cap"></i> Qualifications
                  </h4>
                  <ul>
                    {track.qualifications.map((q, i) => (
                      <li key={i}><i className="fas fa-check"></i> {q}</li>
                    ))}
                  </ul>
                </div>
              )}
              {track.experience?.length > 0 && (
                <div className="job-detail-block">
                  <h4 style={{ color: track.color }}>
                    <i className="fas fa-briefcase"></i> Experience
                  </h4>
                  <ul>
                    {track.experience.map((e, i) => (
                      <li key={i}><i className="fas fa-check"></i> {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {track.responsibilities?.length > 0 && (
            <div className="job-detail-block full-width">
              <h4 style={{ color: track.color }}>
                <i className="fas fa-tasks"></i> Key Responsibilities
              </h4>
              <ul>
                {track.responsibilities.map((r, i) => (
                  <li key={i}><i className="fas fa-check"></i> {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── InternCard ───────────────────────────────────────────────────────────────
const InternCard = ({ track, isOpen, statusLoading }) => {
  const [expanded, setExpanded] = useState(false);
  const applyDisabled = statusLoading || !isOpen;

  return (
    <div className="intern-card">
      <div className="intern-card-header">
        <div className="intern-badge">
          <i className="fas fa-star"></i> Paid Program
        </div>
        <h3 className="intern-title">{track.title}</h3>
        <div className="intern-meta">
          {track.location && (
            <span><i className="fas fa-map-marker-alt"></i> {track.location}</span>
          )}
          {track.duration && (
            <span><i className="fas fa-calendar-alt"></i> {track.duration}</span>
          )}
          {track.employment && (
            <span><i className="fas fa-tag"></i> {track.employment}</span>
          )}
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '2px 10px',
            borderRadius: 20, background: 'rgba(255,255,255,0.2)', color: 'white',
          }}>
            {statusLoading ? '…' : isOpen ? '● Open' : '🔒 Closed'}
          </span>
        </div>
        {track.description && (
          <p className="intern-description">{track.description}</p>
        )}
        <div className="intern-footer">
          <button className="intern-toggle-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show Less' : 'View Details'}
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
          </button>

          {applyDisabled ? (
            <span className="intern-apply-disabled">
              {statusLoading ? 'Loading…' : '🔒 Applications Closed'}
            </span>
          ) : (
            <Link
              to="/apply"
              state={{ trackKey: track.key }}
              className="intern-apply-btn"
            >
              Apply Now <i className="fas fa-arrow-right"></i>
            </Link>
          )}
        </div>
      </div>

      {expanded && (
        <div className="intern-card-body">
          <div className="intern-detail-grid">
            {track.eligibility?.length > 0 && (
              <div className="intern-detail-block">
                <h4><i className="fas fa-user-check"></i> Eligibility</h4>
                <ul>
                  {track.eligibility.map((e, i) => (
                    <li key={i}><i className="fas fa-check"></i> {e}</li>
                  ))}
                </ul>
              </div>
            )}
            {track.responsibilities?.length > 0 && (
              <div className="intern-detail-block">
                <h4><i className="fas fa-tasks"></i> Responsibilities</h4>
                <ul>
                  {track.responsibilities.map((r, i) => (
                    <li key={i}><i className="fas fa-check"></i> {r}</li>
                  ))}
                </ul>
              </div>
            )}
            {track.benefits?.length > 0 && (
              <div className="intern-detail-block">
                <h4><i className="fas fa-gift"></i> Benefits</h4>
                <ul>
                  {track.benefits.map((b, i) => (
                    <li key={i}><i className="fas fa-check"></i> {b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Career (main) ────────────────────────────────────────────────────────────
const Career = () => {
  const [trackStatuses, setTrackStatuses] = useState({});
  const [statusLoading, setStatusLoading] = useState(true);

  // Subscribe to Firestore application status — same doc Apply.jsx watches.
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'applicationStatus'),
      (snap) => {
        setTrackStatuses(snap.exists() ? snap.data() : {});
        setStatusLoading(false);
      },
      (err) => {
        console.error('[Career] settings listen error:', err);
        setTrackStatuses({});
        setStatusLoading(false);
      }
    );
    return unsub;
  }, []);

  return (
    <Layout>
      <style>{`
        .job-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          margin-bottom: 24px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          transition: box-shadow 0.3s ease;
        }
        .job-card:hover { box-shadow: 0 6px 24px rgba(37,99,235,0.10); }

        .job-card-header { padding: 28px 32px; }

        .job-card-title-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 14px;
        }

        .job-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .job-icon-wrap i { font-size: 22px; }

        .job-title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }

        .job-meta { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .job-meta span { font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 5px; }
        .job-meta i { color: #2563eb; }

        .track-status-badge {
          font-size: 12px; font-weight: 700;
          padding: 3px 10px; border-radius: 20px;
          display: inline-flex; align-items: center; gap: 4px;
        }

        .job-description { color: #475569; line-height: 1.7; font-size: 15px; margin-bottom: 20px; }

        .job-card-footer { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

        .toggle-btn {
          width: auto;
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          transition: background 0.2s;
        }
        .toggle-btn:hover { background: #e2e8f0; }

        .apply-btn {
          color: white;
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 14px; font-weight: 600;
          text-decoration: none;
          display: flex; align-items: center; gap: 8px;
          transition: opacity 0.2s;
        }
        .apply-btn:hover { opacity: 0.88; }

        .apply-btn-disabled {
          background: #f1f5f9;
          color: #94a3b8;
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          border: 1px solid #e2e8f0;
          cursor: not-allowed;
        }

        .job-card-body {
          border-top: 1px solid #f1f5f9;
          padding: 28px 32px;
          background: #fafbff;
        }

        .job-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .job-detail-block.full-width { grid-column: 1 / -1; }

        .job-detail-block h4 {
          font-size: 13px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }

        .job-detail-block ul { list-style: none; padding: 0; margin: 0; }
        .job-detail-block ul li {
          font-size: 14px; color: #475569;
          margin-bottom: 8px;
          display: flex; align-items: flex-start; gap: 8px;
          line-height: 1.6;
        }
        .job-detail-block ul li i { color: #10b981; font-size: 12px; margin-top: 4px; flex-shrink: 0; }

        /* Internship Card */
        .intern-card {
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(37,99,235,0.2);
          margin-top: 16px;
        }

        .intern-card-header { padding: 32px; color: white; }

        .intern-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.2);
          color: white;
          font-size: 12px; font-weight: 700;
          padding: 4px 12px; border-radius: 20px;
          margin-bottom: 16px;
          text-transform: uppercase; letter-spacing: 0.05em;
        }

        .intern-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: white; }

        .intern-meta { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
        .intern-meta span { font-size: 13px; color: rgba(255,255,255,0.85); display: flex; align-items: center; gap: 6px; }

        .intern-description { color: rgba(255,255,255,0.85); line-height: 1.7; font-size: 15px; margin-bottom: 24px; }

        .intern-footer { display: flex; gap: 12px; flex-wrap: wrap; }

        .intern-toggle-btn {
          width: auto;
          background: rgba(255,255,255,0.15);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 10px 20px;
          font-size: 14px; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          transition: background 0.2s;
        }
        .intern-toggle-btn:hover { background: rgba(255,255,255,0.25); }

        .intern-apply-btn {
          background: white;
          color: #2563eb;
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 14px; font-weight: 700;
          text-decoration: none;
          display: flex; align-items: center; gap: 8px;
          transition: background 0.2s;
        }
        .intern-apply-btn:hover { background: #eff6ff; }

        .intern-apply-disabled {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.2);
          padding: 10px 22px;
          border-radius: 8px;
          font-size: 14px; font-weight: 600;
          display: flex; align-items: center; gap: 8px;
          cursor: not-allowed;
        }

        .intern-card-body {
          background: white;
          padding: 28px 32px;
        }

        .intern-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 24px;
        }

        .intern-detail-block h4 {
          font-size: 13px; font-weight: 700;
          color: #1e40af;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }

        .intern-detail-block ul { list-style: none; padding: 0; margin: 0; }
        .intern-detail-block ul li {
          font-size: 14px; color: #475569;
          margin-bottom: 8px;
          display: flex; align-items: flex-start; gap: 8px;
          line-height: 1.6;
        }
        .intern-detail-block ul li i { color: #10b981; font-size: 12px; margin-top: 4px; flex-shrink: 0; }

        .section-label {
          font-size: 13px; font-weight: 700;
          color: #2563eb; text-transform: uppercase;
          letter-spacing: 0.08em; margin-bottom: 8px;
          display: flex; align-items: center; gap: 8px;
        }
        .section-label::after {
          content: ''; flex: 1; height: 2px; background: #e2e8f0; border-radius: 2px;
        }

        @media (max-width: 768px) {
          .job-card-header, .job-card-body,
          .intern-card-header, .intern-card-body { padding: 20px; }
          .job-detail-grid, .intern-detail-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="container">
          <h1>Careers & Internships</h1>
          <p>Join Slirus Holdings and help build the future of Uganda's digital and industrial infrastructure.</p>
        </div>
      </div>

      <section className="section">
        <div className="container">

          {/* Job Tracks */}
          <p className="section-label"><i className="fas fa-briefcase"></i> Career Track</p>
          <h2 className="section-title">Track List</h2>

          {jobTracks.map((track) => (
            <JobCard
              key={track.key}
              track={track}
              isOpen={trackStatuses[track.key] === true}
              statusLoading={statusLoading}
            />
          ))}

          {/* Internship Tracks */}
          {internshipTracks.length > 0 && (
            <>
              <p className="section-label" style={{ marginTop: '60px' }}>
                <i className="fas fa-user-graduate"></i> Internship Program
              </p>
              <h2 className="section-title">Paid Internship</h2>

              {internshipTracks.map((track) => (
                <InternCard
                  key={track.key}
                  track={track}
                  isOpen={trackStatuses[track.key] === true}
                  statusLoading={statusLoading}
                />
              ))}
            </>
          )}

        </div>
      </section>
    </Layout>
  );
};

export default Career;