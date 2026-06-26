const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index.esm-BELikEsO.js","assets/vendor-Ddpt2hGP.js"])))=>i.map(i=>d[i]);
import{r as v,a as tn,L as D,_ as ut,C as gt,b as $e,S as Ne,F as tt,g as X,c as wt,d as nn,e as ci,f as sn,h as rn,i as di,j as an,k as on,l as ln,E as jt,m as ee,n as cn,o as pi,p as W,q as dn,s as Oe,t as pn,u as hn,v as un,w as gn,x as Ce,y as Ee,z as fn,A as mn,B as xn,D as Ge,G as ve,R as hi,H as bn,I as ui,J as yn,K as vn,M as Pt,N as wn,O as jn,P as Z}from"./vendor-Ddpt2hGP.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(r){if(r.ep)return;r.ep=!0;const a=n(r);fetch(r.href,a)}})();var gi={exports:{}},it={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var kn=v,_n=Symbol.for("react.element"),Sn=Symbol.for("react.fragment"),Nn=Object.prototype.hasOwnProperty,In=kn.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,Tn={key:!0,ref:!0,__self:!0,__source:!0};function fi(i,t,n){var s,r={},a=null,o=null;n!==void 0&&(a=""+n),t.key!==void 0&&(a=""+t.key),t.ref!==void 0&&(o=t.ref);for(s in t)Nn.call(t,s)&&!Tn.hasOwnProperty(s)&&(r[s]=t[s]);if(i&&i.defaultProps)for(s in t=i.defaultProps,t)r[s]===void 0&&(r[s]=t[s]);return{$$typeof:_n,type:i,key:a,ref:o,props:r,_owner:In.current}}it.Fragment=Sn;it.jsx=fi;it.jsxs=fi;gi.exports=it;var e=gi.exports,ft={},Ot=tn;ft.createRoot=Ot.createRoot,ft.hydrateRoot=Ot.hydrateRoot;const Cn=()=>{const[i,t]=v.useState(!1);return e.jsxs("header",{children:[e.jsx("div",{className:"logo",children:e.jsxs(D,{to:"/",className:"nav-logo",onClick:()=>t(!1),children:[e.jsx("img",{src:"Slirus.png",alt:"Slirus"})," Slirus"]})}),e.jsx("nav",{className:"nav-container",children:e.jsxs("ul",{className:`nav-menu ${i?"active":""}`,children:[e.jsx("li",{children:e.jsx(D,{to:"/",onClick:()=>t(!1),children:"Home"})}),e.jsx("li",{children:e.jsx(D,{to:"/about",onClick:()=>t(!1),children:"About"})}),e.jsx("li",{children:e.jsx(D,{to:"/services",onClick:()=>t(!1),children:"Services"})}),e.jsx("li",{children:e.jsx(D,{to:"/products",onClick:()=>t(!1),children:"Products"})}),e.jsx("li",{children:e.jsx(D,{to:"/career",onClick:()=>t(!1),children:"Career"})})]})}),e.jsxs("div",{className:`menu-toggle ${i?"active":""}`,onClick:n=>{n.stopPropagation(),t(!i)},children:[e.jsx("span",{className:"bar"}),e.jsx("span",{className:"bar"}),e.jsx("span",{className:"bar"})]})]})},En=()=>{const i=new Date().getFullYear();return e.jsxs("footer",{className:"ft-container",children:[e.jsx("div",{className:"ft-accent-rule"}),e.jsxs("div",{className:"ft-inner",children:[e.jsxs("div",{className:"ft-brand",children:[e.jsx("div",{className:"ft-logo-mark",children:e.jsx("span",{className:"ft-logo-s",children:"S"})}),e.jsx("p",{className:"ft-brand-name",children:"Slirus Holdings"}),e.jsx("p",{className:"ft-tagline",children:"Empowering cross-sector enterprise innovation across Uganda."}),e.jsxs("div",{className:"ft-socials",children:[e.jsx("a",{href:"https://wa.me/783091635",target:"_blank",rel:"noreferrer",className:"ft-social-btn","aria-label":"WhatsApp",children:e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"})})}),e.jsx("a",{href:"mailto:info@slirus.com",className:"ft-social-btn","aria-label":"Email",children:e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"})})})]})]}),e.jsxs("div",{className:"ft-col",children:[e.jsx("h4",{className:"ft-col-head",children:"Company"}),e.jsxs("nav",{className:"ft-link-list",children:[e.jsx(D,{to:"/",className:"ft-link",children:"Home"}),e.jsx(D,{to:"/about",className:"ft-link",children:"About Us"}),e.jsx(D,{to:"/services",className:"ft-link",children:"Our Services"}),e.jsx(D,{to:"/apply",className:"ft-link",children:"Careers"}),e.jsx(D,{to:"/contact",className:"ft-link",children:"Contact"})]})]}),e.jsxs("div",{className:"ft-col",children:[e.jsx("h4",{className:"ft-col-head",children:"Services"}),e.jsxs("nav",{className:"ft-link-list",children:[e.jsx(D,{to:"/services",className:"ft-link",children:"Software Development"}),e.jsx(D,{to:"/services",className:"ft-link",children:"IT Consultancy"}),e.jsx(D,{to:"/services",className:"ft-link",children:"Networking"}),e.jsx(D,{to:"/services",className:"ft-link",children:"Cybersecurity"})]})]}),e.jsxs("div",{className:"ft-col",children:[e.jsx("h4",{className:"ft-col-head",children:"Get in Touch"}),e.jsxs("div",{className:"ft-contact-list",children:[e.jsxs("a",{href:"https://wa.me/783091635",target:"_blank",rel:"noreferrer",className:"ft-contact-item",children:[e.jsx("span",{className:"ft-contact-icon",children:e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"})})}),"WhatsApp Us"]}),e.jsxs("a",{href:"mailto:info@slirus.com",className:"ft-contact-item",children:[e.jsx("span",{className:"ft-contact-icon",children:e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"})})}),"info@slirus.com"]}),e.jsxs("a",{href:"tel:+256776079495",className:"ft-contact-item",children:[e.jsx("span",{className:"ft-contact-icon",children:e.jsx("svg",{width:"14",height:"14",viewBox:"0 0 24 24",fill:"currentColor",children:e.jsx("path",{d:"M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"})})}),"0776079495"]})]})]})]}),e.jsxs("div",{className:"ft-bottom-bar",children:[e.jsxs("p",{className:"ft-copyright",children:["© ",i," Slirus Holdings. All Rights Reserved."]}),e.jsxs("div",{className:"ft-legal",children:[e.jsx(D,{to:"/privacy",className:"ft-legal-link",children:"Privacy Policy"}),e.jsx("span",{className:"ft-dot",children:"·"}),e.jsx(D,{to:"/terms",className:"ft-legal-link",children:"Terms of Use"})]})]}),e.jsx("style",{children:`
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
      `})]})},q=({children:i})=>e.jsxs("div",{className:"app-wrapper",style:{display:"flex",flexDirection:"column",minHeight:"100vh"},children:[e.jsx(Cn,{}),e.jsx("main",{className:"main-content",style:{flex:1,paddingTop:"75px"},children:i}),e.jsx(En,{})]}),An=[{icon:"fas fa-wallet",name:"RadiExpense",tag:"Finance",desc:"Personal expense tracking, savings goals, and smart budgeting all in one place.",href:"/products#radi-expense",color:"#2563eb",light:"#eff6ff"},{icon:"fas fa-graduation-cap",name:"RadiLearn",tag:"Education",desc:"A complete School ERP covering admissions, fees, results, and staff management.",href:"/products#radi-learn",color:"#059669",light:"#ecfdf5"},{icon:"fas fa-network-wired",name:"RadiLink",tag:"Community",desc:"Membership management, events, and communication for clubs and associations.",href:"/products#radi-link",color:"#7c3aed",light:"#f5f3ff"}],Rn=[{icon:"fas fa-laptop-code",title:"Custom Software Development",desc:"Tailor-made software solutions designed to meet your unique business needs and workflows.",href:"/services#custom-software",badge:"Core Service",featured:!0},{icon:"fas fa-lightbulb",title:"IT Consulting & Digital Transformation",desc:"Strategic IT consultancy and end-to-end digital transformation to modernize your business.",href:"/services#it-consulting",featured:!1},{icon:"fas fa-network-wired",title:"Network Infrastructure Management",desc:"Reliable design, deployment, and management of network infrastructure for seamless connectivity.",href:"/services#network-infrastructure",featured:!1},{icon:"fas fa-shield-alt",title:"Cybersecurity & Data Protection",desc:"Comprehensive security solutions to safeguard your systems, data, and digital assets from threats.",href:"/services#cybersecurity",featured:!1}],Pn=[{value:"3+",label:"Business Units"},{value:"50+",label:"Projects Delivered"},{value:"100%",label:"Uganda-Based Team"},{value:"24/7",label:"Client Support"}],On=()=>e.jsxs(q,{children:[e.jsx("style",{children:`
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
      `}),e.jsx("section",{className:"home-hero",children:e.jsxs("div",{className:"hero-inner",children:[e.jsxs("div",{className:"hero-eyebrow",children:[e.jsx("i",{className:"fas fa-map-marker-alt"})," Uganda"]}),e.jsxs("h1",{className:"hero-h1",children:["Building Uganda's ",e.jsx("span",{children:"Digital Future"}),", One Solution at a Time"]}),e.jsx("p",{className:"hero-p",children:"Slirus Holdings delivers custom software, financial services, and industry solutions that help businesses and institutions grow with confidence in a connected world."}),e.jsxs("div",{className:"hero-actions",children:[e.jsxs("a",{href:"/services",className:"btn-primary",children:["Explore Services ",e.jsx("i",{className:"fas fa-arrow-right"})]}),e.jsx("a",{href:"/about",className:"btn-ghost",children:"Who We Are"})]})]})}),e.jsx("div",{className:"stats-bar",children:e.jsx("div",{className:"stats-inner",children:Pn.map((i,t)=>e.jsxs("div",{className:"stat-item",children:[e.jsx("div",{className:"stat-value",children:i.value}),e.jsx("div",{className:"stat-label",children:i.label})]},t))})}),e.jsx("section",{className:"home-section",children:e.jsxs("div",{className:"about-layout",children:[e.jsxs("div",{className:"about-visual",children:[e.jsx("div",{className:"about-visual-quote",children:"Uganda's transition into a digitized, financially inclusive economy starts here."}),e.jsx("p",{className:"about-visual-sub",children:"We operate at the intersection of technology, finance, and industry built to deliver real impact across Uganda's most critical growth sectors."})]}),e.jsxs("div",{className:"about-text-block",children:[e.jsx("p",{className:"section-eyebrow",children:"About Slirus"}),e.jsx("h2",{className:"section-h2",children:"A holding company built for Uganda's next chapter"}),e.jsx("p",{children:"Slirus Holdings is a multi-sector company anchoring Uganda's transition into a fully digitized, financially inclusive, and industrially self-reliant economy delivering cutting-edge solutions across technology, financial services, and fashion."}),e.jsx("div",{className:"about-pillars",children:[{icon:"fas fa-laptop-code",text:"Custom Software Development"},{icon:"fas fa-lightbulb",text:"IT Consulting & Digital Transformation"},{icon:"fas fa-network-wired",text:"Network Infrastructure Management"},{icon:"fas fa-shield-alt",text:"Cybersecurity & Data Protection"}].map((i,t)=>e.jsxs("div",{className:"about-pillar",children:[e.jsx("i",{className:i.icon}),e.jsx("span",{children:i.text})]},t))}),e.jsxs("a",{href:"/about",className:"btn-primary",style:{background:"#2563eb",color:"white",display:"inline-flex"},children:["Learn More ",e.jsx("i",{className:"fas fa-arrow-right"})]})]})]})}),e.jsxs("section",{className:"home-section alt",children:[e.jsxs("div",{className:"section-header-row",children:[e.jsxs("div",{children:[e.jsx("p",{className:"section-eyebrow",children:"Our Products"}),e.jsx("h2",{className:"section-h2",style:{marginBottom:0},children:"Software built for real problems"})]}),e.jsxs("a",{href:"/products",className:"view-all",children:["View all products ",e.jsx("i",{className:"fas fa-arrow-right"})]})]}),e.jsx("div",{className:"products-grid",children:An.map((i,t)=>e.jsxs("a",{href:i.href,className:"product-card",children:[e.jsx("div",{className:"product-icon-wrap",style:{background:i.light},children:e.jsx("i",{className:i.icon,style:{color:i.color}})}),e.jsx("div",{className:"product-tag",style:{color:i.color},children:i.tag}),e.jsx("div",{className:"product-name",children:i.name}),e.jsx("div",{className:"product-desc",children:i.desc}),e.jsxs("span",{className:"product-link",style:{color:i.color},children:["Learn more ",e.jsx("i",{className:"fas fa-arrow-right"})]})]},t))})]}),e.jsxs("section",{className:"home-section",children:[e.jsxs("div",{className:"section-header-row",children:[e.jsxs("div",{children:[e.jsx("p",{className:"section-eyebrow",children:"Our Services"}),e.jsx("h2",{className:"section-h2",style:{marginBottom:0},children:"What we do for you"})]}),e.jsxs("a",{href:"/services",className:"view-all",children:["View all services ",e.jsx("i",{className:"fas fa-arrow-right"})]})]}),e.jsx("div",{className:"services-list",children:Rn.map((i,t)=>e.jsxs("a",{href:i.href,className:`service-row ${i.featured?"featured":""}`,children:[e.jsx("div",{className:"service-row-icon",children:e.jsx("i",{className:i.icon})}),e.jsxs("div",{className:"service-row-body",children:[e.jsxs("div",{className:"service-row-title",children:[i.title,i.featured&&e.jsx("span",{className:"featured-badge",children:"Core Service"})]}),e.jsx("div",{className:"service-row-desc",children:i.desc})]}),e.jsx("i",{className:"fas fa-arrow-right service-row-arrow"})]},t))})]}),e.jsxs("section",{className:"home-section alt",children:[e.jsx("p",{className:"section-eyebrow",style:{textAlign:"center"},children:"Work With Us"}),e.jsx("h2",{className:"section-h2",style:{textAlign:"center",marginBottom:12},children:"Join the Slirus team"}),e.jsx("p",{className:"section-sub",style:{textAlign:"center",margin:"0 auto 40px"},children:"We're building something big and we need talented, driven people to help us do it."}),e.jsxs("div",{className:"career-grid",children:[e.jsxs("a",{href:"/career#jobs",className:"career-card jobs",children:[e.jsx("div",{className:"career-card-icon",children:e.jsx("i",{className:"fas fa-briefcase"})}),e.jsx("div",{className:"career-card-title",children:"Open Job Positions"}),e.jsx("div",{className:"career-card-desc",children:"Explore full-time roles in software development, sales, and finance. Be part of a team shaping Uganda's digital economy."}),e.jsxs("span",{className:"career-card-cta",children:["View open roles ",e.jsx("i",{className:"fas fa-arrow-right"})]})]}),e.jsxs("a",{href:"/career#internships",className:"career-card intern",children:[e.jsx("div",{className:"career-card-icon",children:e.jsx("i",{className:"fas fa-user-graduate"})}),e.jsx("div",{className:"career-card-title",children:"Paid Internship Program"}),e.jsx("div",{className:"career-card-desc",children:"Gain hands-on experience on real client projects. Open to CS, IT, and Information Systems students and recent graduates."}),e.jsxs("span",{className:"career-card-cta",children:["Learn about the program ",e.jsx("i",{className:"fas fa-arrow-right"})]})]})]})]}),e.jsxs("div",{className:"cta-banner",children:[e.jsx("h2",{children:"Ready to work with Slirus?"}),e.jsx("p",{children:"Tell us what you're building and we'll show you how we can help."}),e.jsxs("a",{href:"mailto:sales@slirus.com",children:["Get in Touch ",e.jsx("i",{className:"fas fa-arrow-right"})]})]})]}),Dn=[{icon:"fas fa-lightbulb",title:"Innovation",desc:"We embrace emerging technologies and creative thinking to solve real problems for real people."},{icon:"fas fa-handshake",title:"Integrity",desc:"We operate with full transparency and hold ourselves accountable to every client and partner."},{icon:"fas fa-trophy",title:"Excellence",desc:"We set a high bar for every project we touch from code quality to client communication."},{icon:"fas fa-globe-africa",title:"Local Impact",desc:"Everything we build is designed to create lasting, measurable value across Uganda."}],Fn=[{name:"Moses Awal Kaaya",role:"Chief Executive Officer",bio:"Oversees portfolio investments, strategic corporate alignment, and cross-subsidiary governance frameworks across all Slirus business units.",img:"https://raw.githubusercontent.com/Kaayamosesawal/images/main/moses.png",initials:"CEO"},{name:"Joyce Nacibuuka",role:"Accounts Manager",bio:"Manages the consolidated corporate ledger, driving comprehensive internal financial controls, tax compliance, and strategic resource optimization across all Slirus business divisions.",img:"https://raw.githubusercontent.com/Kaayamosesawal/images/main/joy.png",initials:"AM"},{name:"Edith Naziwa",role:"Operations Manager",bio:"Steers the creative vision and commercial product strategy, driving global trend alignment, brand positioning, and cross-subsidiary design synergy across all Slirus operations.",img:"https://raw.githubusercontent.com/Kaayamosesawal/images/main/eddy.png",initials:"OM"}],Ln=[{icon:"fas fa-map-marker-alt",title:"Uganda-Based Team",desc:"We understand the local market, infrastructure, and business environment better than anyone because we operate here every day."},{icon:"fas fa-dollar-sign",title:"Affordable Quality",desc:"Enterprise-grade solutions at prices that make sense for growing businesses and institutions across Uganda."},{icon:"fas fa-cogs",title:"Tailored Solutions",desc:"No templates. Every product and service we deliver is built around your specific needs, goals, and constraints."},{icon:"fas fa-headset",title:"24/7 Support",desc:"Our team is always reachable. We provide ongoing support and maintenance long after a project goes live."},{icon:"fas fa-shield-alt",title:"Trusted & Reliable",desc:"We meet deadlines, communicate clearly, and deliver what we promise every single time."},{icon:"fas fa-layer-group",title:"Multi-Sector Expertise",desc:"With divisions in tech, finance, and fashion, we bring cross-industry thinking that gives our clients a unique edge."}],Un=()=>e.jsxs(q,{children:[e.jsx("style",{children:`
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

        /* ── Leadership ── */
        .leadership-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
        }
        .leader-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          transition: transform 0.3s, box-shadow 0.3s;
          display: flex;
          flex-direction: column;
        }
        .leader-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.08);
        }
        .leader-img-wrap {
          width: 100%;
          aspect-ratio: 7 / 8;
          background: #eef2f7;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .leader-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          display: block;
        }
        .leader-info { padding: 22px 24px 26px; flex: 1; }
        .leader-name {
          font-size: 18px; font-weight: 800;
          color: #0f172a; margin-bottom: 4px;
        }
        .leader-role {
          font-size: 13px; font-weight: 600;
          color: #2563eb; margin-bottom: 12px;
        }
        .leader-bio {
          font-size: 13px; color: #64748b; line-height: 1.65;
        }

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
          .leadership-grid { 
            grid-template-columns: 1fr 1fr !important; 
            gap: 24px;
          }
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
          .why-us-grid,
          .leadership-grid { 
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
      `}),e.jsx("div",{className:"about-hero",children:e.jsxs("div",{className:"about-hero-inner",children:[e.jsxs("div",{className:"about-eyebrow",children:[e.jsx("i",{className:"fas fa-building"})," Uganda"]}),e.jsxs("h1",{children:["We are ",e.jsx("span",{children:"Slirus"})," Holdings"]}),e.jsx("p",{children:"A multi-sector holding company driving Uganda's digital transformation through technology, financial inclusion, and modern industry built on fresh thinking and professional execution."})]})}),e.jsx("section",{className:"about-section",children:e.jsxs("div",{className:"profile-layout",children:[e.jsxs("div",{className:"profile-text",children:[e.jsx("p",{className:"about-eyebrow-small",children:"Our Profile"}),e.jsx("h2",{className:"about-h2",children:"Built to power Uganda's next economy"}),e.jsx("p",{children:"Slirus Holdings is a dynamic technology-led company specializing in modern, high-performing digital solutions that empower businesses to succeed in an increasingly competitive landscape."}),e.jsx("p",{children:"Founded with a clear mission to deliver affordable, reliable, and cutting-edge technology without compromising on quality we combine technical expertise with fresh perspectives to understand each client's unique needs and transform them into scalable digital realities."}),e.jsx("p",{children:"From custom software development to multi-channel transaction networks and modern apparel supply chains, Slirus builds the critical frameworks that empower businesses and communities across Uganda."})]}),e.jsxs("div",{className:"vm-stack",children:[e.jsxs("div",{className:"vm-card",children:[e.jsx("div",{className:"vm-card-icon",children:e.jsx("i",{className:"fas fa-eye"})}),e.jsx("h3",{children:"Our Vision"}),e.jsx("p",{children:"To become a recognized entity building world-class digital solutions that accelerate Uganda's digital transformation and contribute to a more prosperous, innovative, and connected Uganda."})]}),e.jsxs("div",{className:"vm-card",children:[e.jsx("div",{className:"vm-card-icon",children:e.jsx("i",{className:"fas fa-bullseye"})}),e.jsx("h3",{children:"Our Mission"}),e.jsx("p",{children:"To combine up-to-date technical expertise with fresh perspectives understanding each client's unique needs and transforming them into effective, scalable digital realities that create lasting impact."})]})]})]})}),e.jsxs("section",{className:"about-section alt",children:[e.jsx("p",{className:"about-eyebrow-small",style:{textAlign:"center"},children:"What Drives Us"}),e.jsx("h2",{className:"about-h2",style:{textAlign:"center",marginBottom:40},children:"Our Core Values"}),e.jsx("div",{className:"values-grid",children:Dn.map((i,t)=>e.jsxs("div",{className:"value-card",children:[e.jsx("div",{className:"value-icon",children:e.jsx("i",{className:i.icon})}),e.jsx("h3",{children:i.title}),e.jsx("p",{children:i.desc})]},t))})]}),e.jsxs("section",{className:"about-section",children:[e.jsx("p",{className:"about-eyebrow-small",style:{textAlign:"center"},children:"Why Choose Us"}),e.jsx("h2",{className:"about-h2",style:{textAlign:"center",marginBottom:12},children:"What makes Slirus different"}),e.jsx("p",{style:{textAlign:"center",fontSize:"16px",color:"#475569",lineHeight:"1.7",maxWidth:"560px",margin:"0 auto 48px"},children:"We don't just deliver projects we build long-term partnerships rooted in trust, quality, and real results."}),e.jsx("div",{className:"why-us-grid",children:Ln.map((i,t)=>e.jsxs("div",{className:"value-card",children:[e.jsx("div",{className:"value-icon",children:e.jsx("i",{className:i.icon})}),e.jsx("h3",{children:i.title}),e.jsx("p",{children:i.desc})]},t))})]}),e.jsxs("section",{className:"about-section alt",children:[e.jsx("p",{className:"about-eyebrow-small",style:{textAlign:"center"},children:"The People Behind Slirus"}),e.jsx("h2",{className:"about-h2",style:{textAlign:"center",marginBottom:40},children:"Executive Leadership"}),e.jsx("div",{className:"leadership-grid",children:Fn.map((i,t)=>e.jsxs("div",{className:"leader-card",children:[e.jsx("div",{className:"leader-img-wrap",children:e.jsx("img",{src:i.img,alt:i.name})}),e.jsxs("div",{className:"leader-info",children:[e.jsx("div",{className:"leader-name",children:i.name}),e.jsx("div",{className:"leader-role",children:i.role}),e.jsx("p",{className:"leader-bio",children:i.bio})]})]},t))})]}),e.jsxs("div",{className:"about-cta",children:[e.jsx("h2",{children:"Let's build something together"}),e.jsx("p",{children:"Whether you need software, financial solutions, or uniforms Slirus has you covered."}),e.jsxs("div",{className:"about-cta-btns",children:[e.jsxs("a",{href:"/services",className:"btn-white",children:["Our Services ",e.jsx("i",{className:"fas fa-arrow-right"})]}),e.jsxs("a",{href:"mailto:sales@slirus.com",className:"btn-outline-white",children:["Contact Us ",e.jsx("i",{className:"fas fa-envelope"})]})]})]})]}),lt={tagline:"Tailor-made digital products engineered for performance, scalability, and real-world impact.",description:"We build tailored web and mobile applications designed around your exact business needs, from Progressive Web Apps and enterprise resource systems to client portals and workflow automation tools. Every solution is optimized for performance across all network conditions and built to scale alongside your organization. Our development process is collaborative and transparent, ensuring the final product reflects your vision while meeting the highest standards of reliability and user experience.",offerings:[{icon:"fas fa-globe",title:"Web Application Development",description:"Full-stack web platforms built with modern frameworks, responsive, fast, and production-ready for businesses of any size."},{icon:"fas fa-mobile-alt",title:"Mobile App Development",description:"Cross-platform mobile applications for Android and iOS, built to work seamlessly even on low-bandwidth networks."},{icon:"fas fa-cogs",title:"Enterprise Systems & Automation",description:"ERP, CRM, and custom internal tools that automate repetitive workflows and bring operational clarity across departments."},{icon:"fas fa-plug",title:"API & Systems Integration",description:"Seamless integration of third-party services, payment gateways, and legacy systems into a unified, efficient tech ecosystem."}]},zn=[{id:"it-consulting",icon:"fas fa-lightbulb",color:"#d97706",lightColor:"#fffbeb",borderColor:"#fcd34d",title:"IT Consulting & Digital Transformation",tagline:"Helping businesses make smarter technology decisions and transition confidently into the digital era.",description:"Our consultants work closely with organizations to assess their current technology landscape and chart a clear, strategic path forward. Whether you're modernizing legacy systems, adopting cloud infrastructure, or driving organization-wide digital change, we bring the expertise to make it happen, on time and within budget.",offerings:[{icon:"fas fa-search",title:"IT Audits & System Assessments",description:"Comprehensive reviews of your existing technology stack to identify gaps, inefficiencies, and opportunities for improvement."},{icon:"fas fa-road",title:"Digital Transformation Roadmaps",description:"Structured, phased strategies that align your IT investments with long-term organizational goals and market demands."},{icon:"fas fa-cloud",title:"Cloud Migration & Adoption",description:"End-to-end support for migrating on-premise systems to cloud environments, securely, efficiently, and with minimal downtime."},{icon:"fas fa-chalkboard-teacher",title:"IT Corporate Training",description:"Hands-on training programs covering software tools, digital literacy, and emerging technologies to upskill your workforce."}]},{id:"network-infrastructure",icon:"fas fa-network-wired",color:"#0891b2",lightColor:"#ecfeff",borderColor:"#67e8f9",title:"Network Infrastructure Management",tagline:"Reliable, high-performance network foundations that keep your business connected and operational.",description:"We design, deploy, and manage robust network infrastructures tailored to the demands of modern businesses and institutions. From initial architecture planning to ongoing monitoring and maintenance, our team ensures your connectivity is secure, redundant, and optimized for the workloads you run, whether on-premise, cloud-based, or hybrid.",offerings:[{icon:"fas fa-project-diagram",title:"Network Design & Architecture",description:"Custom LAN/WAN designs built for reliability, speed, and future scalability, from small offices to multi-site enterprises."},{icon:"fas fa-server",title:"Server Setup & Management",description:"On-site and cloud server configuration, virtualization, storage solutions, and ongoing performance management."},{icon:"fas fa-wifi",title:"Wireless & Structured Cabling",description:"Professional installation of wireless access points and structured cabling systems for seamless indoor and campus-wide connectivity."},{icon:"fas fa-chart-bar",title:"Network Monitoring & Support",description:"24/7 monitoring, proactive fault detection, and rapid response support to minimize downtime and keep operations running smoothly."}]},{id:"cybersecurity",icon:"fas fa-shield-alt",color:"#dc2626",lightColor:"#fef2f2",borderColor:"#fca5a5",title:"Cybersecurity & Data Protection",tagline:"Safeguarding your digital assets, systems, and sensitive data from evolving cyber threats.",description:"In an increasingly connected world, cybersecurity is not optional, it's foundational. We provide comprehensive security solutions that protect your organization from external threats, internal vulnerabilities, and data breaches. Our layered approach covers everything from risk assessment and policy development to active threat monitoring and incident response.",offerings:[{icon:"fas fa-user-shield",title:"Security Audits & Risk Assessments",description:"In-depth evaluations of your digital environment to identify vulnerabilities, compliance gaps, and high-risk exposure points."},{icon:"fas fa-lock",title:"Endpoint & Network Security",description:"Firewall configuration, intrusion detection, antivirus management, and device-level protection across your entire infrastructure."},{icon:"fas fa-database",title:"Data Backup & Disaster Recovery",description:"Automated backup systems and recovery protocols that ensure business continuity in the event of data loss or system failure."},{icon:"fas fa-exclamation-triangle",title:"Incident Response & Monitoring",description:"Real-time threat monitoring, rapid incident response, and post-breach forensics to contain damage and prevent recurrence."}]}],Mn=()=>e.jsxs(q,{children:[e.jsx("style",{children:`
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
      `}),e.jsx("div",{className:"hero-banner",children:e.jsxs("div",{className:"container",children:[e.jsx("h1",{children:"Our Service Portfolios"}),e.jsx("p",{children:"End-to-end technology solutions, from custom software and IT consulting to network infrastructure and cybersecurity."})]})}),e.jsx("section",{id:"custom-software",className:"core-section",children:e.jsxs("div",{className:"container",children:[e.jsxs("div",{className:"core-badge",children:[e.jsx("i",{className:"fas fa-star"})," Core Service"]}),e.jsxs("h2",{className:"core-heading",children:[e.jsx("span",{children:"Custom Software"})," Development"]}),e.jsx("p",{className:"core-tagline",children:lt.tagline}),e.jsx("p",{className:"core-description",children:lt.description}),e.jsx("div",{className:"core-grid",children:lt.offerings.map((i,t)=>e.jsxs("div",{className:"core-card",children:[e.jsx("div",{className:"core-card-icon",children:e.jsx("i",{className:i.icon})}),e.jsx("h3",{children:i.title}),e.jsx("p",{children:i.description})]},t))})]})}),e.jsx("section",{className:"other-section",children:e.jsxs("div",{className:"container",children:[e.jsx("p",{className:"section-label",children:"What We Also Do"}),e.jsx("h2",{className:"section-heading",children:"More IT Services"}),e.jsx("p",{className:"section-sub",children:"Beyond software development, we offer specialized technology services to keep your business secure, connected, and future-ready."}),zn.map(i=>e.jsxs("div",{className:"service-block",id:i.id,children:[e.jsxs("div",{className:"service-block-header",children:[e.jsx("div",{className:"service-block-icon",style:{background:i.lightColor,border:`1px solid ${i.borderColor}`},children:e.jsx("i",{className:i.icon,style:{color:i.color}})}),e.jsxs("div",{className:"service-block-meta",children:[e.jsx("div",{className:"service-block-title",children:i.title}),e.jsx("div",{className:"service-block-tagline",children:i.tagline}),e.jsx("p",{className:"service-block-desc",children:i.description})]})]}),e.jsx("div",{className:"service-block-body",children:i.offerings.map((t,n)=>e.jsxs("div",{className:"offering-card",children:[e.jsx("div",{className:"offering-icon",style:{background:i.lightColor},children:e.jsx("i",{className:t.icon,style:{color:i.color}})}),e.jsxs("div",{children:[e.jsx("h4",{children:t.title}),e.jsx("p",{children:t.description})]})]},n))})]},i.id))]})}),e.jsxs("div",{className:"services-cta",children:[e.jsx("h2",{children:"Ready to Work With Us?"}),e.jsx("p",{children:"Get in touch and let's discuss how Slirus can support your goals."}),e.jsxs("a",{href:"mailto:sales@slirus.com",children:["Contact Us ",e.jsx("i",{className:"fas fa-arrow-right"})]})]})]}),Dt=[{id:"radi-expense",icon:"fas fa-wallet",image:"/RadiExpense.png",name:"RadiExpense",tag:"Finance & Budgeting",tagColor:"#ea580c",tagBg:"#fff7ed",accentColor:"#ea580c",accentLight:"#fff7ed",ctaHref:"https://radiexpense.slirus.com",headline:"Take full control of every shilling your business spends.",description:"RadiExpense is an intelligent corporate expense management system built for Ugandan businesses. From field operations to head office approvals, it gives management complete real-time clarity over internal financial pipelines online or offline.",why:[{icon:"fas fa-wifi-slash",title:"Offline Capability",desc:"Log business expenses in remote districts even without active cellular data. Syncs automatically when reconnected."},{icon:"fas fa-sitemap",title:"Subsidiary Sync",desc:"A unified dashboard matches transactions to specific holding divisions, giving group-level visibility at a glance."},{icon:"fas fa-shield-alt",title:"Fraud Prevention",desc:"Digital receipt validation algorithms detect and block redundant or exaggerated field claims before they're approved."}],benefits:[{icon:"fas fa-chart-line",title:"Real-time Field Audits",desc:"Track field mobilization outlays as they happen, eliminating end-of-month reporting surprises."},{icon:"fas fa-code-branch",title:"Dynamic Approval Workflows",desc:"High-value budgets are automatically routed through the right management levels without manual chasing."},{icon:"fas fa-mobile-alt",title:"Mobile Money Linkage",desc:"Integrates with MTN and Airtel payment structures for rapid disbursements directly from the platform."}]},{id:"radi-learn",icon:"fas fa-graduation-cap",image:"/RadiLearn.png",name:"RadiLearn",tag:"Education & Training",tagColor:"#3b82f6",tagBg:"#eff6ff",accentColor:"#3b82f6",accentLight:"#eff6ff",ctaHref:"https://radilearn.slirus.com",headline:"A complete school management and e-learning system in one platform.",description:"RadiLearn is a progressive All-In-One School ERP designed for Ugandan academic institutions. It handles admissions, fees, results, timetables, and online learning all through a lightweight PWA that works on any device, on any network.",why:[{icon:"fas fa-signal",title:"Low Bandwidth Architecture",desc:"Delivers full class materials and school data with minimal data consumption built for Uganda's network realities."},{icon:"fas fa-plug",title:"Institutional Integrations",desc:"Connects with existing regional educational registration systems and government data structures seamlessly."},{icon:"fas fa-download",title:"Progressive PWA",desc:"Installs directly onto mobile devices without needing app store downloads works on any Android or iOS device."}],benefits:[{icon:"fas fa-sync",title:"Offline Access",desc:"Students and staff can access materials, results, and records even without an active internet connection."},{icon:"fas fa-robot",title:"Automated Grading",desc:"Tests are graded instantly, giving students immediate performance feedback and freeing up teacher time."},{icon:"fas fa-users",title:"Scalable Classrooms",desc:"Supports thousands of concurrent active students and staff without performance degradation."}]},{id:"radi-link",icon:"fas fa-network-wired",image:"/RadiLink.png",name:"RadiLink",tag:"Clubs & Associations",tagColor:"#0d9488",tagBg:"#f0fdfa",accentColor:"#0d9488",accentLight:"#f0fdfa",ctaHref:"https://radilink.slirus.com",headline:"The all-in-one platform for managing clubs, SACCOs, and associations.",description:"RadiLink is a secure membership management platform purpose-built for clubs, SACCOs, professional bodies, and associations in Uganda. It handles member records, contributions, communications, events, and governance all in one place.",why:[{icon:"fas fa-lock",title:"End-to-End Encryption",desc:"All member data, financial records, and communications are secured with enterprise-grade encryption protocols."},{icon:"fas fa-layer-group",title:"Cross-Platform Syncing",desc:"Access the same up-to-date data across browsers, desktops, and mobile devices for every member and admin."},{icon:"fas fa-plug",title:"API-First Construction",desc:"Integrates smoothly with mobile money platforms, URA, and NSSF portals for seamless compliance reporting."}],benefits:[{icon:"fas fa-bolt",title:"Instant Member Sync",desc:"Membership records, contributions, and event attendance update in real time across all connected devices."},{icon:"fas fa-piggy-bank",title:"Reduced Admin Costs",desc:"Replaces multiple disconnected tools spreadsheets, WhatsApp groups, manual ledgers with one platform."},{icon:"fas fa-bell",title:"Smart Notifications",desc:"Automated alerts for dues, meetings, events, and governance deadlines keep every member informed."}]}],Bn=({product:i})=>{const[t,n]=v.useState("why");return e.jsxs("section",{id:i.id,className:"product-block",children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"product-top",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"product-label",style:{background:i.tagBg,color:i.tagColor},children:[e.jsx("i",{className:i.icon})," ",i.tag]}),e.jsx("h2",{className:"product-name",children:i.name}),e.jsx("p",{className:"product-headline",children:i.headline}),e.jsx("p",{className:"product-desc",children:i.description}),e.jsxs("a",{href:i.ctaHref,target:"_blank",rel:"noopener noreferrer",className:"product-cta",style:{background:i.accentColor},children:["Get Started ",e.jsx("i",{className:"fas fa-arrow-right"})]})]}),e.jsx("div",{className:"product-visual",style:{background:i.tagBg,border:`1.5px solid ${i.tagColor}22`},children:e.jsx("img",{src:i.image,alt:i.name})})]}),e.jsxs("div",{className:"product-tabs",children:[e.jsxs("button",{className:"product-tab",style:{borderBottomColor:t==="why"?i.accentColor:"transparent",color:t==="why"?i.accentColor:"#64748b"},onClick:()=>n("why"),children:[e.jsx("i",{className:"fas fa-question-circle"}),"  Why ",i.name,"?"]}),e.jsxs("button",{className:"product-tab",style:{borderBottomColor:t==="benefits"?i.accentColor:"transparent",color:t==="benefits"?i.accentColor:"#64748b"},onClick:()=>n("benefits"),children:[e.jsx("i",{className:"fas fa-star"}),"  Key Benefits"]})]}),e.jsx("div",{className:"tab-grid",children:(t==="why"?i.why:i.benefits).map((s,r)=>e.jsxs("div",{className:"tab-item",style:{borderTop:`3px solid ${i.accentColor}`},children:[e.jsx("div",{className:"tab-item-icon",style:{background:i.tagBg},children:e.jsx("i",{className:s.icon,style:{color:i.accentColor}})}),e.jsx("h4",{children:s.title}),e.jsx("p",{children:s.desc})]},r))})]})},Wn=()=>e.jsxs(q,{children:[e.jsx("style",{children:`
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
      `}),e.jsx("div",{className:"products-hero",children:e.jsxs("div",{className:"products-hero-inner",children:[e.jsxs("div",{className:"products-eyebrow",children:[e.jsx("i",{className:"fas fa-box-open"})," Software Products"]}),e.jsxs("h1",{children:["Tools built for ",e.jsx("span",{children:"Uganda's reality"})]}),e.jsx("p",{children:"Three purpose-built software products designed to solve real operational challenges for businesses, schools, and organizations across East Africa."})]})}),e.jsx("nav",{className:"product-nav",children:Dt.map(i=>e.jsxs("a",{href:`#${i.id}`,className:"product-nav-link",style:{"--hover-color":i.accentColor},onMouseEnter:t=>{t.currentTarget.style.color=i.accentColor,t.currentTarget.style.borderBottomColor=i.accentColor},onMouseLeave:t=>{t.currentTarget.style.color="#64748b",t.currentTarget.style.borderBottomColor="transparent"},children:[e.jsx("i",{className:i.icon,style:{color:i.accentColor}})," ",i.name]},i.id))}),Dt.map(i=>e.jsx(Bn,{product:i},i.id)),e.jsxs("div",{className:"products-cta",children:[e.jsx("h2",{children:"Interested in any of our products?"}),e.jsx("p",{children:"Reach out and we'll walk you through a demo tailored to your organization's needs."}),e.jsxs("a",{href:"mailto:sales@slirus.com",children:["Request a Demo ",e.jsx("i",{className:"fas fa-arrow-right"})]})]})]}),Hn="modulepreload",qn=function(i){return"/"+i},Ft={},kt=function(t,n,s){let r=Promise.resolve();if(n&&n.length>0){document.getElementsByTagName("link");const o=document.querySelector("meta[property=csp-nonce]"),l=(o==null?void 0:o.nonce)||(o==null?void 0:o.getAttribute("nonce"));r=Promise.allSettled(n.map(c=>{if(c=qn(c),c in Ft)return;Ft[c]=!0;const d=c.endsWith(".css"),u=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${c}"]${u}`))return;const f=document.createElement("link");if(f.rel=d?"stylesheet":Hn,d||(f.as="script"),f.crossOrigin="",f.href=c,l&&f.setAttribute("nonce",l),document.head.appendChild(f),d)return new Promise((w,S)=>{f.addEventListener("load",w),f.addEventListener("error",()=>S(new Error(`Unable to preload CSS for ${c}`)))})}))}function a(o){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=o,window.dispatchEvent(l),!l.defaultPrevented)throw o}return r.then(o=>{for(const l of o||[])l.status==="rejected"&&a(l.reason);return t().catch(a)})};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const mi="firebasestorage.googleapis.com",Vn="storageBucket",$n=2*60*1e3,Gn=10*60*1e3;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Q extends tt{constructor(t,n,s=0){super(ct(t),`Firebase Storage: ${n} (${ct(t)})`),this.status_=s,this.customData={serverResponse:null},this._baseMessage=this.message,Object.setPrototypeOf(this,Q.prototype)}get status(){return this.status_}set status(t){this.status_=t}_codeEquals(t){return ct(t)===this.code}get serverResponse(){return this.customData.serverResponse}set serverResponse(t){this.customData.serverResponse=t,this.customData.serverResponse?this.message=`${this._baseMessage}
${this.customData.serverResponse}`:this.message=this._baseMessage}}var J;(function(i){i.UNKNOWN="unknown",i.OBJECT_NOT_FOUND="object-not-found",i.BUCKET_NOT_FOUND="bucket-not-found",i.PROJECT_NOT_FOUND="project-not-found",i.QUOTA_EXCEEDED="quota-exceeded",i.UNAUTHENTICATED="unauthenticated",i.UNAUTHORIZED="unauthorized",i.UNAUTHORIZED_APP="unauthorized-app",i.RETRY_LIMIT_EXCEEDED="retry-limit-exceeded",i.INVALID_CHECKSUM="invalid-checksum",i.CANCELED="canceled",i.INVALID_EVENT_NAME="invalid-event-name",i.INVALID_URL="invalid-url",i.INVALID_DEFAULT_BUCKET="invalid-default-bucket",i.NO_DEFAULT_BUCKET="no-default-bucket",i.CANNOT_SLICE_BLOB="cannot-slice-blob",i.SERVER_FILE_WRONG_SIZE="server-file-wrong-size",i.NO_DOWNLOAD_URL="no-download-url",i.INVALID_ARGUMENT="invalid-argument",i.INVALID_ARGUMENT_COUNT="invalid-argument-count",i.APP_DELETED="app-deleted",i.INVALID_ROOT_OPERATION="invalid-root-operation",i.INVALID_FORMAT="invalid-format",i.INTERNAL_ERROR="internal-error",i.UNSUPPORTED_ENVIRONMENT="unsupported-environment"})(J||(J={}));function ct(i){return"storage/"+i}function Kn(){const i="An unknown error occurred, please check the error payload for server response.";return new Q(J.UNKNOWN,i)}function Yn(){return new Q(J.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again.")}function Jn(){return new Q(J.CANCELED,"User canceled the upload/download.")}function Xn(i){return new Q(J.INVALID_URL,"Invalid URL '"+i+"'.")}function Qn(i){return new Q(J.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+i+"'.")}function Lt(i){return new Q(J.INVALID_ARGUMENT,i)}function xi(){return new Q(J.APP_DELETED,"The Firebase app was deleted.")}function Zn(i){return new Q(J.INVALID_ROOT_OPERATION,"The operation '"+i+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ${constructor(t,n){this.bucket=t,this.path_=n}get path(){return this.path_}get isRoot(){return this.path.length===0}fullServerUrl(){const t=encodeURIComponent;return"/b/"+t(this.bucket)+"/o/"+t(this.path)}bucketOnlyServerUrl(){return"/b/"+encodeURIComponent(this.bucket)+"/o"}static makeFromBucketSpec(t,n){let s;try{s=$.makeFromUrl(t,n)}catch{return new $(t,"")}if(s.path==="")return s;throw Qn(t)}static makeFromUrl(t,n){let s=null;const r="([A-Za-z0-9.\\-_]+)";function a(k){k.path.charAt(k.path.length-1)==="/"&&(k.path_=k.path_.slice(0,-1))}const o="(/(.*))?$",l=new RegExp("^gs://"+r+o,"i"),c={bucket:1,path:3};function d(k){k.path_=decodeURIComponent(k.path)}const u="v[A-Za-z0-9_]+",f=n.replace(/[.]/g,"\\."),w="(/([^?#]*).*)?$",S=new RegExp(`^https?://${f}/${u}/b/${r}/o${w}`,"i"),C={bucket:1,path:3},N=n===mi?"(?:storage.googleapis.com|storage.cloud.google.com)":n,I="([^?#]*)",g=new RegExp(`^https?://${N}/${r}/${I}`,"i"),m=[{regex:l,indices:c,postModify:a},{regex:S,indices:C,postModify:d},{regex:g,indices:{bucket:1,path:2},postModify:d}];for(let k=0;k<m.length;k++){const T=m[k],F=T.regex.exec(t);if(F){const H=F[T.indices.bucket];let U=F[T.indices.path];U||(U=""),s=new $(H,U),T.postModify(s);break}}if(s==null)throw Xn(t);return s}}class es{constructor(t){this.promise_=Promise.reject(t)}getPromise(){return this.promise_}cancel(t=!1){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ts(i,t,n){let s=1,r=null,a=null,o=!1,l=0;function c(){return l===2}let d=!1;function u(...I){d||(d=!0,t.apply(null,I))}function f(I){r=setTimeout(()=>{r=null,i(S,c())},I)}function w(){a&&clearTimeout(a)}function S(I,...g){if(d){w();return}if(I){w(),u.call(null,I,...g);return}if(c()||o){w(),u.call(null,I,...g);return}s<64&&(s*=2);let m;l===1?(l=2,m=0):m=(s+Math.random())*1e3,f(m)}let C=!1;function N(I){C||(C=!0,w(),!d&&(r!==null?(I||(l=2),clearTimeout(r),f(0)):I||(l=1)))}return f(0),a=setTimeout(()=>{o=!0,N(!0)},n),N}function is(i){i(!1)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ns(i){return i!==void 0}function Ut(i,t,n,s){if(s<t)throw Lt(`Invalid value for '${i}'. Expected ${t} or greater.`);if(s>n)throw Lt(`Invalid value for '${i}'. Expected ${n} or less.`)}function ss(i){const t=encodeURIComponent;let n="?";for(const s in i)if(i.hasOwnProperty(s)){const r=t(s)+"="+t(i[s]);n=n+r+"&"}return n=n.slice(0,-1),n}var Ke;(function(i){i[i.NO_ERROR=0]="NO_ERROR",i[i.NETWORK_ERROR=1]="NETWORK_ERROR",i[i.ABORT=2]="ABORT"})(Ke||(Ke={}));/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rs(i,t){const n=i>=500&&i<600,r=[408,429].indexOf(i)!==-1,a=t.indexOf(i)!==-1;return n||r||a}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class as{constructor(t,n,s,r,a,o,l,c,d,u,f,w=!0){this.url_=t,this.method_=n,this.headers_=s,this.body_=r,this.successCodes_=a,this.additionalRetryCodes_=o,this.callback_=l,this.errorCallback_=c,this.timeout_=d,this.progressCallback_=u,this.connectionFactory_=f,this.retry=w,this.pendingConnection_=null,this.backoffId_=null,this.canceled_=!1,this.appDelete_=!1,this.promise_=new Promise((S,C)=>{this.resolve_=S,this.reject_=C,this.start_()})}start_(){const t=(s,r)=>{if(r){s(!1,new Ue(!1,null,!0));return}const a=this.connectionFactory_();this.pendingConnection_=a;const o=l=>{const c=l.loaded,d=l.lengthComputable?l.total:-1;this.progressCallback_!==null&&this.progressCallback_(c,d)};this.progressCallback_!==null&&a.addUploadProgressListener(o),a.send(this.url_,this.method_,this.body_,this.headers_).then(()=>{this.progressCallback_!==null&&a.removeUploadProgressListener(o),this.pendingConnection_=null;const l=a.getErrorCode()===Ke.NO_ERROR,c=a.getStatus();if(!l||rs(c,this.additionalRetryCodes_)&&this.retry){const u=a.getErrorCode()===Ke.ABORT;s(!1,new Ue(!1,null,u));return}const d=this.successCodes_.indexOf(c)!==-1;s(!0,new Ue(d,a))})},n=(s,r)=>{const a=this.resolve_,o=this.reject_,l=r.connection;if(r.wasSuccessCode)try{const c=this.callback_(l,l.getResponse());ns(c)?a(c):a()}catch(c){o(c)}else if(l!==null){const c=Kn();c.serverResponse=l.getErrorText(),this.errorCallback_?o(this.errorCallback_(l,c)):o(c)}else if(r.canceled){const c=this.appDelete_?xi():Jn();o(c)}else{const c=Yn();o(c)}};this.canceled_?n(!1,new Ue(!1,null,!0)):this.backoffId_=ts(t,n,this.timeout_)}getPromise(){return this.promise_}cancel(t){this.canceled_=!0,this.appDelete_=t||!1,this.backoffId_!==null&&is(this.backoffId_),this.pendingConnection_!==null&&this.pendingConnection_.abort()}}class Ue{constructor(t,n,s){this.wasSuccessCode=t,this.connection=n,this.canceled=!!s}}function os(i,t){t!==null&&t.length>0&&(i.Authorization="Firebase "+t)}function ls(i,t){i["X-Firebase-Storage-Version"]="webjs/"+(t??"AppManager")}function cs(i,t){t&&(i["X-Firebase-GMPID"]=t)}function ds(i,t){t!==null&&(i["X-Firebase-AppCheck"]=t)}function ps(i,t,n,s,r,a,o=!0){const l=ss(i.urlParams),c=i.url+l,d=Object.assign({},i.headers);return cs(d,t),os(d,n),ls(d,a),ds(d,s),new as(c,i.method,d,i.body,i.successCodes,i.additionalRetryCodes,i.handler,i.errorHandler,i.timeout,i.progressCallback,r,o)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hs(i){if(i.length===0)return null;const t=i.lastIndexOf("/");return t===-1?"":i.slice(0,t)}function us(i){const t=i.lastIndexOf("/",i.length-2);return t===-1?i:i.slice(t+1)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ye{constructor(t,n){this._service=t,n instanceof $?this._location=n:this._location=$.makeFromUrl(n,t.host)}toString(){return"gs://"+this._location.bucket+"/"+this._location.path}_newRef(t,n){return new Ye(t,n)}get root(){const t=new $(this._location.bucket,"");return this._newRef(this._service,t)}get bucket(){return this._location.bucket}get fullPath(){return this._location.path}get name(){return us(this._location.path)}get storage(){return this._service}get parent(){const t=hs(this._location.path);if(t===null)return null;const n=new $(this._location.bucket,t);return new Ye(this._service,n)}_throwIfRoot(t){if(this._location.path==="")throw Zn(t)}}function zt(i,t){const n=t==null?void 0:t[Vn];return n==null?null:$.makeFromBucketSpec(n,i)}function gs(i,t,n,s={}){i.host=`${t}:${n}`,i._protocol="http";const{mockUserToken:r}=s;r&&(i._overrideAuthToken=typeof r=="string"?r:sn(r,i.app.options.projectId))}class fs{constructor(t,n,s,r,a){this.app=t,this._authProvider=n,this._appCheckProvider=s,this._url=r,this._firebaseVersion=a,this._bucket=null,this._host=mi,this._protocol="https",this._appId=null,this._deleted=!1,this._maxOperationRetryTime=$n,this._maxUploadRetryTime=Gn,this._requests=new Set,r!=null?this._bucket=$.makeFromBucketSpec(r,this._host):this._bucket=zt(this._host,this.app.options)}get host(){return this._host}set host(t){this._host=t,this._url!=null?this._bucket=$.makeFromBucketSpec(this._url,t):this._bucket=zt(t,this.app.options)}get maxUploadRetryTime(){return this._maxUploadRetryTime}set maxUploadRetryTime(t){Ut("time",0,Number.POSITIVE_INFINITY,t),this._maxUploadRetryTime=t}get maxOperationRetryTime(){return this._maxOperationRetryTime}set maxOperationRetryTime(t){Ut("time",0,Number.POSITIVE_INFINITY,t),this._maxOperationRetryTime=t}async _getAuthToken(){if(this._overrideAuthToken)return this._overrideAuthToken;const t=this._authProvider.getImmediate({optional:!0});if(t){const n=await t.getToken();if(n!==null)return n.accessToken}return null}async _getAppCheckToken(){const t=this._appCheckProvider.getImmediate({optional:!0});return t?(await t.getToken()).token:null}_delete(){return this._deleted||(this._deleted=!0,this._requests.forEach(t=>t.cancel()),this._requests.clear()),Promise.resolve()}_makeStorageReference(t){return new Ye(this,t)}_makeRequest(t,n,s,r,a=!0){if(this._deleted)return new es(xi());{const o=ps(t,this._appId,s,r,n,this._firebaseVersion,a);return this._requests.add(o),o.getPromise().then(()=>this._requests.delete(o),()=>this._requests.delete(o)),o}}async makeRequestWithTokens(t,n){const[s,r]=await Promise.all([this._getAuthToken(),this._getAppCheckToken()]);return this._makeRequest(t,n,s,r).getPromise()}}const Mt="@firebase/storage",Bt="0.13.2";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bi="storage";function ms(i=ci(),t){i=X(i);const s=wt(i,bi).getImmediate({identifier:t}),r=nn("storage");return r&&xs(s,...r),s}function xs(i,t,n,s={}){gs(i,t,n,s)}function bs(i,{instanceIdentifier:t}){const n=i.getProvider("app").getImmediate(),s=i.getProvider("auth-internal"),r=i.getProvider("app-check-internal");return new fs(n,s,r,t,Ne)}function ys(){ut(new gt(bi,bs,"PUBLIC").setMultipleInstances(!0)),$e(Mt,Bt,""),$e(Mt,Bt,"esm2017")}ys();function _t(i,t){var n={};for(var s in i)Object.prototype.hasOwnProperty.call(i,s)&&t.indexOf(s)<0&&(n[s]=i[s]);if(i!=null&&typeof Object.getOwnPropertySymbols=="function")for(var r=0,s=Object.getOwnPropertySymbols(i);r<s.length;r++)t.indexOf(s[r])<0&&Object.prototype.propertyIsEnumerable.call(i,s[r])&&(n[s[r]]=i[s[r]]);return n}function yi(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const vs=yi,vi=new jt("auth","Firebase",yi());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Je=new rn("@firebase/auth");function ws(i,...t){Je.logLevel<=pi.WARN&&Je.warn(`Auth (${Ne}): ${i}`,...t)}function Be(i,...t){Je.logLevel<=pi.ERROR&&Je.error(`Auth (${Ne}): ${i}`,...t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function G(i,...t){throw St(i,...t)}function K(i,...t){return St(i,...t)}function wi(i,t,n){const s=Object.assign(Object.assign({},vs()),{[t]:n});return new jt("auth","Firebase",s).create(t,{appName:i.name})}function ge(i){return wi(i,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function St(i,...t){if(typeof i!="string"){const n=t[0],s=[...t.slice(1)];return s[0]&&(s[0].appName=i.name),i._errorFactory.create(n,...s)}return vi.create(i,...t)}function j(i,t,...n){if(!i)throw St(t,...n)}function te(i){const t="INTERNAL ASSERTION FAILED: "+i;throw Be(t),new Error(t)}function re(i,t){i||te(t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mt(){var i;return typeof self<"u"&&((i=self.location)===null||i===void 0?void 0:i.href)||""}function js(){return Wt()==="http:"||Wt()==="https:"}function Wt(){var i;return typeof self<"u"&&((i=self.location)===null||i===void 0?void 0:i.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ks(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&(js()||ln()||"connection"in navigator)?navigator.onLine:!0}function _s(){if(typeof navigator>"u")return null;const i=navigator;return i.languages&&i.languages[0]||i.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class De{constructor(t,n){this.shortDelay=t,this.longDelay=n,re(n>t,"Short delay should be less than long delay!"),this.isMobile=an()||on()}get(){return ks()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nt(i,t){re(i.emulator,"Emulator should always be set here");const{url:n}=i.emulator;return t?`${n}${t.startsWith("/")?t.slice(1):t}`:n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ji{static initialize(t,n,s){this.fetchImpl=t,n&&(this.headersImpl=n),s&&(this.responseImpl=s)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;te("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;te("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;te("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ss={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ns=new De(3e4,6e4);function be(i,t){return i.tenantId&&!t.tenantId?Object.assign(Object.assign({},t),{tenantId:i.tenantId}):t}async function fe(i,t,n,s,r={}){return ki(i,r,async()=>{let a={},o={};s&&(t==="GET"?o=s:a={body:JSON.stringify(s)});const l=Oe(Object.assign({key:i.config.apiKey},o)).slice(1),c=await i._getAdditionalHeaders();c["Content-Type"]="application/json",i.languageCode&&(c["X-Firebase-Locale"]=i.languageCode);const d=Object.assign({method:t,headers:c},a);return fn()||(d.referrerPolicy="no-referrer"),ji.fetch()(_i(i,i.config.apiHost,n,l),d)})}async function ki(i,t,n){i._canInitEmulator=!1;const s=Object.assign(Object.assign({},Ss),t);try{const r=new Ts(i),a=await Promise.race([n(),r.promise]);r.clearNetworkTimeout();const o=await a.json();if("needConfirmation"in o)throw ze(i,"account-exists-with-different-credential",o);if(a.ok&&!("errorMessage"in o))return o;{const l=a.ok?o.errorMessage:o.error.message,[c,d]=l.split(" : ");if(c==="FEDERATED_USER_ID_ALREADY_LINKED")throw ze(i,"credential-already-in-use",o);if(c==="EMAIL_EXISTS")throw ze(i,"email-already-in-use",o);if(c==="USER_DISABLED")throw ze(i,"user-disabled",o);const u=s[c]||c.toLowerCase().replace(/[_\s]+/g,"-");if(d)throw wi(i,u,d);G(i,u)}}catch(r){if(r instanceof tt)throw r;G(i,"network-request-failed",{message:String(r)})}}async function nt(i,t,n,s,r={}){const a=await fe(i,t,n,s,r);return"mfaPendingCredential"in a&&G(i,"multi-factor-auth-required",{_serverResponse:a}),a}function _i(i,t,n,s){const r=`${t}${n}?${s}`;return i.config.emulator?Nt(i.config,r):`${i.config.apiScheme}://${r}`}function Is(i){switch(i){case"ENFORCE":return"ENFORCE";case"AUDIT":return"AUDIT";case"OFF":return"OFF";default:return"ENFORCEMENT_STATE_UNSPECIFIED"}}class Ts{constructor(t){this.auth=t,this.timer=null,this.promise=new Promise((n,s)=>{this.timer=setTimeout(()=>s(K(this.auth,"network-request-failed")),Ns.get())})}clearNetworkTimeout(){clearTimeout(this.timer)}}function ze(i,t,n){const s={appName:i.name};n.email&&(s.email=n.email),n.phoneNumber&&(s.phoneNumber=n.phoneNumber);const r=K(i,t,s);return r.customData._tokenResponse=n,r}function Ht(i){return i!==void 0&&i.enterprise!==void 0}class Cs{constructor(t){if(this.siteKey="",this.recaptchaEnforcementState=[],t.recaptchaKey===void 0)throw new Error("recaptchaKey undefined");this.siteKey=t.recaptchaKey.split("/")[3],this.recaptchaEnforcementState=t.recaptchaEnforcementState}getProviderEnforcementState(t){if(!this.recaptchaEnforcementState||this.recaptchaEnforcementState.length===0)return null;for(const n of this.recaptchaEnforcementState)if(n.provider&&n.provider===t)return Is(n.enforcementState);return null}isProviderEnabled(t){return this.getProviderEnforcementState(t)==="ENFORCE"||this.getProviderEnforcementState(t)==="AUDIT"}}async function Es(i,t){return fe(i,"GET","/v2/recaptchaConfig",be(i,t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function As(i,t){return fe(i,"POST","/v1/accounts:delete",t)}async function Si(i,t){return fe(i,"POST","/v1/accounts:lookup",t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ae(i){if(i)try{const t=new Date(Number(i));if(!isNaN(t.getTime()))return t.toUTCString()}catch{}}async function Rs(i,t=!1){const n=X(i),s=await n.getIdToken(t),r=It(s);j(r&&r.exp&&r.auth_time&&r.iat,n.auth,"internal-error");const a=typeof r.firebase=="object"?r.firebase:void 0,o=a==null?void 0:a.sign_in_provider;return{claims:r,token:s,authTime:Ae(dt(r.auth_time)),issuedAtTime:Ae(dt(r.iat)),expirationTime:Ae(dt(r.exp)),signInProvider:o||null,signInSecondFactor:(a==null?void 0:a.sign_in_second_factor)||null}}function dt(i){return Number(i)*1e3}function It(i){const[t,n,s]=i.split(".");if(t===void 0||n===void 0||s===void 0)return Be("JWT malformed, contained fewer than 3 sections"),null;try{const r=dn(n);return r?JSON.parse(r):(Be("Failed to decode base64 JWT payload"),null)}catch(r){return Be("Caught error parsing JWT payload as JSON",r==null?void 0:r.toString()),null}}function qt(i){const t=It(i);return j(t,"internal-error"),j(typeof t.exp<"u","internal-error"),j(typeof t.iat<"u","internal-error"),Number(t.exp)-Number(t.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Re(i,t,n=!1){if(n)return t;try{return await t}catch(s){throw s instanceof tt&&Ps(s)&&i.auth.currentUser===i&&await i.auth.signOut(),s}}function Ps({code:i}){return i==="auth/user-disabled"||i==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Os{constructor(t){this.user=t,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(t){var n;if(t){const s=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),s}else{this.errorBackoff=3e4;const r=((n=this.user.stsTokenManager.expirationTime)!==null&&n!==void 0?n:0)-Date.now()-3e5;return Math.max(0,r)}}schedule(t=!1){if(!this.isRunning)return;const n=this.getInterval(t);this.timerId=setTimeout(async()=>{await this.iteration()},n)}async iteration(){try{await this.user.getIdToken(!0)}catch(t){(t==null?void 0:t.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xt{constructor(t,n){this.createdAt=t,this.lastLoginAt=n,this._initializeTime()}_initializeTime(){this.lastSignInTime=Ae(this.lastLoginAt),this.creationTime=Ae(this.createdAt)}_copy(t){this.createdAt=t.createdAt,this.lastLoginAt=t.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Xe(i){var t;const n=i.auth,s=await i.getIdToken(),r=await Re(i,Si(n,{idToken:s}));j(r==null?void 0:r.users.length,n,"internal-error");const a=r.users[0];i._notifyReloadListener(a);const o=!((t=a.providerUserInfo)===null||t===void 0)&&t.length?Ni(a.providerUserInfo):[],l=Fs(i.providerData,o),c=i.isAnonymous,d=!(i.email&&a.passwordHash)&&!(l!=null&&l.length),u=c?d:!1,f={uid:a.localId,displayName:a.displayName||null,photoURL:a.photoUrl||null,email:a.email||null,emailVerified:a.emailVerified||!1,phoneNumber:a.phoneNumber||null,tenantId:a.tenantId||null,providerData:l,metadata:new xt(a.createdAt,a.lastLoginAt),isAnonymous:u};Object.assign(i,f)}async function Ds(i){const t=X(i);await Xe(t),await t.auth._persistUserIfCurrent(t),t.auth._notifyListenersIfCurrent(t)}function Fs(i,t){return[...i.filter(s=>!t.some(r=>r.providerId===s.providerId)),...t]}function Ni(i){return i.map(t=>{var{providerId:n}=t,s=_t(t,["providerId"]);return{providerId:n,uid:s.rawId||"",displayName:s.displayName||null,email:s.email||null,phoneNumber:s.phoneNumber||null,photoURL:s.photoUrl||null}})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ls(i,t){const n=await ki(i,{},async()=>{const s=Oe({grant_type:"refresh_token",refresh_token:t}).slice(1),{tokenApiHost:r,apiKey:a}=i.config,o=_i(i,r,"/v1/token",`key=${a}`),l=await i._getAdditionalHeaders();return l["Content-Type"]="application/x-www-form-urlencoded",ji.fetch()(o,{method:"POST",headers:l,body:s})});return{accessToken:n.access_token,expiresIn:n.expires_in,refreshToken:n.refresh_token}}async function Us(i,t){return fe(i,"POST","/v2/accounts:revokeToken",be(i,t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class je{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(t){j(t.idToken,"internal-error"),j(typeof t.idToken<"u","internal-error"),j(typeof t.refreshToken<"u","internal-error");const n="expiresIn"in t&&typeof t.expiresIn<"u"?Number(t.expiresIn):qt(t.idToken);this.updateTokensAndExpiration(t.idToken,t.refreshToken,n)}updateFromIdToken(t){j(t.length!==0,"internal-error");const n=qt(t);this.updateTokensAndExpiration(t,null,n)}async getToken(t,n=!1){return!n&&this.accessToken&&!this.isExpired?this.accessToken:(j(this.refreshToken,t,"user-token-expired"),this.refreshToken?(await this.refresh(t,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(t,n){const{accessToken:s,refreshToken:r,expiresIn:a}=await Ls(t,n);this.updateTokensAndExpiration(s,r,Number(a))}updateTokensAndExpiration(t,n,s){this.refreshToken=n||null,this.accessToken=t||null,this.expirationTime=Date.now()+s*1e3}static fromJSON(t,n){const{refreshToken:s,accessToken:r,expirationTime:a}=n,o=new je;return s&&(j(typeof s=="string","internal-error",{appName:t}),o.refreshToken=s),r&&(j(typeof r=="string","internal-error",{appName:t}),o.accessToken=r),a&&(j(typeof a=="number","internal-error",{appName:t}),o.expirationTime=a),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(t){this.accessToken=t.accessToken,this.refreshToken=t.refreshToken,this.expirationTime=t.expirationTime}_clone(){return Object.assign(new je,this.toJSON())}_performRefresh(){return te("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function le(i,t){j(typeof i=="string"||typeof i>"u","internal-error",{appName:t})}class ie{constructor(t){var{uid:n,auth:s,stsTokenManager:r}=t,a=_t(t,["uid","auth","stsTokenManager"]);this.providerId="firebase",this.proactiveRefresh=new Os(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=n,this.auth=s,this.stsTokenManager=r,this.accessToken=r.accessToken,this.displayName=a.displayName||null,this.email=a.email||null,this.emailVerified=a.emailVerified||!1,this.phoneNumber=a.phoneNumber||null,this.photoURL=a.photoURL||null,this.isAnonymous=a.isAnonymous||!1,this.tenantId=a.tenantId||null,this.providerData=a.providerData?[...a.providerData]:[],this.metadata=new xt(a.createdAt||void 0,a.lastLoginAt||void 0)}async getIdToken(t){const n=await Re(this,this.stsTokenManager.getToken(this.auth,t));return j(n,this.auth,"internal-error"),this.accessToken!==n&&(this.accessToken=n,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),n}getIdTokenResult(t){return Rs(this,t)}reload(){return Ds(this)}_assign(t){this!==t&&(j(this.uid===t.uid,this.auth,"internal-error"),this.displayName=t.displayName,this.photoURL=t.photoURL,this.email=t.email,this.emailVerified=t.emailVerified,this.phoneNumber=t.phoneNumber,this.isAnonymous=t.isAnonymous,this.tenantId=t.tenantId,this.providerData=t.providerData.map(n=>Object.assign({},n)),this.metadata._copy(t.metadata),this.stsTokenManager._assign(t.stsTokenManager))}_clone(t){const n=new ie(Object.assign(Object.assign({},this),{auth:t,stsTokenManager:this.stsTokenManager._clone()}));return n.metadata._copy(this.metadata),n}_onReload(t){j(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=t,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(t){this.reloadListener?this.reloadListener(t):this.reloadUserInfo=t}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(t,n=!1){let s=!1;t.idToken&&t.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(t),s=!0),n&&await Xe(this),await this.auth._persistUserIfCurrent(this),s&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(ee(this.auth.app))return Promise.reject(ge(this.auth));const t=await this.getIdToken();return await Re(this,As(this.auth,{idToken:t})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return Object.assign(Object.assign({uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(t=>Object.assign({},t)),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId},this.metadata.toJSON()),{apiKey:this.auth.config.apiKey,appName:this.auth.name})}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(t,n){var s,r,a,o,l,c,d,u;const f=(s=n.displayName)!==null&&s!==void 0?s:void 0,w=(r=n.email)!==null&&r!==void 0?r:void 0,S=(a=n.phoneNumber)!==null&&a!==void 0?a:void 0,C=(o=n.photoURL)!==null&&o!==void 0?o:void 0,N=(l=n.tenantId)!==null&&l!==void 0?l:void 0,I=(c=n._redirectEventId)!==null&&c!==void 0?c:void 0,g=(d=n.createdAt)!==null&&d!==void 0?d:void 0,E=(u=n.lastLoginAt)!==null&&u!==void 0?u:void 0,{uid:m,emailVerified:k,isAnonymous:T,providerData:F,stsTokenManager:H}=n;j(m&&H,t,"internal-error");const U=je.fromJSON(this.name,H);j(typeof m=="string",t,"internal-error"),le(f,t.name),le(w,t.name),j(typeof k=="boolean",t,"internal-error"),j(typeof T=="boolean",t,"internal-error"),le(S,t.name),le(C,t.name),le(N,t.name),le(I,t.name),le(g,t.name),le(E,t.name);const z=new ie({uid:m,auth:t,email:w,emailVerified:k,displayName:f,isAnonymous:T,photoURL:C,phoneNumber:S,tenantId:N,stsTokenManager:U,createdAt:g,lastLoginAt:E});return F&&Array.isArray(F)&&(z.providerData=F.map(ae=>Object.assign({},ae))),I&&(z._redirectEventId=I),z}static async _fromIdTokenResponse(t,n,s=!1){const r=new je;r.updateFromServerResponse(n);const a=new ie({uid:n.localId,auth:t,stsTokenManager:r,isAnonymous:s});return await Xe(a),a}static async _fromGetAccountInfoResponse(t,n,s){const r=n.users[0];j(r.localId!==void 0,"internal-error");const a=r.providerUserInfo!==void 0?Ni(r.providerUserInfo):[],o=!(r.email&&r.passwordHash)&&!(a!=null&&a.length),l=new je;l.updateFromIdToken(s);const c=new ie({uid:r.localId,auth:t,stsTokenManager:l,isAnonymous:o}),d={uid:r.localId,displayName:r.displayName||null,photoURL:r.photoUrl||null,email:r.email||null,emailVerified:r.emailVerified||!1,phoneNumber:r.phoneNumber||null,tenantId:r.tenantId||null,providerData:a,metadata:new xt(r.createdAt,r.lastLoginAt),isAnonymous:!(r.email&&r.passwordHash)&&!(a!=null&&a.length)};return Object.assign(c,d),c}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vt=new Map;function ne(i){re(i instanceof Function,"Expected a class definition");let t=Vt.get(i);return t?(re(t instanceof i,"Instance stored in cache mismatched with class"),t):(t=new i,Vt.set(i,t),t)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ii{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(t,n){this.storage[t]=n}async _get(t){const n=this.storage[t];return n===void 0?null:n}async _remove(t){delete this.storage[t]}_addListener(t,n){}_removeListener(t,n){}}Ii.type="NONE";const $t=Ii;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function We(i,t,n){return`firebase:${i}:${t}:${n}`}class ke{constructor(t,n,s){this.persistence=t,this.auth=n,this.userKey=s;const{config:r,name:a}=this.auth;this.fullUserKey=We(this.userKey,r.apiKey,a),this.fullPersistenceKey=We("persistence",r.apiKey,a),this.boundEventHandler=n._onStorageEvent.bind(n),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(t){return this.persistence._set(this.fullUserKey,t.toJSON())}async getCurrentUser(){const t=await this.persistence._get(this.fullUserKey);return t?ie._fromJSON(this.auth,t):null}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(t){if(this.persistence===t)return;const n=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=t,n)return this.setCurrentUser(n)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(t,n,s="authUser"){if(!n.length)return new ke(ne($t),t,s);const r=(await Promise.all(n.map(async d=>{if(await d._isAvailable())return d}))).filter(d=>d);let a=r[0]||ne($t);const o=We(s,t.config.apiKey,t.name);let l=null;for(const d of n)try{const u=await d._get(o);if(u){const f=ie._fromJSON(t,u);d!==a&&(l=f),a=d;break}}catch{}const c=r.filter(d=>d._shouldAllowMigration);return!a._shouldAllowMigration||!c.length?new ke(a,t,s):(a=c[0],l&&await a._set(o,l.toJSON()),await Promise.all(n.map(async d=>{if(d!==a)try{await d._remove(o)}catch{}})),new ke(a,t,s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Gt(i){const t=i.toLowerCase();if(t.includes("opera/")||t.includes("opr/")||t.includes("opios/"))return"Opera";if(Ai(t))return"IEMobile";if(t.includes("msie")||t.includes("trident/"))return"IE";if(t.includes("edge/"))return"Edge";if(Ti(t))return"Firefox";if(t.includes("silk/"))return"Silk";if(Pi(t))return"Blackberry";if(Oi(t))return"Webos";if(Ci(t))return"Safari";if((t.includes("chrome/")||Ei(t))&&!t.includes("edge/"))return"Chrome";if(Ri(t))return"Android";{const n=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,s=i.match(n);if((s==null?void 0:s.length)===2)return s[1]}return"Other"}function Ti(i=W()){return/firefox\//i.test(i)}function Ci(i=W()){const t=i.toLowerCase();return t.includes("safari/")&&!t.includes("chrome/")&&!t.includes("crios/")&&!t.includes("android")}function Ei(i=W()){return/crios\//i.test(i)}function Ai(i=W()){return/iemobile/i.test(i)}function Ri(i=W()){return/android/i.test(i)}function Pi(i=W()){return/blackberry/i.test(i)}function Oi(i=W()){return/webos/i.test(i)}function Tt(i=W()){return/iphone|ipad|ipod/i.test(i)||/macintosh/i.test(i)&&/mobile/i.test(i)}function zs(i=W()){var t;return Tt(i)&&!!(!((t=window.navigator)===null||t===void 0)&&t.standalone)}function Ms(){return un()&&document.documentMode===10}function Di(i=W()){return Tt(i)||Ri(i)||Oi(i)||Pi(i)||/windows phone/i.test(i)||Ai(i)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fi(i,t=[]){let n;switch(i){case"Browser":n=Gt(W());break;case"Worker":n=`${Gt(W())}-${i}`;break;default:n=i}const s=t.length?t.join(","):"FirebaseCore-web";return`${n}/JsCore/${Ne}/${s}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bs{constructor(t){this.auth=t,this.queue=[]}pushCallback(t,n){const s=a=>new Promise((o,l)=>{try{const c=t(a);o(c)}catch(c){l(c)}});s.onAbort=n,this.queue.push(s);const r=this.queue.length-1;return()=>{this.queue[r]=()=>Promise.resolve()}}async runMiddleware(t){if(this.auth.currentUser===t)return;const n=[];try{for(const s of this.queue)await s(t),s.onAbort&&n.push(s.onAbort)}catch(s){n.reverse();for(const r of n)try{r()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:s==null?void 0:s.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ws(i,t={}){return fe(i,"GET","/v2/passwordPolicy",be(i,t))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hs=6;class qs{constructor(t){var n,s,r,a;const o=t.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=(n=o.minPasswordLength)!==null&&n!==void 0?n:Hs,o.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=o.maxPasswordLength),o.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=o.containsLowercaseCharacter),o.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=o.containsUppercaseCharacter),o.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=o.containsNumericCharacter),o.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=o.containsNonAlphanumericCharacter),this.enforcementState=t.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=(r=(s=t.allowedNonAlphanumericCharacters)===null||s===void 0?void 0:s.join(""))!==null&&r!==void 0?r:"",this.forceUpgradeOnSignin=(a=t.forceUpgradeOnSignin)!==null&&a!==void 0?a:!1,this.schemaVersion=t.schemaVersion}validatePassword(t){var n,s,r,a,o,l;const c={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(t,c),this.validatePasswordCharacterOptions(t,c),c.isValid&&(c.isValid=(n=c.meetsMinPasswordLength)!==null&&n!==void 0?n:!0),c.isValid&&(c.isValid=(s=c.meetsMaxPasswordLength)!==null&&s!==void 0?s:!0),c.isValid&&(c.isValid=(r=c.containsLowercaseLetter)!==null&&r!==void 0?r:!0),c.isValid&&(c.isValid=(a=c.containsUppercaseLetter)!==null&&a!==void 0?a:!0),c.isValid&&(c.isValid=(o=c.containsNumericCharacter)!==null&&o!==void 0?o:!0),c.isValid&&(c.isValid=(l=c.containsNonAlphanumericCharacter)!==null&&l!==void 0?l:!0),c}validatePasswordLengthOptions(t,n){const s=this.customStrengthOptions.minPasswordLength,r=this.customStrengthOptions.maxPasswordLength;s&&(n.meetsMinPasswordLength=t.length>=s),r&&(n.meetsMaxPasswordLength=t.length<=r)}validatePasswordCharacterOptions(t,n){this.updatePasswordCharacterOptionsStatuses(n,!1,!1,!1,!1);let s;for(let r=0;r<t.length;r++)s=t.charAt(r),this.updatePasswordCharacterOptionsStatuses(n,s>="a"&&s<="z",s>="A"&&s<="Z",s>="0"&&s<="9",this.allowedNonAlphanumericCharacters.includes(s))}updatePasswordCharacterOptionsStatuses(t,n,s,r,a){this.customStrengthOptions.containsLowercaseLetter&&(t.containsLowercaseLetter||(t.containsLowercaseLetter=n)),this.customStrengthOptions.containsUppercaseLetter&&(t.containsUppercaseLetter||(t.containsUppercaseLetter=s)),this.customStrengthOptions.containsNumericCharacter&&(t.containsNumericCharacter||(t.containsNumericCharacter=r)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(t.containsNonAlphanumericCharacter||(t.containsNonAlphanumericCharacter=a))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vs{constructor(t,n,s,r){this.app=t,this.heartbeatServiceProvider=n,this.appCheckServiceProvider=s,this.config=r,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Kt(this),this.idTokenSubscription=new Kt(this),this.beforeStateQueue=new Bs(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=vi,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=t.name,this.clientVersion=r.sdkClientVersion}_initializeWithPersistence(t,n){return n&&(this._popupRedirectResolver=ne(n)),this._initializationPromise=this.queue(async()=>{var s,r;if(!this._deleted&&(this.persistenceManager=await ke.create(this,t),!this._deleted)){if(!((s=this._popupRedirectResolver)===null||s===void 0)&&s._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(n),this.lastNotifiedUid=((r=this.currentUser)===null||r===void 0?void 0:r.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const t=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!t)){if(this.currentUser&&t&&this.currentUser.uid===t.uid){this._currentUser._assign(t),await this.currentUser.getIdToken();return}await this._updateCurrentUser(t,!0)}}async initializeCurrentUserFromIdToken(t){try{const n=await Si(this,{idToken:t}),s=await ie._fromGetAccountInfoResponse(this,n,t);await this.directlySetCurrentUser(s)}catch(n){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",n),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(t){var n;if(ee(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(l=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(l,l))}):this.directlySetCurrentUser(null)}const s=await this.assertedPersistence.getCurrentUser();let r=s,a=!1;if(t&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(n=this.redirectUser)===null||n===void 0?void 0:n._redirectEventId,l=r==null?void 0:r._redirectEventId,c=await this.tryRedirectSignIn(t);(!o||o===l)&&(c!=null&&c.user)&&(r=c.user,a=!0)}if(!r)return this.directlySetCurrentUser(null);if(!r._redirectEventId){if(a)try{await this.beforeStateQueue.runMiddleware(r)}catch(o){r=s,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return r?this.reloadAndSetCurrentUserOrClear(r):this.directlySetCurrentUser(null)}return j(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===r._redirectEventId?this.directlySetCurrentUser(r):this.reloadAndSetCurrentUserOrClear(r)}async tryRedirectSignIn(t){let n=null;try{n=await this._popupRedirectResolver._completeRedirectFn(this,t,!0)}catch{await this._setRedirectUser(null)}return n}async reloadAndSetCurrentUserOrClear(t){try{await Xe(t)}catch(n){if((n==null?void 0:n.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(t)}useDeviceLanguage(){this.languageCode=_s()}async _delete(){this._deleted=!0}async updateCurrentUser(t){if(ee(this.app))return Promise.reject(ge(this));const n=t?X(t):null;return n&&j(n.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(n&&n._clone(this))}async _updateCurrentUser(t,n=!1){if(!this._deleted)return t&&j(this.tenantId===t.tenantId,this,"tenant-id-mismatch"),n||await this.beforeStateQueue.runMiddleware(t),this.queue(async()=>{await this.directlySetCurrentUser(t),this.notifyAuthListeners()})}async signOut(){return ee(this.app)?Promise.reject(ge(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(t){return ee(this.app)?Promise.reject(ge(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(ne(t))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(t){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const n=this._getPasswordPolicyInternal();return n.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):n.validatePassword(t)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const t=await Ws(this),n=new qs(t);this.tenantId===null?this._projectPasswordPolicy=n:this._tenantPasswordPolicies[this.tenantId]=n}_getPersistence(){return this.assertedPersistence.persistence.type}_updateErrorMap(t){this._errorFactory=new jt("auth","Firebase",t())}onAuthStateChanged(t,n,s){return this.registerStateListener(this.authStateSubscription,t,n,s)}beforeAuthStateChanged(t,n){return this.beforeStateQueue.pushCallback(t,n)}onIdTokenChanged(t,n,s){return this.registerStateListener(this.idTokenSubscription,t,n,s)}authStateReady(){return new Promise((t,n)=>{if(this.currentUser)t();else{const s=this.onAuthStateChanged(()=>{s(),t()},n)}})}async revokeAccessToken(t){if(this.currentUser){const n=await this.currentUser.getIdToken(),s={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:t,idToken:n};this.tenantId!=null&&(s.tenantId=this.tenantId),await Us(this,s)}}toJSON(){var t;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(t=this._currentUser)===null||t===void 0?void 0:t.toJSON()}}async _setRedirectUser(t,n){const s=await this.getOrInitRedirectPersistenceManager(n);return t===null?s.removeCurrentUser():s.setCurrentUser(t)}async getOrInitRedirectPersistenceManager(t){if(!this.redirectPersistenceManager){const n=t&&ne(t)||this._popupRedirectResolver;j(n,this,"argument-error"),this.redirectPersistenceManager=await ke.create(this,[ne(n._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(t){var n,s;return this._isInitialized&&await this.queue(async()=>{}),((n=this._currentUser)===null||n===void 0?void 0:n._redirectEventId)===t?this._currentUser:((s=this.redirectUser)===null||s===void 0?void 0:s._redirectEventId)===t?this.redirectUser:null}async _persistUserIfCurrent(t){if(t===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(t))}_notifyListenersIfCurrent(t){t===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t,n;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const s=(n=(t=this.currentUser)===null||t===void 0?void 0:t.uid)!==null&&n!==void 0?n:null;this.lastNotifiedUid!==s&&(this.lastNotifiedUid=s,this.authStateSubscription.next(this.currentUser))}registerStateListener(t,n,s,r){if(this._deleted)return()=>{};const a=typeof n=="function"?n:n.next.bind(n);let o=!1;const l=this._isInitialized?Promise.resolve():this._initializationPromise;if(j(l,this,"internal-error"),l.then(()=>{o||a(this.currentUser)}),typeof n=="function"){const c=t.addObserver(n,s,r);return()=>{o=!0,c()}}else{const c=t.addObserver(n);return()=>{o=!0,c()}}}async directlySetCurrentUser(t){this.currentUser&&this.currentUser!==t&&this._currentUser._stopProactiveRefresh(),t&&this.isProactiveRefreshEnabled&&t._startProactiveRefresh(),this.currentUser=t,t?await this.assertedPersistence.setCurrentUser(t):await this.assertedPersistence.removeCurrentUser()}queue(t){return this.operations=this.operations.then(t,t),this.operations}get assertedPersistence(){return j(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(t){!t||this.frameworks.includes(t)||(this.frameworks.push(t),this.frameworks.sort(),this.clientVersion=Fi(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var t;const n={"X-Client-Version":this.clientVersion};this.app.options.appId&&(n["X-Firebase-gmpid"]=this.app.options.appId);const s=await((t=this.heartbeatServiceProvider.getImmediate({optional:!0}))===null||t===void 0?void 0:t.getHeartbeatsHeader());s&&(n["X-Firebase-Client"]=s);const r=await this._getAppCheckToken();return r&&(n["X-Firebase-AppCheck"]=r),n}async _getAppCheckToken(){var t;const n=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))===null||t===void 0?void 0:t.getToken());return n!=null&&n.error&&ws(`Error while retrieving App Check token: ${n.error}`),n==null?void 0:n.token}}function Ie(i){return X(i)}class Kt{constructor(t){this.auth=t,this.observer=null,this.addObserver=cn(n=>this.observer=n)}get next(){return j(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let st={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function $s(i){st=i}function Li(i){return st.loadJS(i)}function Gs(){return st.recaptchaEnterpriseScript}function Ks(){return st.gapiScript}function Ys(i){return`__${i}${Math.floor(Math.random()*1e6)}`}const Js="recaptcha-enterprise",Xs="NO_RECAPTCHA";class Qs{constructor(t){this.type=Js,this.auth=Ie(t)}async verify(t="verify",n=!1){async function s(a){if(!n){if(a.tenantId==null&&a._agentRecaptchaConfig!=null)return a._agentRecaptchaConfig.siteKey;if(a.tenantId!=null&&a._tenantRecaptchaConfigs[a.tenantId]!==void 0)return a._tenantRecaptchaConfigs[a.tenantId].siteKey}return new Promise(async(o,l)=>{Es(a,{clientType:"CLIENT_TYPE_WEB",version:"RECAPTCHA_ENTERPRISE"}).then(c=>{if(c.recaptchaKey===void 0)l(new Error("recaptcha Enterprise site key undefined"));else{const d=new Cs(c);return a.tenantId==null?a._agentRecaptchaConfig=d:a._tenantRecaptchaConfigs[a.tenantId]=d,o(d.siteKey)}}).catch(c=>{l(c)})})}function r(a,o,l){const c=window.grecaptcha;Ht(c)?c.enterprise.ready(()=>{c.enterprise.execute(a,{action:t}).then(d=>{o(d)}).catch(()=>{o(Xs)})}):l(Error("No reCAPTCHA enterprise script loaded."))}return new Promise((a,o)=>{s(this.auth).then(l=>{if(!n&&Ht(window.grecaptcha))r(l,a,o);else{if(typeof window>"u"){o(new Error("RecaptchaVerifier is only supported in browser"));return}let c=Gs();c.length!==0&&(c+=l),Li(c).then(()=>{r(l,a,o)}).catch(d=>{o(d)})}}).catch(l=>{o(l)})})}}async function Yt(i,t,n,s=!1){const r=new Qs(i);let a;try{a=await r.verify(n)}catch{a=await r.verify(n,!0)}const o=Object.assign({},t);return s?Object.assign(o,{captchaResp:a}):Object.assign(o,{captchaResponse:a}),Object.assign(o,{clientType:"CLIENT_TYPE_WEB"}),Object.assign(o,{recaptchaVersion:"RECAPTCHA_ENTERPRISE"}),o}async function Jt(i,t,n,s){var r;if(!((r=i._getRecaptchaConfig())===null||r===void 0)&&r.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")){const a=await Yt(i,t,n,n==="getOobCode");return s(i,a)}else return s(i,t).catch(async a=>{if(a.code==="auth/missing-recaptcha-token"){console.log(`${n} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);const o=await Yt(i,t,n,n==="getOobCode");return s(i,o)}else return Promise.reject(a)})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Zs(i,t){const n=wt(i,"auth");if(n.isInitialized()){const r=n.getImmediate(),a=n.getOptions();if(hn(a,t??{}))return r;G(r,"already-initialized")}return n.initialize({options:t})}function er(i,t){const n=(t==null?void 0:t.persistence)||[],s=(Array.isArray(n)?n:[n]).map(ne);t!=null&&t.errorMap&&i._updateErrorMap(t.errorMap),i._initializeWithPersistence(s,t==null?void 0:t.popupRedirectResolver)}function tr(i,t,n){const s=Ie(i);j(s._canInitEmulator,s,"emulator-config-failed"),j(/^https?:\/\//.test(t),s,"invalid-emulator-scheme");const r=!1,a=Ui(t),{host:o,port:l}=ir(t),c=l===null?"":`:${l}`;s.config.emulator={url:`${a}//${o}${c}/`},s.settings.appVerificationDisabledForTesting=!0,s.emulatorConfig=Object.freeze({host:o,port:l,protocol:a.replace(":",""),options:Object.freeze({disableWarnings:r})}),nr()}function Ui(i){const t=i.indexOf(":");return t<0?"":i.substr(0,t+1)}function ir(i){const t=Ui(i),n=/(\/\/)?([^?#/]+)/.exec(i.substr(t.length));if(!n)return{host:"",port:null};const s=n[2].split("@").pop()||"",r=/^(\[[^\]]+\])(:|$)/.exec(s);if(r){const a=r[1];return{host:a,port:Xt(s.substr(a.length+1))}}else{const[a,o]=s.split(":");return{host:a,port:Xt(o)}}}function Xt(i){if(!i)return null;const t=Number(i);return isNaN(t)?null:t}function nr(){function i(){const t=document.createElement("p"),n=t.style;t.innerText="Running in emulator mode. Do not use with production credentials.",n.position="fixed",n.width="100%",n.backgroundColor="#ffffff",n.border=".1em solid #000000",n.color="#b50000",n.bottom="0px",n.left="0px",n.margin="0px",n.zIndex="10000",n.textAlign="center",t.classList.add("firebase-emulator-warning"),document.body.appendChild(t)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",i):i())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ct{constructor(t,n){this.providerId=t,this.signInMethod=n}toJSON(){return te("not implemented")}_getIdTokenResponse(t){return te("not implemented")}_linkToIdToken(t,n){return te("not implemented")}_getReauthenticationResolver(t){return te("not implemented")}}async function sr(i,t){return fe(i,"POST","/v1/accounts:signUp",t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function rr(i,t){return nt(i,"POST","/v1/accounts:signInWithPassword",be(i,t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ar(i,t){return nt(i,"POST","/v1/accounts:signInWithEmailLink",be(i,t))}async function or(i,t){return nt(i,"POST","/v1/accounts:signInWithEmailLink",be(i,t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pe extends Ct{constructor(t,n,s,r=null){super("password",s),this._email=t,this._password=n,this._tenantId=r}static _fromEmailAndPassword(t,n){return new Pe(t,n,"password")}static _fromEmailAndCode(t,n,s=null){return new Pe(t,n,"emailLink",s)}toJSON(){return{email:this._email,password:this._password,signInMethod:this.signInMethod,tenantId:this._tenantId}}static fromJSON(t){const n=typeof t=="string"?JSON.parse(t):t;if(n!=null&&n.email&&(n!=null&&n.password)){if(n.signInMethod==="password")return this._fromEmailAndPassword(n.email,n.password);if(n.signInMethod==="emailLink")return this._fromEmailAndCode(n.email,n.password,n.tenantId)}return null}async _getIdTokenResponse(t){switch(this.signInMethod){case"password":const n={returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Jt(t,n,"signInWithPassword",rr);case"emailLink":return ar(t,{email:this._email,oobCode:this._password});default:G(t,"internal-error")}}async _linkToIdToken(t,n){switch(this.signInMethod){case"password":const s={idToken:n,returnSecureToken:!0,email:this._email,password:this._password,clientType:"CLIENT_TYPE_WEB"};return Jt(t,s,"signUpPassword",sr);case"emailLink":return or(t,{idToken:n,email:this._email,oobCode:this._password});default:G(t,"internal-error")}}_getReauthenticationResolver(t){return this._getIdTokenResponse(t)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function _e(i,t){return nt(i,"POST","/v1/accounts:signInWithIdp",be(i,t))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const lr="http://localhost";class xe extends Ct{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(t){const n=new xe(t.providerId,t.signInMethod);return t.idToken||t.accessToken?(t.idToken&&(n.idToken=t.idToken),t.accessToken&&(n.accessToken=t.accessToken),t.nonce&&!t.pendingToken&&(n.nonce=t.nonce),t.pendingToken&&(n.pendingToken=t.pendingToken)):t.oauthToken&&t.oauthTokenSecret?(n.accessToken=t.oauthToken,n.secret=t.oauthTokenSecret):G("argument-error"),n}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(t){const n=typeof t=="string"?JSON.parse(t):t,{providerId:s,signInMethod:r}=n,a=_t(n,["providerId","signInMethod"]);if(!s||!r)return null;const o=new xe(s,r);return o.idToken=a.idToken||void 0,o.accessToken=a.accessToken||void 0,o.secret=a.secret,o.nonce=a.nonce,o.pendingToken=a.pendingToken||null,o}_getIdTokenResponse(t){const n=this.buildRequest();return _e(t,n)}_linkToIdToken(t,n){const s=this.buildRequest();return s.idToken=n,_e(t,s)}_getReauthenticationResolver(t){const n=this.buildRequest();return n.autoCreate=!1,_e(t,n)}buildRequest(){const t={requestUri:lr,returnSecureToken:!0};if(this.pendingToken)t.pendingToken=this.pendingToken;else{const n={};this.idToken&&(n.id_token=this.idToken),this.accessToken&&(n.access_token=this.accessToken),this.secret&&(n.oauth_token_secret=this.secret),n.providerId=this.providerId,this.nonce&&!this.pendingToken&&(n.nonce=this.nonce),t.postBody=Oe(n)}return t}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function cr(i){switch(i){case"recoverEmail":return"RECOVER_EMAIL";case"resetPassword":return"PASSWORD_RESET";case"signIn":return"EMAIL_SIGNIN";case"verifyEmail":return"VERIFY_EMAIL";case"verifyAndChangeEmail":return"VERIFY_AND_CHANGE_EMAIL";case"revertSecondFactorAddition":return"REVERT_SECOND_FACTOR_ADDITION";default:return null}}function dr(i){const t=Ce(Ee(i)).link,n=t?Ce(Ee(t)).deep_link_id:null,s=Ce(Ee(i)).deep_link_id;return(s?Ce(Ee(s)).link:null)||s||n||t||i}class Et{constructor(t){var n,s,r,a,o,l;const c=Ce(Ee(t)),d=(n=c.apiKey)!==null&&n!==void 0?n:null,u=(s=c.oobCode)!==null&&s!==void 0?s:null,f=cr((r=c.mode)!==null&&r!==void 0?r:null);j(d&&u&&f,"argument-error"),this.apiKey=d,this.operation=f,this.code=u,this.continueUrl=(a=c.continueUrl)!==null&&a!==void 0?a:null,this.languageCode=(o=c.languageCode)!==null&&o!==void 0?o:null,this.tenantId=(l=c.tenantId)!==null&&l!==void 0?l:null}static parseLink(t){const n=dr(t);try{return new Et(n)}catch{return null}}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Te{constructor(){this.providerId=Te.PROVIDER_ID}static credential(t,n){return Pe._fromEmailAndPassword(t,n)}static credentialWithLink(t,n){const s=Et.parseLink(n);return j(s,"argument-error"),Pe._fromEmailAndCode(t,s.code,s.tenantId)}}Te.PROVIDER_ID="password";Te.EMAIL_PASSWORD_SIGN_IN_METHOD="password";Te.EMAIL_LINK_SIGN_IN_METHOD="emailLink";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zi{constructor(t){this.providerId=t,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(t){this.defaultLanguageCode=t}setCustomParameters(t){return this.customParameters=t,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fe extends zi{constructor(){super(...arguments),this.scopes=[]}addScope(t){return this.scopes.includes(t)||this.scopes.push(t),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ce extends Fe{constructor(){super("facebook.com")}static credential(t){return xe._fromParams({providerId:ce.PROVIDER_ID,signInMethod:ce.FACEBOOK_SIGN_IN_METHOD,accessToken:t})}static credentialFromResult(t){return ce.credentialFromTaggedObject(t)}static credentialFromError(t){return ce.credentialFromTaggedObject(t.customData||{})}static credentialFromTaggedObject({_tokenResponse:t}){if(!t||!("oauthAccessToken"in t)||!t.oauthAccessToken)return null;try{return ce.credential(t.oauthAccessToken)}catch{return null}}}ce.FACEBOOK_SIGN_IN_METHOD="facebook.com";ce.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class de extends Fe{constructor(){super("google.com"),this.addScope("profile")}static credential(t,n){return xe._fromParams({providerId:de.PROVIDER_ID,signInMethod:de.GOOGLE_SIGN_IN_METHOD,idToken:t,accessToken:n})}static credentialFromResult(t){return de.credentialFromTaggedObject(t)}static credentialFromError(t){return de.credentialFromTaggedObject(t.customData||{})}static credentialFromTaggedObject({_tokenResponse:t}){if(!t)return null;const{oauthIdToken:n,oauthAccessToken:s}=t;if(!n&&!s)return null;try{return de.credential(n,s)}catch{return null}}}de.GOOGLE_SIGN_IN_METHOD="google.com";de.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pe extends Fe{constructor(){super("github.com")}static credential(t){return xe._fromParams({providerId:pe.PROVIDER_ID,signInMethod:pe.GITHUB_SIGN_IN_METHOD,accessToken:t})}static credentialFromResult(t){return pe.credentialFromTaggedObject(t)}static credentialFromError(t){return pe.credentialFromTaggedObject(t.customData||{})}static credentialFromTaggedObject({_tokenResponse:t}){if(!t||!("oauthAccessToken"in t)||!t.oauthAccessToken)return null;try{return pe.credential(t.oauthAccessToken)}catch{return null}}}pe.GITHUB_SIGN_IN_METHOD="github.com";pe.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class he extends Fe{constructor(){super("twitter.com")}static credential(t,n){return xe._fromParams({providerId:he.PROVIDER_ID,signInMethod:he.TWITTER_SIGN_IN_METHOD,oauthToken:t,oauthTokenSecret:n})}static credentialFromResult(t){return he.credentialFromTaggedObject(t)}static credentialFromError(t){return he.credentialFromTaggedObject(t.customData||{})}static credentialFromTaggedObject({_tokenResponse:t}){if(!t)return null;const{oauthAccessToken:n,oauthTokenSecret:s}=t;if(!n||!s)return null;try{return he.credential(n,s)}catch{return null}}}he.TWITTER_SIGN_IN_METHOD="twitter.com";he.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Se{constructor(t){this.user=t.user,this.providerId=t.providerId,this._tokenResponse=t._tokenResponse,this.operationType=t.operationType}static async _fromIdTokenResponse(t,n,s,r=!1){const a=await ie._fromIdTokenResponse(t,s,r),o=Qt(s);return new Se({user:a,providerId:o,_tokenResponse:s,operationType:n})}static async _forOperation(t,n,s){await t._updateTokensIfNecessary(s,!0);const r=Qt(s);return new Se({user:t,providerId:r,_tokenResponse:s,operationType:n})}}function Qt(i){return i.providerId?i.providerId:"phoneNumber"in i?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qe extends tt{constructor(t,n,s,r){var a;super(n.code,n.message),this.operationType=s,this.user=r,Object.setPrototypeOf(this,Qe.prototype),this.customData={appName:t.name,tenantId:(a=t.tenantId)!==null&&a!==void 0?a:void 0,_serverResponse:n.customData._serverResponse,operationType:s}}static _fromErrorAndOperation(t,n,s,r){return new Qe(t,n,s,r)}}function Mi(i,t,n,s){return(t==="reauthenticate"?n._getReauthenticationResolver(i):n._getIdTokenResponse(i)).catch(a=>{throw a.code==="auth/multi-factor-auth-required"?Qe._fromErrorAndOperation(i,a,t,s):a})}async function pr(i,t,n=!1){const s=await Re(i,t._linkToIdToken(i.auth,await i.getIdToken()),n);return Se._forOperation(i,"link",s)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function hr(i,t,n=!1){const{auth:s}=i;if(ee(s.app))return Promise.reject(ge(s));const r="reauthenticate";try{const a=await Re(i,Mi(s,r,t,i),n);j(a.idToken,s,"internal-error");const o=It(a.idToken);j(o,s,"internal-error");const{sub:l}=o;return j(i.uid===l,s,"user-mismatch"),Se._forOperation(i,r,a)}catch(a){throw(a==null?void 0:a.code)==="auth/user-not-found"&&G(s,"user-mismatch"),a}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Bi(i,t,n=!1){if(ee(i.app))return Promise.reject(ge(i));const s="signIn",r=await Mi(i,s,t),a=await Se._fromIdTokenResponse(i,s,r);return n||await i._updateCurrentUser(a.user),a}async function ur(i,t){return Bi(Ie(i),t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function gr(i){const t=Ie(i);t._getPasswordPolicyInternal()&&await t._updatePasswordPolicy()}function fr(i,t,n){return ee(i.app)?Promise.reject(ge(i)):ur(X(i),Te.credential(t,n)).catch(async s=>{throw s.code==="auth/password-does-not-meet-requirements"&&gr(i),s})}function mr(i,t,n,s){return X(i).onIdTokenChanged(t,n,s)}function xr(i,t,n){return X(i).beforeAuthStateChanged(t,n)}function br(i,t,n,s){return X(i).onAuthStateChanged(t,n,s)}function yr(i){return X(i).signOut()}const Ze="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wi{constructor(t,n){this.storageRetriever=t,this.type=n}_isAvailable(){try{return this.storage?(this.storage.setItem(Ze,"1"),this.storage.removeItem(Ze),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(t,n){return this.storage.setItem(t,JSON.stringify(n)),Promise.resolve()}_get(t){const n=this.storage.getItem(t);return Promise.resolve(n?JSON.parse(n):null)}_remove(t){return this.storage.removeItem(t),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vr=1e3,wr=10;class Hi extends Wi{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(t,n)=>this.onStorageEvent(t,n),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Di(),this._shouldAllowMigration=!0}forAllChangedKeys(t){for(const n of Object.keys(this.listeners)){const s=this.storage.getItem(n),r=this.localCache[n];s!==r&&t(n,r,s)}}onStorageEvent(t,n=!1){if(!t.key){this.forAllChangedKeys((o,l,c)=>{this.notifyListeners(o,c)});return}const s=t.key;n?this.detachListener():this.stopPolling();const r=()=>{const o=this.storage.getItem(s);!n&&this.localCache[s]===o||this.notifyListeners(s,o)},a=this.storage.getItem(s);Ms()&&a!==t.newValue&&t.newValue!==t.oldValue?setTimeout(r,wr):r()}notifyListeners(t,n){this.localCache[t]=n;const s=this.listeners[t];if(s)for(const r of Array.from(s))r(n&&JSON.parse(n))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((t,n,s)=>{this.onStorageEvent(new StorageEvent("storage",{key:t,oldValue:n,newValue:s}),!0)})},vr)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(t,n){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[t]||(this.listeners[t]=new Set,this.localCache[t]=this.storage.getItem(t)),this.listeners[t].add(n)}_removeListener(t,n){this.listeners[t]&&(this.listeners[t].delete(n),this.listeners[t].size===0&&delete this.listeners[t]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(t,n){await super._set(t,n),this.localCache[t]=JSON.stringify(n)}async _get(t){const n=await super._get(t);return this.localCache[t]=JSON.stringify(n),n}async _remove(t){await super._remove(t),delete this.localCache[t]}}Hi.type="LOCAL";const jr=Hi;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qi extends Wi{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(t,n){}_removeListener(t,n){}}qi.type="SESSION";const Vi=qi;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function kr(i){return Promise.all(i.map(async t=>{try{return{fulfilled:!0,value:await t}}catch(n){return{fulfilled:!1,reason:n}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rt{constructor(t){this.eventTarget=t,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(t){const n=this.receivers.find(r=>r.isListeningto(t));if(n)return n;const s=new rt(t);return this.receivers.push(s),s}isListeningto(t){return this.eventTarget===t}async handleEvent(t){const n=t,{eventId:s,eventType:r,data:a}=n.data,o=this.handlersMap[r];if(!(o!=null&&o.size))return;n.ports[0].postMessage({status:"ack",eventId:s,eventType:r});const l=Array.from(o).map(async d=>d(n.origin,a)),c=await kr(l);n.ports[0].postMessage({status:"done",eventId:s,eventType:r,response:c})}_subscribe(t,n){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[t]||(this.handlersMap[t]=new Set),this.handlersMap[t].add(n)}_unsubscribe(t,n){this.handlersMap[t]&&n&&this.handlersMap[t].delete(n),(!n||this.handlersMap[t].size===0)&&delete this.handlersMap[t],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}rt.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function At(i="",t=10){let n="";for(let s=0;s<t;s++)n+=Math.floor(Math.random()*10);return i+n}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _r{constructor(t){this.target=t,this.handlers=new Set}removeMessageHandler(t){t.messageChannel&&(t.messageChannel.port1.removeEventListener("message",t.onMessage),t.messageChannel.port1.close()),this.handlers.delete(t)}async _send(t,n,s=50){const r=typeof MessageChannel<"u"?new MessageChannel:null;if(!r)throw new Error("connection_unavailable");let a,o;return new Promise((l,c)=>{const d=At("",20);r.port1.start();const u=setTimeout(()=>{c(new Error("unsupported_event"))},s);o={messageChannel:r,onMessage(f){const w=f;if(w.data.eventId===d)switch(w.data.status){case"ack":clearTimeout(u),a=setTimeout(()=>{c(new Error("timeout"))},3e3);break;case"done":clearTimeout(a),l(w.data.response);break;default:clearTimeout(u),clearTimeout(a),c(new Error("invalid_response"));break}}},this.handlers.add(o),r.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:t,eventId:d,data:n},[r.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Y(){return window}function Sr(i){Y().location.href=i}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $i(){return typeof Y().WorkerGlobalScope<"u"&&typeof Y().importScripts=="function"}async function Nr(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function Ir(){var i;return((i=navigator==null?void 0:navigator.serviceWorker)===null||i===void 0?void 0:i.controller)||null}function Tr(){return $i()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gi="firebaseLocalStorageDb",Cr=1,et="firebaseLocalStorage",Ki="fbase_key";class Le{constructor(t){this.request=t}toPromise(){return new Promise((t,n)=>{this.request.addEventListener("success",()=>{t(this.request.result)}),this.request.addEventListener("error",()=>{n(this.request.error)})})}}function at(i,t){return i.transaction([et],t?"readwrite":"readonly").objectStore(et)}function Er(){const i=indexedDB.deleteDatabase(Gi);return new Le(i).toPromise()}function bt(){const i=indexedDB.open(Gi,Cr);return new Promise((t,n)=>{i.addEventListener("error",()=>{n(i.error)}),i.addEventListener("upgradeneeded",()=>{const s=i.result;try{s.createObjectStore(et,{keyPath:Ki})}catch(r){n(r)}}),i.addEventListener("success",async()=>{const s=i.result;s.objectStoreNames.contains(et)?t(s):(s.close(),await Er(),t(await bt()))})})}async function Zt(i,t,n){const s=at(i,!0).put({[Ki]:t,value:n});return new Le(s).toPromise()}async function Ar(i,t){const n=at(i,!1).get(t),s=await new Le(n).toPromise();return s===void 0?null:s.value}function ei(i,t){const n=at(i,!0).delete(t);return new Le(n).toPromise()}const Rr=800,Pr=3;class Yi{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await bt(),this.db)}async _withRetries(t){let n=0;for(;;)try{const s=await this._openDb();return await t(s)}catch(s){if(n++>Pr)throw s;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return $i()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=rt._getInstance(Tr()),this.receiver._subscribe("keyChanged",async(t,n)=>({keyProcessed:(await this._poll()).includes(n.key)})),this.receiver._subscribe("ping",async(t,n)=>["keyChanged"])}async initializeSender(){var t,n;if(this.activeServiceWorker=await Nr(),!this.activeServiceWorker)return;this.sender=new _r(this.activeServiceWorker);const s=await this.sender._send("ping",{},800);s&&!((t=s[0])===null||t===void 0)&&t.fulfilled&&!((n=s[0])===null||n===void 0)&&n.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(t){if(!(!this.sender||!this.activeServiceWorker||Ir()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:t},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const t=await bt();return await Zt(t,Ze,"1"),await ei(t,Ze),!0}catch{}return!1}async _withPendingWrite(t){this.pendingWrites++;try{await t()}finally{this.pendingWrites--}}async _set(t,n){return this._withPendingWrite(async()=>(await this._withRetries(s=>Zt(s,t,n)),this.localCache[t]=n,this.notifyServiceWorker(t)))}async _get(t){const n=await this._withRetries(s=>Ar(s,t));return this.localCache[t]=n,n}async _remove(t){return this._withPendingWrite(async()=>(await this._withRetries(n=>ei(n,t)),delete this.localCache[t],this.notifyServiceWorker(t)))}async _poll(){const t=await this._withRetries(r=>{const a=at(r,!1).getAll();return new Le(a).toPromise()});if(!t)return[];if(this.pendingWrites!==0)return[];const n=[],s=new Set;if(t.length!==0)for(const{fbase_key:r,value:a}of t)s.add(r),JSON.stringify(this.localCache[r])!==JSON.stringify(a)&&(this.notifyListeners(r,a),n.push(r));for(const r of Object.keys(this.localCache))this.localCache[r]&&!s.has(r)&&(this.notifyListeners(r,null),n.push(r));return n}notifyListeners(t,n){this.localCache[t]=n;const s=this.listeners[t];if(s)for(const r of Array.from(s))r(n)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Rr)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(t,n){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[t]||(this.listeners[t]=new Set,this._get(t)),this.listeners[t].add(n)}_removeListener(t,n){this.listeners[t]&&(this.listeners[t].delete(n),this.listeners[t].size===0&&delete this.listeners[t]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Yi.type="LOCAL";const Or=Yi;new De(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Dr(i,t){return t?ne(t):(j(i._popupRedirectResolver,i,"argument-error"),i._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rt extends Ct{constructor(t){super("custom","custom"),this.params=t}_getIdTokenResponse(t){return _e(t,this._buildIdpRequest())}_linkToIdToken(t,n){return _e(t,this._buildIdpRequest(n))}_getReauthenticationResolver(t){return _e(t,this._buildIdpRequest())}_buildIdpRequest(t){const n={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return t&&(n.idToken=t),n}}function Fr(i){return Bi(i.auth,new Rt(i),i.bypassAuthState)}function Lr(i){const{auth:t,user:n}=i;return j(n,t,"internal-error"),hr(n,new Rt(i),i.bypassAuthState)}async function Ur(i){const{auth:t,user:n}=i;return j(n,t,"internal-error"),pr(n,new Rt(i),i.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ji{constructor(t,n,s,r,a=!1){this.auth=t,this.resolver=s,this.user=r,this.bypassAuthState=a,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(n)?n:[n]}execute(){return new Promise(async(t,n)=>{this.pendingPromise={resolve:t,reject:n};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(s){this.reject(s)}})}async onAuthEvent(t){const{urlResponse:n,sessionId:s,postBody:r,tenantId:a,error:o,type:l}=t;if(o){this.reject(o);return}const c={auth:this.auth,requestUri:n,sessionId:s,tenantId:a||void 0,postBody:r||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(l)(c))}catch(d){this.reject(d)}}onError(t){this.reject(t)}getIdpTask(t){switch(t){case"signInViaPopup":case"signInViaRedirect":return Fr;case"linkViaPopup":case"linkViaRedirect":return Ur;case"reauthViaPopup":case"reauthViaRedirect":return Lr;default:G(this.auth,"internal-error")}}resolve(t){re(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(t),this.unregisterAndCleanUp()}reject(t){re(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(t),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zr=new De(2e3,1e4);class we extends Ji{constructor(t,n,s,r,a){super(t,n,r,a),this.provider=s,this.authWindow=null,this.pollId=null,we.currentPopupAction&&we.currentPopupAction.cancel(),we.currentPopupAction=this}async executeNotNull(){const t=await this.execute();return j(t,this.auth,"internal-error"),t}async onExecution(){re(this.filter.length===1,"Popup operations only handle one event");const t=At();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],t),this.authWindow.associatedEvent=t,this.resolver._originValidation(this.auth).catch(n=>{this.reject(n)}),this.resolver._isIframeWebStorageSupported(this.auth,n=>{n||this.reject(K(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var t;return((t=this.authWindow)===null||t===void 0?void 0:t.associatedEvent)||null}cancel(){this.reject(K(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,we.currentPopupAction=null}pollUserCancellation(){const t=()=>{var n,s;if(!((s=(n=this.authWindow)===null||n===void 0?void 0:n.window)===null||s===void 0)&&s.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(K(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(t,zr.get())};t()}}we.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Mr="pendingRedirect",He=new Map;class Br extends Ji{constructor(t,n,s=!1){super(t,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],n,void 0,s),this.eventId=null}async execute(){let t=He.get(this.auth._key());if(!t){try{const s=await Wr(this.resolver,this.auth)?await super.execute():null;t=()=>Promise.resolve(s)}catch(n){t=()=>Promise.reject(n)}He.set(this.auth._key(),t)}return this.bypassAuthState||He.set(this.auth._key(),()=>Promise.resolve(null)),t()}async onAuthEvent(t){if(t.type==="signInViaRedirect")return super.onAuthEvent(t);if(t.type==="unknown"){this.resolve(null);return}if(t.eventId){const n=await this.auth._redirectUserForId(t.eventId);if(n)return this.user=n,super.onAuthEvent(t);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function Wr(i,t){const n=Vr(t),s=qr(i);if(!await s._isAvailable())return!1;const r=await s._get(n)==="true";return await s._remove(n),r}function Hr(i,t){He.set(i._key(),t)}function qr(i){return ne(i._redirectPersistence)}function Vr(i){return We(Mr,i.config.apiKey,i.name)}async function $r(i,t,n=!1){if(ee(i.app))return Promise.reject(ge(i));const s=Ie(i),r=Dr(s,t),o=await new Br(s,r,n).execute();return o&&!n&&(delete o.user._redirectEventId,await s._persistUserIfCurrent(o.user),await s._setRedirectUser(null,t)),o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gr=10*60*1e3;class Kr{constructor(t){this.auth=t,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(t){this.consumers.add(t),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,t)&&(this.sendToConsumer(this.queuedRedirectEvent,t),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(t){this.consumers.delete(t)}onEvent(t){if(this.hasEventBeenHandled(t))return!1;let n=!1;return this.consumers.forEach(s=>{this.isEventForConsumer(t,s)&&(n=!0,this.sendToConsumer(t,s),this.saveEventToCache(t))}),this.hasHandledPotentialRedirect||!Yr(t)||(this.hasHandledPotentialRedirect=!0,n||(this.queuedRedirectEvent=t,n=!0)),n}sendToConsumer(t,n){var s;if(t.error&&!Xi(t)){const r=((s=t.error.code)===null||s===void 0?void 0:s.split("auth/")[1])||"internal-error";n.onError(K(this.auth,r))}else n.onAuthEvent(t)}isEventForConsumer(t,n){const s=n.eventId===null||!!t.eventId&&t.eventId===n.eventId;return n.filter.includes(t.type)&&s}hasEventBeenHandled(t){return Date.now()-this.lastProcessedEventTime>=Gr&&this.cachedEventUids.clear(),this.cachedEventUids.has(ti(t))}saveEventToCache(t){this.cachedEventUids.add(ti(t)),this.lastProcessedEventTime=Date.now()}}function ti(i){return[i.type,i.eventId,i.sessionId,i.tenantId].filter(t=>t).join("-")}function Xi({type:i,error:t}){return i==="unknown"&&(t==null?void 0:t.code)==="auth/no-auth-event"}function Yr(i){switch(i.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return Xi(i);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Jr(i,t={}){return fe(i,"GET","/v1/projects",t)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xr=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,Qr=/^https?/;async function Zr(i){if(i.config.emulator)return;const{authorizedDomains:t}=await Jr(i);for(const n of t)try{if(ea(n))return}catch{}G(i,"unauthorized-domain")}function ea(i){const t=mt(),{protocol:n,hostname:s}=new URL(t);if(i.startsWith("chrome-extension://")){const o=new URL(i);return o.hostname===""&&s===""?n==="chrome-extension:"&&i.replace("chrome-extension://","")===t.replace("chrome-extension://",""):n==="chrome-extension:"&&o.hostname===s}if(!Qr.test(n))return!1;if(Xr.test(i))return s===i;const r=i.replace(/\./g,"\\.");return new RegExp("^(.+\\."+r+"|"+r+")$","i").test(s)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ta=new De(3e4,6e4);function ii(){const i=Y().___jsl;if(i!=null&&i.H){for(const t of Object.keys(i.H))if(i.H[t].r=i.H[t].r||[],i.H[t].L=i.H[t].L||[],i.H[t].r=[...i.H[t].L],i.CP)for(let n=0;n<i.CP.length;n++)i.CP[n]=null}}function ia(i){return new Promise((t,n)=>{var s,r,a;function o(){ii(),gapi.load("gapi.iframes",{callback:()=>{t(gapi.iframes.getContext())},ontimeout:()=>{ii(),n(K(i,"network-request-failed"))},timeout:ta.get()})}if(!((r=(s=Y().gapi)===null||s===void 0?void 0:s.iframes)===null||r===void 0)&&r.Iframe)t(gapi.iframes.getContext());else if(!((a=Y().gapi)===null||a===void 0)&&a.load)o();else{const l=Ys("iframefcb");return Y()[l]=()=>{gapi.load?o():n(K(i,"network-request-failed"))},Li(`${Ks()}?onload=${l}`).catch(c=>n(c))}}).catch(t=>{throw qe=null,t})}let qe=null;function na(i){return qe=qe||ia(i),qe}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sa=new De(5e3,15e3),ra="__/auth/iframe",aa="emulator/auth/iframe",oa={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},la=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function ca(i){const t=i.config;j(t.authDomain,i,"auth-domain-config-required");const n=t.emulator?Nt(t,aa):`https://${i.config.authDomain}/${ra}`,s={apiKey:t.apiKey,appName:i.name,v:Ne},r=la.get(i.config.apiHost);r&&(s.eid=r);const a=i._getFrameworks();return a.length&&(s.fw=a.join(",")),`${n}?${Oe(s).slice(1)}`}async function da(i){const t=await na(i),n=Y().gapi;return j(n,i,"internal-error"),t.open({where:document.body,url:ca(i),messageHandlersFilter:n.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:oa,dontclear:!0},s=>new Promise(async(r,a)=>{await s.restyle({setHideOnLeave:!1});const o=K(i,"network-request-failed"),l=Y().setTimeout(()=>{a(o)},sa.get());function c(){Y().clearTimeout(l),r(s)}s.ping(c).then(c,()=>{a(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pa={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},ha=500,ua=600,ga="_blank",fa="http://localhost";class ni{constructor(t){this.window=t,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function ma(i,t,n,s=ha,r=ua){const a=Math.max((window.screen.availHeight-r)/2,0).toString(),o=Math.max((window.screen.availWidth-s)/2,0).toString();let l="";const c=Object.assign(Object.assign({},pa),{width:s.toString(),height:r.toString(),top:a,left:o}),d=W().toLowerCase();n&&(l=Ei(d)?ga:n),Ti(d)&&(t=t||fa,c.scrollbars="yes");const u=Object.entries(c).reduce((w,[S,C])=>`${w}${S}=${C},`,"");if(zs(d)&&l!=="_self")return xa(t||"",l),new ni(null);const f=window.open(t||"",l,u);j(f,i,"popup-blocked");try{f.focus()}catch{}return new ni(f)}function xa(i,t){const n=document.createElement("a");n.href=i,n.target=t;const s=document.createEvent("MouseEvent");s.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),n.dispatchEvent(s)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ba="__/auth/handler",ya="emulator/auth/handler",va=encodeURIComponent("fac");async function si(i,t,n,s,r,a){j(i.config.authDomain,i,"auth-domain-config-required"),j(i.config.apiKey,i,"invalid-api-key");const o={apiKey:i.config.apiKey,appName:i.name,authType:n,redirectUrl:s,v:Ne,eventId:r};if(t instanceof zi){t.setDefaultLanguage(i.languageCode),o.providerId=t.providerId||"",gn(t.getCustomParameters())||(o.customParameters=JSON.stringify(t.getCustomParameters()));for(const[u,f]of Object.entries({}))o[u]=f}if(t instanceof Fe){const u=t.getScopes().filter(f=>f!=="");u.length>0&&(o.scopes=u.join(","))}i.tenantId&&(o.tid=i.tenantId);const l=o;for(const u of Object.keys(l))l[u]===void 0&&delete l[u];const c=await i._getAppCheckToken(),d=c?`#${va}=${encodeURIComponent(c)}`:"";return`${wa(i)}?${Oe(l).slice(1)}${d}`}function wa({config:i}){return i.emulator?Nt(i,ya):`https://${i.authDomain}/${ba}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const pt="webStorageSupport";class ja{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Vi,this._completeRedirectFn=$r,this._overrideRedirectResult=Hr}async _openPopup(t,n,s,r){var a;re((a=this.eventManagers[t._key()])===null||a===void 0?void 0:a.manager,"_initialize() not called before _openPopup()");const o=await si(t,n,s,mt(),r);return ma(t,o,At())}async _openRedirect(t,n,s,r){await this._originValidation(t);const a=await si(t,n,s,mt(),r);return Sr(a),new Promise(()=>{})}_initialize(t){const n=t._key();if(this.eventManagers[n]){const{manager:r,promise:a}=this.eventManagers[n];return r?Promise.resolve(r):(re(a,"If manager is not set, promise should be"),a)}const s=this.initAndGetManager(t);return this.eventManagers[n]={promise:s},s.catch(()=>{delete this.eventManagers[n]}),s}async initAndGetManager(t){const n=await da(t),s=new Kr(t);return n.register("authEvent",r=>(j(r==null?void 0:r.authEvent,t,"invalid-auth-event"),{status:s.onEvent(r.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[t._key()]={manager:s},this.iframes[t._key()]=n,s}_isIframeWebStorageSupported(t,n){this.iframes[t._key()].send(pt,{type:pt},r=>{var a;const o=(a=r==null?void 0:r[0])===null||a===void 0?void 0:a[pt];o!==void 0&&n(!!o),G(t,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(t){const n=t._key();return this.originValidationPromises[n]||(this.originValidationPromises[n]=Zr(t)),this.originValidationPromises[n]}get _shouldInitProactively(){return Di()||Ci()||Tt()}}const ka=ja;var ri="@firebase/auth",ai="1.7.9";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _a{constructor(t){this.auth=t,this.internalListeners=new Map}getUid(){var t;return this.assertAuthConfigured(),((t=this.auth.currentUser)===null||t===void 0?void 0:t.uid)||null}async getToken(t){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(t)}:null}addAuthTokenListener(t){if(this.assertAuthConfigured(),this.internalListeners.has(t))return;const n=this.auth.onIdTokenChanged(s=>{t((s==null?void 0:s.stsTokenManager.accessToken)||null)});this.internalListeners.set(t,n),this.updateProactiveRefresh()}removeAuthTokenListener(t){this.assertAuthConfigured();const n=this.internalListeners.get(t);n&&(this.internalListeners.delete(t),n(),this.updateProactiveRefresh())}assertAuthConfigured(){j(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Sa(i){switch(i){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function Na(i){ut(new gt("auth",(t,{options:n})=>{const s=t.getProvider("app").getImmediate(),r=t.getProvider("heartbeat"),a=t.getProvider("app-check-internal"),{apiKey:o,authDomain:l}=s.options;j(o&&!o.includes(":"),"invalid-api-key",{appName:s.name});const c={apiKey:o,authDomain:l,clientPlatform:i,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:Fi(i)},d=new Vs(s,r,a,c);return er(d,n),d},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((t,n,s)=>{t.getProvider("auth-internal").initialize()})),ut(new gt("auth-internal",t=>{const n=Ie(t.getProvider("auth").getImmediate());return(s=>new _a(s))(n)},"PRIVATE").setInstantiationMode("EXPLICIT")),$e(ri,ai,Sa(i)),$e(ri,ai,"esm2017")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ia=5*60,Ta=di("authIdTokenMaxAge")||Ia;let oi=null;const Ca=i=>async t=>{const n=t&&await t.getIdTokenResult(),s=n&&(new Date().getTime()-Date.parse(n.issuedAtTime))/1e3;if(s&&s>Ta)return;const r=n==null?void 0:n.token;oi!==r&&(oi=r,await fetch(i,{method:r?"POST":"DELETE",headers:r?{Authorization:`Bearer ${r}`}:{}}))};function Ea(i=ci()){const t=wt(i,"auth");if(t.isInitialized())return t.getImmediate();const n=Zs(i,{popupRedirectResolver:ka,persistence:[Or,jr,Vi]}),s=di("authTokenSyncURL");if(s&&typeof isSecureContext=="boolean"&&isSecureContext){const a=new URL(s,location.origin);if(location.origin===a.origin){const o=Ca(a.toString());xr(n,o,()=>o(n.currentUser)),mr(n,l=>o(l))}}const r=pn("auth");return r&&tr(n,`http://${r}`),n}function Aa(){var i,t;return(t=(i=document.getElementsByTagName("head"))===null||i===void 0?void 0:i[0])!==null&&t!==void 0?t:document}$s({loadJS(i){return new Promise((t,n)=>{const s=document.createElement("script");s.setAttribute("src",i),s.onload=t,s.onerror=r=>{const a=K("internal-error");a.customData=r,n(a)},s.type="text/javascript",s.charset="UTF-8",Aa().appendChild(s)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});Na("Browser");const Ra={apiKey:"AIzaSyAt-TWmA7W2O5VUnaS_y_9soRRV5u_8O8s",authDomain:"slirus.firebaseapp.com",projectId:"slirus",storageBucket:"slirus.firebasestorage.app",messagingSenderId:"604437913517",appId:"1:604437913517:web:f72fdc33244dc926440b24",measurementId:"G-83REHT8FMK"},ot=mn(Ra),ue=xn(ot);ms(ot);const Ve=Ea(ot);typeof window<"u"&&kt(async()=>{const{getAnalytics:i}=await import("./index.esm-BELikEsO.js");return{getAnalytics:i}},__vite__mapDeps([0,1])).then(({getAnalytics:i})=>{i(ot)});const se=[{key:"softwareDev",type:"Job",title:"Software Developer",tag:"Job Opening",color:"#2E6DA4",lightBg:"#EBF4FF",icon:"fas fa-code",location:"Lira City, Uganda",employment:"Full-time",description:"We are looking for a talented and motivated Software Developer to build high-quality, scalable web and mobile applications — developing innovative digital solutions for our clients across Uganda and the region.",qualifications:["Bachelor's Degree in Computer Science, Information Technology, or Software Engineering.","Diploma in Computer Science or IT with strong practical skills will be considered.","Relevant certifications in web development or JavaScript frameworks are an advantage."],experience:["Minimum of 1 year of hands-on experience in software development.","Strong internship or project experience in relevant technologies may be considered."],responsibilities:["Design, develop, test, and maintain web applications using HTML, CSS, JavaScript, React, Node.js, PHP, or Laravel.","Develop and integrate RESTful APIs and backend services.","Collaborate with designers and project managers to translate requirements into functional solutions.","Write clean, efficient, and well-documented code.","Perform debugging, troubleshooting, and performance optimization.","Ensure applications are responsive, secure, and scalable.","Participate in code reviews and contribute to team knowledge sharing."]},{key:"accounts",type:"Job",title:"Accounts & Finance",tag:"Job Opening",color:"#0F766E",lightBg:"#F0FDFA",icon:"fas fa-calculator",location:"Lira City, Uganda",employment:"Full-time",description:"We are seeking a detail-oriented and reliable Accounts Officer to manage the financial operations of our growing technology company, ensuring accurate financial reporting and compliance with Ugandan tax regulations.",qualifications:["Bachelor's Degree in Accounting, Finance, or Business Administration.","Professional qualifications such as CPA or ACCA are an added advantage.","Diploma in Accounting with relevant experience may be considered."],experience:["Minimum of 1 year of relevant working experience in accounting or finance.","Fresh graduates with strong internship records in reputable firms may be considered."],responsibilities:["Manage daily financial transactions including accounts payable and receivable.","Prepare monthly, quarterly, and annual financial reports and statements.","Ensure timely filing of tax returns (VAT, PAYE, NSSF) in compliance with URA regulations.","Reconcile bank statements and maintain accurate financial records.","Support budgeting, forecasting, and cash flow management.","Handle payroll processing and statutory deductions.","Assist with internal and external audits."]},{key:"sales",type:"Job",title:"Sales & Marketing",tag:"Job Opening",color:"#7C3AED",lightBg:"#F5F3FF",icon:"fas fa-chart-line",location:"Lira City, Uganda (with field visits)",employment:"Full-time · Performance Incentives",description:"We are hiring a proactive and results-driven Sales Officer to promote our IT services and acquire new clients — driving revenue growth by identifying business opportunities and building strong client relationships.",qualifications:["Bachelor's Degree in Marketing, Business Administration, or Information Technology.","Diploma in Sales or Marketing with proven sales experience will be considered."],experience:["Minimum of 1 year of sales experience, preferably in IT, software, or technology services."],responsibilities:["Identify and prospect potential clients including businesses, NGOs, and government institutions.","Present and demonstrate company solutions through meetings and proposals.","Prepare and negotiate quotations, contracts, and service level agreements.","Build and maintain long-term relationships with existing and new clients.","Achieve monthly and quarterly sales targets.","Market services through networking, digital channels, and direct outreach.","Gather market intelligence to inform business strategy."]},{key:"internship",type:"Internship",title:"IT Intern – Software Development Track",tag:"Internship",color:"#B45309",lightBg:"#FFFBEB",icon:"fas fa-user-graduate",location:"Lira City, Uganda",employment:"Paid Internship",duration:"10 Weeks",description:"A structured and paid internship program providing hands-on experience to talented students and recent graduates in computer-related programs. Interns work on real client projects under the guidance of experienced developers.",eligibility:["Currently enrolled or recently graduated students in Computer Science, Information Technology, Information Systems, or Software Engineering.","Strong academic record with demonstrated interest in web development or programming."],responsibilities:["Assist in developing and maintaining web applications and digital projects.","Participate in coding, testing, and documentation tasks.","Learn modern development tools and best practices.","Support the team in client project delivery.","Attend team meetings and knowledge-sharing sessions."],benefits:["Competitive monthly stipend (paid internship).","Hands-on experience with real client projects.","Mentorship from experienced professionals.","Opportunity for full-time employment upon successful completion.","Certificate of completion."]}],Pa=se.filter(i=>i.type==="Job"),li=se.filter(i=>i.type==="Internship"),Oa=({track:i,isOpen:t,statusLoading:n})=>{var o,l,c,d,u;const[s,r]=v.useState(!1),a=n||!t;return e.jsxs("div",{className:"job-card",style:{borderTop:`3px solid ${i.color}`},children:[e.jsxs("div",{className:"job-card-header",children:[e.jsxs("div",{className:"job-card-title-row",children:[e.jsx("div",{className:"job-icon-wrap",style:{background:i.lightBg},children:e.jsx("i",{className:i.icon,style:{color:i.color}})}),e.jsxs("div",{children:[e.jsx("h3",{className:"job-title",children:i.title}),e.jsxs("div",{className:"job-meta",children:[i.location&&e.jsxs("span",{children:[e.jsx("i",{className:"fas fa-map-marker-alt"})," ",i.location]}),i.employment&&e.jsxs("span",{children:[e.jsx("i",{className:"fas fa-clock"})," ",i.employment]}),e.jsx("span",{className:`track-status-badge ${t?"open":"closed"}`,style:t?{background:"#f0fdf4",color:"#166534",border:"1px solid #bbf7d0"}:{background:"#f1f5f9",color:"#64748b",border:"1px solid #e2e8f0"},children:n?"…":t?"● Accepting Applications":"🔒 Closed"})]})]})]}),i.description&&e.jsx("p",{className:"job-description",children:i.description}),e.jsxs("div",{className:"job-card-footer",children:[e.jsxs("button",{className:"toggle-btn",onClick:()=>r(!s),children:[s?"Show Less":"View Details",e.jsx("i",{className:`fas fa-chevron-${s?"up":"down"}`})]}),a?e.jsx("span",{className:"apply-btn-disabled",children:n?"Loading…":"🔒 Applications Closed"}):e.jsxs(D,{to:"/apply",state:{trackKey:i.key},className:"apply-btn",style:{background:i.color},children:["Apply Now ",e.jsx("i",{className:"fas fa-arrow-right"})]})]})]}),s&&e.jsxs("div",{className:"job-card-body",children:[(((o=i.qualifications)==null?void 0:o.length)||((l=i.experience)==null?void 0:l.length))&&e.jsxs("div",{className:"job-detail-grid",children:[((c=i.qualifications)==null?void 0:c.length)>0&&e.jsxs("div",{className:"job-detail-block",children:[e.jsxs("h4",{style:{color:i.color},children:[e.jsx("i",{className:"fas fa-graduation-cap"})," Qualifications"]}),e.jsx("ul",{children:i.qualifications.map((f,w)=>e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-check"})," ",f]},w))})]}),((d=i.experience)==null?void 0:d.length)>0&&e.jsxs("div",{className:"job-detail-block",children:[e.jsxs("h4",{style:{color:i.color},children:[e.jsx("i",{className:"fas fa-briefcase"})," Experience"]}),e.jsx("ul",{children:i.experience.map((f,w)=>e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-check"})," ",f]},w))})]})]}),((u=i.responsibilities)==null?void 0:u.length)>0&&e.jsxs("div",{className:"job-detail-block full-width",children:[e.jsxs("h4",{style:{color:i.color},children:[e.jsx("i",{className:"fas fa-tasks"})," Key Responsibilities"]}),e.jsx("ul",{children:i.responsibilities.map((f,w)=>e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-check"})," ",f]},w))})]})]})]})},Da=({track:i,isOpen:t,statusLoading:n})=>{var o,l,c;const[s,r]=v.useState(!1),a=n||!t;return e.jsxs("div",{className:"intern-card",children:[e.jsxs("div",{className:"intern-card-header",children:[e.jsxs("div",{className:"intern-badge",children:[e.jsx("i",{className:"fas fa-star"})," Paid Program"]}),e.jsx("h3",{className:"intern-title",children:i.title}),e.jsxs("div",{className:"intern-meta",children:[i.location&&e.jsxs("span",{children:[e.jsx("i",{className:"fas fa-map-marker-alt"})," ",i.location]}),i.duration&&e.jsxs("span",{children:[e.jsx("i",{className:"fas fa-calendar-alt"})," ",i.duration]}),i.employment&&e.jsxs("span",{children:[e.jsx("i",{className:"fas fa-tag"})," ",i.employment]}),e.jsx("span",{style:{fontSize:12,fontWeight:700,padding:"2px 10px",borderRadius:20,background:"rgba(255,255,255,0.2)",color:"white"},children:n?"…":t?"● Open":"🔒 Closed"})]}),i.description&&e.jsx("p",{className:"intern-description",children:i.description}),e.jsxs("div",{className:"intern-footer",children:[e.jsxs("button",{className:"intern-toggle-btn",onClick:()=>r(!s),children:[s?"Show Less":"View Details",e.jsx("i",{className:`fas fa-chevron-${s?"up":"down"}`})]}),a?e.jsx("span",{className:"intern-apply-disabled",children:n?"Loading…":"🔒 Applications Closed"}):e.jsxs(D,{to:"/apply",state:{trackKey:i.key},className:"intern-apply-btn",children:["Apply Now ",e.jsx("i",{className:"fas fa-arrow-right"})]})]})]}),s&&e.jsx("div",{className:"intern-card-body",children:e.jsxs("div",{className:"intern-detail-grid",children:[((o=i.eligibility)==null?void 0:o.length)>0&&e.jsxs("div",{className:"intern-detail-block",children:[e.jsxs("h4",{children:[e.jsx("i",{className:"fas fa-user-check"})," Eligibility"]}),e.jsx("ul",{children:i.eligibility.map((d,u)=>e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-check"})," ",d]},u))})]}),((l=i.responsibilities)==null?void 0:l.length)>0&&e.jsxs("div",{className:"intern-detail-block",children:[e.jsxs("h4",{children:[e.jsx("i",{className:"fas fa-tasks"})," Responsibilities"]}),e.jsx("ul",{children:i.responsibilities.map((d,u)=>e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-check"})," ",d]},u))})]}),((c=i.benefits)==null?void 0:c.length)>0&&e.jsxs("div",{className:"intern-detail-block",children:[e.jsxs("h4",{children:[e.jsx("i",{className:"fas fa-gift"})," Benefits"]}),e.jsx("ul",{children:i.benefits.map((d,u)=>e.jsxs("li",{children:[e.jsx("i",{className:"fas fa-check"})," ",d]},u))})]})]})})]})},Fa=()=>{const[i,t]=v.useState({}),[n,s]=v.useState(!0);return v.useEffect(()=>Ge(ve(ue,"settings","applicationStatus"),a=>{t(a.exists()?a.data():{}),s(!1)},a=>{console.error("[Career] settings listen error:",a),t({}),s(!1)}),[]),e.jsxs(q,{children:[e.jsx("style",{children:`
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
      `}),e.jsx("div",{className:"hero-banner",children:e.jsxs("div",{className:"container",children:[e.jsx("h1",{children:"Careers & Internships"}),e.jsx("p",{children:"Join Slirus Holdings and help build the future of Uganda's digital and industrial infrastructure."})]})}),e.jsx("section",{className:"section",children:e.jsxs("div",{className:"container",children:[e.jsxs("p",{className:"section-label",children:[e.jsx("i",{className:"fas fa-briefcase"})," Career Track"]}),e.jsx("h2",{className:"section-title",children:"Track List"}),Pa.map(r=>e.jsx(Oa,{track:r,isOpen:i[r.key]===!0,statusLoading:n},r.key)),li.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{className:"section-label",style:{marginTop:"60px"},children:[e.jsx("i",{className:"fas fa-user-graduate"})," Internship Program"]}),e.jsx("h2",{className:"section-title",children:"Paid Internship"}),li.map(r=>e.jsx(Da,{track:r,isOpen:i[r.key]===!0,statusLoading:n},r.key))]})]})})]})},La=async(i,t)=>{var E;const{jsPDF:n}=await kt(async()=>{const{jsPDF:m}=await import("./jspdf.es.min-DmfAY9eD.js").then(k=>k.j);return{jsPDF:m}},[]),s=new n({unit:"mm",format:"a4"}),r=210,a=20,o=r-a*2;let l=20;const c=()=>{s.addPage(),l=20},d=(m=10)=>{l+m>275&&c()};s.setFillColor(26,60,94),s.rect(0,0,r,28,"F"),s.setFontSize(14),s.setFont("helvetica","bold"),s.setTextColor(255,255,255),s.text("SLIRUS HOLDINGS LIMITED",a,12),s.setFontSize(9),s.setFont("helvetica","normal"),s.text("Employment Application Form",a,19),s.text(`Position: ${t.title}`,r-a,12,{align:"right"}),s.text(`Date: ${new Date().toLocaleDateString("en-UG")}`,r-a,19,{align:"right"}),l=36;const u=m=>{const k=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(m);return k?[parseInt(k[1],16),parseInt(k[2],16),parseInt(k[3],16)]:[26,60,94]},[f,w,S]=u(t.color||"#1A3C5E");s.setDrawColor(f,w,S),s.setLineWidth(.8),s.line(a,l,r-a,l),l+=6;const C=m=>{d(14),s.setFillColor(240,244,248),s.rect(a,l,o,7,"F"),s.setFontSize(9),s.setFont("helvetica","bold"),s.setTextColor(26,60,94),s.text(m.toUpperCase(),a+3,l+5),l+=10},N=(m,k)=>{if(!k)return;d(7),s.setFontSize(9),s.setFont("helvetica","bold"),s.setTextColor(90,122,154),s.text(m+":",a,l),s.setFont("helvetica","normal"),s.setTextColor(26,60,94);const T=s.splitTextToSize(String(k),o-45);s.text(T,a+44,l),l+=T.length*5+2},I=(m,k)=>{k&&(d(10),m&&(s.setFontSize(9),s.setFont("helvetica","bold"),s.setTextColor(90,122,154),s.text(m+":",a,l),l+=5),s.setFont("helvetica","normal"),s.setTextColor(26,60,94),s.splitTextToSize(String(k),o).forEach(T=>{d(5),s.text(T,a,l),l+=5}),l+=2)};C("1. Personal Information"),N("Full Name",i.fullName),N("Date of Birth",i.dob),N("Age",i.age),N("Gender",i.gender),l+=2,C("2. Contact Information"),N("Phone",i.phone),N("Email",i.email),N("Address",i.physicalAddress),N("District",i.district),l+=2,(E=i.coverNote)!=null&&E.trim()&&(C("3. Cover Note"),I("",i.coverNote),l+=2),C("4. Education History"),i.education.forEach((m,k)=>{m.institution&&(d(18),s.setFontSize(8.5),s.setFont("helvetica","bold"),s.setTextColor(26,60,94),s.text(`${k+1}. ${m.institution}`,a+2,l),l+=5,N("  Year",m.year),N("  Level",m.level),N("  Award",m.award),l+=1)}),C("5. Work Experience"),i.experience.some(m=>m.employer)?i.experience.forEach((m,k)=>{m.employer&&(d(20),s.setFontSize(8.5),s.setFont("helvetica","bold"),s.setTextColor(26,60,94),s.text(`${k+1}. ${m.employer} — ${m.role}`,a+2,l),l+=5,N("  Period",m.period),m.duties&&I("  Duties",m.duties),l+=1)}):(s.setFontSize(9),s.setFont("helvetica","italic"),s.setTextColor(150,150,150),s.text("No work experience provided.",a+2,l),l+=7),i.hobbies.filter(Boolean).length&&(C("6. Hobbies & Interests"),I("",i.hobbies.filter(Boolean).join(", ")),l+=2),C("7. Professional Referees"),i.referees.forEach((m,k)=>{m.name&&(d(18),s.setFontSize(8.5),s.setFont("helvetica","bold"),s.setTextColor(26,60,94),s.text(`${k+1}. ${m.name}`,a+2,l),l+=5,N("  Title",m.title),N("  Contact",m.contact),l+=1)});const g=s.internal.getNumberOfPages();for(let m=1;m<=g;m++)s.setPage(m),s.setFontSize(8),s.setFont("helvetica","normal"),s.setTextColor(160,160,160),s.line(a,285,r-a,285),s.text(`Slirus Holdings Limited · Page ${m} of ${g}`,r/2,290,{align:"center"});s.save(`Slirus_Application_${(i.fullName||"applicant").replace(/\s+/g,"_")}_${t.key}.pdf`)},P=({label:i,required:t,error:n,children:s})=>e.jsxs("div",{style:h.fieldWrap,children:[e.jsxs("label",{style:h.label,children:[i,t&&e.jsx("span",{style:{color:"#C0392B"},children:" *"})]}),s,n&&e.jsx("span",{style:h.errMsg,children:n})]}),L=({error:i,...t})=>e.jsx("input",{style:{...h.input,borderColor:i?"#C0392B":"#D0DCE8"},...t}),Qi=({error:i,children:t,...n})=>e.jsx("select",{style:{...h.input,borderColor:i?"#C0392B":"#D0DCE8"},...n,children:t}),Zi=({error:i,...t})=>e.jsx("textarea",{style:{...h.input,...h.textarea,borderColor:i?"#C0392B":"#D0DCE8"},...t}),yt=["Personal","Contact","Education","Experience","Review"],Ua=({step:i,trackColor:t})=>e.jsx("div",{style:h.stepBar,children:yt.map((n,s)=>{const r=s<i,a=s===i,o=r||a?t:"#CBD5E0",l=r||a?t:"#94A3B8";return e.jsxs(hi.Fragment,{children:[s>0&&e.jsx("div",{style:{...h.stepLine,background:s<=i?t:"#E2E8F0"}}),e.jsxs("div",{style:h.stepItem,children:[e.jsx("div",{style:{...h.stepCircle,background:r?t:a?"#EFF6FF":"#F8FAFC",border:`2px solid ${o}`,color:r?"#fff":l},children:r?"✓":s+1}),e.jsx("span",{style:{...h.stepLabel,color:l,fontWeight:a?700:400},children:n})]})]},n)})}),za=()=>e.jsx("div",{style:h.trackGrid,children:Array.from({length:4}).map((i,t)=>e.jsxs("div",{style:{...h.trackCard,borderTop:"4px solid #E2E8F0"},children:[e.jsx("div",{style:{height:20,width:"40%",background:"#E2E8F0",borderRadius:4,marginBottom:10}}),e.jsx("div",{style:{height:18,width:"70%",background:"#EEF2F7",borderRadius:4,marginBottom:8}}),e.jsx("div",{style:{height:13,width:"90%",background:"#F3F6F9",borderRadius:4,marginBottom:4}}),e.jsx("div",{style:{height:13,width:"75%",background:"#F3F6F9",borderRadius:4,marginBottom:20}}),e.jsx("div",{style:{height:38,background:"#E2E8F0",borderRadius:8,marginTop:"auto"}})]},t))}),Ma=({trackStatuses:i,statusLoading:t,onSelect:n})=>e.jsxs("div",{style:h.selectorWrap,children:[e.jsxs("div",{style:h.selectorHeader,children:[e.jsx("h1",{style:h.selectorTitle,children:"Careers at Slirus Holdings"}),e.jsx("p",{style:h.selectorSub,children:"Select a position below to begin your application. Open positions are accepting submissions now."})]}),t?e.jsx(za,{}):e.jsx("div",{style:h.trackGrid,children:se.map(s=>{const r=i[s.key]===!0;return e.jsxs("div",{style:{...h.trackCard,borderTop:`4px solid ${s.color}`,opacity:r?1:.6},children:[s.tag&&e.jsx("span",{style:{...h.trackTag,background:s.lightBg||"#EFF6FF",color:s.color},children:s.tag}),e.jsx("h3",{style:{...h.trackTitle,color:s.color},children:s.title}),s.description&&e.jsx("p",{style:h.trackDesc,children:s.description}),e.jsx("div",{style:{marginTop:"auto",paddingTop:14},children:r?e.jsx("button",{style:{...h.trackApplyBtn,background:s.color},onClick:()=>n(s),children:"Apply Now →"}):e.jsx("span",{style:h.trackClosedBadge,children:"🔒 Closed"})})]},s.key)})})]}),Ba=({track:i,onBack:t})=>e.jsx("div",{style:h.centreWrap,children:e.jsxs("div",{style:{...h.noticeCard,borderTop:`4px solid ${(i==null?void 0:i.color)||"#C0392B"}`},children:[e.jsx("div",{style:{fontSize:44,marginBottom:14},children:"🔒"}),e.jsxs("h2",{style:h.noticeTitle,children:[i==null?void 0:i.title," Applications Are Closed"]}),e.jsx("p",{style:h.noticeBody,children:"This position is not currently accepting applications. Check back soon or explore other openings."}),e.jsx("button",{style:{...h.trackApplyBtn,background:"#1A3C5E",display:"inline-block",width:"auto",padding:"10px 24px"},onClick:t,children:"← View Other Positions"})]})}),Wa=({form:i,track:t,docId:n,onBack:s})=>{const[r,a]=v.useState(!1),o=async()=>{a(!0);try{await La(i,t)}catch(l){alert("Could not generate PDF: "+l.message)}finally{a(!1)}};return e.jsx("div",{style:h.centreWrap,children:e.jsxs("div",{style:{...h.noticeCard,borderTop:`4px solid ${t.color}`},children:[e.jsx("div",{style:{fontSize:52,marginBottom:14},children:"🎉"}),e.jsx("h2",{style:{...h.noticeTitle,color:"#065F46"},children:"Application Submitted!"}),e.jsxs("p",{style:h.noticeBody,children:["Thank you, ",e.jsx("strong",{children:i.fullName}),". Your application for ",e.jsx("strong",{children:t.title})," has been received. A confirmation email has been sent to ",e.jsx("strong",{children:i.email}),"."]}),e.jsxs("div",{style:{...h.refBox,margin:"0 auto 24px",display:"inline-flex"},children:[e.jsx("span",{style:h.refLabel,children:"Reference "}),e.jsx("span",{style:h.refValue,children:n==null?void 0:n.slice(0,12).toUpperCase()})]}),e.jsxs("div",{style:{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"},children:[e.jsx("button",{style:{...h.trackApplyBtn,background:t.color,width:"auto",padding:"10px 24px"},onClick:o,disabled:r,children:r?"⏳ Generating…":"⬇ Download PDF Copy"}),e.jsx("button",{style:{...h.trackApplyBtn,background:"#1A3C5E",width:"auto",padding:"10px 24px"},onClick:s,children:"← Back to Positions"})]})]})})},Ha=({form:i,errors:t,onChange:n})=>e.jsxs("div",{children:[e.jsx("h3",{style:h.sectionTitle,children:"Personal Information"}),e.jsxs("div",{style:h.row2,children:[e.jsx(P,{label:"Full Name",required:!0,error:t.fullName,children:e.jsx(L,{value:i.fullName,error:t.fullName,onChange:s=>n("fullName",s.target.value),placeholder:"e.g. Aisha Nakamya"})}),e.jsx(P,{label:"Date of Birth",required:!0,error:t.dob,children:e.jsx(L,{type:"date",value:i.dob,error:t.dob,onChange:s=>{const r=s.target.value,a=r?Math.floor((Date.now()-new Date(r))/315576e5):"";n("dob",r),n("age",String(a))}})})]}),e.jsxs("div",{style:h.row2,children:[e.jsx(P,{label:"Age",children:e.jsx(L,{value:i.age,readOnly:!0,style:{...h.input,background:"#F0F4F8",cursor:"not-allowed"},placeholder:"Auto-calculated"})}),e.jsx(P,{label:"Gender",required:!0,error:t.gender,children:e.jsxs(Qi,{value:i.gender,error:t.gender,onChange:s=>n("gender",s.target.value),children:[e.jsx("option",{value:"",children:"Select gender…"}),e.jsx("option",{children:"Male"}),e.jsx("option",{children:"Female"}),e.jsx("option",{children:"Prefer not to say"})]})})]})]}),qa=({form:i,errors:t,onChange:n})=>e.jsxs("div",{children:[e.jsx("h3",{style:h.sectionTitle,children:"Contact Information"}),e.jsxs("div",{style:h.row2,children:[e.jsx(P,{label:"Phone Number",required:!0,error:t.phone,children:e.jsx(L,{type:"tel",value:i.phone,error:t.phone,onChange:s=>n("phone",s.target.value),placeholder:"+256 7XX XXX XXX"})}),e.jsx(P,{label:"Email Address",required:!0,error:t.email,children:e.jsx(L,{type:"email",value:i.email,error:t.email,onChange:s=>n("email",s.target.value),placeholder:"you@example.com"})})]}),e.jsxs("div",{style:h.row2,children:[e.jsx(P,{label:"Physical Address",required:!0,error:t.physicalAddress,children:e.jsx(L,{value:i.physicalAddress,error:t.physicalAddress,onChange:s=>n("physicalAddress",s.target.value),placeholder:"e.g. Plot 12, Entebbe Road"})}),e.jsx(P,{label:"District",required:!0,error:t.district,children:e.jsx(L,{value:i.district,error:t.district,onChange:s=>n("district",s.target.value),placeholder:"e.g. Kampala"})})]}),e.jsx(P,{label:"Cover Note / Motivation (Optional)",children:e.jsx(Zi,{value:i.coverNote,onChange:s=>n("coverNote",s.target.value),placeholder:"Briefly describe why you're applying and what makes you a strong candidate…",rows:5})})]}),Va=({form:i,errors:t,onChangeArr:n,onAddRow:s,onRemoveRow:r})=>e.jsxs("div",{children:[e.jsx("h3",{style:h.sectionTitle,children:"Education History"}),e.jsx("p",{style:h.sectionHint,children:"List your academic qualifications, most recent first."}),i.education.map((a,o)=>e.jsxs("div",{style:h.card,children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10},children:[e.jsxs("span",{style:{fontWeight:700,color:"#1A3C5E",fontSize:13},children:["Education #",o+1]}),i.education.length>1&&e.jsx("button",{style:h.removeBtn,onClick:()=>r("education",o),children:"✕ Remove"})]}),e.jsxs("div",{style:h.row2,children:[e.jsx(P,{label:"Institution",required:o===0,error:t[`edu_${o}_institution`],children:e.jsx(L,{value:a.institution,error:t[`edu_${o}_institution`],onChange:l=>n("education",o,"institution",l.target.value),placeholder:"School / University name"})}),e.jsx(P,{label:"Year Completed",children:e.jsx(L,{value:a.year,onChange:l=>n("education",o,"year",l.target.value),placeholder:"e.g. 2021"})})]}),e.jsxs("div",{style:h.row2,children:[e.jsx(P,{label:"Level / Qualification",children:e.jsxs(Qi,{value:a.level,onChange:l=>n("education",o,"level",l.target.value),children:[e.jsx("option",{value:"",children:"Select level…"}),e.jsx("option",{children:"Primary"}),e.jsx("option",{children:"O-Level (UCE)"}),e.jsx("option",{children:"A-Level (UACE)"}),e.jsx("option",{children:"Certificate"}),e.jsx("option",{children:"Diploma"}),e.jsx("option",{children:"Bachelor's Degree"}),e.jsx("option",{children:"Postgraduate Diploma"}),e.jsx("option",{children:"Master's Degree"}),e.jsx("option",{children:"Doctorate (PhD)"}),e.jsx("option",{children:"Other"})]})}),e.jsx(P,{label:"Award / Grade",children:e.jsx(L,{value:a.award,onChange:l=>n("education",o,"award",l.target.value),placeholder:"e.g. Second Class Upper"})})]})]},o)),e.jsx("button",{style:h.addBtn,onClick:()=>s("education",{year:"",institution:"",level:"",award:""}),children:"+ Add Another Qualification"})]}),$a=({form:i,errors:t,onChangeArr:n,onAddRow:s,onRemoveRow:r,onChange:a})=>e.jsxs("div",{children:[e.jsx("h3",{style:h.sectionTitle,children:"Work Experience"}),e.jsx("p",{style:h.sectionHint,children:"Leave blank if you have no prior work experience — that's completely fine."}),i.experience.map((o,l)=>e.jsxs("div",{style:h.card,children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10},children:[e.jsxs("span",{style:{fontWeight:700,color:"#1A3C5E",fontSize:13},children:["Position #",l+1]}),i.experience.length>1&&e.jsx("button",{style:h.removeBtn,onClick:()=>r("experience",l),children:"✕ Remove"})]}),e.jsxs("div",{style:h.row2,children:[e.jsx(P,{label:"Employer / Organisation",children:e.jsx(L,{value:o.employer,onChange:c=>n("experience",l,"employer",c.target.value),placeholder:"Organisation name"})}),e.jsx(P,{label:"Role / Job Title",children:e.jsx(L,{value:o.role,onChange:c=>n("experience",l,"role",c.target.value),placeholder:"e.g. Sales Associate"})})]}),e.jsx("div",{style:h.row2,children:e.jsx(P,{label:"Period",children:e.jsx(L,{value:o.period,onChange:c=>n("experience",l,"period",c.target.value),placeholder:"e.g. Jan 2022 – Dec 2023"})})}),e.jsx(P,{label:"Key Duties",children:e.jsx(Zi,{value:o.duties,onChange:c=>n("experience",l,"duties",c.target.value),placeholder:"Briefly describe your main responsibilities…",rows:3})})]},l)),e.jsx("button",{style:h.addBtn,onClick:()=>s("experience",{period:"",employer:"",role:"",duties:""}),children:"+ Add Another Position"}),e.jsx("h3",{style:{...h.sectionTitle,marginTop:28},children:"Hobbies & Interests"}),i.hobbies.map((o,l)=>e.jsxs("div",{style:{display:"flex",gap:8,marginBottom:8,alignItems:"center"},children:[e.jsx(L,{value:o,onChange:c=>n("hobbies",l,null,c.target.value),placeholder:`Hobby ${l+1}`,style:{...h.input,flex:1}}),i.hobbies.length>1&&e.jsx("button",{style:{...h.removeBtn,margin:0},onClick:()=>r("hobbies",l),children:"✕"})]},l)),e.jsx("button",{style:h.addBtn,onClick:()=>s("hobbies",""),children:"+ Add Hobby"}),e.jsx("h3",{style:{...h.sectionTitle,marginTop:28},children:"Professional Referees"}),e.jsx("p",{style:h.sectionHint,children:"Please provide at least one referee who is not a family member."}),i.referees.map((o,l)=>e.jsxs("div",{style:h.card,children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10},children:[e.jsxs("span",{style:{fontWeight:700,color:"#1A3C5E",fontSize:13},children:["Referee #",l+1]}),i.referees.length>1&&e.jsx("button",{style:h.removeBtn,onClick:()=>r("referees",l),children:"✕ Remove"})]}),e.jsxs("div",{style:h.row3,children:[e.jsx(P,{label:"Full Name",required:l===0,error:t[`ref_${l}_name`],children:e.jsx(L,{value:o.name,error:t[`ref_${l}_name`],onChange:c=>n("referees",l,"name",c.target.value),placeholder:"Referee name"})}),e.jsx(P,{label:"Title / Position",children:e.jsx(L,{value:o.title,onChange:c=>n("referees",l,"title",c.target.value),placeholder:"e.g. Director"})}),e.jsx(P,{label:"Phone / Email",children:e.jsx(L,{value:o.contact,onChange:c=>n("referees",l,"contact",c.target.value),placeholder:"Contact details"})})]})]},l)),e.jsx("button",{style:h.addBtn,onClick:()=>s("referees",{name:"",title:"",contact:""}),children:"+ Add Referee"})]}),Me=({label:i,val:t})=>t?e.jsxs("div",{style:h.rrRow,children:[e.jsx("span",{style:h.rrLabel,children:i}),e.jsx("span",{style:h.rrVal,children:t})]}):null,Ga=({form:i,track:t})=>{var n;return e.jsxs("div",{children:[e.jsxs("div",{style:{...h.trackBanner,borderColor:t.color,background:t.lightBg||"#EFF6FF",marginBottom:20},children:[e.jsx("span",{style:{fontSize:18,marginRight:10},children:"📋"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:700,color:t.color,fontSize:14},children:t.title}),e.jsx("div",{style:{fontSize:12,color:"#4A6B8A"},children:"Review your details before submitting. Go back to make changes."})]})]}),[{title:"1. Personal",rows:[["Full Name",i.fullName],["Date of Birth",i.dob],["Age",i.age],["Gender",i.gender]]},{title:"2. Contact",rows:[["Phone",i.phone],["Email",i.email],["Address",i.physicalAddress],["District",i.district]]}].map(s=>e.jsxs("div",{style:h.rrSection,children:[e.jsx("p",{style:h.rrHead,children:s.title}),s.rows.map(([r,a])=>e.jsx(Me,{label:r,val:a},r))]},s.title)),((n=i.coverNote)==null?void 0:n.trim())&&e.jsxs("div",{style:h.rrSection,children:[e.jsx("p",{style:h.rrHead,children:"3. Cover Note"}),e.jsx("p",{style:{fontSize:13,color:"#1A3C5E",lineHeight:1.7,margin:0},children:i.coverNote})]}),e.jsxs("div",{style:h.rrSection,children:[e.jsx("p",{style:h.rrHead,children:"4. Education"}),i.education.filter(s=>s.institution).map((s,r)=>e.jsx(Me,{label:s.year||`#${r+1}`,val:[s.institution,s.level,s.award].filter(Boolean).join(" · ")},r))]}),i.experience.some(s=>s.employer)&&e.jsxs("div",{style:h.rrSection,children:[e.jsx("p",{style:h.rrHead,children:"5. Experience"}),i.experience.filter(s=>s.employer).map((s,r)=>e.jsx(Me,{label:s.period||`#${r+1}`,val:[s.employer,s.role].filter(Boolean).join(" · ")},r))]}),i.referees.some(s=>s.name)&&e.jsxs("div",{style:h.rrSection,children:[e.jsx("p",{style:h.rrHead,children:"6. Referees"}),i.referees.filter(s=>s.name).map((s,r)=>e.jsx(Me,{label:s.name,val:[s.title,s.contact].filter(Boolean).join(" · ")},r))]})]})},Ka=()=>{const[i,t]=v.useState({}),[n,s]=v.useState(!0),[r,a]=v.useState(null),[o,l]=v.useState(0),[c,d]=v.useState(!1),[u,f]=v.useState(null),[w,S]=v.useState(!1),[C,N]=v.useState({}),I=v.useRef(null),[g,E]=v.useState({fullName:"",dob:"",age:"",gender:"",phone:"",email:"",physicalAddress:"",district:"",coverNote:"",education:[{year:"",institution:"",level:"",award:""}],experience:[{period:"",employer:"",role:"",duties:""}],hobbies:[""],referees:[{name:"",title:"",contact:""}]}),[m,k]=v.useState(null);v.useEffect(()=>Ge(ve(ue,"settings","applicationStatus"),b=>{k(null),t(b.exists()?b.data():{}),s(!1)},b=>{console.error("Settings listen error:",b),b.code==="permission-denied"&&k("permission-denied"),t({}),s(!1)}),[]);const T=v.useCallback((p,b)=>E(x=>({...x,[p]:b})),[]),F=v.useCallback((p,b,x,A)=>{E(O=>{const V=[...O[p]];return V[b]=x===null?A:{...V[b],[x]:A},{...O,[p]:V}})},[]),H=v.useCallback((p,b)=>E(x=>({...x,[p]:[...x[p],b]})),[]),U=v.useCallback((p,b)=>E(x=>({...x,[p]:x[p].filter((A,O)=>O!==b)})),[]),z=()=>{var p;return(p=I.current)==null?void 0:p.scrollIntoView({behavior:"smooth"})},ae=()=>{var b,x;const p={};return o===0&&(g.fullName.trim()||(p.fullName="Full name is required."),g.dob||(p.dob="Date of birth is required."),g.gender||(p.gender="Please select a gender.")),o===1&&(g.phone.trim()||(p.phone="Phone number is required."),g.email.trim()?/\S+@\S+\.\S+/.test(g.email)||(p.email="Please enter a valid email."):p.email="Email address is required.",g.physicalAddress.trim()||(p.physicalAddress="Address is required."),g.district.trim()||(p.district="District is required.")),o===2&&g.education.forEach((A,O)=>{O===0&&!A.institution.trim()&&(p[`edu_${O}_institution`]="At least one institution is required.")}),o===3&&((x=(b=g.referees[0])==null?void 0:b.name)!=null&&x.trim()||(p.ref_0_name="At least one referee name is required.")),N(p),Object.keys(p).length===0},ye=()=>{ae()&&(l(p=>p+1),z())},oe=()=>{l(p=>p-1),N({}),z()},_=async()=>{if(ae()){S(!0);try{const p=await bn(ui(ue,"applications"),{...g,type:r.type||"",program:r.title,trackKey:r.key,trackColor:r.color,status:"Pending",submittedAt:yn()});fetch("/api/send-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:"application_received",to:g.email,name:g.fullName,program:r.title})}).catch(b=>console.warn("[Email] Confirmation email failed:",b)),f(p.id),d(!0),z()}catch(p){alert("Submission failed: "+p.message)}finally{S(!1)}}};if(!r)return e.jsxs(q,{children:[m==="permission-denied"&&e.jsxs("div",{style:{background:"#FEF3C7",borderBottom:"1px solid #F59E0B",padding:"10px 20px",fontSize:13,color:"#92400E",textAlign:"center"},children:["⚠️ Could not load position availability — please check your Firestore Security Rules for the ",e.jsx("code",{children:"settings"})," collection."]}),e.jsx(Ma,{trackStatuses:i,statusLoading:n,onSelect:a})]});if(i[r.key]===!1)return e.jsx(q,{children:e.jsx(Ba,{track:r,onBack:()=>a(null)})});if(c)return e.jsx(q,{children:e.jsx(Wa,{form:g,track:r,docId:u,onBack:()=>{a(null),d(!1),l(0)}})});const R=[e.jsx(Ha,{form:g,errors:C,onChange:T},"p"),e.jsx(qa,{form:g,errors:C,onChange:T},"c"),e.jsx(Va,{form:g,errors:C,onChangeArr:F,onAddRow:H,onRemoveRow:U},"e"),e.jsx($a,{form:g,errors:C,onChangeArr:F,onAddRow:H,onRemoveRow:U,onChange:T},"x"),e.jsx(Ga,{form:g,track:r},"r")],B=o===yt.length-1;return e.jsx(q,{children:e.jsxs("div",{style:h.pageWrap,ref:I,children:[e.jsxs("div",{style:h.pageHeader,children:[e.jsx("button",{style:h.backToTracks,onClick:()=>a(null),children:"← All Positions"}),e.jsx("span",{style:{...h.trackPill,background:r.lightBg||"#EFF6FF",color:r.color},children:r.title})]}),e.jsxs("div",{style:h.formCard,children:[e.jsx("div",{style:{...h.formAccent,background:r.color}}),e.jsx(Ua,{step:o,trackColor:r.color}),e.jsx("div",{style:h.formBody,children:R[o]}),e.jsxs("div",{style:h.navBar,children:[e.jsx("div",{style:{flex:1},children:o>0&&e.jsx("button",{style:h.backBtn,onClick:oe,children:"← Back"})}),e.jsxs("span",{style:{fontSize:12,color:"#94A3B8"},children:["Step ",o+1," of ",yt.length]}),e.jsx("div",{style:{flex:1,display:"flex",justifyContent:"flex-end"},children:B?e.jsx("button",{style:{...h.nextBtn,background:r.color,minWidth:130},onClick:_,disabled:w,children:w?"⏳ Submitting…":"✓ Submit Application"}):e.jsx("button",{style:{...h.nextBtn,background:r.color},onClick:ye,children:"Continue →"})})]})]})]})})},h={centreWrap:{minHeight:"70vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 20px"},noticeCard:{maxWidth:520,width:"100%",background:"#fff",borderRadius:14,boxShadow:"0 4px 24px rgba(0,0,0,0.10)",border:"1px solid #E2E8F0",padding:"48px 40px",textAlign:"center"},noticeTitle:{fontSize:22,fontWeight:700,color:"#1A3C5E",margin:"0 0 12px"},noticeBody:{fontSize:15,color:"#4A6B8A",lineHeight:1.7,margin:"0 0 24px"},refBox:{display:"inline-flex",alignItems:"center",gap:10,background:"#F0F4F8",borderRadius:8,padding:"10px 18px",marginBottom:20},refLabel:{fontSize:12,fontWeight:600,color:"#7A8A9A",textTransform:"uppercase",letterSpacing:.5},refValue:{fontSize:14,fontWeight:700,color:"#1A3C5E",fontFamily:"monospace"},selectorWrap:{maxWidth:1e3,margin:"0 auto",padding:"48px 20px 80px"},selectorHeader:{marginBottom:36},selectorTitle:{fontSize:30,fontWeight:700,color:"#1A3C5E",margin:0},selectorSub:{color:"#5A7A9A",marginTop:8,fontSize:15},trackGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:20},trackCard:{background:"#fff",borderRadius:12,border:"1px solid #E2E8F0",padding:"24px 22px",boxShadow:"0 1px 6px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",gap:8},trackTag:{display:"inline-block",fontSize:11,fontWeight:700,borderRadius:4,padding:"3px 9px",letterSpacing:.4,textTransform:"uppercase",alignSelf:"flex-start"},trackTitle:{fontSize:17,fontWeight:700,margin:0},trackDesc:{fontSize:13,color:"#5A7A9A",lineHeight:1.6,margin:0,flex:1},trackApplyBtn:{border:"none",color:"#fff",borderRadius:8,padding:"10px 18px",fontSize:14,fontWeight:700,cursor:"pointer",width:"100%",textAlign:"center"},trackClosedBadge:{display:"inline-block",background:"#F3F4F6",color:"#9CA3AF",borderRadius:6,padding:"9px 16px",fontSize:13,fontWeight:600,width:"100%",textAlign:"center",boxSizing:"border-box"},pageWrap:{maxWidth:820,margin:"0 auto",padding:"32px 20px 80px"},pageHeader:{display:"flex",alignItems:"center",gap:14,marginBottom:20,flexWrap:"wrap"},backToTracks:{background:"none",border:"1.5px solid #D0DCE8",color:"#4A6B8A",borderRadius:7,padding:"7px 14px",fontSize:13,fontWeight:600,cursor:"pointer"},trackPill:{borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:600},formCard:{background:"#fff",borderRadius:12,boxShadow:"0 2px 16px rgba(0,0,0,0.08)",border:"1px solid #E2E8F0",overflow:"hidden"},formAccent:{height:4},formBody:{padding:"28px 32px"},navBar:{display:"flex",alignItems:"center",padding:"16px 32px",borderTop:"1px solid #E2E8F0",background:"#F7F9FC",gap:12},stepBar:{display:"flex",alignItems:"center",padding:"18px 32px 14px",borderBottom:"1px solid #E2E8F0",background:"#F7F9FC",overflowX:"auto",gap:0},stepItem:{display:"flex",flexDirection:"column",alignItems:"center",minWidth:58},stepCircle:{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,marginBottom:4},stepLabel:{fontSize:10,textAlign:"center",whiteSpace:"nowrap",color:"#94A3B8"},stepLine:{flex:1,height:2,minWidth:16,margin:"0 2px 14px"},sectionTitle:{fontSize:15,fontWeight:700,color:"#1A3C5E",marginBottom:6,marginTop:0},sectionHint:{fontSize:13,color:"#7A8A9A",marginBottom:16,marginTop:0},row2:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:14,marginBottom:0},row3:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))",gap:14,marginBottom:0},fieldWrap:{display:"flex",flexDirection:"column",marginBottom:14},label:{fontSize:12,fontWeight:600,color:"#4A6B8A",marginBottom:5,letterSpacing:.3},input:{width:"100%",boxSizing:"border-box",padding:"10px 12px",borderRadius:7,border:"1.5px solid #D0DCE8",fontSize:14,color:"#1A3C5E",background:"#F8FAFC",outline:"none",fontFamily:"inherit"},textarea:{resize:"vertical",minHeight:90},errMsg:{fontSize:11,color:"#C0392B",marginTop:4,display:"block"},card:{background:"#F7F9FC",border:"1px solid #E2E8F0",borderRadius:8,padding:"16px 18px",marginBottom:12},addBtn:{background:"none",border:"1.5px dashed #2E6DA4",color:"#2E6DA4",borderRadius:7,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:4},removeBtn:{background:"none",border:"none",color:"#C0392B",fontSize:12,cursor:"pointer",fontWeight:600},backBtn:{background:"none",border:"1.5px solid #C5CDD6",color:"#4A6B8A",borderRadius:8,padding:"9px 20px",fontSize:14,fontWeight:600,cursor:"pointer"},nextBtn:{color:"#fff",border:"none",borderRadius:8,padding:"9px 26px",fontSize:14,fontWeight:700,cursor:"pointer"},trackBanner:{display:"flex",alignItems:"center",border:"1.5px solid",borderRadius:8,padding:"10px 16px"},rrSection:{background:"#F7F9FC",borderRadius:8,border:"1px solid #E2E8F0",padding:"14px 18px",marginBottom:10},rrHead:{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,margin:"0 0 8px",color:"#7A8A9A"},rrRow:{display:"flex",gap:10,padding:"4px 0",fontSize:14,borderBottom:"1px solid #EEF2F7"},rrLabel:{minWidth:120,color:"#7A8A9A",fontWeight:600,fontSize:13},rrVal:{color:"#1A3C5E",flex:1}},Ya=async i=>{var ye,oe;const{jsPDF:t}=await kt(async()=>{const{jsPDF:_}=await import("./jspdf.es.min-DmfAY9eD.js").then(R=>R.j);return{jsPDF:_}},[]),n=se.find(_=>_.key===i.trackKey),s=i.trackColor||(n==null?void 0:n.color)||"#1A3C5E",r=new t({unit:"mm",format:"a4"}),a=210,o=20,l=a-o*2;let c=20;const d=()=>{r.addPage(),c=20},u=(_=10)=>{c+_>275&&d()},f=_=>{const R=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(_);return R?[parseInt(R[1],16),parseInt(R[2],16),parseInt(R[3],16)]:[26,60,94]};r.setFillColor(26,60,94),r.rect(0,0,a,28,"F"),r.setFontSize(14),r.setFont("helvetica","bold"),r.setTextColor(255,255,255),r.text("SLIRUS HOLDINGS LIMITED",o,12),r.setFontSize(9),r.setFont("helvetica","normal"),r.text("Employment Application — Admin Copy",o,19),r.text(`Position: ${i.program||"—"}`,a-o,12,{align:"right"});const w=(ye=i.submittedAt)!=null&&ye.toDate?i.submittedAt.toDate().toLocaleDateString("en-UG"):"—";r.text(`Submitted: ${w}`,a-o,19,{align:"right"}),c=36;const[S,C,N]=f(s);r.setDrawColor(S,C,N),r.setLineWidth(.8),r.line(o,c,a-o,c),c+=6;const I={Shortlisted:[16,185,129],Unqualified:[239,68,68],Pending:[245,158,11]},[g,E,m]=I[i.status]||I.Pending;r.setFillColor(g,E,m),r.roundedRect(o,c,38,7,2,2,"F"),r.setFontSize(8),r.setFont("helvetica","bold"),r.setTextColor(255,255,255),r.text((i.status||"Pending").toUpperCase(),o+19,c+5,{align:"center"}),c+=14;const k=_=>{u(14),r.setFillColor(240,244,248),r.rect(o,c,l,7,"F"),r.setFontSize(9),r.setFont("helvetica","bold"),r.setTextColor(26,60,94),r.text(_.toUpperCase(),o+3,c+5),c+=10},T=(_,R)=>{if(!R)return;u(7),r.setFontSize(9),r.setFont("helvetica","bold"),r.setTextColor(90,122,154),r.text(_+":",o,c),r.setFont("helvetica","normal"),r.setTextColor(26,60,94);const B=r.splitTextToSize(String(R),l-45);r.text(B,o+44,c),c+=B.length*5+2},F=(_,R)=>{R&&(u(10),_&&(r.setFontSize(9),r.setFont("helvetica","bold"),r.setTextColor(90,122,154),r.text(_+":",o,c),c+=5),r.setFont("helvetica","normal"),r.setTextColor(26,60,94),r.splitTextToSize(String(R),l).forEach(B=>{u(5),r.text(B,o,c),c+=5}),c+=2)};k("1. Personal Information"),T("Full Name",i.fullName),T("Date of Birth",i.dob),T("Age",i.age),T("Gender",i.gender),c+=2,k("2. Contact Information"),T("Phone",i.phone),T("Email",i.email),T("Address",i.physicalAddress),T("District",i.district),c+=2,(oe=i.coverNote)!=null&&oe.trim()&&(k("3. Cover Note"),F("",i.coverNote),c+=2),k("4. Education History"),(i.education||[]).forEach((_,R)=>{_.institution&&(u(18),r.setFontSize(8.5),r.setFont("helvetica","bold"),r.setTextColor(26,60,94),r.text(`${R+1}. ${_.institution}`,o+2,c),c+=5,T("  Year",_.year),T("  Level",_.level),T("  Award",_.award),c+=1)}),k("5. Work Experience"),(i.experience||[]).some(_=>_.employer)?(i.experience||[]).forEach((_,R)=>{_.employer&&(u(20),r.setFontSize(8.5),r.setFont("helvetica","bold"),r.setTextColor(26,60,94),r.text(`${R+1}. ${_.employer} — ${_.role}`,o+2,c),c+=5,T("  Period",_.period),_.duties&&F("  Duties",_.duties),c+=1)}):(r.setFontSize(9),r.setFont("helvetica","italic"),r.setTextColor(150,150,150),r.text("No work experience provided.",o+2,c),c+=7);const U=(i.hobbies||[]).filter(Boolean);U.length&&(k("6. Hobbies & Interests"),F("",U.join(", ")),c+=2),k("7. Professional Referees"),(i.referees||[]).forEach((_,R)=>{_.name&&(u(18),r.setFontSize(8.5),r.setFont("helvetica","bold"),r.setTextColor(26,60,94),r.text(`${R+1}. ${_.name}`,o+2,c),c+=5,T("  Title",_.title),T("  Contact",_.contact),c+=1)});const z=r.internal.getNumberOfPages();for(let _=1;_<=z;_++)r.setPage(_),r.setFontSize(8),r.setFont("helvetica","normal"),r.setTextColor(160,160,160),r.line(o,285,a-o,285),r.text(`Slirus Holdings · Admin Copy · Confidential · Page ${_} of ${z}`,a/2,290,{align:"center"});const ae=(i.fullName||"applicant").replace(/\s+/g,"_");r.save(`Slirus_Admin_${ae}_${i.trackKey||"app"}.pdf`)},vt={Pending:{bg:"#FEF3C7",color:"#92400E",dot:"#F59E0B"},Shortlisted:{bg:"#D1FAE5",color:"#065F46",dot:"#10B981"},Unqualified:{bg:"#FEE2E2",color:"#991B1B",dot:"#EF4444"}},en=({status:i})=>{const t=vt[i]||vt.Pending;return e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:5,background:t.bg,color:t.color,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:600},children:[e.jsx("span",{style:{width:7,height:7,borderRadius:"50%",background:t.dot,flexShrink:0}}),i||"Pending"]})},Ja=({track:i,isOpen:t,onToggle:n,toggling:s,appCount:r})=>e.jsxs("div",{style:{...me.card,borderTop:`3px solid ${i.color}`},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10},children:[i.tag&&e.jsx("span",{style:{...me.tag,background:i.lightBg||"#EFF6FF",color:i.color},children:i.tag}),e.jsxs("span",{style:{fontSize:12,color:"#7A8A9A",fontWeight:600,marginLeft:"auto"},children:[r," applied"]})]}),e.jsx("h4",{style:{...me.title,color:i.color},children:i.title}),i.description&&e.jsx("p",{style:me.desc,children:i.description}),e.jsxs("div",{style:me.footer,children:[e.jsx("span",{style:{...me.status,color:t?"#065F46":"#991B1B"},children:t?"● Open":"● Closed"}),e.jsx("button",{style:{...me.btn,background:t?"#FEE2E2":"#D1FAE5",color:t?"#991B1B":"#065F46"},onClick:()=>n(i.key,t),disabled:s===i.key,children:s===i.key?"…":t?"Close":"Open"})]})]}),Xa=({app:i,onClose:t,onStatusChange:n,statusUpdating:s})=>{var C,N,I;const[r,a]=v.useState(!1),[o,l]=v.useState(i==null?void 0:i.status);if(v.useEffect(()=>{l(i==null?void 0:i.status)},[i==null?void 0:i.status]),!i)return null;const c=se.find(g=>g.key===i.trackKey),d=i.trackColor||(c==null?void 0:c.color)||"#2E6DA4",u=async g=>{l(g),await n(i.id,g)},f=async()=>{a(!0);try{await Ya({...i,status:o})}catch(g){alert("PDF error: "+g.message)}finally{a(!1)}},w=({title:g,children:E})=>e.jsxs("div",{style:M.section,children:[e.jsx("h4",{style:{...M.secTitle,color:d},children:g}),E]}),S=({label:g,val:E})=>E?e.jsxs("div",{style:M.row,children:[e.jsx("span",{style:M.label,children:g}),e.jsx("span",{style:M.val,children:E})]}):null;return e.jsx("div",{style:M.overlay,onClick:t,children:e.jsxs("div",{style:M.modal,onClick:g=>g.stopPropagation(),children:[e.jsxs("div",{style:{...M.header,borderTop:`4px solid ${d}`},children:[e.jsxs("div",{children:[e.jsx("h3",{style:{margin:0,color:"#1A3C5E",fontSize:17},children:i.fullName}),e.jsxs("p",{style:{margin:"4px 0 0",color:"#5A7A9A",fontSize:13},children:[i.program,i.type?` · ${i.type}`:""]})]}),e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center"},children:[e.jsx(en,{status:o}),e.jsx("button",{style:M.closeBtn,onClick:t,title:"Close",children:"✕"})]})]}),e.jsxs("div",{style:M.actionBar,children:[e.jsx("button",{style:{...M.actionBtn,background:"#D1FAE5",color:"#065F46",opacity:o==="Shortlisted"?.45:1},onClick:()=>u("Shortlisted"),disabled:o==="Shortlisted"||s,children:"✅ Shortlist"}),e.jsx("button",{style:{...M.actionBtn,background:"#FEE2E2",color:"#991B1B",opacity:o==="Unqualified"?.45:1},onClick:()=>u("Unqualified"),disabled:o==="Unqualified"||s,children:"✗ Reject"}),e.jsx("button",{style:{...M.actionBtn,background:"#EFF6FF",color:"#1D4ED8"},onClick:f,disabled:r,children:r?"⏳ Generating…":"⬇ Download PDF"})]}),e.jsxs("div",{style:M.body,children:[e.jsxs(w,{title:"Personal",children:[e.jsx(S,{label:"Date of Birth",val:i.dob}),e.jsx(S,{label:"Age",val:i.age}),e.jsx(S,{label:"Gender",val:i.gender})]}),e.jsxs(w,{title:"Contact",children:[e.jsx(S,{label:"Phone",val:i.phone}),e.jsx(S,{label:"Email",val:i.email}),e.jsx(S,{label:"Address",val:i.physicalAddress}),e.jsx(S,{label:"District",val:i.district})]}),((C=i.coverNote)==null?void 0:C.trim())&&e.jsx(w,{title:"Cover Note",children:e.jsx("p",{style:{fontSize:14,color:"#1A3C5E",lineHeight:1.7,margin:0},children:i.coverNote})}),(i.education||[]).some(g=>g.institution)&&e.jsx(w,{title:"Education",children:(i.education||[]).map((g,E)=>g.institution?e.jsx(S,{label:g.year||`#${E+1}`,val:[g.institution,g.level,g.award].filter(Boolean).join(" · ")},E):null)}),(i.experience||[]).some(g=>g.employer)&&e.jsx(w,{title:"Experience",children:(i.experience||[]).map((g,E)=>g.employer?e.jsxs("div",{style:{marginBottom:10},children:[e.jsx(S,{label:g.period||`#${E+1}`,val:[g.employer,g.role].filter(Boolean).join(" · ")}),g.duties&&e.jsx("p",{style:{fontSize:13,color:"#5A7A9A",margin:"3px 0 0 124px",lineHeight:1.5},children:g.duties})]},E):null)}),(i.hobbies||[]).filter(Boolean).length>0&&e.jsx(w,{title:"Hobbies",children:e.jsx("p",{style:{fontSize:14,color:"#1A3C5E",margin:0},children:i.hobbies.filter(Boolean).join(", ")})}),(i.referees||[]).some(g=>g.name)&&e.jsx(w,{title:"Referees",children:(i.referees||[]).map((g,E)=>g.name?e.jsx(S,{label:g.name,val:[g.title,g.contact].filter(Boolean).join(" · ")},E):null)}),e.jsxs(w,{title:"Submission",children:[e.jsx(S,{label:"Reference",val:(N=i.id)==null?void 0:N.slice(0,12).toUpperCase()}),e.jsx(S,{label:"Submitted",val:(I=i.submittedAt)!=null&&I.toDate?i.submittedAt.toDate().toLocaleString("en-UG"):"—"}),e.jsx(S,{label:"Status",val:o})]})]})]})})},Qa=({onLogin:i})=>{const[t,n]=v.useState(""),[s,r]=v.useState(""),[a,o]=v.useState(!1),[l,c]=v.useState(""),d=async u=>{if(u==null||u.preventDefault(),!t.trim()||!s){c("Please enter your email and password.");return}o(!0),c("");try{await fr(Ve,t.trim(),s),i==null||i()}catch(f){const w=["auth/user-not-found","auth/wrong-password","auth/invalid-credential"].includes(f.code);c(w?"Invalid email or password. Please try again.":"Sign-in failed. Please check your connection.")}finally{o(!1)}};return e.jsx("div",{style:y.loginBg,children:e.jsxs("div",{style:y.loginCard,children:[e.jsx("div",{style:{fontSize:40,marginBottom:14},children:"🔐"}),e.jsx("h2",{style:y.loginTitle,children:"Admin Portal"}),e.jsx("p",{style:y.loginSub,children:"Enter your credentials to access the dashboard."}),e.jsxs("form",{onSubmit:d,noValidate:!0,children:[e.jsx("input",{type:"email",placeholder:"Admin Email",value:t,onChange:u=>n(u.target.value),style:{...y.loginInput,borderColor:l?"#EF4444":"#D0DCE8"},disabled:a,autoFocus:!0,autoComplete:"username"}),e.jsx("input",{type:"password",placeholder:"Password",value:s,onChange:u=>r(u.target.value),style:{...y.loginInput,borderColor:l?"#EF4444":"#D0DCE8",marginTop:10},disabled:a,autoComplete:"current-password"}),l&&e.jsx("p",{style:y.loginErr,children:l}),e.jsx("button",{type:"submit",style:y.loginBtn,disabled:a,children:a?"Signing in…":"Sign In →"})]})]})})},Za=()=>{const[i,t]=v.useState(null),[n,s]=v.useState(!0),[r,a]=v.useState([]),[o,l]=v.useState({}),[c,d]=v.useState(null),[u,f]=v.useState(null),[w,S]=v.useState(!1),[C,N]=v.useState(!0),[I,g]=v.useState("All"),[E,m]=v.useState("All"),[k,T]=v.useState(""),[F,H]=v.useState(null),[U,z]=v.useState(null);v.useEffect(()=>br(Ve,b=>{t(b),s(!1)}),[]),v.useEffect(()=>{if(!i){a([]),l({}),H(null),z(null);return}N(!0);const p=Ge(ui(ue,"applications"),x=>{H(null),a(x.docs.map(A=>({id:A.id,...A.data()}))),N(!1)},x=>{console.error("Applications listen error:",x),H(x.code==="permission-denied"?"Permission denied reading applications. Check your Firestore Security Rules.":"Could not load applications: "+x.message),N(!1)}),b=Ge(ve(ue,"settings","applicationStatus"),async x=>{z(null);const A=x.exists()?x.data():{},O={};if(se.forEach(V=>{V.key in A||(O[V.key]=!1)}),Object.keys(O).length>0){console.log("[Admin] Seeding missing track keys:",O);try{await Pt(ve(ue,"settings","applicationStatus"),O,{merge:!0})}catch(V){console.warn("[Admin] Could not seed track keys:",V.message)}return}l(A)},x=>{console.error("Settings listen error:",x),z(x.code==="permission-denied"?"Permission denied reading settings. Check your Firestore Security Rules.":"Could not load track settings: "+x.message)});return()=>{p(),b()}},[i]);const ae=async()=>{try{await yr(Ve)}catch(p){console.error("Logout error:",p)}},ye=async(p,b)=>{d(p);try{const x=Ve.currentUser;if(!x){alert("Session expired — please sign out and sign in again."),d(null);return}const A=!b;console.log(`[Toggle] ${p}: ${b} → ${A} | uid: ${x.uid} | email: ${x.email}`),await Pt(ve(ue,"settings","applicationStatus"),{[p]:A},{merge:!0}),console.log(`[Toggle] Firestore write success for ${p}`)}catch(x){console.error("toggleTrackStatus error:",x.code,x.message),x.code==="permission-denied"?alert(`Permission denied.

Firebase rejected the write for "${p}".

Make sure:
1. You are logged in as kaayamosesawal@gmail.com
2. Your Firestore rules allow this email to write to settings/applicationStatus`):alert("Toggle failed: "+x.message)}finally{d(null)}},oe=v.useCallback(async(p,b)=>{S(!0);try{await vn(ve(ue,"applications",p),{status:b}),f(A=>(A==null?void 0:A.id)===p?{...A,status:b}:A);const x=r.find(A=>A.id===p);x&&(b==="Shortlisted"||b==="Unqualified")&&fetch("/api/send-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:b==="Shortlisted"?"shortlisted":"unqualified",to:x.email,name:x.fullName,program:x.program})}).catch(O=>console.warn("[Email] Status email failed:",O))}catch(x){console.error("updateStatus error:",x),alert("Status update failed: "+x.message)}finally{S(!1)}},[r]);if(n)return e.jsx("div",{style:y.loginBg,children:e.jsx("div",{style:{color:"#1A3C5E",fontWeight:600,fontSize:15},children:"Loading Portal…"})});if(!i)return e.jsx(Qa,{});const _=p=>r.filter(b=>b.trackKey===p).length,R=r.filter(p=>I==="All"||p.trackKey===I).filter(p=>E==="All"||p.status===E).filter(p=>{var x,A;const b=k.trim().toLowerCase();return!b||((x=p.fullName)==null?void 0:x.toLowerCase().includes(b))||((A=p.email)==null?void 0:A.toLowerCase().includes(b))}).sort((p,b)=>{var x,A,O,V;return(((A=(x=b.submittedAt)==null?void 0:x.toDate)==null?void 0:A.call(x))||0)-(((V=(O=p.submittedAt)==null?void 0:O.toDate)==null?void 0:V.call(O))||0)}),B={All:r.length,Pending:r.filter(p=>p.status==="Pending").length,Shortlisted:r.filter(p=>p.status==="Shortlisted").length,Unqualified:r.filter(p=>p.status==="Unqualified").length};return e.jsxs(q,{children:[e.jsxs("div",{style:y.page,children:[U&&e.jsxs("div",{style:y.errorBanner,children:["⚠️ Track Settings: ",U]}),F&&e.jsxs("div",{style:y.errorBanner,children:["⚠️ Applications: ",F]}),e.jsxs("div",{style:y.topBar,children:[e.jsxs("div",{children:[e.jsx("h1",{style:y.pageTitle,children:"Applications Dashboard"}),e.jsxs("p",{style:y.pageSub,children:[B.All," total · ",B.Shortlisted," shortlisted · ",B.Pending," pending · ",B.Unqualified," unqualified"]})]}),e.jsx("button",{style:y.logoutBtn,onClick:ae,children:"Sign Out ⎋"})]}),e.jsx("h2",{style:y.sectionHead,children:"Position Intake Control"}),e.jsx("div",{style:y.trackGrid,children:se.map(p=>e.jsx(Ja,{track:p,isOpen:o[p.key]===!0,onToggle:ye,toggling:c,appCount:_(p.key)},p.key))}),e.jsx("h2",{style:{...y.sectionHead,marginTop:36},children:"Received Applications"}),e.jsxs("div",{style:y.toolbar,children:[e.jsxs("div",{style:y.tabs,children:[e.jsxs("button",{style:{...y.tab,...I==="All"?y.tabActive:{}},onClick:()=>g("All"),children:["All Tracks ",e.jsx("span",{style:y.tabCount,children:B.All})]}),se.map(p=>e.jsxs("button",{style:{...y.tab,...I===p.key?{...y.tabActive,background:p.color,borderColor:p.color}:{}},onClick:()=>g(p.key),children:[p.title.split(" ")[0],e.jsx("span",{style:y.tabCount,children:_(p.key)})]},p.key))]}),e.jsx("div",{style:y.tabs,children:["All","Pending","Shortlisted","Unqualified"].map(p=>{const b=vt[p];return e.jsxs("button",{style:{...y.tab,...E===p?b?{background:b.bg,color:b.color,borderColor:b.dot}:y.tabActive:{}},onClick:()=>m(p),children:[p," ",e.jsx("span",{style:y.tabCount,children:B[p]})]},p)})}),e.jsx("input",{style:y.searchInput,placeholder:"Search name or email…",value:k,onChange:p=>T(p.target.value)})]}),e.jsx("div",{style:y.tableWrap,children:C?e.jsx("div",{style:y.tableMsg,children:"Loading applications…"}):R.length===0?e.jsx("div",{style:y.tableMsg,children:"No applications match your filters."}):e.jsxs("table",{style:y.table,children:[e.jsx("thead",{children:e.jsxs("tr",{style:y.thead,children:[e.jsx("th",{style:y.th,children:"Applicant"}),e.jsx("th",{style:y.th,children:"Track"}),e.jsx("th",{style:y.th,children:"Status"}),e.jsx("th",{style:y.th,children:"Submitted"}),e.jsx("th",{style:y.th,children:"Actions"})]})}),e.jsx("tbody",{children:R.map(p=>{var x;const b=se.find(A=>A.key===p.trackKey);return e.jsxs("tr",{style:y.tr,children:[e.jsxs("td",{style:y.td,children:[e.jsx("button",{style:y.nameBtn,onClick:()=>f(p),children:p.fullName}),e.jsx("div",{style:{fontSize:12,color:"#7A8A9A",marginTop:2},children:p.email})]}),e.jsx("td",{style:y.td,children:e.jsx("span",{style:{fontSize:13,color:(b==null?void 0:b.color)||"#1A3C5E",fontWeight:600},children:(b==null?void 0:b.title)||p.program||"—"})}),e.jsx("td",{style:y.td,children:e.jsx(en,{status:p.status})}),e.jsx("td",{style:{...y.td,fontSize:12,color:"#7A8A9A",whiteSpace:"nowrap"},children:(x=p.submittedAt)!=null&&x.toDate?p.submittedAt.toDate().toLocaleDateString("en-UG"):"—"}),e.jsx("td",{style:y.td,children:e.jsxs("div",{style:{display:"flex",gap:6},children:[e.jsx("button",{style:{...y.btnShortlist,opacity:p.status==="Shortlisted"?.45:1},onClick:()=>oe(p.id,"Shortlisted"),disabled:p.status==="Shortlisted"||w,children:"Shortlist"}),e.jsx("button",{style:{...y.btnReject,opacity:p.status==="Unqualified"?.45:1},onClick:()=>oe(p.id,"Unqualified"),disabled:p.status==="Unqualified"||w,children:"Reject"}),e.jsx("button",{style:y.btnView,onClick:()=>f(p),children:"View"})]})})]},p.id)})})]})})]}),e.jsx(Xa,{app:u,onClose:()=>f(null),onStatusChange:oe,statusUpdating:w})]})},y={errorBanner:{background:"#FEF3C7",border:"1px solid #F59E0B",borderRadius:8,padding:"10px 16px",marginBottom:16,fontSize:13,color:"#92400E",fontWeight:600},loginBg:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F0F4F8"},loginCard:{background:"#fff",borderRadius:14,padding:"48px 40px",boxShadow:"0 4px 24px rgba(0,0,0,0.10)",textAlign:"center",width:"100%",maxWidth:380,border:"1px solid #E2E8F0",borderTop:"4px solid #1A3C5E"},loginTitle:{fontSize:22,fontWeight:700,color:"#1A3C5E",margin:"0 0 8px"},loginSub:{color:"#5A7A9A",fontSize:14,margin:"0 0 28px"},loginInput:{width:"100%",padding:"12px 14px",borderRadius:8,border:"1.5px solid #D0DCE8",fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"inherit"},loginErr:{color:"#EF4444",fontSize:13,margin:"10px 0 0",textAlign:"left"},loginBtn:{width:"100%",background:"#1A3C5E",color:"#fff",border:"none",borderRadius:8,padding:"12px",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:16},page:{padding:"36px 5%",maxWidth:1280,margin:"0 auto"},topBar:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:12},pageTitle:{fontSize:26,fontWeight:700,color:"#1A3C5E",margin:0},pageSub:{color:"#5A7A9A",margin:"4px 0 0",fontSize:14},logoutBtn:{padding:"8px 16px",background:"#fff",border:"1.5px solid #C5CDD6",color:"#4A6B8A",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"},sectionHead:{fontSize:15,fontWeight:700,color:"#1A3C5E",margin:"0 0 14px"},trackGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:14},toolbar:{display:"flex",flexWrap:"wrap",gap:10,marginBottom:14,alignItems:"center"},tabs:{display:"flex",gap:4,flexWrap:"wrap"},tab:{background:"none",border:"1.5px solid #E2E8F0",borderRadius:7,padding:"7px 12px",fontSize:13,color:"#5A7A9A",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:5},tabActive:{background:"#1A3C5E",color:"#fff",borderColor:"#1A3C5E"},tabCount:{background:"rgba(0,0,0,0.12)",borderRadius:10,padding:"1px 7px",fontSize:11},searchInput:{flex:1,minWidth:200,padding:"9px 14px",border:"1.5px solid #D0DCE8",borderRadius:8,fontSize:14,outline:"none",fontFamily:"inherit"},tableWrap:{background:"#fff",borderRadius:10,border:"1px solid #E2E8F0",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",overflow:"auto"},tableMsg:{padding:56,textAlign:"center",color:"#5A7A9A",fontSize:14},table:{width:"100%",borderCollapse:"collapse",fontSize:14},thead:{background:"#F7F9FC"},th:{padding:"11px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#7A8A9A",textTransform:"uppercase",letterSpacing:.4,borderBottom:"1px solid #E2E8F0",whiteSpace:"nowrap"},tr:{borderBottom:"1px solid #F0F4F8"},td:{padding:"11px 14px",verticalAlign:"middle",color:"#1A3C5E"},nameBtn:{background:"none",border:"none",color:"#2E6DA4",fontWeight:700,fontSize:14,cursor:"pointer",textDecoration:"underline",padding:0,fontFamily:"inherit"},btnShortlist:{background:"#D1FAE5",color:"#065F46",border:"none",borderRadius:6,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer"},btnReject:{background:"#FEE2E2",color:"#991B1B",border:"none",borderRadius:6,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer"},btnView:{background:"#EFF6FF",color:"#1D4ED8",border:"none",borderRadius:6,padding:"5px 10px",fontSize:12,fontWeight:700,cursor:"pointer"}},me={card:{background:"#fff",borderRadius:10,border:"1px solid #E2E8F0",padding:"18px 20px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"},tag:{fontSize:10,fontWeight:700,borderRadius:4,padding:"3px 8px",letterSpacing:.4,textTransform:"uppercase"},title:{fontSize:15,fontWeight:700,margin:"6px 0 4px"},desc:{fontSize:12,color:"#5A7A9A",lineHeight:1.5,margin:"0 0 14px"},footer:{display:"flex",alignItems:"center",justifyContent:"space-between"},status:{fontSize:12,fontWeight:700},btn:{border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}},M={overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1e3,padding:20},modal:{background:"#fff",borderRadius:12,width:"100%",maxWidth:640,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,0.18)"},header:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"18px 24px",borderBottom:"1px solid #E2E8F0",background:"#F7F9FC",borderRadius:"12px 12px 0 0",flexShrink:0},actionBar:{display:"flex",gap:8,padding:"12px 24px",borderBottom:"1px solid #E2E8F0",flexWrap:"wrap",flexShrink:0},actionBtn:{border:"none",borderRadius:7,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer"},body:{overflowY:"auto",padding:"20px 24px",flex:1},closeBtn:{background:"none",border:"none",fontSize:18,cursor:"pointer",color:"#7A8A9A",lineHeight:1,padding:4},section:{marginBottom:18},secTitle:{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,margin:"0 0 8px",borderBottom:"1px solid #E8F0F8",paddingBottom:5},row:{display:"flex",gap:10,padding:"4px 0",fontSize:14},label:{minWidth:120,color:"#7A8A9A",fontWeight:600,fontSize:13,flexShrink:0},val:{color:"#1A3C5E",flex:1,wordBreak:"break-word"}},ht=[{id:"slirupay",icon:"fas fa-mobile-alt",name:"SlirusPay",tagline:"Mobile Money & Agent Banking Platform",color:"#2563eb",light:"#eff6ff",sections:[{heading:"What SlirusPay Collects",body:"When you register on SlirusPay or use an agent outlet, we collect your full name, national ID number (Nin), date of birth, phone number, and a live selfie photograph for identity verification. Every transaction you initiate, including the amount, timestamp, recipient, sending and receiving float balances, and device location at the time of transfer, is recorded to maintain a legally compliant audit trail."},{heading:"How We Use Your SlirusPay Data",body:"Your identity data is used to comply with Bank of Uganda Know-Your-Customer (KYC) and Anti-Money Laundering (AML) directives. Transaction records are used to generate your e-statement, settle disputes, and detect unusual activity such as rapid high-value transfers or SIM-swap fraud patterns. We do not use your SlirusPay data to serve you advertisements. Agent outlet data (float levels, daily throughput) is shared internally with Slirus Financial Services Limited to manage liquidity."},{heading:"Retention of SlirusPay Records",body:"Under the Financial Institutions Act and Bank of Uganda guidelines, all transaction records, KYC documents, and agent agreements are retained for a minimum of seven (7) years. Records tied to an active regulatory investigation are held until that investigation is formally closed, regardless of the standard retention window."}]},{id:"slirusmanage",icon:"fas fa-layer-group",name:"SlirusManage",tagline:"Enterprise Resource Planning & Business Management",color:"#7c3aed",light:"#f5f3ff",sections:[{heading:"What SlirusManage Collects",body:"SlirusManage collects data you or your organisation enters into the platform: employee records (names, roles, salary grades, National Social Security Fund numbers), customer invoices and payment status, supplier purchase orders, and inventory stock levels. System usage data, which modules you open, how long you spend on each screen, and any errors encountered, is collected automatically to help us improve the product."},{heading:"Data Ownership & Client Control",body:"You own the business data you input into SlirusManage. We act as a data processor on your behalf, not as a data controller for that content. You may export a full copy of your data at any time from the Settings › Data Export panel, and you may request permanent deletion of your account and all associated records by contacting support@slirus.com. Deletion requests are processed within 14 business days."},{heading:"Integrations & Third-Party Connectors",body:"If you connect SlirusManage to a third-party service, such as a bank feed, Uganda Revenue Authority (URA) eTax gateway, or SMS gateway for invoice delivery, you authorise Slirus Technologies to transmit the minimum data required to complete that integration. Each connector is documented in your account under Settings › Integrations with a plain-language summary of what data crosses the boundary."}]},{id:"slirusfashion",icon:"fas fa-tshirt",name:"SlirusFashion",tagline:"Fashion Retail & Inventory Management",color:"#db2777",light:"#fdf2f8",sections:[{heading:"What SlirusFashion Collects",body:"When you place an order through SlirusFashion, whether for school uniforms, corporate wear, or retail clothing, we collect your full name, delivery address, phone number, and measurements or size preferences you provide. If you pay online, card processing is handled entirely by our licensed payment gateway partner; Slirus does not store raw card numbers on our servers."},{heading:"How We Use Your SlirusFashion Data",body:"Your address and contact details are shared with our production and delivery teams to fulfil your order. Size and style preference data is used to pre-populate future orders and provide accurate fit recommendations. We may send you order status updates via SMS or WhatsApp. We will only send promotional messages if you explicitly opt in, and you can unsubscribe from any message by replying STOP."},{heading:"Bulk & Corporate Order Data",body:"For institutional clients (schools, hospitals, government entities), we receive staff lists, employee numbers, and department groupings to manage bulk uniform orders. This data is used exclusively for order fulfilment. Lists are deleted from our production systems within 30 days of final delivery confirmation, though an anonymised order summary is retained for billing records."}]}],eo=[{icon:"fas fa-eye",title:"Right to Access",desc:"You may request a copy of all personal data Slirus holds about you across any of our products. We will respond within 21 days."},{icon:"fas fa-pen",title:"Right to Correct",desc:"If your name, contact, or identity details are wrong, contact us and we will correct them within 7 business days."},{icon:"fas fa-trash-alt",title:"Right to Erasure",desc:"You may request deletion of your data. We will comply unless a legal obligation (e.g. BOU 7-year rule) requires us to retain it."},{icon:"fas fa-ban",title:"Right to Object",desc:"You may object to processing based on legitimate interests. We will stop unless we can show overriding grounds."},{icon:"fas fa-download",title:"Right to Portability",desc:"Where technically feasible, you may request your data in a machine-readable format (CSV / JSON) for transfer elsewhere."},{icon:"fas fa-hand-paper",title:"Right to Withdraw Consent",desc:"Where we rely on consent, you may withdraw it at any time. Withdrawal does not affect processing already carried out."}],to=()=>{const[i,t]=v.useState("slirupay");return ht.find(n=>n.id===i),e.jsxs(q,{children:[e.jsx("link",{href:"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",rel:"stylesheet"}),e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"pp-container-wrapper",children:[e.jsx("div",{className:"pp-hero",children:e.jsxs("div",{className:"pp-hero-inner",children:[e.jsxs("div",{className:"pp-hero-glass-card",children:[e.jsxs("div",{className:"pp-eyebrow",children:[e.jsx("i",{className:"fas fa-shield-alt"})," Privacy & Data Protection"]}),e.jsxs("h1",{children:["Your data.",e.jsx("br",{}),e.jsx("span",{children:"Our responsibility."})]}),e.jsx("p",{children:"This policy explains exactly what personal information Slirus Holdings and its subsidiaries collect across every product and service, why we collect it, how we protect it, and what rights you hold under Ugandan law."})]}),e.jsxs("div",{className:"pp-meta",children:[e.jsxs("div",{className:"pp-meta-item",children:[e.jsx("i",{className:"fas fa-calendar-alt"}),"Last updated: 25 June 2026"]}),e.jsxs("div",{className:"pp-meta-item",children:[e.jsx("i",{className:"fas fa-gavel"}),"Governed by Uganda Data Protection & Privacy Act, 2019"]}),e.jsxs("div",{className:"pp-meta-item",children:[e.jsx("i",{className:"fas fa-building"}),"Applies to Slirus Holdings Limited & all subsidiaries"]})]})]})}),e.jsxs("div",{className:"pp-body",children:[e.jsxs("nav",{className:"pp-nav",children:[e.jsx("p",{className:"pp-nav-label",children:"On this page"}),e.jsxs("ul",{className:"pp-nav-list",children:[e.jsx("li",{children:e.jsx("a",{href:"#who-we-are",children:"Who We Are"})}),e.jsx("li",{children:e.jsx("a",{href:"#what-we-collect",children:"What We Collect"})}),e.jsx("li",{children:e.jsx("a",{href:"#how-we-use",children:"How We Use It"})}),e.jsx("li",{children:e.jsx("a",{href:"#legal-basis",children:"Legal Basis"})}),e.jsx("li",{children:e.jsx("a",{href:"#sharing",children:"Sharing & Disclosure"})})]}),e.jsx("div",{className:"pp-nav-divider"}),e.jsxs("ul",{className:"pp-nav-list",children:[e.jsx("li",{children:e.jsx("a",{href:"#products",children:"Our Products"})}),e.jsx("li",{children:e.jsx("a",{href:"#slirupay",children:"SlirusPay"})}),e.jsx("li",{children:e.jsx("a",{href:"#slirusmanage",children:"SlirusManage"})}),e.jsx("li",{children:e.jsx("a",{href:"#slirusfashion",children:"SlirusFashion"})})]}),e.jsx("div",{className:"pp-nav-divider"}),e.jsxs("ul",{className:"pp-nav-list",children:[e.jsx("li",{children:e.jsx("a",{href:"#security",children:"Security"})}),e.jsx("li",{children:e.jsx("a",{href:"#retention",children:"Retention"})}),e.jsx("li",{children:e.jsx("a",{href:"#your-rights",children:"Your Rights"})}),e.jsx("li",{children:e.jsx("a",{href:"#cookies",children:"Cookies"})}),e.jsx("li",{children:e.jsx("a",{href:"#contact",children:"Contact Us"})})]})]}),e.jsxs("div",{className:"pp-content",children:[e.jsxs("section",{className:"pp-section",id:"who-we-are",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"1. Identity"}),e.jsx("h2",{children:"Who We Are"}),e.jsx("p",{className:"pp-section-subtitle",children:"The Data Controller responsible for your personal information."}),e.jsxs("div",{className:"pp-legal-card",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Slirus Holdings Limited"})," is a multi-sector technology company incorporated in Uganda and operating from Lira. We are the data controller for all personal information collected through our corporate website (",e.jsx("strong",{children:"slirusholding.com"}),") and across our three product subsidiaries: Slirus Technologies Limited, Slirus Financial Services Limited, and Slirus Fashion Limited."]}),e.jsx("p",{style:{marginBottom:0},children:"Each subsidiary operates its own product but shares a unified data governance framework set by Slirus Holdings. When you use SlirusPay, SlirusManage, or SlirusFashion, Slirus Holdings Limited remains the ultimate responsible entity for how your data is handled."})]}),e.jsxs("div",{className:"pp-legal-card highlight",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-map-marker-alt"})," Registered Address"]}),e.jsxs("p",{style:{margin:0},children:["Slirus Holdings Limited · Lira, Uganda · ",e.jsx("strong",{children:"sales@slirus.com"})," · ",e.jsx("strong",{children:"info@slirus.com"})]})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"what-we-collect",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"2. Data Collected"}),e.jsx("h2",{children:"What We Collect"}),e.jsx("p",{className:"pp-section-subtitle",children:"We only collect information that is necessary for a specific, documented purpose."}),e.jsxs("div",{className:"pp-collect-grid",children:[e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-user"})}),e.jsx("h4",{children:"Identity Data"})]}),e.jsx("p",{children:"Full name, national ID number, date of birth, passport copy (for high-value SlirusPay accounts), and a photograph or selfie for KYC verification."})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-phone"})}),e.jsx("h4",{children:"Contact Data"})]}),e.jsx("p",{children:"Phone number, email address, physical or delivery address. Business clients additionally provide a company name, TIN, and URSB registration number."})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-exchange-alt"})}),e.jsx("h4",{children:"Financial & Transaction Data"})]}),e.jsx("p",{children:"Mobile money wallet details, agent float balances, transaction amounts, timestamps, and reference numbers generated on SlirusPay."})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-laptop"})}),e.jsx("h4",{children:"Technical & Device Data"})]}),e.jsx("p",{children:"IP address, device type, operating system, browser version, and session logs collected automatically when you access any Slirus platform."})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-shopping-bag"})}),e.jsx("h4",{children:"Order & Preference Data"})]}),e.jsx("p",{children:"Clothing sizes, style preferences, order history, and delivery instructions collected on SlirusFashion to fulfil and personalise your orders."})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-comment-alt"})}),e.jsx("h4",{children:"Communications Data"})]}),e.jsx("p",{children:"Support tickets, live chat transcripts, feedback forms, and any documents you upload when engaging with our customer service teams."})]})]}),e.jsxs("div",{className:"pp-legal-card warning",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-exclamation-triangle",style:{color:"#d97706"}})," Special Category Data"]}),e.jsxs("p",{style:{margin:0},children:["We do not intentionally collect sensitive categories of data such as health records, religious beliefs, or political opinions. If you believe you have submitted such data, contact ",e.jsx("strong",{children:"info@slirus.com"})," immediately for removal."]})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"how-we-use",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"3. Use of Data"}),e.jsx("h2",{children:"How We Use Your Information"}),e.jsx("p",{className:"pp-section-subtitle",children:"Every use of your data maps to a specific, documented purpose. We do not use data for purposes incompatible with why it was collected."}),e.jsxs("div",{className:"pp-legal-card",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-cog"})," Purpose Configurations"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Service delivery:"})," Processing transactions on SlirusPay, generating business reports in SlirusManage, and fulfilling garment orders through SlirusFashion. This is the primary reason data exists on our systems."]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Identity & fraud prevention:"})," Verifying who you are before granting access to financial services and flagging unusual account behaviour such as logins from new devices or rapid high-value transfers."]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Legal & regulatory compliance:"})," Meeting Bank of Uganda KYC and AML requirements, Uganda Revenue Authority tax reporting, and audit obligations under the Accountants Act."]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Customer support:"})," Investigating disputes, correcting transaction errors, and responding to support requests using your account and transaction history."]}),e.jsxs("p",{style:{marginBottom:0},children:[e.jsx("strong",{children:"Product improvement:"})," Analysing aggregated, anonymised usage patterns to fix bugs and improve features. Individual-level data is not used for product analytics without your consent."]})]}),e.jsxs("div",{className:"pp-legal-card accent",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-ban"})," What We Do Not Do"]}),e.jsx("p",{style:{margin:0},children:"We do not sell your personal data to any third party. We do not use your data to serve targeted advertisements. We do not profile you for credit scoring outside SlirusPay's own loan-eligibility checks, which are always disclosed to you before they run."})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"legal-basis",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"4. Legal Basis"}),e.jsx("h2",{children:"Our Legal Basis for Processing"}),e.jsx("p",{className:"pp-section-subtitle",children:"Under the Data Protection and Privacy Act, 2019 of Uganda, every processing activity must rest on a lawful basis. Here is ours."}),e.jsxs("div",{className:"pp-collect-grid",children:[e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-file-contract"})}),e.jsx("h4",{children:"Contract Performance"})]}),e.jsx("p",{children:"The majority of our processing, running your SlirusPay transactions, generating SlirusManage invoices, delivering your SlirusFashion order, is necessary to perform the contract we have with you."})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-gavel"})}),e.jsx("h4",{children:"Legal Obligation"})]}),e.jsx("p",{children:"KYC checks, AML transaction monitoring, URA tax filings, and retention of financial records for seven years are all required by Ugandan statute."})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-check-circle"})}),e.jsx("h4",{children:"Consent"})]}),e.jsx("p",{children:"For optional activities, marketing emails, promotional SMS, optional product surveys, we ask for your explicit consent first, making withdrawal just as simple."})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-balance-scale"})}),e.jsx("h4",{children:"Legitimate Interests"})]}),e.jsx("p",{children:"Fraud detection, security monitoring, and internal analytics are carried out under legitimate interests after verifying they do not override your rights."})]})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"sharing",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"5. Sharing"}),e.jsx("h2",{children:"Sharing & Disclosure"}),e.jsx("p",{className:"pp-section-subtitle",children:"We share the minimum necessary data with a limited set of recipients, all of whom are bound by confidentiality and data processing agreements."}),e.jsxs("div",{className:"pp-legal-card",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Within the Slirus Group:"})," Slirus Technologies, Slirus Financial Services, and Slirus Fashion operate under a shared internal data-access policy. Staff only access data relevant to their role and are bound by confidentiality agreements."]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Technology partners:"})," Our cloud hosting provider, SMS gateway operator, and payment processor (for SlirusPay card transactions) receive the minimum data required to perform their function. All are under a formal Data Processing Agreement that prohibits them from using your data for any other purpose."]}),e.jsxs("p",{style:{marginBottom:0},children:[e.jsx("strong",{children:"Regulators & authorities:"})," Bank of Uganda, Uganda Revenue Authority, Uganda Police, and courts of competent jurisdiction may lawfully compel disclosure. We comply with valid legal instruments and, where the law permits, will notify you before disclosing."]})]}),e.jsxs("div",{className:"pp-legal-card warning",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-times-circle",style:{color:"#d97706"}})," We Never Share With"]}),e.jsx("p",{style:{margin:0},children:"Advertising networks · Data brokers · Social media platforms for targeting · Any buyer of personal data. Full stop."})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"products",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"6. Product-Specific Practices"}),e.jsx("h2",{children:"Our Three Products"}),e.jsx("p",{className:"pp-section-subtitle",children:"Each Slirus product handles distinct data. Select a product below to read the practices that apply specifically to it."}),e.jsx("div",{className:"pp-product-tabs",children:ht.map(n=>e.jsxs("button",{className:`pp-tab-btn${i===n.id?" active":""}`,style:{"--tab-color":n.color,"--tab-light":n.light},onClick:()=>t(n.id),id:n.id,children:[e.jsx("i",{className:n.icon})," ",n.name]},n.id))}),ht.map(n=>e.jsxs("div",{className:`pp-product-panel${i===n.id?" active":""}`,style:{"--prod-color":n.color,"--prod-light":n.light,"--prod-border":n.color+"33"},children:[e.jsxs("div",{className:"pp-product-header",children:[e.jsx("div",{className:"pp-product-header-icon",children:e.jsx("i",{className:n.icon})}),e.jsxs("div",{children:[e.jsx("h3",{children:n.name}),e.jsx("span",{children:n.tagline})]})]}),n.sections.map((s,r)=>e.jsxs("div",{className:"pp-product-sub",children:[e.jsx("h4",{children:s.heading}),e.jsx("p",{children:s.body})]},r))]},n.id))]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"security",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"7. Security"}),e.jsx("h2",{children:"How We Protect Your Data"}),e.jsx("p",{className:"pp-section-subtitle",children:"Security is not a checkbox for us. It is an ongoing practice embedded into how we build and operate every system."}),e.jsxs("div",{className:"pp-legal-card",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Encryption in transit and at rest:"})," All data moving between your device and our servers travels over TLS 1.2 or higher. Data stored in our databases is encrypted at rest using AES-256."]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Access controls:"})," Slirus staff access production systems using role-based permissions and multi-factor authentication. No single employee can access your full data profile without a logged justification reviewed by management."]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Security audits:"})," We conduct internal security reviews quarterly and engage an independent penetration testing firm annually. Critical findings are remediated within 30 days."]}),e.jsxs("p",{style:{marginBottom:0},children:[e.jsx("strong",{children:"Incident response:"})," If a data breach occurs that is likely to affect your rights and freedoms, we will notify the Personal Data Protection Office and, where required, you directly within 72 hours of discovery."]})]}),e.jsxs("div",{className:"pp-legal-card warning",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-key",style:{color:"#d97706"}})," Your Responsibility"]}),e.jsx("p",{style:{margin:0},children:"No system is impenetrable. You are responsible for keeping your SlirusPay PIN, SlirusManage password, and the device you use to access our platforms secure. Never share your login credentials with anyone, including Slirus staff, we will never ask for your PIN."})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"retention",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"8. Retention"}),e.jsx("h2",{children:"How Long We Keep Your Data"}),e.jsx("p",{className:"pp-section-subtitle",children:"We keep your data only as long as the law or a legitimate purpose requires. After that, it is deleted or irreversibly anonymised."}),e.jsxs("div",{className:"pp-collect-grid",children:[e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-history"})}),e.jsx("h4",{children:"SlirusPay Records"})]}),e.jsxs("p",{children:["KYC documents, transaction logs, and agent agreements: ",e.jsx("strong",{children:"7 years"})," from the date of last activity, per Bank of Uganda directive."]})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-file-invoice"})}),e.jsx("h4",{children:"SlirusManage Business Data"})]}),e.jsxs("p",{children:["Your business records remain on our servers for as long as your subscription is active, plus ",e.jsx("strong",{children:"90 days"})," after account closure to allow data export."]})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-box"})}),e.jsx("h4",{children:"SlirusFashion Orders"})]}),e.jsxs("p",{children:["Order history and delivery data: ",e.jsx("strong",{children:"3 years"})," for warranty and return purposes. Bulk staff lists are deleted within ",e.jsx("strong",{children:"30 days"})," of delivery confirmation."]})]}),e.jsxs("div",{className:"pp-collect-item",children:[e.jsxs("div",{className:"pp-collect-item-head",children:[e.jsx("div",{className:"pp-collect-icon",children:e.jsx("i",{className:"fas fa-headset"})}),e.jsx("h4",{children:"Support Tickets"})]}),e.jsxs("p",{children:["Customer support communications are retained for ",e.jsx("strong",{children:"2 years"})," to allow dispute resolution and service quality review."]})]})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"your-rights",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"9. Your Rights"}),e.jsx("h2",{children:"Your Rights Under Ugandan Law"}),e.jsx("p",{className:"pp-section-subtitle",children:"The Data Protection and Privacy Act, 2019 gives you real, enforceable rights over your personal information. Here is what they mean in practice at Slirus."}),e.jsx("div",{className:"pp-rights-grid",children:eo.map((n,s)=>e.jsxs("div",{className:"pp-right-card",children:[e.jsx("div",{className:"pp-right-icon",children:e.jsx("i",{className:n.icon})}),e.jsx("h4",{children:n.title}),e.jsx("p",{children:n.desc})]},s))}),e.jsxs("div",{className:"pp-legal-card highlight",style:{marginTop:24},children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-envelope"})," How to Exercise Your Rights"]}),e.jsxs("p",{style:{margin:0},children:["Email ",e.jsx("strong",{children:"info@slirus.com"})," with your full name, the product you are enquiring about, and a description of your request. We will acknowledge within 5 business days and resolve within 21 days. If you are unsatisfied with our response, you may escalate to the ",e.jsx("strong",{children:"Personal Data Protection Office of Uganda"}),"."]})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"cookies",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"10. Cookies"}),e.jsx("h2",{children:"Cookies & Tracking Technologies"}),e.jsx("p",{className:"pp-section-subtitle",children:"We use cookies to keep our websites and applications working correctly and to understand how they are being used."}),e.jsxs("div",{className:"pp-legal-card",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Strictly necessary cookies"})," keep you logged in and protect your session. These cannot be disabled because the platform will not function without them."]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Analytics cookies"})," show us which pages are visited most and where users encounter problems. We use anonymised, aggregated data only. You can opt out by declining analytics cookies in the consent banner when you first visit our site."]}),e.jsxs("p",{children:[e.jsx("strong",{children:"No advertising cookies."})," We do not use third-party advertising networks and do not allow them to set cookies on our domain."]}),e.jsxs("p",{style:{marginBottom:0},children:["You can review and change your cookie preferences at any time by clicking ",e.jsx("strong",{children:'"Manage Cookies"'})," in the footer of any Slirus website, or by adjusting your browser settings."]})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"children",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"11. Minors"}),e.jsx("h2",{children:"Children's Privacy"}),e.jsx("div",{className:"pp-legal-card",children:e.jsxs("p",{style:{marginBottom:0},children:["Our services are intended for persons aged 18 and above. We do not knowingly collect or process personal data from anyone under 18. SlirusPay requires a valid national ID which confirms the holder is of legal age. If you believe a minor's data has been submitted to us, contact ",e.jsx("strong",{children:"info@slirus.com"})," immediately and we will delete it without delay."]})})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"changes",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"12. Policy Updates"}),e.jsx("h2",{children:"Changes to This Policy"}),e.jsxs("div",{className:"pp-legal-card",children:[e.jsx("p",{children:"We review this Privacy Policy at least annually and whenever we launch a new product or materially change how we handle data. If we make a significant change, for example, adding a new data-sharing partner or changing our legal basis for a processing activity, we will notify active users by email and post a summary of what changed at the top of this page for 30 days."}),e.jsx("p",{style:{marginBottom:0},children:"Continued use of any Slirus service after the effective date of a change constitutes acceptance of the updated policy. The date at the top of this page always reflects when it was last revised."})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",id:"contact",children:[e.jsx("p",{className:"pp-section-eyebrow",children:"13. Contact"}),e.jsx("h2",{children:"Get in Touch"}),e.jsx("p",{className:"pp-section-subtitle",children:"For any privacy-related question, request, or concern, reach us directly."}),e.jsxs("div",{className:"pp-contact-card",children:[e.jsx("h3",{children:"Slirus Holdings Limited, Data Privacy Team"}),e.jsxs("p",{children:["We respond to all privacy queries within 5 business days. For urgent matters involving a potential data breach or unauthorised access to your account, mark your email subject line ",e.jsx("strong",{children:"URGENT: Security"}),"."]}),e.jsxs("div",{className:"pp-contact-grid-inner",children:[e.jsxs("div",{className:"pp-contact-item-box",children:[e.jsx("i",{className:"fas fa-envelope"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Privacy Enquiries"}),e.jsx("span",{children:"info@slirus.com"})]})]}),e.jsxs("div",{className:"pp-contact-item-box",children:[e.jsx("i",{className:"fas fa-headset"}),e.jsxs("div",{children:[e.jsx("strong",{children:"General Support"}),e.jsx("span",{children:"sales@slirus.com"})]})]}),e.jsxs("div",{className:"pp-contact-item-box",children:[e.jsx("i",{className:"fas fa-map-marker-alt"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Physical Address"}),e.jsx("span",{children:"Slirus Holdings, Lira, Uganda"})]})]}),e.jsxs("div",{className:"pp-contact-item-box",children:[e.jsx("i",{className:"fas fa-external-link-alt"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Regulatory Escalation"}),e.jsx("span",{children:"Personal Data Protection Office, pdpo.go.ug"})]})]})]})]})]})]})]})]})]})},io=()=>e.jsxs(q,{children:[e.jsx("link",{href:"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",rel:"stylesheet"}),e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"pp-container-wrapper",children:[e.jsx("div",{className:"pp-hero",children:e.jsxs("div",{className:"pp-hero-inner",children:[e.jsxs("div",{className:"pp-hero-glass-card",children:[e.jsxs("div",{className:"pp-eyebrow",children:[e.jsx("i",{className:"fas fa-file-contract"})," Legal Framework"]}),e.jsxs("h1",{children:["Terms of ",e.jsx("span",{children:"Use"})]}),e.jsx("p",{children:"Please review our official terms and parameters thoroughly before accessing or utilizing our platform services."}),e.jsxs("div",{className:"pp-trust-badges",children:[e.jsxs("div",{className:"pp-badge",children:[e.jsx("i",{className:"fas fa-check-circle"})," Legally Binding"]}),e.jsxs("div",{className:"pp-badge",children:[e.jsx("i",{className:"fas fa-gavel"})," URSB Governed"]}),e.jsxs("div",{className:"pp-badge",children:[e.jsx("i",{className:"fas fa-user-shield"})," User Protected"]})]})]}),e.jsxs("div",{className:"pp-meta",children:[e.jsxs("div",{className:"pp-meta-item",children:[e.jsx("i",{className:"fas fa-calendar-alt"}),"Last Updated: June 25, 2026"]}),e.jsxs("div",{className:"pp-meta-item",children:[e.jsx("i",{className:"fas fa-globe"}),"Applies globally to slirus.com & operations"]})]})]})}),e.jsxs("div",{className:"pp-body",children:[e.jsxs("nav",{className:"pp-nav",children:[e.jsx("p",{className:"pp-nav-label",children:"Agreement Modules"}),e.jsxs("ul",{className:"pp-nav-list",children:[e.jsx("li",{children:e.jsx("a",{href:"#intro",children:"Overview"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-about",children:"1. About Us"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-acceptance",children:"2. Acceptance"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-accounts",children:"3. User Accounts"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-services",children:"4. Our Services"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-conduct",children:"5. Conduct Standards"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-ip",children:"6. Intellectual Property"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-privacy",children:"7. Privacy Policy"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-fees",children:"8. Fees & Payments"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-liability",children:"9. Liability Limitations"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-indemnity",children:"10. Indemnification"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-termination",children:"11. Termination"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-governance",children:"12. Disputes & Law"})}),e.jsx("li",{children:e.jsx("a",{href:"#sec-provisions",children:"13. General Terms"})})]})]}),e.jsxs("div",{className:"pp-content",children:[e.jsxs("section",{className:"pp-section",id:"intro",children:[e.jsxs("p",{children:["Welcome to ",e.jsx("strong",{children:"Slirus Holdings Limited"})," (“Slirus”, “we”, “us”, or “our”)."]}),e.jsxs("p",{children:["By accessing or using our website ",e.jsx("a",{href:"https://slirus.com",style:{color:"#2563eb",textDecoration:"underline"},children:"slirus.com"}),", mobile applications, and any of our ecosystem environments, you agree explicitly to be bound by these Terms of Use. If you disagree with these stipulations, please do not interact with our platforms."]})]}),e.jsx("div",{className:"pp-divider"}),e.jsxs("section",{className:"pp-section",children:[e.jsxs("div",{className:"pp-legal-card",id:"sec-about",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-info-circle"})," 1. About Us"]}),e.jsx("p",{children:"Slirus Holdings Limited is a Ugandan-registered company (URSB) operating as a technology-led holding company with specialized business focus areas and subsidiaries in:"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Information Technology (Slirus Technologies)"}),e.jsx("li",{children:"Financial Services (Mobile Money & Agent Banking)"}),e.jsx("li",{children:"Fashion & Garment Retail"})]}),e.jsxs("p",{children:["Our premier core digital product architectures include ",e.jsx("strong",{children:"SlirusPay"}),", ",e.jsx("strong",{children:"SlirusManage"}),", and ",e.jsx("strong",{children:"SlirusFashion"}),"."]})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-acceptance",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-check-double"})," 2. Acceptance of Terms"]}),e.jsx("p",{children:"These Terms of Use represent a fully binding digital agreement constructed between yourself and Slirus Holdings Limited. We hold rights to alter or modify these clauses sequentially. Your baseline engagement following adjustments constitutes formal acceptance."})]}),e.jsxs("div",{className:"pp-legal-card accent",id:"sec-accounts",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-user-shield"})," 3. User Accounts and Registration"]}),e.jsxs("ul",{children:[e.jsx("li",{children:"You must provide accurate, current, and complete information during registration."}),e.jsx("li",{children:"You are responsible for maintaining the confidentiality of your account credentials."}),e.jsx("li",{children:"You must notify us immediately of any unauthorized use of your account."}),e.jsx("li",{children:"We reserve the right to suspend or terminate accounts that violate these terms."})]})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-services",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-cubes"})," 4. Our Services"]}),e.jsx("p",{children:"We actively deliver and support:"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Custom software development and enterprise IT solutions"}),e.jsxs("li",{children:["Mobile money transactional routing and agent platform layouts (",e.jsx("strong",{children:"SlirusPay"}),")"]}),e.jsxs("li",{children:["Business metrics tracking and ERP tooling infrastructures (",e.jsx("strong",{children:"SlirusManage"}),")"]}),e.jsxs("li",{children:["Fashion retail points, operational inventory systems, and e-commerce setups (",e.jsx("strong",{children:"SlirusFashion"}),")"]})]}),e.jsx("p",{children:"All services are systematically distributed on an “as is” and “as available” operational metric framework with no warranties."})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-conduct",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-exclamation-triangle"})," 5. User Responsibilities and Conduct"]}),e.jsx("p",{children:"By connecting to our nodes, you agree explicitly not to:"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Use our services for any unlawful purpose or in violation of Ugandan law"}),e.jsx("li",{children:"Upload or transmit viruses, malware, or harmful code"}),e.jsx("li",{children:"Attempt to gain unauthorized access to our systems"}),e.jsx("li",{children:"Infringe on any intellectual property rights"}),e.jsx("li",{children:"Engage in fraud, money laundering, or any financial crime (especially on financial platforms)"}),e.jsx("li",{children:"Share or sell access to your account"}),e.jsx("li",{children:"Collect or harvest data from our platforms without permission"})]})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-ip",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-copyright"})," 6. Intellectual Property"]}),e.jsxs("ul",{children:[e.jsx("li",{children:"All content, logos, software logic, designs, and visual frameworks on our platforms are protected assets of Slirus Holdings."}),e.jsx("li",{children:"You are explicitly limited to a non-exclusive, non-transferable, revocable license to access features."}),e.jsx("li",{children:"You may not copy, adjust, redistribute, or try to reverse-engineer our components without express written signatures."})]})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-privacy",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-user-lock"})," 7. Privacy"]}),e.jsxs("p",{children:["Your individual processing metrics are of absolute value to our systems. Please consult our detailed ",e.jsx("a",{href:"/privacy",style:{color:"#2563eb",textDecoration:"underline"},children:"Privacy Policy"})," which integrates seamlessly into this structural master agreement."]})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-fees",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-credit-card"})," 8. Fees and Payments"]}),e.jsxs("ul",{children:[e.jsx("li",{children:"Fees for our services are clearly stated at the time of purchase or agreement."}),e.jsx("li",{children:"All payments are non-refundable except where required by law or as specified in a separate service agreement."}),e.jsx("li",{children:"You are responsible for all taxes applicable to your use of our services."})]})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-liability",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-shield-alt"})," 9. Limitation of Liability"]}),e.jsx("p",{children:"To the maximum extent permitted by law, Slirus Holdings shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our services."}),e.jsx("p",{children:"Our total cumulative liability metrics shall not exceed the absolute financial calculation you paid to us within the trailing twelve (12) months."})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-indemnity",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-handshake"})," 10. Indemnification"]}),e.jsx("p",{children:"You agree to safely indemnify, protect, and hold harmless Slirus Holdings, its associated board directors, officers, operational employees, and subsidiaries against any legal actions or incoming damages originating from breaches of these parameters."})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-termination",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-door-open"})," 11. Termination"]}),e.jsx("p",{children:"We retain absolute authority to drop, freeze, or terminate your active connectivity access profiles at any timeline interval, without warning indicators, for conduct deemed structurally toxic to our operational stability."})]}),e.jsxs("div",{className:"pp-legal-card accent",id:"sec-governance",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-balance-scale"})," 12. Governing Law and Dispute Resolution"]}),e.jsxs("p",{children:["These operational parameters travel exclusively under the structural legal frameworks of the ",e.jsx("strong",{children:"Republic of Uganda"}),". Any disputes emerging from these conditions will be guided through modern arbitration protocols held in Kampala under the Arbitration and Conciliation Act."]})]}),e.jsxs("div",{className:"pp-legal-card",id:"sec-provisions",children:[e.jsxs("h3",{children:[e.jsx("i",{className:"fas fa-gavel"})," 13. General Provisions"]}),e.jsxs("ul",{children:[e.jsx("li",{children:"If any provision of these Terms is found to be invalid, the remaining provisions shall remain in full force."}),e.jsx("li",{children:"Our failure to enforce any right does not constitute a waiver."}),e.jsx("li",{children:"These Terms constitute the entire agreement between you and Slirus regarding our services."})]})]})]}),e.jsx("div",{className:"pp-divider"}),e.jsx("section",{className:"pp-section",id:"contact",children:e.jsxs("div",{className:"pp-contact-card",children:[e.jsx("h2",{children:"Questions about these Terms?"}),e.jsx("p",{children:"Contact our dedicated Legal Team for formal clarification or contractual definitions."}),e.jsxs("a",{href:"mailto:info@slirus.com",className:"pp-contact-btn",children:["Contact Legal ",e.jsx("i",{className:"fas fa-envelope"})]})]})})]})]})]})]});function no(){return e.jsx(wn,{children:e.jsx("div",{className:"app-wrapper",children:e.jsx("main",{className:"content",children:e.jsxs(jn,{children:[e.jsx(Z,{path:"/",element:e.jsx(On,{})}),e.jsx(Z,{path:"/about",element:e.jsx(Un,{})}),e.jsx(Z,{path:"/services",element:e.jsx(Mn,{})}),e.jsx(Z,{path:"/products",element:e.jsx(Wn,{})}),e.jsx(Z,{path:"/career",element:e.jsx(Fa,{})}),e.jsx(Z,{path:"/apply",element:e.jsx(Ka,{})}),e.jsx(Z,{path:"/admin",element:e.jsx(Za,{})}),e.jsx(Z,{path:"/privacy",element:e.jsx(to,{})}),e.jsx(Z,{path:"/terms",element:e.jsx(io,{})})]})})})})}ft.createRoot(document.getElementById("root")).render(e.jsx(hi.StrictMode,{children:e.jsx(no,{})}));export{kt as _};
