import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="ft-container">
      {/* Gold accent rule */}
      <div className="ft-accent-rule" />
      
      <div className="ft-inner">
        {/* Brand column */}
        <div className="ft-brand">
          <div className="ft-logo-mark">
            <span className="ft-logo-s">S</span>
          </div>
          <p className="ft-brand-name">Slirus Holdings</p>
          <p className="ft-tagline">
            Empowering cross-sector enterprise innovation across Uganda.
          </p>
          {/* Social links */}
          <div className="ft-socials">
            <a href="https://wa.me/783091635" target="_blank" rel="noreferrer"
               className="ft-social-btn" aria-label="WhatsApp">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <a href="mailto:info@slirus.com" className="ft-social-btn" aria-label="Email">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div className="ft-col">
          <h4 className="ft-col-head">Company</h4>
          <nav className="ft-link-list">
            <Link to="/" className="ft-link">Home</Link>
            <Link to="/about" className="ft-link">About Us</Link>
            <Link to="/services" className="ft-link">Our Services</Link>
            <Link to="/apply" className="ft-link">Careers</Link>
            <Link to="/contact" className="ft-link">Contact</Link>
          </nav>
        </div>

        {/* Sectors */}
        <div className="ft-col">
          <h4 className="ft-col-head">Services</h4>
          <nav className="ft-link-list">
            <Link to="/services" className="ft-link">Software Development</Link>
            <Link to="/services" className="ft-link">IT Consultancy</Link>
            <Link to="/services" className="ft-link">Networking</Link>
            <Link to="/services" className="ft-link">Cybersecurity</Link>
          </nav>
        </div>

        {/* Contact */}
        <div className="ft-col">
          <h4 className="ft-col-head">Get in Touch</h4>
          <div className="ft-contact-list">
            <a href="https://wa.me/783091635" target="_blank" rel="noreferrer" className="ft-contact-item">
              <span className="ft-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </span>
              WhatsApp Us
            </a>
            <a href="mailto:info@slirus.com" className="ft-contact-item">
              <span className="ft-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </span>
              info@slirus.com
            </a>
            <a href="tel:+256776079495" className="ft-contact-item">
              <span className="ft-contact-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </span>
              0776079495
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="ft-bottom-bar">
        <p className="ft-copyright">
          &copy; {currentYear} Slirus Holdings. All Rights Reserved.
        </p>
        <div className="ft-legal">
          <Link to="/privacy" className="ft-legal-link">Privacy Policy</Link>
          <span className="ft-dot">·</span>
          <Link to="/terms" className="ft-legal-link">Terms of Use</Link>
        </div>
      </div>

      {/* ─── Encapsulated Standard CSS with Responsive Query Rules ─── */}
      <style>{`
        .ft-container {
          background: #0D1B2A;
          color: #A8B8C8;
          font-family: 'Segoe UI', system-ui, sans-serif;
          margin-top: auto;
          width: 100%;
        }
        .ft-accent-rule {
          height: 3px;
          background: linear-gradient(90deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%);
        }
        .ft-inner {
          display: grid;
          grid-template-columns: 1.6fr 1fr 1fr 1.2fr;
          gap: 48px 32px;
          max-width: 1140px;
          margin: 0 auto;
          padding: 52px 5% 40px;
        }
        .ft-brand { display: flex; flexDirection: column; gap: 12px; }
        .ft-logo-mark {
          width: 44px; height: 44px; border-radius: 10px;
          background: linear-gradient(135deg, #C9A84C, #E8C96A);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ft-logo-s { color: #0D1B2A; font-weight: 900; font-size: 22px; letter-spacing: -1px; }
        .ft-brand-name { color: #F0F6FF; font-weight: 700; font-size: 15px; margin: 0; letter-spacing: 0.3px; }
        .ft-tagline { font-size: 13px; line-height: 1.65; color: #7A90A4; margin: 0; max-width: 240px; }
        .ft-socials { display: flex; gap: 10px; margin-top: 4px; }
        .ft-social-btn {
          width: 34px; height: 34px; border-radius: 8px;
          background: #1A2D40;
          border: 1px solid #263D52;
          color: #7A90A4;
          display: flex; align-items: center; justify-content: center;
          text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .ft-social-btn:hover { background: #263D52; color: #E8C96A; }
        .ft-col { display: flex; flex-direction: column; gap: 0px; }
        .ft-col-head {
          color: #F0F6FF; font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1.2px;
          margin: 0 0 16px;
          padding-bottom: 10px;
          border-bottom: 1px solid #1E3045;
        }
        .ft-link-list { display: flex; flex-direction: column; gap: 2px; }
        .ft-link {
          color: #7A90A4; font-size: 14px; text-decoration: none;
          padding: 5px 0;
          transition: color 0.15s;
        }
        .ft-link:hover { color: #F0F6FF; }
        .ft-contact-list { display: flex; flex-direction: column; gap: 2px; }
        .ft-contact-item {
          display: flex; align-items: center; gap: 10px;
          color: #7A90A4; font-size: 14px; text-decoration: none;
          padding: 6px 0;
          transition: color 0.15s;
        }
        .ft-contact-item:hover { color: #F0F6FF; }
        .ft-contact-icon {
          width: 28px; height: 28px; border-radius: 6px;
          background: #1A2D40; border: 1px solid #263D52;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: #C9A84C;
        }
        .ft-bottom-bar {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
          max-width: 1140px; margin: 0 auto;
          padding: 18px 5%;
          border-top: 1px solid #1A2D40;
        }
        .ft-copyright { font-size: 13px; color: #4A6070; margin: 0; }
        .ft-legal { display: flex; align-items: center; gap: 8px; }
        .ft-legal-link { font-size: 13px; color: #4A6070; text-decoration: none; transition: color 0.2s; }
        .ft-legal-link:hover { color: #A8B8C8; }
        .ft-dot { color: #2A3D50; font-size: 13px; }

        /* ─── Responsive Breakdown ─── */
        @media screen and (max-width: 900px) {
          .ft-inner {
            grid-template-columns: 1fr 1fr; /* Adjust down to 2 columns on tablets */
            gap: 32px;
          }
        }

        @media screen and (max-width: 550px) {
          .ft-inner {
            grid-template-columns: 1fr; /* Drop to 1 clean stacked row on phone screens */
            gap: 28px;
            padding-top: 40px;
          }
          .ft-bottom-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </footer>
  );
};

export default Footer;