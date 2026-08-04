import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { BottomTabBar } from './BottomTabBar';
import { PushPermissionBanner } from './notifications/PushPermissionBanner';
import { ChangelogBanner } from './ChangelogBanner';
import { OfflineBanner } from './OfflineBanner';
import { useAuth } from '../context/AuthContext';

const noFooterRoutes = [
  '/messages',
  '/onboarding',
  '/admin',
];
const noNavRoutes = [
  '/login',
  '/signup',
  '/onboarding',
  '/notifications',
];
const noBottomTabRoutes = [
  '/onboarding',
  '/admin',
];

export default function Layout() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const showFooter = !noFooterRoutes.some(r => location.pathname.startsWith(r));
  const showNav = !noNavRoutes.includes(location.pathname);
  const showBottomTabs = !!user && !noBottomTabRoutes.some(r => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen flex flex-col bg-ink" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <OfflineBanner />
      {showNav && <Navbar />}
      <PushPermissionBanner />
      <ChangelogBanner />
      <main className={`flex-grow ${showNav ? 'pt-16' : ''} ${showBottomTabs ? 'page-with-tabs' : ''}`}>
        <Outlet />
      </main>
      {showFooter && <Footer />}
      {showBottomTabs && <BottomTabBar role={profile?.role} />}
    </div>
  );
}
