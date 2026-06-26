import React, { useState } from 'react';
import Layout from '../components/Layout';

const products = [
  {
    id: 'radi-expense',
    icon: 'fas fa-wallet',
    image: '/RadiExpense.png',
    name: 'RadiExpense',
    tag: 'Finance & Budgeting',
    tagColor: '#ea580c',
    tagBg: '#fff7ed',
    accentColor: '#ea580c',
    accentLight: '#fff7ed',
    ctaHref: 'https://radiexpense.slirus.com',
    headline: 'Take full control of every shilling your business spends.',
    description:
      'RadiExpense is an intelligent corporate expense management system built for Ugandan businesses. From field operations to head office approvals, it gives management complete real-time clarity over internal financial pipelines online or offline.',
    why: [
      { icon: 'fas fa-wifi-slash', title: 'Offline Capability', desc: 'Log business expenses in remote districts even without active cellular data. Syncs automatically when reconnected.' },
      { icon: 'fas fa-sitemap', title: 'Subsidiary Sync', desc: 'A unified dashboard matches transactions to specific holding divisions, giving group-level visibility at a glance.' },
      { icon: 'fas fa-shield-alt', title: 'Fraud Prevention', desc: "Digital receipt validation algorithms detect and block redundant or exaggerated field claims before they're approved." },
    ],
    benefits: [
      { icon: 'fas fa-chart-line', title: 'Real-time Field Audits', desc: 'Track field mobilization outlays as they happen, eliminating end-of-month reporting surprises.' },
      { icon: 'fas fa-code-branch', title: 'Dynamic Approval Workflows', desc: 'High-value budgets are automatically routed through the right management levels without manual chasing.' },
      { icon: 'fas fa-mobile-alt', title: 'Mobile Money Linkage', desc: 'Integrates with MTN and Airtel payment structures for rapid disbursements directly from the platform.' },
    ],
  },
  {
    id: 'radi-learn',
    icon: 'fas fa-graduation-cap',
    image: '/RadiLearn.png',
    name: 'RadiLearn',
    tag: 'Education & Training',
    tagColor: '#3b82f6',
    tagBg: '#eff6ff',
    accentColor: '#3b82f6',
    accentLight: '#eff6ff',
    ctaHref: 'https://radilearn.slirus.com',
    headline: 'A complete school management and e-learning system in one platform.',
    description:
      'RadiLearn is a progressive All-In-One School ERP designed for Ugandan academic institutions. It handles admissions, fees, results, timetables, and online learning all through a lightweight PWA that works on any device, on any network.',
    why: [
      { icon: 'fas fa-signal', title: 'Low Bandwidth Architecture', desc: "Delivers full class materials and school data with minimal data consumption built for Uganda's network realities." },
      { icon: 'fas fa-plug', title: 'Institutional Integrations', desc: 'Connects with existing regional educational registration systems and government data structures seamlessly.' },
      { icon: 'fas fa-download', title: 'Progressive PWA', desc: 'Installs directly onto mobile devices without needing app store downloads works on any Android or iOS device.' },
    ],
    benefits: [
      { icon: 'fas fa-sync', title: 'Offline Access', desc: 'Students and staff can access materials, results, and records even without an active internet connection.' },
      { icon: 'fas fa-robot', title: 'Automated Grading', desc: 'Tests are graded instantly, giving students immediate performance feedback and freeing up teacher time.' },
      { icon: 'fas fa-users', title: 'Scalable Classrooms', desc: 'Supports thousands of concurrent active students and staff without performance degradation.' },
    ],
  },
  {
    id: 'radi-link',
    icon: 'fas fa-network-wired',
    image: '/RadiLink.png',
    name: 'RadiLink',
    tag: 'Clubs & Associations',
    tagColor: '#0d9488',
    tagBg: '#f0fdfa',
    accentColor: '#0d9488',
    accentLight: '#f0fdfa',
    ctaHref: 'https://radilink.slirus.com',
    headline: 'The all-in-one platform for managing clubs, SACCOs, and associations.',
    description:
      'RadiLink is a secure membership management platform purpose-built for clubs, SACCOs, professional bodies, and associations in Uganda. It handles member records, contributions, communications, events, and governance all in one place.',
    why: [
      { icon: 'fas fa-lock', title: 'End-to-End Encryption', desc: 'All member data, financial records, and communications are secured with enterprise-grade encryption protocols.' },
      { icon: 'fas fa-layer-group', title: 'Cross-Platform Syncing', desc: 'Access the same up-to-date data across browsers, desktops, and mobile devices for every member and admin.' },
      { icon: 'fas fa-plug', title: 'API-First Construction', desc: 'Integrates smoothly with mobile money platforms, URA, and NSSF portals for seamless compliance reporting.' },
    ],
    benefits: [
      { icon: 'fas fa-bolt', title: 'Instant Member Sync', desc: 'Membership records, contributions, and event attendance update in real time across all connected devices.' },
      { icon: 'fas fa-piggy-bank', title: 'Reduced Admin Costs', desc: 'Replaces multiple disconnected tools spreadsheets, WhatsApp groups, manual ledgers with one platform.' },
      { icon: 'fas fa-bell', title: 'Smart Notifications', desc: 'Automated alerts for dues, meetings, events, and governance deadlines keep every member informed.' },
    ],
  },
];

const ProductCard = ({ product }) => {
  const [tab, setTab] = useState('why');

  return (
    <section id={product.id} className="product-block">
      <style>{`
        .product-block {
          padding: 90px 8%;
          border-bottom: 1px solid #e2e8f0;
        }
        .product-block:nth-child(even) { background: #f8fafc; }

        .product-top {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: start;
          margin-bottom: 48px;
        }

        .product-label {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 4px 12px; border-radius: 20px;
          margin-bottom: 16px;
        }

        .product-name {
          font-size: clamp(28px, 4vw, 42px);
          font-weight: 800; color: #0f172a;
          line-height: 1.15; margin-bottom: 14px;
        }

        .product-headline {
          font-size: 16px; font-weight: 600;
          color: #334155; margin-bottom: 14px;
          line-height: 1.5;
        }

        .product-desc {
          font-size: 15px; color: #64748b;
          line-height: 1.8; margin-bottom: 24px;
        }

        .product-cta {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 28px; border-radius: 10px;
          font-size: 14px; font-weight: 700;
          text-decoration: none; color: white;
          transition: opacity 0.2s, transform 0.2s;
        }
        .product-cta:hover { opacity: 0.9; transform: translateY(-2px); }

        .product-visual {
          border-radius: 20px;
          padding: 40px;
          display: flex; align-items: center; justify-content: center;
          min-height: 280px;
          position: relative; overflow: hidden;
        }

        .product-visual img {
          width: 100%; height: 100%;
          object-fit: contain;
          border-radius: 12px;
          position: relative; z-index: 1;
          max-height: 280px;
        }

        /* Tabs */
        .product-tabs {
          display: flex; gap: 8px;
          margin-bottom: 28px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0;
        }

        .product-tab {
          padding: 10px 22px;
          font-size: 14px; font-weight: 600;
          border: none; background: transparent;
          cursor: pointer; color: #64748b;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.2s, border-color 0.2s;
          width: auto;
        }

        .tab-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .tab-item {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px; padding: 22px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .product-block:nth-child(even) .tab-item { background: white; }

        .tab-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }

        .tab-item-icon {
          width: 42px; height: 42px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }

        .tab-item-icon i { font-size: 17px; }

        .tab-item h4 {
          font-size: 14px; font-weight: 700;
          color: #0f172a; margin-bottom: 6px;
        }

        .tab-item p {
          font-size: 13px; color: #64748b; line-height: 1.65;
        }

        @media (max-width: 900px) {
          .product-top { grid-template-columns: 1fr; gap: 32px; }
          .tab-grid { grid-template-columns: 1fr 1fr; }
          .product-block { padding: 60px 5%; }
        }

        @media (max-width: 540px) {
          .tab-grid { grid-template-columns: 1fr; }
          .product-tabs { overflow-x: auto; }
        }
      `}</style>

      {/* Top: info + visual */}
      <div className="product-top">
        <div>
          <div
            className="product-label"
            style={{ background: product.tagBg, color: product.tagColor }}
          >
            <i className={product.icon}></i> {product.tag}
          </div>
          <h2 className="product-name">{product.name}</h2>
          <p className="product-headline">{product.headline}</p>
          <p className="product-desc">{product.description}</p>
          <a
            href={product.ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="product-cta"
            style={{ background: product.accentColor }}
          >
            Get Started <i className="fas fa-arrow-right"></i>
          </a>
        </div>

        <div
          className="product-visual"
          style={{ background: product.tagBg, border: `1.5px solid ${product.tagColor}22` }}
        >
          <img src={product.image} alt={product.name} />
        </div>
      </div>

      {/* Tabs: Why / Benefits */}
      <div className="product-tabs">
        <button
          className="product-tab"
          style={{
            borderBottomColor: tab === 'why' ? product.accentColor : 'transparent',
            color: tab === 'why' ? product.accentColor : '#64748b',
          }}
          onClick={() => setTab('why')}
        >
          <i className="fas fa-question-circle"></i>&nbsp; Why {product.name}?
        </button>
        <button
          className="product-tab"
          style={{
            borderBottomColor: tab === 'benefits' ? product.accentColor : 'transparent',
            color: tab === 'benefits' ? product.accentColor : '#64748b',
          }}
          onClick={() => setTab('benefits')}
        >
          <i className="fas fa-star"></i>&nbsp; Key Benefits
        </button>
      </div>

      <div className="tab-grid">
        {(tab === 'why' ? product.why : product.benefits).map((item, i) => (
          <div
            className="tab-item"
            key={i}
            style={{ borderTop: `3px solid ${product.accentColor}` }}
          >
            <div className="tab-item-icon" style={{ background: product.tagBg }}>
              <i className={item.icon} style={{ color: product.accentColor }}></i>
            </div>
            <h4>{item.title}</h4>
            <p>{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const Products = () => {
  return (
    <Layout>
      <style>{`
        .products-hero {
          background: linear-gradient(135deg, #020617 0%, #1e3a8a 60%, #2563eb 100%);
          padding: 100px 8% 80px;
          color: white;
          position: relative; overflow: hidden;
        }

        .products-hero::after {
          content: '';
          position: absolute; top: -80px; right: -80px;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .products-hero-inner { max-width: 680px; position: relative; z-index: 1; }

        .products-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #93c5fd;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 5px 14px; border-radius: 20px;
          margin-bottom: 24px;
        }

        .products-hero h1 {
          font-size: clamp(34px, 5vw, 54px);
          font-weight: 800; line-height: 1.15;
          color: white; margin-bottom: 18px;
        }

        .products-hero h1 span {
          background: linear-gradient(90deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .products-hero p {
          font-size: 17px; color: #cbd5e1;
          line-height: 1.75; max-width: 540px;
        }

        /* ── Nav Pills ── */
        .product-nav {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 8%;
          display: flex; gap: 4px;
          position: sticky; top: 75px; z-index: 100;
        }

        .product-nav-link {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 16px 20px;
          font-size: 14px; font-weight: 600;
          color: #64748b; text-decoration: none;
          border-bottom: 2px solid transparent;
          transition: color 0.2s, border-color 0.2s;
          white-space: nowrap;
        }

        /* ── CTA ── */
        .products-cta {
          background: linear-gradient(135deg, #020617, #1e3a8a);
          padding: 80px 8%; text-align: center; color: white;
        }

        .products-cta h2 {
          font-size: clamp(24px, 3vw, 36px);
          font-weight: 800; margin-bottom: 14px;
        }

        .products-cta p {
          font-size: 16px; color: #94a3b8;
          max-width: 460px; margin: 0 auto 32px; line-height: 1.7;
        }

        .products-cta a {
          display: inline-flex; align-items: center; gap: 8px;
          background: white; color: #1e40af;
          padding: 14px 30px; border-radius: 10px;
          font-size: 15px; font-weight: 700;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .products-cta a:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.25); }

        @media (max-width: 768px) {
          .products-hero { padding: 70px 5% 60px; }
          .product-nav { padding: 0 5%; overflow-x: auto; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div className="products-hero">
        <div className="products-hero-inner">
          <div className="products-eyebrow">
            <i className="fas fa-box-open"></i> Software Products
          </div>
          <h1>Tools built for <span>Uganda's reality</span></h1>
          <p>
            Three purpose-built software products designed to solve real operational challenges for businesses, schools, and organizations across East Africa.
          </p>
        </div>
      </div>

      {/* ── Sticky Product Nav ── */}
      <nav className="product-nav">
        {products.map((p) => (
          <a
            key={p.id}
            href={`#${p.id}`}
            className="product-nav-link"
            style={{ '--hover-color': p.accentColor }}
            onMouseEnter={e => {
              e.currentTarget.style.color = p.accentColor;
              e.currentTarget.style.borderBottomColor = p.accentColor;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderBottomColor = 'transparent';
            }}
          >
            <i className={p.icon} style={{ color: p.accentColor }}></i> {p.name}
          </a>
        ))}
      </nav>

      {/* ── Product Sections ── */}
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}

      {/* ── CTA ── */}
      <div className="products-cta">
        <h2>Interested in any of our products?</h2>
        <p>Reach out and we'll walk you through a demo tailored to your organization's needs.</p>
        <a href="mailto:sales@slirus.com">
          Request a Demo <i className="fas fa-arrow-right"></i>
        </a>
      </div>

    </Layout>
  );
};

export default Products;