import React from 'react';
import Layout from '../components/Layout';

const Terms = () => {
  return (
    <Layout>
      {/* 10. Global Typography Integration */}
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      <style>{`
        /* ── Reset & Base ── */
        *, *::before, *::after { box-sizing: border-box; }
        
        /* 10. Typography Application */
        .pp-container-wrapper {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ── 1. Modern Glassmorphism Hero ── */
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
        
        /* Glassmorphism Panel on Hero Intro */
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
        
        /* Trust Badges Integration */
        .pp-trust-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 36px;
          align-items: center;
        }
        .pp-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 500;
          color: #e2e8f0;
          backdrop-filter: blur(4px);
        }
        .pp-badge i { color: #34d399; }

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

        /* ── 3. Layout Max-Width Adjustment ── */
        .pp-body {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 0;
          max-width: 1400px;
          margin: 0 auto;
          padding: 60px 8% 100px;
        }

        /* ── 2. Floating Navigation Card ── */
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

        /* ── 3. Content Width & Breathing Room ── */
        .pp-content { 
          padding: 20px 0 0 60px; 
          border-left: 1px solid #e2e8f0; 
        }

        /* ── Sections ── */
        .pp-section { margin-bottom: 60px; scroll-margin-top: 40px; }
        .pp-section-eyebrow {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: #2563eb; margin-bottom: 8px;
        }
        
        /* ── 6. Better Section Titles ── */
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
        .pp-section ul {
          padding-left: 20px;
          margin: 12px 0;
        }
        .pp-section li {
          font-size: 14.5px; color: #475569;
          line-height: 1.8;
          margin-bottom: 8px;
        }

        /* ── 4. Softer Cards Configuration ── */
        .pp-legal-card {
          background: white;
          border: 1px solid rgba(226,232,240,0.8);
          box-shadow: 0 4px 20px rgba(15,23,42,0.04);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
        }
        .pp-legal-card h3 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pp-legal-card h3 i {
          color: #2563eb;
          font-size: 18px;
        }
        .pp-legal-card.accent {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        /* ── 5. Animated Hover Effects ── */
        .pp-legal-card {
            transition: all .3s ease;
        }
        .pp-legal-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 16px 40px rgba(37,99,235,0.12);
        }

        /* ── 9. Contact Section Enhancement ── */
        .pp-contact-card {
          background: linear-gradient(135deg, #020617, #1e3a8a);
          border-radius: 20px;
          padding: 40px;
          color: white;
          margin-top: 8px;
          box-shadow: 0 30px 60px rgba(2,6,23,0.25);
          overflow: hidden;
          position: relative;
          text-align: left;
        }
        .pp-contact-card::before {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          right: -100px;
          top: -100px;
          background: radial-gradient(rgba(96,165,250,0.15), transparent);
          pointer-events: none;
        }
        .pp-contact-card h2 { font-size: 24px; font-weight: 800; margin-bottom: 12px; position: relative; z-index: 1; color: white !important; }
        .pp-contact-card p { font-size: 14px; color: #94a3b8; line-height: 1.7; margin-bottom: 28px; position: relative; z-index: 1; }
        
        .pp-contact-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          background: white;
          color: #1e40af;
          border-radius: 10px;
          font-weight: 700;
          text-decoration: none;
          position: relative;
          z-index: 1;
          transition: all 0.2s;
        }
        .pp-contact-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(255,255,255,0.1);
          background: #f8fafc;
        }

        /* ── 7. Improved Dividers ── */
        .pp-divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #e2e8f0, transparent);
          margin: 60px 0;
        }

        /* ── Responsive Rules Adjustment ── */
        @media (max-width: 1024px) {
          .pp-body {
            grid-template-columns: 1fr;
            padding: 40px 5% 80px;
          }
          .pp-nav {
            display: none;
          }
          .pp-content {
            padding: 20px 0 0;
            border-left: none;
          }
        }
        @media (max-width: 600px) {
          .pp-hero { padding: 90px 5% 80px; }
          .pp-hero-glass-card { padding: 24px; }
        }
      `}</style>

      <div className="pp-container-wrapper">
        {/* ── Hero Section ── */}
        <div className="pp-hero">
          <div className="pp-hero-inner">
            <div className="pp-hero-glass-card">
              <div className="pp-eyebrow">
                <i className="fas fa-file-contract"></i> Legal Framework
              </div>
              <h1>Terms of <span>Use</span></h1>
              <p>
                Please review our official terms and parameters thoroughly before accessing or utilizing our platform services.
              </p>
              
              {/* Trust Badges Container */}
              <div className="pp-trust-badges">
                <div className="pp-badge">
                  <i className="fas fa-check-circle"></i> Legally Binding
                </div>
                <div className="pp-badge">
                  <i className="fas fa-gavel"></i> URSB Governed
                </div>
                <div className="pp-badge">
                  <i className="fas fa-user-shield"></i> User Protected
                </div>
              </div>
            </div>

            <div className="pp-meta">
              <div className="pp-meta-item">
                <i className="fas fa-calendar-alt"></i>
                Last Updated: June 25, 2026
              </div>
              <div className="pp-meta-item">
                <i className="fas fa-globe"></i>
                Applies globally to slirus.com &amp; operations
              </div>
            </div>
          </div>
        </div>

        {/* ── Layout Body ── */}
        <div className="pp-body">

          {/* ── Sticky Nav Card ── */}
          <nav className="pp-nav">
            <p className="pp-nav-label">Agreement Modules</p>
            <ul className="pp-nav-list">
              <li><a href="#intro">Overview</a></li>
              <li><a href="#sec-about">1. About Us</a></li>
              <li><a href="#sec-acceptance">2. Acceptance</a></li>
              <li><a href="#sec-accounts">3. User Accounts</a></li>
              <li><a href="#sec-services">4. Our Services</a></li>
              <li><a href="#sec-conduct">5. Conduct Standards</a></li>
              <li><a href="#sec-ip">6. Intellectual Property</a></li>
              <li><a href="#sec-privacy">7. Privacy Policy</a></li>
              <li><a href="#sec-fees">8. Fees &amp; Payments</a></li>
              <li><a href="#sec-liability">9. Liability Limitations</a></li>
              <li><a href="#sec-indemnity">10. Indemnification</a></li>
              <li><a href="#sec-termination">11. Termination</a></li>
              <li><a href="#sec-governance">12. Disputes &amp; Law</a></li>
              <li><a href="#sec-provisions">13. General Terms</a></li>
            </ul>
          </nav>

          {/* ── Main Content Column ── */}
          <div className="pp-content">
            
            {/* Intro Header */}
            <section className="pp-section" id="intro">
              <p>
                Welcome to <strong>Slirus Holdings Limited</strong> (“Slirus”, “we”, “us”, or “our”).
              </p>
              <p>
                By accessing or using our website <a href="https://slirus.com" style={{color: '#2563eb', textDecoration: 'underline'}}>slirus.com</a>, mobile applications, and any of our ecosystem environments, you agree explicitly to be bound by these Terms of Use. If you disagree with these stipulations, please do not interact with our platforms.
              </p>
            </section>

            <div className="pp-divider"></div>

            {/* Content Cards Grid Area */}
            <section className="pp-section">
              
              {/* Card 1 */}
              <div className="pp-legal-card" id="sec-about">
                <h3><i className="fas fa-info-circle"></i> 1. About Us</h3>
                <p>
                  Slirus Holdings Limited is a Ugandan-registered company (URSB) operating as a technology-led holding company with specialized business focus areas and subsidiaries in:
                </p>
                <ul>
                  <li>Information Technology (Slirus Technologies)</li>
                  <li>Financial Services (Mobile Money &amp; Agent Banking)</li>
                  <li>Fashion &amp; Garment Retail</li>
                </ul>
                <p>
                  Our premier core digital product architectures include <strong>SlirusPay</strong>, <strong>SlirusManage</strong>, and <strong>SlirusFashion</strong>.
                </p>
              </div>

              {/* Card 2 */}
              <div className="pp-legal-card" id="sec-acceptance">
                <h3><i className="fas fa-check-double"></i> 2. Acceptance of Terms</h3>
                <p>
                  These Terms of Use represent a fully binding digital agreement constructed between yourself and Slirus Holdings Limited. We hold rights to alter or modify these clauses sequentially. Your baseline engagement following adjustments constitutes formal acceptance.
                </p>
              </div>

              {/* Card 3 */}
              <div className="pp-legal-card accent" id="sec-accounts">
                <h3><i className="fas fa-user-shield"></i> 3. User Accounts and Registration</h3>
                <ul>
                  <li>You must provide accurate, current, and complete information during registration.</li>
                  <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                  <li>You must notify us immediately of any unauthorized use of your account.</li>
                  <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
                </ul>
              </div>

              {/* Card 4 */}
              <div className="pp-legal-card" id="sec-services">
                <h3><i className="fas fa-cubes"></i> 4. Our Services</h3>
                <p>We actively deliver and support:</p>
                <ul>
                  <li>Custom software development and enterprise IT solutions</li>
                  <li>Mobile money transactional routing and agent platform layouts (<strong>SlirusPay</strong>)</li>
                  <li>Business metrics tracking and ERP tooling infrastructures (<strong>SlirusManage</strong>)</li>
                  <li>Fashion retail points, operational inventory systems, and e-commerce setups (<strong>SlirusFashion</strong>)</li>
                </ul>
                <p>
                  All services are systematically distributed on an “as is” and “as available” operational metric framework with no warranties.
                </p>
              </div>

              {/* Card 5 */}
              <div className="pp-legal-card" id="sec-conduct">
                <h3><i className="fas fa-exclamation-triangle"></i> 5. User Responsibilities and Conduct</h3>
                <p>By connecting to our nodes, you agree explicitly not to:</p>
                <ul>
                  <li>Use our services for any unlawful purpose or in violation of Ugandan law</li>
                  <li>Upload or transmit viruses, malware, or harmful code</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Infringe on any intellectual property rights</li>
                  <li>Engage in fraud, money laundering, or any financial crime (especially on financial platforms)</li>
                  <li>Share or sell access to your account</li>
                  <li>Collect or harvest data from our platforms without permission</li>
                </ul>
              </div>

              {/* Card 6 */}
              <div className="pp-legal-card" id="sec-ip">
                <h3><i className="fas fa-copyright"></i> 6. Intellectual Property</h3>
                <ul>
                  <li>All content, logos, software logic, designs, and visual frameworks on our platforms are protected assets of Slirus Holdings.</li>
                  <li>You are explicitly limited to a non-exclusive, non-transferable, revocable license to access features.</li>
                  <li>You may not copy, adjust, redistribute, or try to reverse-engineer our components without express written signatures.</li>
                </ul>
              </div>

              {/* Card 7 */}
              <div className="pp-legal-card" id="sec-privacy">
                <h3><i className="fas fa-user-lock"></i> 7. Privacy</h3>
                <p>
                  Your individual processing metrics are of absolute value to our systems. Please consult our detailed <a href="/privacy" style={{color: '#2563eb', textDecoration: 'underline'}}>Privacy Policy</a> which integrates seamlessly into this structural master agreement.
                </p>
              </div>

              {/* Card 8 */}
              <div className="pp-legal-card" id="sec-fees">
                <h3><i className="fas fa-credit-card"></i> 8. Fees and Payments</h3>
                <ul>
                  <li>Fees for our services are clearly stated at the time of purchase or agreement.</li>
                  <li>All payments are non-refundable except where required by law or as specified in a separate service agreement.</li>
                  <li>You are responsible for all taxes applicable to your use of our services.</li>
                </ul>
              </div>

              {/* Card 9 */}
              <div className="pp-legal-card" id="sec-liability">
                <h3><i className="fas fa-shield-alt"></i> 9. Limitation of Liability</h3>
                <p>
                  To the maximum extent permitted by law, Slirus Holdings shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our services.
                </p>
                <p>
                  Our total cumulative liability metrics shall not exceed the absolute financial calculation you paid to us within the trailing twelve (12) months.
                </p>
              </div>

              {/* Card 10 */}
              <div className="pp-legal-card" id="sec-indemnity">
                <h3><i className="fas fa-handshake"></i> 10. Indemnification</h3>
                <p>
                  You agree to safely indemnify, protect, and hold harmless Slirus Holdings, its associated board directors, officers, operational employees, and subsidiaries against any legal actions or incoming damages originating from breaches of these parameters.
                </p>
              </div>

              {/* Card 11 */}
              <div className="pp-legal-card" id="sec-termination">
                <h3><i className="fas fa-door-open"></i> 11. Termination</h3>
                <p>
                  We retain absolute authority to drop, freeze, or terminate your active connectivity access profiles at any timeline interval, without warning indicators, for conduct deemed structurally toxic to our operational stability.
                </p>
              </div>

              {/* Card 12 */}
              <div className="pp-legal-card accent" id="sec-governance">
                <h3><i className="fas fa-balance-scale"></i> 12. Governing Law and Dispute Resolution</h3>
                <p>
                  These operational parameters travel exclusively under the structural legal frameworks of the <strong>Republic of Uganda</strong>. Any disputes emerging from these conditions will be guided through modern arbitration protocols held in Kampala under the Arbitration and Conciliation Act.
                </p>
              </div>

              {/* Card 13 */}
              <div className="pp-legal-card" id="sec-provisions">
                <h3><i className="fas fa-gavel"></i> 13. General Provisions</h3>
                <ul>
                  <li>If any provision of these Terms is found to be invalid, the remaining provisions shall remain in full force.</li>
                  <li>Our failure to enforce any right does not constitute a waiver.</li>
                  <li>These Terms constitute the entire agreement between you and Slirus regarding our services.</li>
                </ul>
              </div>

            </section>

            <div className="pp-divider"></div>

            {/* ── 9. Contact Section Enhancement ── */}
            <section className="pp-section" id="contact">
              <div className="pp-contact-card">
                <h2>Questions about these Terms?</h2>
                <p>Contact our dedicated Legal Team for formal clarification or contractual definitions.</p>
                <a href="mailto:info@slirus.com" className="pp-contact-btn">
                  Contact Legal <i className="fas fa-envelope"></i>
                </a>
              </div>
            </section>

          </div>{/* end pp-content */}
        </div>{/* end pp-body */}
      </div>{/* end pp-container-wrapper */}
    </Layout>
  );
};

export default Terms;