import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      <Navbar />
      
      <main className="main-content" style={{ flex: 1, paddingTop: '75px' }}>
        {children}
      </main>
      
      <Footer />
    </div>
  );
};

export default Layout;