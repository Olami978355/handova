import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const noFooterRoutes = [
  '/messages',
  '/onboarding',
  '/admin',
];

const noNavRoutes = [
  '/login',
  '/signup',
  '/onboarding',
];

export default function Layout() {
  const location = useLocation();

  const showFooter = !noFooterRoutes.some(r => location.pathname.startsWith(r));
  const showNav = !noNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {showNav && <Navbar />}
      <main className={`flex-grow ${showNav ? 'pt-16' : ''}`}>
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
