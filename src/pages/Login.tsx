import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/dashboard',
        }
      });

      if (error) throw error;
      setError('Magic link sent! Check your email.');
    } catch (err: any) {
      console.error('Magic link error:', err);
      setError(err.message || 'Error sending magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#1a6b3c]/5 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-zinc-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1a6b3c]/10 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-[#1a6b3c]" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Welcome back</h1>
          <p className="text-zinc-500 mt-2">Login to manage your properties</p>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 text-blue-700 text-sm rounded-2xl flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-2xl flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-[#1a6b3c] focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-zinc-500">
              <input type="checkbox" className="mr-2 rounded border-zinc-300 text-[#1a6b3c] focus:ring-[#1a6b3c]" />
              Remember me
            </label>
            <Link to="#" className="text-[#1a6b3c] font-bold hover:underline">Forgot password?</Link>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a6b3c] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#14522e] transition-colors shadow-lg shadow-[#1a6b3c]/20 flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Login <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </form>

        <div className="mt-6">
          <button 
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full bg-white text-zinc-700 py-3 border border-zinc-200 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            Sign in with Magic Link
          </button>
        </div>

        <p className="mt-8 text-center text-zinc-500 text-sm">
          Don't have an account? <Link to="/signup" className="text-[#1a6b3c] font-bold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
