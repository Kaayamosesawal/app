/**
 * Portals.jsx – Slirus Global Limited Staff Portals
 *
 * A card menu of every internal staff portal. These links used to live in
 * the footer ("Staff Portals" column); they now live here, and the footer
 * links to this page at /portals.
 *
 * Route: <Route path="/portals" element={<Portals />} />
 * Dependencies: react-router-dom, Layout, Font Awesome (fas icons, as in Services.jsx)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const portals = [
  {
    to: '/admin',
    icon: 'fas fa-user-shield',
    title: 'Admin',
    desc: 'Review applications, project proposals, and contracts.',
    color: '#1A3C5E',
    lightColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  {
    to: '/ceo-manager',
    icon: 'fas fa-user-tie',
    title: 'Manager',
    desc: 'Company dashboard, staff accounts, and agreements.',
    color: '#7c3aed',
    lightColor: '#f5f3ff',
    borderColor: '#c4b5fd',
  },
  {
    to: '/accounts-manager',
    icon: 'fas fa-calculator',
    title: 'Accounts',
    desc: 'Finance and accounting records.',
    color: '#16a34a',
    lightColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  {
    to: '/hr-manager',
    icon: 'fas fa-users',
    title: 'Human Resource',
    desc: 'Recruitment, staff, and HR management.',
    color: '#db2777',
    lightColor: '#fdf2f8',
    borderColor: '#f9a8d4',
  },
  {
    to: '/sales-manager',
    icon: 'fas fa-chart-line',
    title: 'Sales',
    desc: 'Sales tracking and client activity.',
    color: '#ea580c',
    lightColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  {
    to: '/secretary-manager',
    icon: 'fas fa-folder-open',
    title: 'Secretary',
    desc: 'Office administration and company records.',
    color: '#0891b2',
    lightColor: '#ecfeff',
    borderColor: '#67e8f9',
  },
  {
    to: '/worker-log',
    icon: 'fas fa-clipboard-list',
    title: "Worker's Log",
    desc: 'Daily work logs and activity records.',
    color: '#C9A84C',
    lightColor: '#fffbeb',
    borderColor: '#fde68a',
  },
];

const Portals = () => {
  return (
    <Layout>
      <style>{`
        .portals-hero {
          background: linear-gradient(135deg, #0D1B2A 0%, #1A3C5E 100%);
          color: white;
          padding: 80px 8% 70px;
          text-align: center;
        }
        .portals-hero-label {
          display: inline-block;
          font-size: 12px; font-weight: 700;
          letter-spacing: 1.6px; text-transform: uppercase;
          color: #E8C96A;
          margin: 0 0 14px;
        }
        .portals-hero h1 {
          font-size: clamp(30px, 5vw, 44px);
          font-weight: 800;
          margin: 0 0 14px;
        }
        .portals-hero p {
          font-size: 16px; line-height: 1.7;
          color: #B7C7D8;
          max-width: 560px;
          margin: 0 auto;
        }

        .portals-section {
          padding: 70px 8% 90px;
          background: #f8fafc;
        }
        .portals-grid {
          max-width: 1140px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 22px;
        }
        .portal-card {
          display: flex; flex-direction: column;
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 28px 24px;
          text-decoration: none;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .portal-card:hover,
        .portal-card:focus-visible {
          transform: translateY(-4px);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
          outline: none;
        }
        .portal-icon {
          width: 56px; height: 56px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          margin-bottom: 18px;
        }
        .portal-title {
          font-size: 18px; font-weight: 700;
          color: #0F172A;
          margin: 0 0 8px;
        }
        .portal-desc {
          font-size: 14px; line-height: 1.65;
          color: #64748B;
          margin: 0 0 20px;
          flex: 1;
        }
        .portal-open {
          font-size: 13px; font-weight: 700;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .portal-open i { transition: transform 0.2s; }
        .portal-card:hover .portal-open i { transform: translateX(4px); }

        .portals-note {
          max-width: 1140px;
          margin: 36px auto 0;
          text-align: center;
          font-size: 13px;
          color: #94A3B8;
        }

        @media (max-width: 768px) {
          .portals-hero { padding: 60px 5% 50px; }
          .portals-section { padding: 50px 5% 70px; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="portals-hero">
        <p className="portals-hero-label">Slirus Global Limited</p>
        <h1>Staff Portals</h1>
        <p>Select your department below to sign in to your portal.</p>
      </section>

      {/* ── PORTAL CARDS ── */}
      <section className="portals-section">
        <div className="portals-grid">
          {portals.map((portal) => (
            <Link
              key={portal.to}
              to={portal.to}
              className="portal-card"
              style={{ borderTop: `4px solid ${portal.color}` }}
            >
              <div
                className="portal-icon"
                style={{ background: portal.lightColor, border: `1px solid ${portal.borderColor}` }}
              >
                <i className={portal.icon} style={{ color: portal.color }}></i>
              </div>
              <h3 className="portal-title">{portal.title}</h3>
              <p className="portal-desc">{portal.desc}</p>
              <span className="portal-open" style={{ color: portal.color }}>
                Open Portal <i className="fas fa-arrow-right"></i>
              </span>
            </Link>
          ))}
        </div>

        <p className="portals-note">For authorized Slirus staff only.</p>
      </section>
    </Layout>
  );
};

export default Portals;