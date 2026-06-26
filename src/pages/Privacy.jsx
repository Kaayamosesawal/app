import React, { useState } from 'react';
import Layout from '../components/Layout';

const products = [
  {
    id: 'slirupay',
    icon: 'fas fa-mobile-alt',
    name: 'SlirusPay',
    tagline: 'Mobile Money & Agent Banking Platform',
    color: '#2563eb',
    light: '#eff6ff',
    sections: [
      {
        heading: 'What SlirusPay Collects',
        body: `When you register on SlirusPay or use an agent outlet, we collect your full name, national ID number (Nin), date of birth, phone number, and a live selfie photograph for identity verification. Every transaction you initiate, including the amount, timestamp, recipient, sending and receiving float balances, and device location at the time of transfer, is recorded to maintain a legally compliant audit trail.`,
      },
      {
        heading: 'How We Use Your SlirusPay Data',
        body: `Your identity data is used to comply with Bank of Uganda Know-Your-Customer (KYC) and Anti-Money Laundering (AML) directives. Transaction records are used to generate your e-statement, settle disputes, and detect unusual activity such as rapid high-value transfers or SIM-swap fraud patterns. We do not use your SlirusPay data to serve you advertisements. Agent outlet data (float levels, daily throughput) is shared internally with Slirus Financial Services Limited to manage liquidity.`,
      },
      {
        heading: 'Retention of SlirusPay Records',
        body: `Under the Financial Institutions Act and Bank of Uganda guidelines, all transaction records, KYC documents, and agent agreements are retained for a minimum of seven (7) years. Records tied to an active regulatory investigation are held until that investigation is formally closed, regardless of the standard retention window.`,
      },
    ],
  },
  {
    id: 'slirusmanage',
    icon: 'fas fa-layer-group',
    name: 'SlirusManage',
    tagline: 'Enterprise Resource Planning & Business Management',
    color: '#7c3aed',
    light: '#f5f3ff',
    sections: [
      {
        heading: 'What SlirusManage Collects',
        body: `SlirusManage collects data you or your organisation enters into the platform: employee records (names, roles, salary grades, National Social Security Fund numbers), customer invoices and payment status, supplier purchase orders, and inventory stock levels. System usage data, which modules you open, how long you spend on each screen, and any errors encountered, is collected automatically to help us improve the product.`,
      },
      {
        heading: 'Data Ownership & Client Control',
        body: `You own the business data you input into SlirusManage. We act as a data processor on your behalf, not as a data controller for that content. You may export a full copy of your data at any time from the Settings › Data Export panel, and you may request permanent deletion of your account and all associated records by contacting support@slirus.com. Deletion requests are processed within 14 business days.`,
      },
      {
        heading: 'Integrations & Third-Party Connectors',
        body: `If you connect SlirusManage to a third-party service, such as a bank feed, Uganda Revenue Authority (URA) eTax gateway, or SMS gateway for invoice delivery, you authorise Slirus Technologies to transmit the minimum data required to complete that integration. Each connector is documented in your account under Settings › Integrations with a plain-language summary of what data crosses the boundary.`,
      },
    ],
  },
  {
    id: 'slirusfashion',
    icon: 'fas fa-tshirt',
    name: 'SlirusFashion',
    tagline: 'Fashion Retail & Inventory Management',
    color: '#db2777',
    light: '#fdf2f8',
    sections: [
      {
        heading: 'What SlirusFashion Collects',
        body: `When you place an order through SlirusFashion, whether for school uniforms, corporate wear, or retail clothing, we collect your full name, delivery address, phone number, and measurements or size preferences you provide. If you pay online, card processing is handled entirely by our licensed payment gateway partner; Slirus does not store raw card numbers on our servers.`,
      },
      {
        heading: 'How We Use Your SlirusFashion Data',
        body: `Your address and contact details are shared with our production and delivery teams to fulfil your order. Size and style preference data is used to pre-populate future orders and provide accurate fit recommendations. We may send you order status updates via SMS or WhatsApp. We will only send promotional messages if you explicitly opt in, and you can unsubscribe from any message by replying STOP.`,
      },
      {
        heading: 'Bulk & Corporate Order Data',
        body: `For institutional clients (schools, hospitals, government entities), we receive staff lists, employee numbers, and department groupings to manage bulk uniform orders. This data is used exclusively for order fulfilment. Lists are deleted from our production systems within 30 days of final delivery confirmation, though an anonymised order summary is retained for billing records.`,
      },
    ],
  },
];

const rights = [
  { icon: 'fas fa-eye', title: 'Right to Access', desc: 'You may request a copy of all personal data Slirus holds about you across any of our products. We will respond within 21 days.' },
  { icon: 'fas fa-pen', title: 'Right to Correct', desc: 'If your name, contact, or identity details are wrong, contact us and we will correct them within 7 business days.' },
  { icon: 'fas fa-trash-alt', title: 'Right to Erasure', desc: 'You may request deletion of your data. We will comply unless a legal obligation (e.g. BOU 7-year rule) requires us to retain it.' },
  { icon: 'fas fa-ban', title: 'Right to Object', desc: 'You may object to processing based on legitimate interests. We will stop unless we can show overriding grounds.' },
  { icon: 'fas fa-download', title: 'Right to Portability', desc: 'Where technically feasible, you may request your data in a machine-readable format (CSV / JSON) for transfer elsewhere.' },
  { icon: 'fas fa-hand-paper', title: 'Right to Withdraw Consent', desc: 'Where we rely on consent, you may withdraw it at any time. Withdrawal does not affect processing already carried out.' },
];

const PrivacyPolicy = () => {
  const [activeProduct, setActiveProduct] = useState('slirupay');
  const active = products.find(p => p.id === activeProduct);

  return (
    <Layout>
      {/* Global Typography Integration */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        /* ── Reset & Base ── */
        *, *::before, *::after { box-sizing: border-box; }

        .pp-container-wrapper {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background-color: #f8fafc;
          width: 100%;
          overflow-x: hidden;
        }

        /* ── Modern Glassmorphism Hero ── */
        .pp-hero {
          background: linear-gradient(-45deg, #020617, #0f172a, #1e3a8a, #1d4ed8);
          background-size: 400% 400%;
          animation: pp-gradient-animation 15s ease infinite;
          padding: 140px 8% 120px;
          color: white;
          position: relative;
          overflow: hidden;
        }
        @keyframes pp-gradient-animation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .pp-hero::after {
          content: '';
          position: absolute; top: -120px; right: -120px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(96,165,250,0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .pp-hero-inner { max-width: 800px; position: relative; z-index: 1; }
        
        .pp-hero-glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .pp-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: #93c5fd;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 6px 16px; border-radius: 20px;
          margin-bottom: 24px;
        }
        .pp-hero h1 {
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 800; line-height: 1.15;
          color: white; margin-bottom: 20px;
          letter-spacing: -0.02em;
        }
        .pp-hero h1 span {
          background: linear-gradient(90deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .pp-hero p { font-size: 17px; color: #cbd5e1; line-height: 1.8; max-width: 640px; margin-bottom: 0; }
        
        .pp-meta {
          display: flex; gap: 28px; flex-wrap: wrap;
          margin-top: 40px;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 24px;
        }
        .pp-meta-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #94a3b8;
        }
        .pp-meta-item i { color: #60a5fa; font-size: 14px; }

        /* ── Layout Max-Width Adjustment ── */
        .pp-body {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 0;
          max-width: 1400px;
          margin: 0 auto;
          padding: 60px 8% 100px;
        }

        /* ── Floating Navigation Card ── */
        .pp-nav {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 10px 30px rgba(15,23,42,0.08);
          position: sticky;
          top: 40px;
          align-self: start;
          height: fit-content;
          max-height: calc(100vh - 80px);
          overflow-y: auto;
        }
        .pp-nav-label {
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: #94a3b8; margin-bottom: 14px;
        }
        .pp-nav-list { list-style: none; padding: 0; margin: 0; }
        .pp-nav-list li { margin-bottom: 2px; }
        .pp-nav-list a {
          display: block;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13.5px; font-weight: 500;
          color: #475569;
          text-decoration: none;
          transition: background 0.2s, color 0.2s;
          border-left: 2px solid transparent;
        }
        .pp-nav-list a:hover {
          background: #eff6ff;
          color: #2563eb;
          border-left-color: #2563eb;
        }
        .pp-nav-divider {
          height: 1px; background: #e2e8f0;
          margin: 16px 0;
        }

        /* ── Content Width & Breathing Room ── */
        .pp-content { 
          padding: 20px 0 0 60px; 
          border-left: 1px solid #e2e8f0; 
          min-width: 0; /* Prevents flex/grid children elements from expanding beyond parent bounds */
        }

        /* ── Sections ── */
        .pp-section { margin-bottom: 60px; scroll-margin-top: 40px; }
        .pp-section-eyebrow {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: #2563eb; margin-bottom: 8px;
        }
        .pp-section h2 {
          font-size: clamp(30px, 4vw, 40px);
          letter-spacing: -0.03em;
          margin-bottom: 12px;
          font-weight: 800; color: #0f172a;
          line-height: 1.2;
        }
        .pp-section-subtitle {
          font-size: 15px; color: #64748b;
          margin-bottom: 32px; line-height: 1.6;
        }
        .pp-section p {
          font-size: 15px; color: #475569;
          line-height: 1.85; margin-bottom: 16px;
        }

        /* ── Softer Legal Content Cards ── */
        .pp-legal-card {
          background: white;
          border: 1px solid rgba(226,232,240,0.8);
          box-shadow: 0 4px 20px rgba(15,23,42,0.04);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }
        .pp-legal-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(37,99,235,0.08);
        }
        .pp-legal-card h3 {
          font-size: 18px; font-weight: 700; color: #0f172a;
          margin: 0 0 16px 0; display: flex; align-items: center; gap: 12px;
        }
        .pp-legal-card h3 i { color: #2563eb; font-size: 18px; }
        
        /* Card Semantics */
        .pp-legal-card.accent { background: #f8fafc; border-color: #e2e8f0; }
        .pp-legal-card.highlight { background: #eff6ff; border-color: #bfdbfe; }
        .pp-legal-card.warning { background: #fffbeb; border-color: #fde68a; }

        /* ── Collect & Info Grid (2 Columns) ── */
        .pp-collect-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 24px;
          margin-bottom: 24px;
        }
        .pp-collect-item {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(15,23,42,0.02);
        }
        .pp-collect-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(15,23,42,0.06);
        }
        .pp-collect-item-head {
          display: flex; align-items: center; gap: 14px; margin-bottom: 14px;
        }
        .pp-collect-icon {
          width: 42px; height: 42px;
          background: #eff6ff; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .pp-collect-icon i { color: #2563eb; font-size: 16px; }
        .pp-collect-item h4 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
        .pp-collect-item p { font-size: 14px; color: #64748b; line-height: 1.7; margin: 0; }

        /* ── Product Tabs Interface ── */
        .pp-product-tabs {
          display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 32px;
        }
        .pp-tab-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 24px; border-radius: 12px;
          border: 1.5px solid #e2e8f0; background: white;
          font-size: 14px; font-weight: 600; color: #64748b;
          cursor: pointer; transition: all 0.25s ease;
        }
        .pp-tab-btn:hover { border-color: #2563eb; color: #2563eb; transform: translateY(-1px); }
        .pp-tab-btn.active {
          border-color: var(--tab-color);
          background: var(--tab-light);
          color: var(--tab-color);
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
        }

        .pp-product-panel { display: none; }
        .pp-product-panel.active { display: block; }

        .pp-product-header {
          display: flex; align-items: center; gap: 18px;
          margin-bottom: 24px; padding: 24px; border-radius: 16px;
          background: var(--prod-light); border: 1px solid var(--prod-border);
        }
        .pp-product-header-icon {
          width: 54px; height: 54px; border-radius: 14px; background: white;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .pp-product-header-icon i { font-size: 24px; color: var(--prod-color); }
        .pp-product-header h3 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
        .pp-product-header span { font-size: 14px; color: #64748b; }

        .pp-product-sub {
          margin-bottom: 20px; background: white;
          border: 1px solid rgba(226,232,240,0.8); border-radius: 16px;
          padding: 28px; transition: all 0.3s ease;
        }
        .pp-product-sub:hover { box-shadow: 0 12px 30px rgba(0,0,0,0.04); }
        .pp-product-sub h4 {
          font-size: 16px; font-weight: 700; color: #0f172a;
          margin: 0 0 12px 0; display: flex; align-items: center; gap: 10px;
        }
        .pp-product-sub h4::before {
          content: ''; display: inline-block; width: 4px; height: 18px;
          background: var(--prod-color); border-radius: 2px; flex-shrink: 0;
        }
        .pp-product-sub p { font-size: 14.5px; color: #475569; line-height: 1.8; margin: 0; }

        /* ── Rights Dynamic Grid ── */
        .pp-rights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px; margin-top: 28px;
        }
        .pp-right-card {
          background: white; border: 1px solid #e2e8f0;
          border-radius: 16px; padding: 28px; transition: all 0.3s ease;
        }
        .pp-right-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 35px rgba(37,99,235,0.08);
          border-color: #bfdbfe;
        }
        .pp-right-icon {
          width: 46px; height: 46px; background: #eff6ff; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
        }
        .pp-right-icon i { color: #2563eb; font-size: 18px; }
        .pp-right-card h4 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
        .pp-right-card p { font-size: 14px; color: #64748b; line-height: 1.7; margin: 0; }

        /* ── Premium Contact Layout ── */
        .pp-contact-card {
          background: linear-gradient(135deg, #020617, #1e3a8a);
          border-radius: 24px; padding: 44px; color: white;
          margin-top: 8px; box-shadow: 0 30px 60px rgba(2,6,23,0.15);
          position: relative; overflow: hidden;
        }
        .pp-contact-card::before {
          content: ''; position: absolute; width: 300px; height: 300px;
          right: -100px; top: -100px; background: radial-gradient(rgba(96,165,250,0.15), transparent);
          pointer-events: none;
        }
        .pp-contact-card h3 { font-size: 24px; font-weight: 800; margin-bottom: 12px; color: white; }
        .pp-contact-card p { font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 32px; }
        
        .pp-contact-grid-inner {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px; z-index: 1; position: relative;
        }
        .pp-contact-item-box {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 18px; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
          transition: background 0.2s;
        }
        .pp-contact-item-box:hover { background: rgba(255,255,255,0.08); }
        .pp-contact-item-box i { color: #60a5fa; font-size: 16px; margin-top: 3px; flex-shrink: 0; }
        .pp-contact-item-box strong { display: block; font-size: 11px; font-weight: 700; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
        .pp-contact-item-box span { font-size: 14px; color: #cbd5e1; word-break: break-word; }

        /* ── Decorative Dividers ── */
        .pp-divider {
          height: 1px; background: linear-gradient(to right, transparent, #e2e8f0, transparent);
          margin: 60px 0;
        }

        /* ── Responsive Architecture ── */
        @media (max-width: 1024px) {
          .pp-body { grid-template-columns: 1fr; padding: 40px 5% 80px; }
          .pp-nav { display: none; }
          .pp-content { padding: 20px 0 0; border-left: none; }
        }
        
        @media (max-width: 600px) {
          .pp-hero { padding: 90px 5% 80px; }
          .pp-hero-glass-card { padding: 24px; }
          
          /* Force standard stacked rows on narrower phone viewports to stop content overlaps */
          .pp-collect-grid, 
          .pp-rights-grid,
          .pp-contact-grid-inner {
            grid-template-columns: 1fr !important;
            gap: 16px;
          }
          
          .pp-legal-card {
            padding: 24px;
          }
          .pp-contact-card {
            padding: 30px 20px;
          }
          
          .pp-product-tabs { flex-direction: column; }
          .pp-tab-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="pp-container-wrapper">
        {/* ── Hero Section ── */}
        <div className="pp-hero">
          <div className="pp-hero-inner">
            <div className="pp-hero-glass-card">
              <div className="pp-eyebrow">
                <i className="fas fa-shield-alt"></i> Privacy &amp; Data Protection
              </div>
              <h1>Your data.<br /><span>Our responsibility.</span></h1>
              <p>
                This policy explains exactly what personal information Slirus Holdings and its subsidiaries collect across every product and service, why we collect it, how we protect it, and what rights you hold under Ugandan law.
              </p>
            </div>

            <div className="pp-meta">
              <div className="pp-meta-item">
                <i className="fas fa-calendar-alt"></i>
                Last updated: 25 June 2026
              </div>
              <div className="pp-meta-item">
                <i className="fas fa-gavel"></i>
                Governed by Uganda Data Protection &amp; Privacy Act, 2019
              </div>
              <div className="pp-meta-item">
                <i className="fas fa-building"></i>
                Applies to Slirus Holdings Limited &amp; all subsidiaries
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Layout Body ── */}
        <div className="pp-body">

          {/* ── Sticky Sidebar Nav Card ── */}
          <nav className="pp-nav">
            <p className="pp-nav-label">On this page</p>
            <ul className="pp-nav-list">
              <li><a href="#who-we-are">Who We Are</a></li>
              <li><a href="#what-we-collect">What We Collect</a></li>
              <li><a href="#how-we-use">How We Use It</a></li>
              <li><a href="#legal-basis">Legal Basis</a></li>
              <li><a href="#sharing">Sharing &amp; Disclosure</a></li>
            </ul>
            <div className="pp-nav-divider"></div>
            <ul className="pp-nav-list">
              <li><a href="#products">Our Products</a></li>
              <li><a href="#slirupay">SlirusPay</a></li>
              <li><a href="#slirusmanage">SlirusManage</a></li>
              <li><a href="#slirusfashion">SlirusFashion</a></li>
            </ul>
            <div className="pp-nav-divider"></div>
            <ul className="pp-nav-list">
              <li><a href="#security">Security</a></li>
              <li><a href="#retention">Retention</a></li>
              <li><a href="#your-rights">Your Rights</a></li>
              <li><a href="#cookies">Cookies</a></li>
              <li><a href="#contact">Contact Us</a></li>
            </ul>
          </nav>

          {/* ── Main Content Column ── */}
          <div className="pp-content">

            {/* ── 1. Who We Are ── */}
            <section className="pp-section" id="who-we-are">
              <p className="pp-section-eyebrow">1. Identity</p>
              <h2>Who We Are</h2>
              <p className="pp-section-subtitle">The Data Controller responsible for your personal information.</p>
              
              <div className="pp-legal-card">
                <p>
                  <strong>Slirus Holdings Limited</strong> is a multi-sector technology company incorporated in Uganda and operating from Lira. We are the data controller for all personal information collected through our corporate website (<strong>slirusholding.com</strong>) and across our three product subsidiaries: Slirus Technologies Limited, Slirus Financial Services Limited, and Slirus Fashion Limited.
                </p>
                <p style={{ marginBottom: 0 }}>
                  Each subsidiary operates its own product but shares a unified data governance framework set by Slirus Holdings. When you use SlirusPay, SlirusManage, or SlirusFashion, Slirus Holdings Limited remains the ultimate responsible entity for how your data is handled.
                </p>
              </div>

              <div className="pp-legal-card highlight">
                <h3><i className="fas fa-map-marker-alt"></i> Registered Address</h3>
                <p style={{ margin: 0 }}>Slirus Holdings Limited · Lira, Uganda · <strong>sales@slirus.com</strong> · <strong>info@slirus.com</strong></p>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 2. What We Collect ── */}
            <section className="pp-section" id="what-we-collect">
              <p className="pp-section-eyebrow">2. Data Collected</p>
              <h2>What We Collect</h2>
              <p className="pp-section-subtitle">We only collect information that is necessary for a specific, documented purpose.</p>

              <div className="pp-collect-grid">
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-user"></i></div>
                    <h4>Identity Data</h4>
                  </div>
                  <p>Full name, national ID number, date of birth, passport copy (for high-value SlirusPay accounts), and a photograph or selfie for KYC verification.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-phone"></i></div>
                    <h4>Contact Data</h4>
                  </div>
                  <p>Phone number, email address, physical or delivery address. Business clients additionally provide a company name, TIN, and URSB registration number.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-exchange-alt"></i></div>
                    <h4>Financial &amp; Transaction Data</h4>
                  </div>
                  <p>Mobile money wallet details, agent float balances, transaction amounts, timestamps, and reference numbers generated on SlirusPay.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-laptop"></i></div>
                    <h4>Technical &amp; Device Data</h4>
                  </div>
                  <p>IP address, device type, operating system, browser version, and session logs collected automatically when you access any Slirus platform.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-shopping-bag"></i></div>
                    <h4>Order &amp; Preference Data</h4>
                  </div>
                  <p>Clothing sizes, style preferences, order history, and delivery instructions collected on SlirusFashion to fulfil and personalise your orders.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-comment-alt"></i></div>
                    <h4>Communications Data</h4>
                  </div>
                  <p>Support tickets, live chat transcripts, feedback forms, and any documents you upload when engaging with our customer service teams.</p>
                </div>
              </div>

              <div className="pp-legal-card warning">
                <h3><i className="fas fa-exclamation-triangle" style={{color:'#d97706'}}></i> Special Category Data</h3>
                <p style={{ margin: 0 }}>We do not intentionally collect sensitive categories of data such as health records, religious beliefs, or political opinions. If you believe you have submitted such data, contact <strong>info@slirus.com</strong> immediately for removal.</p>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 3. How We Use It ── */}
            <section className="pp-section" id="how-we-use">
              <p className="pp-section-eyebrow">3. Use of Data</p>
              <h2>How We Use Your Information</h2>
              <p className="pp-section-subtitle">Every use of your data maps to a specific, documented purpose. We do not use data for purposes incompatible with why it was collected.</p>

              <div className="pp-legal-card">
                <h3><i className="fas fa-cog"></i> Purpose Configurations</h3>
                <p><strong>Service delivery:</strong> Processing transactions on SlirusPay, generating business reports in SlirusManage, and fulfilling garment orders through SlirusFashion. This is the primary reason data exists on our systems.</p>
                <p><strong>Identity &amp; fraud prevention:</strong> Verifying who you are before granting access to financial services and flagging unusual account behaviour such as logins from new devices or rapid high-value transfers.</p>
                <p><strong>Legal &amp; regulatory compliance:</strong> Meeting Bank of Uganda KYC and AML requirements, Uganda Revenue Authority tax reporting, and audit obligations under the Accountants Act.</p>
                <p><strong>Customer support:</strong> Investigating disputes, correcting transaction errors, and responding to support requests using your account and transaction history.</p>
                <p style={{ marginBottom: 0 }}><strong>Product improvement:</strong> Analysing aggregated, anonymised usage patterns to fix bugs and improve features. Individual-level data is not used for product analytics without your consent.</p>
              </div>

              <div className="pp-legal-card accent">
                <h3><i className="fas fa-ban"></i> What We Do Not Do</h3>
                <p style={{ margin: 0 }}>We do not sell your personal data to any third party. We do not use your data to serve targeted advertisements. We do not profile you for credit scoring outside SlirusPay's own loan-eligibility checks, which are always disclosed to you before they run.</p>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 4. Legal Basis ── */}
            <section className="pp-section" id="legal-basis">
              <p className="pp-section-eyebrow">4. Legal Basis</p>
              <h2>Our Legal Basis for Processing</h2>
              <p className="pp-section-subtitle">Under the Data Protection and Privacy Act, 2019 of Uganda, every processing activity must rest on a lawful basis. Here is ours.</p>

              <div className="pp-collect-grid">
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-file-contract"></i></div>
                    <h4>Contract Performance</h4>
                  </div>
                  <p>The majority of our processing, running your SlirusPay transactions, generating SlirusManage invoices, delivering your SlirusFashion order, is necessary to perform the contract we have with you.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-gavel"></i></div>
                    <h4>Legal Obligation</h4>
                  </div>
                  <p>KYC checks, AML transaction monitoring, URA tax filings, and retention of financial records for seven years are all required by Ugandan statute.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-check-circle"></i></div>
                    <h4>Consent</h4>
                  </div>
                  <p>For optional activities, marketing emails, promotional SMS, optional product surveys, we ask for your explicit consent first, making withdrawal just as simple.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-balance-scale"></i></div>
                    <h4>Legitimate Interests</h4>
                  </div>
                  <p>Fraud detection, security monitoring, and internal analytics are carried out under legitimate interests after verifying they do not override your rights.</p>
                </div>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 5. Sharing ── */}
            <section className="pp-section" id="sharing">
              <p className="pp-section-eyebrow">5. Sharing</p>
              <h2>Sharing &amp; Disclosure</h2>
              <p className="pp-section-subtitle">We share the minimum necessary data with a limited set of recipients, all of whom are bound by confidentiality and data processing agreements.</p>

              <div className="pp-legal-card">
                <p><strong>Within the Slirus Group:</strong> Slirus Technologies, Slirus Financial Services, and Slirus Fashion operate under a shared internal data-access policy. Staff only access data relevant to their role and are bound by confidentiality agreements.</p>
                <p><strong>Technology partners:</strong> Our cloud hosting provider, SMS gateway operator, and payment processor (for SlirusPay card transactions) receive the minimum data required to perform their function. All are under a formal Data Processing Agreement that prohibits them from using your data for any other purpose.</p>
                <p style={{ marginBottom: 0 }}><strong>Regulators &amp; authorities:</strong> Bank of Uganda, Uganda Revenue Authority, Uganda Police, and courts of competent jurisdiction may lawfully compel disclosure. We comply with valid legal instruments and, where the law permits, will notify you before disclosing.</p>
              </div>

              <div className="pp-legal-card warning">
                <h3><i className="fas fa-times-circle" style={{color:'#d97706'}}></i> We Never Share With</h3>
                <p style={{ margin: 0 }}>Advertising networks · Data brokers · Social media platforms for targeting · Any buyer of personal data. Full stop.</p>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 6. Product-Specific Tabbed Segment ── */}
            <section className="pp-section" id="products">
              <p className="pp-section-eyebrow">6. Product-Specific Practices</p>
              <h2>Our Three Products</h2>
              <p className="pp-section-subtitle">Each Slirus product handles distinct data. Select a product below to read the practices that apply specifically to it.</p>

              <div className="pp-product-tabs">
                {products.map(p => (
                  <button
                    key={p.id}
                    className={`pp-tab-btn${activeProduct === p.id ? ' active' : ''}`}
                    style={{ '--tab-color': p.color, '--tab-light': p.light }}
                    onClick={() => setActiveProduct(p.id)}
                    id={p.id}
                  >
                    <i className={p.icon}></i> {p.name}
                  </button>
                ))}
              </div>

              {products.map(p => (
                <div
                  key={p.id}
                  className={`pp-product-panel${activeProduct === p.id ? ' active' : ''}`}
                  style={{ '--prod-color': p.color, '--prod-light': p.light, '--prod-border': p.color + '33' }}
                >
                  <div className="pp-product-header">
                    <div className="pp-product-header-icon">
                      <i className={p.icon}></i>
                    </div>
                    <div>
                      <h3>{p.name}</h3>
                      <span>{p.tagline}</span>
                    </div>
                  </div>
                  {p.sections.map((s, i) => (
                    <div className="pp-product-sub" key={i}>
                      <h4>{s.heading}</h4>
                      <p>{s.body}</p>
                    </div>
                  ))}
                </div>
              ))}
            </section>

            <div className="pp-divider"></div>

            {/* ── 7. Security ── */}
            <section className="pp-section" id="security">
              <p className="pp-section-eyebrow">7. Security</p>
              <h2>How We Protect Your Data</h2>
              <p className="pp-section-subtitle">Security is not a checkbox for us. It is an ongoing practice embedded into how we build and operate every system.</p>

              <div className="pp-legal-card">
                <p><strong>Encryption in transit and at rest:</strong> All data moving between your device and our servers travels over TLS 1.2 or higher. Data stored in our databases is encrypted at rest using AES-256.</p>
                <p><strong>Access controls:</strong> Slirus staff access production systems using role-based permissions and multi-factor authentication. No single employee can access your full data profile without a logged justification reviewed by management.</p>
                <p><strong>Security audits:</strong> We conduct internal security reviews quarterly and engage an independent penetration testing firm annually. Critical findings are remediated within 30 days.</p>
                <p style={{ marginBottom: 0 }}><strong>Incident response:</strong> If a data breach occurs that is likely to affect your rights and freedoms, we will notify the Personal Data Protection Office and, where required, you directly within 72 hours of discovery.</p>
              </div>

              <div className="pp-legal-card warning">
                <h3><i className="fas fa-key" style={{color:'#d97706'}}></i> Your Responsibility</h3>
                <p style={{ margin: 0 }}>No system is impenetrable. You are responsible for keeping your SlirusPay PIN, SlirusManage password, and the device you use to access our platforms secure. Never share your login credentials with anyone, including Slirus staff, we will never ask for your PIN.</p>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 8. Retention ── */}
            <section className="pp-section" id="retention">
              <p className="pp-section-eyebrow">8. Retention</p>
              <h2>How Long We Keep Your Data</h2>
              <p className="pp-section-subtitle">We keep your data only as long as the law or a legitimate purpose requires. After that, it is deleted or irreversibly anonymised.</p>

              <div className="pp-collect-grid">
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-history"></i></div>
                    <h4>SlirusPay Records</h4>
                  </div>
                  <p>KYC documents, transaction logs, and agent agreements: <strong>7 years</strong> from the date of last activity, per Bank of Uganda directive.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-file-invoice"></i></div>
                    <h4>SlirusManage Business Data</h4>
                  </div>
                  <p>Your business records remain on our servers for as long as your subscription is active, plus <strong>90 days</strong> after account closure to allow data export.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-box"></i></div>
                    <h4>SlirusFashion Orders</h4>
                  </div>
                  <p>Order history and delivery data: <strong>3 years</strong> for warranty and return purposes. Bulk staff lists are deleted within <strong>30 days</strong> of delivery confirmation.</p>
                </div>
                <div className="pp-collect-item">
                  <div className="pp-collect-item-head">
                    <div className="pp-collect-icon"><i className="fas fa-headset"></i></div>
                    <h4>Support Tickets</h4>
                  </div>
                  <p>Customer support communications are retained for <strong>2 years</strong> to allow dispute resolution and service quality review.</p>
                </div>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 9. Your Rights ── */}
            <section className="pp-section" id="your-rights">
              <p className="pp-section-eyebrow">9. Your Rights</p>
              <h2>Your Rights Under Ugandan Law</h2>
              <p className="pp-section-subtitle">The Data Protection and Privacy Act, 2019 gives you real, enforceable rights over your personal information. Here is what they mean in practice at Slirus.</p>

              <div className="pp-rights-grid">
                {rights.map((r, i) => (
                  <div className="pp-right-card" key={i}>
                    <div className="pp-right-icon"><i className={r.icon}></i></div>
                    <h4>{r.title}</h4>
                    <p>{r.desc}</p>
                  </div>
                ))}
              </div>

              <div className="pp-legal-card highlight" style={{marginTop: 24}}>
                <h3><i className="fas fa-envelope"></i> How to Exercise Your Rights</h3>
                <p style={{ margin: 0 }}>Email <strong>info@slirus.com</strong> with your full name, the product you are enquiring about, and a description of your request. We will acknowledge within 5 business days and resolve within 21 days. If you are unsatisfied with our response, you may escalate to the <strong>Personal Data Protection Office of Uganda</strong>.</p>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 10. Cookies ── */}
            <section className="pp-section" id="cookies">
              <p className="pp-section-eyebrow">10. Cookies</p>
              <h2>Cookies &amp; Tracking Technologies</h2>
              <p className="pp-section-subtitle">We use cookies to keep our websites and applications working correctly and to understand how they are being used.</p>

              <div className="pp-legal-card">
                <p><strong>Strictly necessary cookies</strong> keep you logged in and protect your session. These cannot be disabled because the platform will not function without them.</p>
                <p><strong>Analytics cookies</strong> show us which pages are visited most and where users encounter problems. We use anonymised, aggregated data only. You can opt out by declining analytics cookies in the consent banner when you first visit our site.</p>
                <p><strong>No advertising cookies.</strong> We do not use third-party advertising networks and do not allow them to set cookies on our domain.</p>
                <p style={{ marginBottom: 0 }}>You can review and change your cookie preferences at any time by clicking <strong>"Manage Cookies"</strong> in the footer of any Slirus website, or by adjusting your browser settings.</p>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 11. Minors ── */}
            <section className="pp-section" id="children">
              <p className="pp-section-eyebrow">11. Minors</p>
              <h2>Children's Privacy</h2>
              <div className="pp-legal-card">
                <p style={{ marginBottom: 0 }}>
                  Our services are intended for persons aged 18 and above. We do not knowingly collect or process personal data from anyone under 18. SlirusPay requires a valid national ID which confirms the holder is of legal age. If you believe a minor's data has been submitted to us, contact <strong>info@slirus.com</strong> immediately and we will delete it without delay.
                </p>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 12. Policy Updates ── */}
            <section className="pp-section" id="changes">
              <p className="pp-section-eyebrow">12. Policy Updates</p>
              <h2>Changes to This Policy</h2>
              <div className="pp-legal-card">
                <p>
                  We review this Privacy Policy at least annually and whenever we launch a new product or materially change how we handle data. If we make a significant change, for example, adding a new data-sharing partner or changing our legal basis for a processing activity, we will notify active users by email and post a summary of what changed at the top of this page for 30 days.
                </p>
                <p style={{ marginBottom: 0 }}>
                  Continued use of any Slirus service after the effective date of a change constitutes acceptance of the updated policy. The date at the top of this page always reflects when it was last revised.
                </p>
              </div>
            </section>

            <div className="pp-divider"></div>

            {/* ── 13. Contact Section ── */}
            <section className="pp-section" id="contact">
              <p className="pp-section-eyebrow">13. Contact</p>
              <h2>Get in Touch</h2>
              <p className="pp-section-subtitle">For any privacy-related question, request, or concern, reach us directly.</p>
              
              <div className="pp-contact-card">
                <h3>Slirus Holdings Limited, Data Privacy Team</h3>
                <p>We respond to all privacy queries within 5 business days. For urgent matters involving a potential data breach or unauthorised access to your account, mark your email subject line <strong>URGENT: Security</strong>.</p>
                
                <div className="pp-contact-grid-inner">
                  <div className="pp-contact-item-box">
                    <i className="fas fa-envelope"></i>
                    <div>
                      <strong>Privacy Enquiries</strong>
                      <span>info@slirus.com</span>
                    </div>
                  </div>
                  <div className="pp-contact-item-box">
                    <i className="fas fa-headset"></i>
                    <div>
                      <strong>General Support</strong>
                      <span>sales@slirus.com</span>
                    </div>
                  </div>
                  <div className="pp-contact-item-box">
                    <i className="fas fa-map-marker-alt"></i>
                    <div>
                      <strong>Physical Address</strong>
                      <span>Slirus Holdings, Lira, Uganda</span>
                    </div>
                  </div>
                  <div className="pp-contact-item-box">
                    <i className="fas fa-external-link-alt"></i>
                    <div>
                      <strong>Regulatory Escalation</strong>
                      <span>Personal Data Protection Office, pdpo.go.ug</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>{/* end pp-content */}
        </div>{/* end pp-body */}
      </div>{/* end pp-container-wrapper */}
    </Layout>
  );
};

export default PrivacyPolicy;