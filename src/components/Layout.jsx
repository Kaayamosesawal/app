import React from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

// Staff portal routes: these pages are full-screen, with no site navbar or footer.
const PORTAL_ROUTES = [
  '/admin',
  '/ceo-manager',
  '/accounts-manager',
  '/hr-manager',
  '/sales-manager',
  '/secretary-manager',
  '/worker-log',
];

const Layout = ({ children }) => {
  const { pathname } = useLocation();
  const path = pathname.toLowerCase().replace(/\/+$/, '');
  const isPortal = PORTAL_ROUTES.some((r) => path === r || path.startsWith(r + '/'));

  return (
    <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {!isPortal && <Navbar />}
      
      <main className="main-content" style={{ flex: 1, paddingTop: isPortal ? 0 : '75px' }}>
        {children}
      </main>
      
      {!isPortal && <Footer />}
    </div>
  );
};

export default Layout;