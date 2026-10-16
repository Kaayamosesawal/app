import React from 'react';
import Layout from '../components/Layout';

const values = [
  { icon: 'fas fa-lightbulb', title: 'Innovation', desc: 'We embrace emerging technologies and creative thinking to solve real problems for real people.' },
  { icon: 'fas fa-handshake', title: 'Integrity', desc: 'We operate with full transparency and hold ourselves accountable to every client and partner.' },
  { icon: 'fas fa-trophy', title: 'Excellence', desc: 'We set a high bar for every project we touch from code quality to client communication.' },
  { icon: 'fas fa-globe-africa', title: 'Local Impact', desc: 'Everything we build is designed to create lasting, measurable value across Uganda.' },
];

const pillars = [
  {
    icon: 'fas fa-laptop-code',
    name: 'Technology Hub',
    tagline: 'Digital solutions & software',
    mandate: 'Delivers affordable, reliable, cutting-edge technology that helps businesses succeed in an increasingly competitive landscape.',
    capabilities: ['Custom software development', 'Scalable digital platforms', 'Ongoing support & maintenance'],
    serves: 'Businesses and institutions across Uganda',
  },
  {
    icon: 'fas fa-coins',
    name: 'Finance Hub',
    tagline: 'Transactions & financial inclusion',
    mandate: 'Builds the transaction and payment frameworks that extend financial access to businesses and communities.',
    capabilities: ['Multi-channel transaction networks', 'Financial inclusion solutions', 'Transparent, accountable operations'],
    serves: 'Merchants, agents and communities',
  },
  {
    icon: 'fas fa-industry',
    name: 'Industrial & Apparel Hub',
    tagline: 'Production, supply & trade',
    mandate: 'Runs modern apparel supply chains and trade operations that turn product and design into dependable supply.',
    capabilities: ['Apparel & uniform production', 'Fashion and lifestyle products', 'Agricultural supply & general commerce'],
    serves: 'Institutions, retailers and consumers',
  },
];

const matrixRows = [
  { key: 'mandate', label: 'Mandate', icon: 'fas fa-bullseye' },
  { key: 'capabilities', label: 'Core Capabilities', icon: 'fas fa-cubes' },
  { key: 'serves', label: 'Who It Serves', icon: 'fas fa-users' },
];

const backbone = [
  { icon: 'fas fa-balance-scale', title: 'Governance & Strategy', desc: 'Portfolio oversight and corporate alignment across every hub.' },
  { icon: 'fas fa-file-invoice-dollar', title: 'Finance & Compliance', desc: 'A consolidated ledger, internal controls and tax compliance.' },
  { icon: 'fas fa-project-diagram', title: 'Operations & Design', desc: 'Product strategy, brand positioning and cross-hub synergy.' },
];

const whyUs = [
  { icon: 'fas fa-map-marker-alt', title: 'Uganda-Based Team', desc: 'We understand the local market, infrastructure, and business environment better than anyone because we operate here every day.' },
  { icon: 'fas fa-dollar-sign', title: 'Affordable Quality', desc: 'Enterprise-grade solutions at prices that make sense for growing businesses and institutions across Uganda.' },
  { icon: 'fas fa-cogs', title: 'Tailored Solutions', desc: 'No templates. Every product and service we deliver is built around your specific needs, goals, and constraints.' },
  { icon: 'fas fa-headset', title: '24/7 Support', desc: 'Our team is always reachable. We provide ongoing support and maintenance long after a project goes live.' },
  { icon: 'fas fa-shield-alt', title: 'Trusted & Reliable', desc: 'We meet deadlines, communicate clearly, and deliver what we promise every single time.' },
  { icon: 'fas fa-layer-group', title: 'Multi-Sector Expertise', desc: 'With divisions in tech, finance, and fashion, we bring cross-industry thinking that gives our clients a unique edge.' },
];

const About = () => {
  return (
    <Layout>
      <style>{`
        /* ── Hero ── */
        .about-hero {
          background: linear-gradient(135deg, #020617 0%, #1e3a8a 60%, #2563eb 100%);
          padding: 100px 8% 80px;
          color: white;
          position: relative; overflow: hidden;
        }
        .about-hero::after {
          content: '';
          position: absolute; top: -60px; right: -60px;
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .about-hero-inner { max-width: 680px; position: relative; z-index: 1; }
        .about-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #93c5fd;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 5px 14px; border-radius: 20px;
          margin-bottom: 24px;
        }
        .about-hero h1 {
          font-size: clamp(34px, 5vw, 54px);
          font-weight: 800; line-height: 1.15;
          color: white; margin-bottom: 18px;
        }
        .about-hero h1 span {
          background: linear-gradient(90deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .about-hero p {
          font-size: 17px; color: #cbd5e1;
          line-height: 1.75; max-width: 560px;
        }

        /* ── Section Shell ── */
        .about-section { 
          padding: 90px 8%; 
          display: block;
          width: 100%;
        }
        .about-section.alt { 
          background: #f8fafc; 
        }
        .about-eyebrow-small {
          font-size: 11px; 
          font-weight: 700;
          text-transform: uppercase; 
          letter-spacing: 0.12em;
          color: #2563eb; 
          margin-bottom: 10px;
        }
        .about-h2 {
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 800; color: #0f172a;
          margin-bottom: 14px; line-height: 1.2;
        }

        /* ── Profile Layout ── */
        .profile-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px; align-items: start;
        }
        .profile-text p {
          font-size: 16px; color: #475569;
          line-height: 1.8; margin-bottom: 20px;
        }
        .vm-stack { display: flex; flex-direction: column; gap: 20px; }
        .vm-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px; padding: 28px;
          position: relative; overflow: hidden;
        }
        .vm-card::before {
          content: '';
          position: absolute; top: 0; left: 0;
          width: 4px; height: 100%;
          background: #2563eb;
          border-radius: 4px 0 0 4px;
        }
        .vm-card-icon {
          width: 44px; height: 44px;
          background: #eff6ff; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .vm-card-icon i { color: #2563eb; font-size: 18px; }
        .vm-card h3 { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .vm-card p { font-size: 14px; color: #64748b; line-height: 1.7; }

        /* ── Values & Why Choose Us Grids ── */
        .values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .why-us-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .value-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px; padding: 28px 22px;
          text-align: center;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .value-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(37,99,235,0.08);
        }
        .value-icon {
          width: 56px; height: 56px;
          background: #eff6ff; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 18px;
        }
        .value-icon i { font-size: 22px; color: #2563eb; }
        .value-card h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        .value-card p { font-size: 13px; color: #64748b; line-height: 1.65; }

        /* ── Operational Pillars ── */
        .pillars-head { text-align: center; max-width: 640px; margin: 0 auto 48px; }
        .pillars-head .about-h2 { margin-bottom: 12px; }
        .pillars-sub { font-size: 16px; color: #475569; line-height: 1.7; }

        .pillar-matrix {
          display: grid;
          grid-template-columns: 150px repeat(3, 1fr);
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
        }
        .pm-corner { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .pm-col-head {
          padding: 28px 24px 22px;
          background: linear-gradient(135deg, #0f172a, #1e3a8a);
          color: white;
          border-left: 1px solid rgba(255,255,255,0.08);
        }
        .pm-col-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px;
        }
        .pm-col-icon i { color: #93c5fd; font-size: 18px; }
        .pm-col-head h3 { font-size: 17px; font-weight: 800; color: white; margin-bottom: 4px; }
        .pm-col-head span { font-size: 12.5px; color: #93c5fd; font-weight: 600; }

        .pm-row-label {
          padding: 24px 20px;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #2563eb;
          display: flex; align-items: flex-start; gap: 8px;
        }
        .pm-row-label i { font-size: 12px; margin-top: 1px; }
        .pm-cell {
          padding: 24px;
          border-top: 1px solid #e2e8f0;
          border-left: 1px solid #e2e8f0;
          font-size: 14px; color: #475569; line-height: 1.7;
        }
        .pm-cell::before {
          content: attr(data-label);
          display: none;
          font-size: 10.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #2563eb; margin-bottom: 8px;
        }
        .pm-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
        .pm-list li { display: flex; gap: 10px; align-items: flex-start; color: #334155; font-weight: 500; }
        .pm-list li i { color: #2563eb; font-size: 11px; margin-top: 6px; flex-shrink: 0; }

        .backbone {
          margin-top: 28px;
          background: #0f172a;
          border-radius: 20px;
          padding: 32px;
          color: white;
        }
        .backbone-title {
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #93c5fd; margin-bottom: 6px;
        }
        .backbone h3 { font-size: 19px; font-weight: 800; color: white; margin-bottom: 22px; }
        .backbone-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .backbone-item {
          display: flex; gap: 14px; align-items: flex-start;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 18px;
        }
        .backbone-item i { color: #60a5fa; font-size: 18px; margin-top: 2px; }
        .backbone-item h4 { font-size: 14px; font-weight: 700; color: white; margin-bottom: 4px; }
        .backbone-item p { font-size: 12.5px; color: #94a3b8; line-height: 1.6; }

        /* ── CTA ── */
        .about-cta {
          background: linear-gradient(135deg, #020617, #1e3a8a);
          padding: 80px 8%; text-align: center; color: white;
        }
        .about-cta h2 {
          font-size: clamp(24px, 3vw, 36px);
          font-weight: 800; margin-bottom: 14px;
        }
        .about-cta p {
          font-size: 16px; color: #94a3b8;
          max-width: 460px; margin: 0 auto 32px; line-height: 1.7;
        }
        .about-cta-btns { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; }
        .about-cta-btns a {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 10px;
          font-size: 15px; font-weight: 700;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .about-cta-btns a:hover { transform: translateY(-2px); }
        .btn-white { background: white; color: #1e40af; }
        .btn-white:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.25); }
        .btn-outline-white {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
        }
        .btn-outline-white:hover { background: rgba(255,255,255,0.1); }

        /* ── Responsive Overrides ── */
        @media screen and (max-width: 1024px) {
          .why-us-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media screen and (max-width: 768px) {
          .about-hero { 
            padding: 70px 5% 60px !important; 
          }
          .about-section { 
            padding: 60px 5% !important; 
          }
          .profile-layout {
            grid-template-columns: 1fr !important; /* Stacks vision/mission cards underneath text */
            gap: 40px;
          }
          .values-grid { 
            grid-template-columns: 1fr 1fr !important; 
            gap: 20px;
          }
          .why-us-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .pillar-matrix { grid-template-columns: 1fr !important; }
          .pm-corner, .pm-row-label { display: none !important; }
          .pm-col-head { border-left: none; border-top: 1px solid rgba(255,255,255,0.1); }
          .pm-cell { border-left: none; padding: 20px 24px; }
          .pm-cell::before { display: block; }
          .backbone-grid { grid-template-columns: 1fr !important; }
          .backbone { padding: 24px 20px; }
          .about-cta { 
            padding: 60px 5% !important; 
          }
          
          .get-in-touch {
            padding: 50px 5% !important;
          }
          .get-in-touch-grid,
          .pp-contact-grid-inner {
            grid-template-columns: 1fr !important; 
            gap: 16px;
          }
        }

        @media screen and (max-width: 480px) {
          .about-section { 
            padding: 40px 5% !important; 
          }
          .about-hero {
            padding: 50px 5% 40px !important;
          }
          .about-eyebrow-small {
            font-size: 10px !important; 
            letter-spacing: 0.1em !important;
            margin-bottom: 8px !important;
          }
          .values-grid,
          .why-us-grid { 
            grid-template-columns: 1fr !important; 
          }
          .about-cta {
            padding: 40px 5% !important;
          }

          .get-in-touch {
            padding: 36px 5% !important;
          }
          .get-in-touch h2,
          .pp-contact-card h3 {
            font-size: 20px !important; 
            line-height: 1.3 !important;
          }
          .get-in-touch-box,
          .pp-contact-item-box,
          .pp-contact-item {
            padding: 14px !important;
            flex-direction: column !important; 
            align-items: flex-start !important;
            gap: 8px !important;
          }
        }
      `}</style>

      {/* ── Hero ── */}
      <div className="about-hero">
        <div className="about-hero-inner">
          <div className="about-eyebrow">
            <i className="fas fa-building"></i> Uganda
          </div>
          <h1>We are <span>Slirus</span> Global</h1>
          <p>
            A multi-sector global company driving Uganda's digital transformation through technology, financial inclusion, and modern industry built on fresh thinking and professional execution.
          </p>
        </div>
      </div>

      {/* ── Corporate Profile ── */}
      <section className="about-section">
        <div className="profile-layout">
          <div className="profile-text">
            <p className="about-eyebrow-small">Our Profile</p>
            <h2 className="about-h2">Built to power Uganda's next economy</h2>
            <p>
              Slirus Global Limited is a dynamic technology-led GLOBAL specializing in modern, high-performing digital solutions that empower businesses to succeed in an increasingly competitive landscape.
            </p>
            <p>
              Founded with a clear mission to deliver affordable, reliable, and cutting-edge technology without compromising on quality we combine technical expertise with fresh perspectives to understand each client's unique needs and transform them into scalable digital realities.
            </p>
            <p>
              From custom software development to multi-channel transaction networks and modern apparel supply chains, Slirus builds the critical frameworks that empower businesses and communities across Uganda.
            </p>
          </div>

          <div className="vm-stack">
            <div className="vm-card">
              <div className="vm-card-icon"><i className="fas fa-eye"></i></div>
              <h3>Our Vision</h3>
              <p>To be a leading Ugandan enterprise, recognized across Africa and beyond, where technology, trade, and transformation come together to build a more prosperous, innovative, and connected Uganda.</p>
            </div>
            <div className="vm-card">
              <div className="vm-card-icon"><i className="fas fa-bullseye"></i></div>
              <h3>Our Mission</h3>
              <p>To harness technology, drive trade, and transform communities by delivering software and digital solutions, fashion and lifestyle products, agricultural supply, and general commerce that are affordable, reliable, and built on fresh thinking and professional execution.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className="about-section alt">
        <p className="about-eyebrow-small" style={{ textAlign: 'center' }}>What Drives Us</p>
        <h2 className="about-h2" style={{ textAlign: 'center', marginBottom: 40 }}>Our Core Values</h2>
        <div className="values-grid">
          {values.map((v, i) => (
            <div className="value-card" key={i}>
              <div className="value-icon"><i className={v.icon}></i></div>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="about-section">
        <p className="about-eyebrow-small" style={{ textAlign: 'center' }}>Why Choose Us</p>
        <h2 className="about-h2" style={{ textAlign: 'center', marginBottom: 12 }}>What makes Slirus different</h2>
        <p style={{ textAlign: 'center', fontSize: '16px', color: '#475569', lineHeight: '1.7', maxWidth: '560px', margin: '0 auto 48px' }}>
          We don't just deliver projects we build long-term partnerships rooted in trust, quality, and real results.
        </p>
        <div className="why-us-grid">
          {whyUs.map((item, i) => (
            <div className="value-card" key={i}>
              <div className="value-icon"><i className={item.icon}></i></div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Operational Pillars ── */}
      <section className="about-section alt">
        <div className="pillars-head">
          <p className="about-eyebrow-small">How We Operate</p>
          <h2 className="about-h2">The Pillars of Slirus</h2>
          <p className="pillars-sub">
            Moving away from centralized management to dedicated operational hubs powering Uganda's next economy.
          </p>
        </div>

        <div className="pillar-matrix" role="table" aria-label="Slirus operational pillars">
          <div className="pm-corner"></div>
          {pillars.map((p, i) => (
            <div className="pm-col-head" key={i}>
              <div className="pm-col-icon"><i className={p.icon}></i></div>
              <h3>{p.name}</h3>
              <span>{p.tagline}</span>
            </div>
          ))}

          {matrixRows.map((row) => (
            <React.Fragment key={row.key}>
              <div className="pm-row-label">
                <i className={row.icon}></i> {row.label}
              </div>
              {pillars.map((p, i) => (
                <div className="pm-cell" data-label={row.label} key={i}>
                  {row.key === 'capabilities' ? (
                    <ul className="pm-list">
                      {p.capabilities.map((c, j) => (
                        <li key={j}><i className="fas fa-circle"></i>{c}</li>
                      ))}
                    </ul>
                  ) : (
                    p[row.key]
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        <div className="backbone">
          <p className="backbone-title">One Ecosystem</p>
          <h3>Shared corporate backbone connecting every hub</h3>
          <div className="backbone-grid">
            {backbone.map((b, i) => (
              <div className="backbone-item" key={i}>
                <i className={b.icon}></i>
                <div>
                  <h4>{b.title}</h4>
                  <p>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="about-cta">
        <h2>Let's build something together</h2>
        <p>Whether you need software, financial solutions, or uniforms Slirus has you covered.</p>
        <div className="about-cta-btns">
          <a href="/services" className="btn-white">
            Our Services <i className="fas fa-arrow-right"></i>
          </a>
          <a href="mailto:sales@slirus.com" className="btn-outline-white">
            Contact Us <i className="fas fa-envelope"></i>
          </a>
        </div>
      </div>

    </Layout>
  );
};

export default About;