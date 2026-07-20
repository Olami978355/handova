import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConversationsProvider } from './context/ConversationsContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HelmetProvider } from 'react-helmet-async';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignupPage from './pages/auth/SignupPage';
import ConfirmEmail from './pages/auth/ConfirmEmail';
import OnboardingWizard from './pages/onboarding/OnboardingWizard';
import VerificationPage from './pages/verification/VerificationPage';
import Listings from './pages/Listings';
import PropertyDetail from './pages/PropertyDetail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import MessagesPage from './pages/MessagesPage';
import { ListingPage } from './pages/ListingPage';
import EditListing from './pages/EditListing';
import NotificationsPage from './pages/NotificationsPage';
import { ListingSuccess } from './pages/ListingSuccess';
import MapSearch from './pages/MapSearch';
import Admin from './pages/Admin';
import DealDetail from './pages/DealDetail';
import LegalPage from './pages/LegalPage';
import FAQPage from './pages/FAQPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import LegalGuidePage from './pages/LegalGuidePage';

const SuspendedScreen = () => (
  <div
    className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-5 text-center"
    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
  >
    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-6">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    </div>
    <h1 className="text-[24px] font-black text-white mb-3">Account Suspended</h1>
    <p className="text-[14px] text-white/45 mb-8 max-w-sm leading-relaxed">
      Your account has been suspended for violating our terms of service.
      If you believe this is an error, please contact our support team.
    </p>
    
    <a
      className="bg-[#1a6b3c] text-white px-8 py-3 rounded-xl font-bold text-[14px] hover:bg-[#0f4a2a] transition-colors"
    >
      Contact Support
    </a>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div
      className="h-screen flex items-center justify-center bg-[#0a0a0a]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="w-6 h-6 border-2 border-[#1a6b3c] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // ✅ Block suspended accounts from everything except contact page
  if (profile?.account_status === 'suspended') {
    return <SuspendedScreen />;
  }

  if (profile !== null && (!profile?.role || !profile?.full_name)) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  } else if (profile?.role && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppInner() {
  return (
    <NotificationsProvider>
    <ConversationsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="auth/confirm" element={<ConfirmEmail />} />
            <Route path="listings" element={<Listings />} />
            <Route path="map" element={<MapSearch />} />
            <Route path="property/:id" element={<PropertyDetail />} />
            <Route path="legal" element={<LegalPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="legal-guide" element={<LegalGuidePage />} />

            {/* Protected Routes */}
            <Route path="onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
            <Route path="verification" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="landlord/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="agent/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="add-property" element={<ProtectedRoute><ListingPage /></ProtectedRoute>} />
            <Route path="edit-property/:id" element={<ProtectedRoute><EditListing /></ProtectedRoute>} />
            <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="listing-success" element={<ProtectedRoute><ListingSuccess /></ProtectedRoute>} />
            <Route path="admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="deals/:id" element={<ProtectedRoute><DealDetail /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConversationsProvider>
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}