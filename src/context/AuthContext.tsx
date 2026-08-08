import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  sessionExpired: boolean;
  clearSessionExpired: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (fields: Partial<Profile>) => Promise<{ success: boolean; error?: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingProfile = useRef(false);
  const initialised = useRef(false);
  const manualSignOut = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const fetchProfile = async (userId: string, isRetry = false) => {
    if (fetchingProfile.current && !isRetry) return;
    fetchingProfile.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) {
        if (!isRetry) {
          fetchingProfile.current = false;
          await new Promise(resolve => setTimeout(resolve, 700));
          await fetchProfile(userId, true);
          return;
        }
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
      fetchingProfile.current = false;
    }
  };

  useEffect(() => {
    // ✅ Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If we lost the session (SIGNED_OUT) but the user didn't click
        // "Sign out" themselves, the token silently expired mid-use —
        // surface that distinctly so Login.tsx can explain what happened
        // instead of just quietly bouncing them with no context.
        if (event === 'SIGNED_OUT' && initialised.current && !manualSignOut.current) {
          setSessionExpired(true);
        }
        manualSignOut.current = false;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setSessionExpired(false);
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }

        initialised.current = true;
      }
    );

    // ✅ Get existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (initialised.current) return; // already handled by onAuthStateChange
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
      initialised.current = true;
    }).catch(() => {
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!error && data) setProfile(data);
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  const updateProfile = async (fields: Partial<Profile>) => {
    if (!user) return { success: false, error: 'No user' };
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...fields,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (error) throw error;
      await refreshProfile();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const signOut = async () => {
    manualSignOut.current = true;
    setProfile(null);
    setUser(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const clearSessionExpired = () => setSessionExpired(false);

  // Safety timeout so the app never hangs forever waiting on Supabase,
  // but long enough that a normal slow connection doesn't get mistaken
  // for "logged out". If it times out AND we're actually offline, show
  // an explicit offline screen instead of silently rendering as logged out.
  const [timedOut, setTimedOut] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (loading && !timedOut) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B0D10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #D4AF37',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (loading && timedOut && isOffline) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B0D10',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>You're offline</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, maxWidth: 260 }}>
          Your account is still signed in — reconnect to the internet to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#D4AF37', color: '#fff', padding: '10px 24px',
            borderRadius: 12, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, sessionExpired, clearSessionExpired,
      signOut, refreshProfile, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};