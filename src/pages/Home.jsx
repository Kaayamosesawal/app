import React from 'react';
import Layout from '../components/Layout';
import Hero from '../components/Hero';

const products = [
  {
    icon: 'fas fa-wallet',
    name: 'RadiExpense',
    tag: 'Finance',
    desc: 'Personal expense tracking, savings goals, and smart budgeting all in one place.',
    href: '/products#radi-expense',
    color: '#2563eb',
    light: '#eff6ff',
  },
  {
    icon: 'fas fa-graduation-cap',
    name: 'RadiLearn',
    tag: 'Education',
    desc: 'A complete School ERP covering admissions, fees, results, and staff management.',
    href: '/products#radi-learn',
    color: '#059669',
    light: '#ecfdf5',
  },
  {
    icon: 'fas fa-network-wired',
    name: 'RadiLink',
    tag: 'Community',
    desc: 'Membership management, events, and communication for clubs and associations.',
    href: '/products#radi-link',
    color: '#7c3aed',
    light: '#f5f3ff',
  },
];

const services = [
  {
  icon: 'fas fa-laptop-code',
  title: 'Custom Software Development',
  desc: 'Tailor-made software solutions designed to meet your unique business needs and workflows.',
  href: '/services#custom-software',
  badge: 'Core Service',
  featured: true,
},
{
  icon: 'fas fa-lightbulb',
  title: 'IT Consulting & Digital Transformation',
  desc: 'Strategic IT consultancy and end-to-end digital transformation to modernize your business.',
  href: '/services#it-consulting',
  featured: false,
},
{
  icon: 'fas fa-network-wired',
  title: 'Network Infrastructure Management',
  desc: 'Reliable design, deployment, and management of network infrastructure for seamless connectivity.',
  href: '/services#network-infrastructure',
  featured: false,
},
{
  icon: 'fas fa-shield-alt',
  title: 'Cybersecurity & Data Protection',
  desc: 'Comprehensive security solutions to safeguard your systems, data, and digital assets from threats.',
  href: '/services#cybersecurity',
  featured: false,
},
];

const stats = [
  { value: '3+', label: 'Business Units' },
  { value: '50+', label: 'Projects Delivered' },
  { value: '100%', label: 'Uganda-Based Team' },
  { value: '24/7', label: 'Client Support' },
];

const Home = () => {
  return (
    <Layout>
      <style>{`
        /* ── Tokens ── */
        :root {
          --blue: #2563eb;
          --blue-dark: #1d4ed8;
          --navy: #0f172a;
          --slate: #334155;
          --muted: #64748b;
          --border: #e2e8f0;
          --surface: #f8fafc;
        }

        /* ── Hero ── */
        .home-hero {
          min-height: calc(100vh - 75px);
          background: linear-gradient(135deg, #020617 0%, #1e3a8a 55%, #2563eb 100%);
          display: flex; align-items: center;
          padding: 80px 8%;
          position: relative;
          overflow: hidden;
        }

        .home-hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 70% 50%, rgba(96,165,250,0.15) 0%, transparent 60%);
          pointer-events: none;
        }

        .hero-inner { max-width: 680px; position: relative; z-index: 1; }

        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #93c5fd;
          font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 6px 14px; border-radius: 20px;
          margin-bottom: 28px;
        }

        .hero-eyebrow i { font-size: 10px; }

        .hero-h1 {
          font-size: clamp(36px, 5vw, 60px);
          font-weight: 800; line-height: 1.12;
          color: white; margin-bottom: 24px;
        }

        .hero-h1 span {
          background: linear-gradient(90deg, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-p {
          font-size: 17px; color: #cbd5e1;
          line-height: 1.75; margin-bottom: 40px;
          max-width: 560px;
        }

        .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: white; color: #1e40af;
          padding: 14px 28px; border-radius: 10px;
          font-size: 15px; font-weight: 700;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 14px 28px; border-radius: 10px;
          font-size: 15px; font-weight: 600;
          text-decoration: none;
          transition: background 0.2s;
        }
        .btn-ghost:hover { background: rgba(255,255,255,0.1); }

        /* ── Stats Bar ── */
        .stats-bar {
          background: white;
          border-bottom: 1px solid var(--border);
          padding: 0 8%;
        }

        .stats-inner {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          divide: horizontal;
        }

        .stat-item {
          padding: 28px 0;
          text-align: center;
          border-right: 1px solid var(--border);
        }
        .stat-item:last-child { border-right: none; }

        .stat-value {
          font-size: 32px; font-weight: 800;
          color: var(--blue); line-height: 1;
          margin-bottom: 6px;
        }

        .stat-label {
          font-size: 13px; color: var(--muted); font-weight: 500;
        }

        /* ── Section Shell ── */
        .home-section { padding: 90px 8%; }
        .home-section.alt { background: var(--surface); }

        .section-eyebrow {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: var(--blue); margin-bottom: 10px;
        }

        .section-h2 {
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 800; color: var(--navy);
          margin-bottom: 12px; line-height: 1.2;
        }

        .section-sub {
          font-size: 16px; color: var(--muted);
          max-width: 520px; line-height: 1.7;
          margin-bottom: 48px;
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 48px;
          flex-wrap: wrap; gap: 20px;
        }

        .view-all {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--blue); font-size: 14px; font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          transition: gap 0.2s;
        }
        .view-all:hover { gap: 10px; }

        /* ── About ── */
        .about-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px; align-items: center;
        }

        .about-visual {
          background: linear-gradient(135deg, #1e3a8a, #2563eb);
          border-radius: 20px;
          padding: 50px 40px;
          color: white;
          position: relative; overflow: hidden;
        }

        .about-visual::after {
          content: '';
          position: absolute; top: -40px; right: -40px;
          width: 200px; height: 200px;
          background: rgba(255,255,255,0.06);
          border-radius: 50%;
        }

        .about-visual-quote {
          font-size: 20px; font-weight: 700;
          line-height: 1.5; margin-bottom: 20px;
          position: relative; z-index: 1;
        }

        .about-visual-quote::before {
          content: '"';
          font-size: 60px; color: rgba(255,255,255,0.2);
          line-height: 0; position: absolute;
          top: 20px; left: -10px;
        }

        .about-visual-sub {
          font-size: 14px; color: rgba(255,255,255,0.7);
          line-height: 1.6; position: relative; z-index: 1;
        }

        .about-text-block p {
          font-size: 16px; color: var(--slate);
          line-height: 1.8; margin-bottom: 24px;
        }

        .about-pillars {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 14px; margin-bottom: 28px;
        }

        .about-pillar {
          background: #eff6ff;
          border-radius: 10px; padding: 16px;
          display: flex; align-items: flex-start; gap: 10px;
        }

        .about-pillar i { color: var(--blue); font-size: 16px; margin-top: 2px; }

        .about-pillar span { font-size: 14px; font-weight: 600; color: var(--navy); }

        /* ── Products ── */
        .products-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .product-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 16px; padding: 30px;
          display: flex; flex-direction: column;
          transition: transform 0.3s, box-shadow 0.3s;
          text-decoration: none;
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.08);
        }

        .product-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
        }

        .product-icon-wrap i { font-size: 22px; }

        .product-tag {
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          margin-bottom: 8px;
        }

        .product-name {
          font-size: 20px; font-weight: 800;
          color: var(--navy); margin-bottom: 10px;
        }

        .product-desc {
          font-size: 14px; color: var(--muted);
          line-height: 1.7; flex: 1; margin-bottom: 20px;
        }

        .product-link {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; font-weight: 700;
          text-decoration: none;
          transition: gap 0.2s;
        }

        .product-link:hover { gap: 10px; }

        /* ── Services ── */
        .services-list { display: flex; flex-direction: column; gap: 16px; }

        .service-row {
          background: white;
          border: 1px solid var(--border);
          border-radius: 14px; padding: 24px 28px;
          display: flex; align-items: center; gap: 20px;
          text-decoration: none;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          position: relative; overflow: hidden;
        }

        .service-row:hover {
          border-color: var(--blue);
          box-shadow: 0 4px 20px rgba(37,99,235,0.08);
          transform: translateX(4px);
        }

        .service-row.featured {
          border-color: var(--blue);
          background: linear-gradient(135deg, #eff6ff, #f0f4ff);
        }

        .service-row-icon {
          width: 50px; height: 50px; flex-shrink: 0;
          background: #eff6ff; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }

        .service-row.featured .service-row-icon { background: #dbeafe; }

        .service-row-icon i { font-size: 20px; color: var(--blue); }

        .service-row-body { flex: 1; }

        .service-row-title {
          font-size: 17px; font-weight: 700;
          color: var(--navy); margin-bottom: 4px;
          display: flex; align-items: center; gap: 10px;
        }

        .featured-badge {
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          background: var(--blue); color: white;
          padding: 2px 8px; border-radius: 4px;
        }

        .service-row-desc { font-size: 14px; color: var(--muted); line-height: 1.5; }

        .service-row-arrow {
          color: var(--blue); font-size: 16px; flex-shrink: 0;
          transition: transform 0.2s;
        }

        .service-row:hover .service-row-arrow { transform: translateX(4px); }

        /* ── Career ── */
        .career-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .career-card {
          border-radius: 16px; padding: 34px;
          display: flex; flex-direction: column; gap: 16px;
          text-decoration: none;
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .career-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.10); }

        .career-card.jobs {
          background: linear-gradient(135deg, #1e3a8a, #2563eb);
          color: white;
        }

        .career-card.intern {
          background: white;
          border: 1px solid var(--border);
          color: var(--navy);
        }

        .career-card-icon {
          width: 52px; height: 52px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }

        .career-card.jobs .career-card-icon { background: rgba(255,255,255,0.15); }
        .career-card.intern .career-card-icon { background: #eff6ff; }

        .career-card-icon i { font-size: 22px; }
        .career-card.jobs .career-card-icon i { color: white; }
        .career-card.intern .career-card-icon i { color: var(--blue); }

        .career-card-title {
          font-size: 22px; font-weight: 800; line-height: 1.2;
        }

        .career-card.intern .career-card-title { color: var(--navy); }

        .career-card-desc {
          font-size: 15px; line-height: 1.7; flex: 1;
        }

        .career-card.jobs .career-card-desc { color: rgba(255,255,255,0.8); }
        .career-card.intern .career-card-desc { color: var(--muted); }

        .career-card-cta {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 14px; font-weight: 700;
        }

        .career-card.jobs .career-card-cta { color: #93c5fd; }
        .career-card.intern .career-card-cta { color: var(--blue); }

        /* ── CTA Banner ── */
        .cta-banner {
          background: linear-gradient(135deg, #020617, #1e3a8a);
          padding: 80px 8%; text-align: center; color: white;
        }

        .cta-banner h2 {
          font-size: clamp(26px, 3vw, 38px);
          font-weight: 800; margin-bottom: 14px;
        }

        .cta-banner p {
          font-size: 16px; color: #94a3b8;
          margin-bottom: 36px; max-width: 480px;
          margin-left: auto; margin-right: auto; line-height: 1.7;
        }

        .cta-banner a {
          display: inline-flex; align-items: center; gap: 8px;
          background: white; color: #1e40af;
          padding: 15px 32px; border-radius: 10px;
          font-size: 15px; font-weight: 700;
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .cta-banner a:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .about-layout, .products-grid { grid-template-columns: 1fr; }
          .stats-inner { grid-template-columns: repeat(2, 1fr); }
          .stat-item:nth-child(2) { border-right: none; }
          .stat-item:nth-child(3) { border-top: 1px solid var(--border); }
          .stat-item:nth-child(4) { border-top: 1px solid var(--border); border-right: none; }
        }

        @media (max-width: 768px) {
          .home-section { padding: 60px 5%; }
          .home-hero { padding: 60px 5%; }
          .stats-bar { padding: 0 5%; }
          .career-grid { grid-template-columns: 1fr; }
          .about-pillars { grid-template-columns: 1fr; }
          .section-header-row { flex-direction: column; align-items: flex-start; }
          .cta-banner { padding: 60px 5%; }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <i className="fas fa-map-marker-alt"></i> Uganda
          </div>
          <h1 className="hero-h1">
            Building Uganda's <span>Digital Future</span>, One Solution at a Time
          </h1>
          <p className="hero-p">
            Slirus Holdings delivers custom software, financial services, and industry solutions that help businesses and institutions grow with confidence in a connected world.
          </p>
          <div className="hero-actions">
            <a href="/services" className="btn-primary">
              Explore Services <i className="fas fa-arrow-right"></i>
            </a>
            <a href="/about" className="btn-ghost">
              Who We Are
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="stats-bar">
        <div className="stats-inner">
          {stats.map((s, i) => (
            <div className="stat-item" key={i}>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── About ── */}
      <section className="home-section">
        <div className="about-layout">
          <div className="about-visual">
            <div className="about-visual-quote">
              Uganda's transition into a digitized, financially inclusive economy starts here.
            </div>
            <p className="about-visual-sub">
              We operate at the intersection of technology, finance, and industry built to deliver real impact across Uganda's most critical growth sectors.
            </p>
          </div>
          <div className="about-text-block">
            <p className="section-eyebrow">About Slirus</p>
            <h2 className="section-h2">A holding company built for Uganda's next chapter</h2>
            <p>
              Slirus Holdings is a multi-sector company anchoring Uganda's transition into a fully digitized, financially inclusive, and industrially self-reliant economy delivering cutting-edge solutions across technology, financial services, and fashion.
            </p>
            <div className="about-pillars">
              {[
                { icon: 'fas fa-laptop-code', text: 'Custom Software Development' },
{ icon: 'fas fa-lightbulb', text: 'IT Consulting & Digital Transformation' },
{ icon: 'fas fa-network-wired', text: 'Network Infrastructure Management' },
{ icon: 'fas fa-shield-alt', text: 'Cybersecurity & Data Protection' },
              ].map((p, i) => (
                <div className="about-pillar" key={i}>
                  <i className={p.icon}></i>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
            <a href="/about" className="btn-primary" style={{ background: '#2563eb', color: 'white', display: 'inline-flex' }}>
              Learn More <i className="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      </section>

      {/* ── Products ── */}
      <section className="home-section alt">
        <div className="section-header-row">
          <div>
            <p className="section-eyebrow">Our Products</p>
            <h2 className="section-h2" style={{ marginBottom: 0 }}>Software built for real problems</h2>
          </div>
          <a href="/products" className="view-all">
            View all products <i className="fas fa-arrow-right"></i>
          </a>
        </div>
        <div className="products-grid">
          {products.map((p, i) => (
            <a href={p.href} className="product-card" key={i}>
              <div className="product-icon-wrap" style={{ background: p.light }}>
                <i className={p.icon} style={{ color: p.color }}></i>
              </div>
              <div className="product-tag" style={{ color: p.color }}>{p.tag}</div>
              <div className="product-name">{p.name}</div>
              <div className="product-desc">{p.desc}</div>
              <span className="product-link" style={{ color: p.color }}>
                Learn more <i className="fas fa-arrow-right"></i>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Services ── */}
      <section className="home-section">
        <div className="section-header-row">
          <div>
            <p className="section-eyebrow">Our Services</p>
            <h2 className="section-h2" style={{ marginBottom: 0 }}>What we do for you</h2>
          </div>
          <a href="/services" className="view-all">
            View all services <i className="fas fa-arrow-right"></i>
          </a>
        </div>
        <div className="services-list">
          {services.map((s, i) => (
            <a href={s.href} className={`service-row ${s.featured ? 'featured' : ''}`} key={i}>
              <div className="service-row-icon">
                <i className={s.icon}></i>
              </div>
              <div className="service-row-body">
                <div className="service-row-title">
                  {s.title}
                  {s.featured && <span className="featured-badge">Core Service</span>}
                </div>
                <div className="service-row-desc">{s.desc}</div>
              </div>
              <i className="fas fa-arrow-right service-row-arrow"></i>
            </a>
          ))}
        </div>
      </section>

      {/* ── Career ── */}
      <section className="home-section alt">
        <p className="section-eyebrow" style={{ textAlign: 'center' }}>Work With Us</p>
        <h2 className="section-h2" style={{ textAlign: 'center', marginBottom: 12 }}>Join the Slirus team</h2>
        <p className="section-sub" style={{ textAlign: 'center', margin: '0 auto 40px' }}>
          We're building something big and we need talented, driven people to help us do it.
        </p>
        <div className="career-grid">
          <a href="/career#jobs" className="career-card jobs">
            <div className="career-card-icon">
              <i className="fas fa-briefcase"></i>
            </div>
            <div className="career-card-title">Open Job Positions</div>
            <div className="career-card-desc">
              Explore full-time roles in software development, sales, and finance. Be part of a team shaping Uganda's digital economy.
            </div>
            <span className="career-card-cta">
              View open roles <i className="fas fa-arrow-right"></i>
            </span>
          </a>
          <a href="/career#internships" className="career-card intern">
            <div className="career-card-icon">
              <i className="fas fa-user-graduate"></i>
            </div>
            <div className="career-card-title">Paid Internship Program</div>
            <div className="career-card-desc">
              Gain hands-on experience on real client projects. Open to CS, IT, and Information Systems students and recent graduates.
            </div>
            <span className="career-card-cta">
              Learn about the program <i className="fas fa-arrow-right"></i>
            </span>
          </a>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <div className="cta-banner">
        <h2>Ready to work with Slirus?</h2>
        <p>Tell us what you're building and we'll show you how we can help.</p>
        <a href="mailto:sales@slirus.com">
          Get in Touch <i className="fas fa-arrow-right"></i>
        </a>
      </div>

    </Layout>
  );
};

export default Home;