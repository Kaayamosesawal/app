import React from 'react';
import Layout from '../components/Layout';

const coreService = {
  icon: 'fas fa-laptop-code',
  title: 'Custom Software Development',
  badge: 'Core Service',
  tagline: 'Tailor-made digital products engineered for performance, scalability, and real-world impact.',
  description:
    'We build tailored web and mobile applications designed around your exact business needs, from Progressive Web Apps and enterprise resource systems to client portals and workflow automation tools. Every solution is optimized for performance across all network conditions and built to scale alongside your organization. Our development process is collaborative and transparent, ensuring the final product reflects your vision while meeting the highest standards of reliability and user experience.',
  offerings: [
    {
      icon: 'fas fa-globe',
      title: 'Web Application Development',
      description:
        'Full-stack web platforms built with modern frameworks, responsive, fast, and production-ready for businesses of any size.',
    },
    {
      icon: 'fas fa-mobile-alt',
      title: 'Mobile App Development',
      description:
        'Cross-platform mobile applications for Android and iOS, built to work seamlessly even on low-bandwidth networks.',
    },
    {
      icon: 'fas fa-cogs',
      title: 'Enterprise Systems & Automation',
      description:
        'ERP, CRM, and custom internal tools that automate repetitive workflows and bring operational clarity across departments.',
    },
    {
      icon: 'fas fa-plug',
      title: 'API & Systems Integration',
      description:
        'Seamless integration of third-party services, payment gateways, and legacy systems into a unified, efficient tech ecosystem.',
    },
  ],
};

const otherServices = [
  {
    id: 'it-consulting',
    icon: 'fas fa-lightbulb',
    color: '#d97706',
    lightColor: '#fffbeb',
    borderColor: '#fcd34d',
    title: 'IT Consulting & Digital Transformation',
    tagline: 'Helping businesses make smarter technology decisions and transition confidently into the digital era.',
    description:
      'Our consultants work closely with organizations to assess their current technology landscape and chart a clear, strategic path forward. Whether you\'re modernizing legacy systems, adopting cloud infrastructure, or driving organization-wide digital change, we bring the expertise to make it happen, on time and within budget.',
    offerings: [
      {
        icon: 'fas fa-search',
        title: 'IT Audits & System Assessments',
        description:
          'Comprehensive reviews of your existing technology stack to identify gaps, inefficiencies, and opportunities for improvement.',
      },
      {
        icon: 'fas fa-road',
        title: 'Digital Transformation Roadmaps',
        description:
          'Structured, phased strategies that align your IT investments with long-term organizational goals and market demands.',
      },
      {
        icon: 'fas fa-cloud',
        title: 'Cloud Migration & Adoption',
        description:
          'End-to-end support for migrating on-premise systems to cloud environments, securely, efficiently, and with minimal downtime.',
      },
      {
        icon: 'fas fa-chalkboard-teacher',
        title: 'IT Corporate Training',
        description:
          'Hands-on training programs covering software tools, digital literacy, and emerging technologies to upskill your workforce.',
      },
    ],
  },
  {
    id: 'network-infrastructure',
    icon: 'fas fa-network-wired',
    color: '#0891b2',
    lightColor: '#ecfeff',
    borderColor: '#67e8f9',
    title: 'Network Infrastructure Management',
    tagline: 'Reliable, high-performance network foundations that keep your business connected and operational.',
    description:
      'We design, deploy, and manage robust network infrastructures tailored to the demands of modern businesses and institutions. From initial architecture planning to ongoing monitoring and maintenance, our team ensures your connectivity is secure, redundant, and optimized for the workloads you run, whether on-premise, cloud-based, or hybrid.',
    offerings: [
      {
        icon: 'fas fa-project-diagram',
        title: 'Network Design & Architecture',
        description:
          'Custom LAN/WAN designs built for reliability, speed, and future scalability, from small offices to multi-site enterprises.',
      },
      {
        icon: 'fas fa-server',
        title: 'Server Setup & Management',
        description:
          'On-site and cloud server configuration, virtualization, storage solutions, and ongoing performance management.',
      },
      {
        icon: 'fas fa-wifi',
        title: 'Wireless & Structured Cabling',
        description:
          'Professional installation of wireless access points and structured cabling systems for seamless indoor and campus-wide connectivity.',
      },
      {
        icon: 'fas fa-chart-bar',
        title: 'Network Monitoring & Support',
        description:
          '24/7 monitoring, proactive fault detection, and rapid response support to minimize downtime and keep operations running smoothly.',
      },
    ],
  },
  {
    id: 'cybersecurity',
    icon: 'fas fa-shield-alt',
    color: '#dc2626',
    lightColor: '#fef2f2',
    borderColor: '#fca5a5',
    title: 'Cybersecurity & Data Protection',
    tagline: 'Safeguarding your digital assets, systems, and sensitive data from evolving cyber threats.',
    description:
      'In an increasingly connected world, cybersecurity is not optional, it\'s foundational. We provide comprehensive security solutions that protect your organization from external threats, internal vulnerabilities, and data breaches. Our layered approach covers everything from risk assessment and policy development to active threat monitoring and incident response.',
    offerings: [
      {
        icon: 'fas fa-user-shield',
        title: 'Security Audits & Risk Assessments',
        description:
          'In-depth evaluations of your digital environment to identify vulnerabilities, compliance gaps, and high-risk exposure points.',
      },
      {
        icon: 'fas fa-lock',
        title: 'Endpoint & Network Security',
        description:
          'Firewall configuration, intrusion detection, antivirus management, and device-level protection across your entire infrastructure.',
      },
      {
        icon: 'fas fa-database',
        title: 'Data Backup & Disaster Recovery',
        description:
          'Automated backup systems and recovery protocols that ensure business continuity in the event of data loss or system failure.',
      },
      {
        icon: 'fas fa-exclamation-triangle',
        title: 'Incident Response & Monitoring',
        description:
          'Real-time threat monitoring, rapid incident response, and post-breach forensics to contain damage and prevent recurrence.',
      },
    ],
  },
];

const Services = () => {
  return (
    <Layout>
      <style>{`
        /* ── Hero ── */
        .hero-banner {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
          padding: 80px 8%;
          color: white;
          text-align: center;
        }
        .hero-banner h1 { font-size: 40px; font-weight: 800; margin-bottom: 14px; }
        .hero-banner p { font-size: 17px; color: #cbd5e1; max-width: 600px; margin: 0 auto; line-height: 1.7; }

        /* ── Core Service ── */
        .core-section {
          padding: 90px 8%;
          background: linear-gradient(160deg, #020617 0%, #1e3a8a 60%, #1e40af 100%);
          color: white;
        }

        .core-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.12);
          color: #93c5fd;
          font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 5px 14px; border-radius: 20px;
          margin-bottom: 20px;
        }

        .core-heading {
          font-size: 40px; font-weight: 800;
          color: white; margin-bottom: 10px; line-height: 1.2;
        }
        .core-heading span { color: #60a5fa; }

        .core-tagline {
          font-size: 17px; color: #93c5fd;
          font-weight: 600; margin-bottom: 16px;
        }

        .core-description {
          font-size: 16px; color: #cbd5e1;
          max-width: 780px; line-height: 1.8; margin-bottom: 50px;
        }

        .core-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 22px;
        }

        .core-card {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          padding: 28px;
          transition: background 0.3s, transform 0.3s;
        }

        .core-card:hover {
          background: rgba(255,255,255,0.10);
          transform: translateY(-4px);
        }

        .core-card-icon {
          width: 48px; height: 48px;
          background: rgba(96,165,250,0.15);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .core-card-icon i { font-size: 20px; color: #60a5fa; }
        .core-card h3 { font-size: 16px; font-weight: 700; color: white; margin-bottom: 8px; }
        .core-card p { font-size: 14px; color: #94a3b8; line-height: 1.7; }

        /* ── Other IT Services ── */
        .other-section {
          padding: 90px 8%;
          background: #f8fafc;
        }

        .section-label {
          text-align: center;
          font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: #64748b; margin-bottom: 10px;
        }

        .section-heading {
          text-align: center;
          font-size: 32px; font-weight: 800;
          color: #0f172a; margin-bottom: 12px;
        }

        .section-sub {
          text-align: center;
          color: #64748b; font-size: 16px;
          max-width: 600px; margin: 0 auto 60px;
          line-height: 1.6;
        }

        .service-block {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          margin-bottom: 36px;
        }

        .service-block-header {
          padding: 36px 40px 30px;
          border-bottom: 1px solid #f1f5f9;
          display: flex; gap: 20px; align-items: flex-start;
        }

        .service-block-icon {
          width: 58px; height: 58px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .service-block-icon i { font-size: 24px; }

        .service-block-meta { flex: 1; }

        .service-block-title {
          font-size: 22px; font-weight: 800;
          color: #0f172a; margin-bottom: 6px;
        }

        .service-block-tagline {
          font-size: 14px; color: #64748b;
          font-weight: 600; margin-bottom: 10px;
        }

        .service-block-desc {
          font-size: 14px; color: #475569;
          line-height: 1.8; max-width: 800px;
        }

        .service-block-body {
          padding: 32px 40px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .offering-card {
          display: flex; gap: 14px;
        }

        .offering-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 2px;
        }
        .offering-icon i { font-size: 16px; }

        .offering-card h4 {
          font-size: 15px; font-weight: 700;
          color: #0f172a; margin-bottom: 5px;
        }
        .offering-card p {
          font-size: 13px; color: #64748b; line-height: 1.65;
        }

        /* ── CTA ── */
        .services-cta {
          text-align: center;
          padding: 70px 8%;
          background: white;
          border-top: 1px solid #e2e8f0;
        }
        .services-cta h2 { font-size: 30px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
        .services-cta p { font-size: 16px; color: #64748b; margin-bottom: 28px; max-width: 500px; margin-left: auto; margin-right: auto; }
        .services-cta a {
          display: inline-flex; align-items: center; gap: 8px;
          background: #2563eb; color: white;
          padding: 14px 32px; border-radius: 10px;
          font-size: 15px; font-weight: 700;
          text-decoration: none;
          transition: background 0.2s, transform 0.2s;
        }
        .services-cta a:hover { background: #1d4ed8; transform: translateY(-2px); }

        @media (max-width: 900px) {
          .core-grid { grid-template-columns: 1fr; }
          .service-block-body { grid-template-columns: 1fr; }
          .service-block-header { flex-direction: column; }
          .core-heading { font-size: 28px; }
          .section-heading { font-size: 26px; }
        }

        @media (max-width: 768px) {
          .core-section, .other-section { padding: 60px 5%; }
          .service-block-header { padding: 28px 24px 22px; }
          .service-block-body { padding: 24px; }
          .hero-banner { padding: 60px 5%; }
          .hero-banner h1 { font-size: 28px; }
        }
      `}</style>

      {/* Hero */}
      <div className="hero-banner">
        <div className="container">
          <h1>Our Service Portfolios</h1>
          <p>End-to-end technology solutions, from custom software and IT consulting to network infrastructure and cybersecurity.</p>
        </div>
      </div>

      {/* ── CORE: Custom Software Development ── */}
      <section id="custom-software" className="core-section">
        <div className="container">
          <div className="core-badge">
            <i className="fas fa-star"></i> Core Service
          </div>
          <h2 className="core-heading">
            <span>Custom Software</span> Development
          </h2>
          <p className="core-tagline">{coreService.tagline}</p>
          <p className="core-description">{coreService.description}</p>

          <div className="core-grid">
            {coreService.offerings.map((item, i) => (
              <div className="core-card" key={i}>
                <div className="core-card-icon">
                  <i className={item.icon}></i>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OTHER IT SERVICES ── */}
      <section className="other-section">
        <div className="container">
          <p className="section-label">What We Also Do</p>
          <h2 className="section-heading">More IT Services</h2>
          <p className="section-sub">
            Beyond software development, we offer specialized technology services to keep your business secure, connected, and future-ready.
          </p>

          {otherServices.map((service) => (
            <div className="service-block" key={service.id} id={service.id}>
              <div className="service-block-header">
                <div
                  className="service-block-icon"
                  style={{ background: service.lightColor, border: `1px solid ${service.borderColor}` }}
                >
                  <i className={service.icon} style={{ color: service.color }}></i>
                </div>
                <div className="service-block-meta">
                  <div className="service-block-title">{service.title}</div>
                  <div className="service-block-tagline">{service.tagline}</div>
                  <p className="service-block-desc">{service.description}</p>
                </div>
              </div>

              <div className="service-block-body">
                {service.offerings.map((offering, i) => (
                  <div className="offering-card" key={i}>
                    <div
                      className="offering-icon"
                      style={{ background: service.lightColor }}
                    >
                      <i className={offering.icon} style={{ color: service.color }}></i>
                    </div>
                    <div>
                      <h4>{offering.title}</h4>
                      <p>{offering.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="services-cta">
        <h2>Ready to Work With Us?</h2>
        <p>Get in touch and let's discuss how Slirus can support your goals.</p>
        <a href="mailto:sales@slirus.com">
          Contact Us <i className="fas fa-arrow-right"></i>
        </a>
      </div>
    </Layout>
  );
};

export default Services;