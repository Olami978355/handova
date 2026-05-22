import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConversationsProvider } from './context/ConversationsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignupPage from './pages/auth/SignupPage';
import OnboardingWizard from './pages/onboarding/OnboardingWizard';
import VerificationPage from './pages/verification/VerificationPage';
import Listings from './pages/Listings';
import PropertyDetail from './pages/PropertyDetail';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import MessagesPage from './pages/MessagesPage';
import { ListingPage } from './pages/ListingPage';
import { ListingSuccess } from './pages/ListingSuccess';
import MapSearch from './pages/MapSearch';
import Admin from './pages/Admin';
import DealDetail from './pages/DealDetail';
import { HelmetProvider } from 'react-helmet-async';

// In your App return:
<HelmetProvider>
  <ErrorBoundary>
    <AuthProvider>
      ...
    </AuthProvider>
  </ErrorBoundary>
</HelmetProvider>

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

  if (!profile?.role || !profile?.full_name) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  } else if (location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Inner app — has access to AuthContext, wrapped with ConversationsProvider always
function AppInner() {
  return (
    <ConversationsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="listings" element={<Listings />} />
            <Route path="map" element={<MapSearch />} />
            <Route path="property/:id" element={<PropertyDetail />} />

            {/* Protected Routes */}
            <Route path="onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
            <Route path="verification" element={<ProtectedRoute><VerificationPage /></ProtectedRoute>} />
            <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="landlord/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="agent/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="add-property" element={<ProtectedRoute><ListingPage /></ProtectedRoute>} />
            <Route path="listing-success" element={<ProtectedRoute><ListingSuccess /></ProtectedRoute>} />
            <Route path="admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="deals/:id" element={<ProtectedRoute><DealDetail /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConversationsProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ErrorBoundary>
  );
}