import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle2, ArrowRight, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreed) {
      setError("You must agree to the terms and conditions");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        }
      });

      if (authError) throw authError;
      if (!data.user) throw new Error('Signup failed');

      // Check if email confirmation is required (session will be null if required)
      if (data.session) {
        // No confirmation required -> redirect to /onboarding
        navigate('/onboarding');
      } else {
        // Confirmation required
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#1a6b3c]/5 flex items-center justify-center p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl p-8 md:p-12 border border-zinc-100"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-[#1a6b3c]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Home className="w-8 h-8 text-[#1a6b3c]" />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Create Account</h1>
          <p className="text-zinc-500 mt-2 font-medium">Join Nigeria's most trusted real estate platform</p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <Mail className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-zinc-900">Check your email</h2>
              <p className="text-zinc-500 font-medium">
                We've sent a confirmation link to <span className="text-zinc-900 font-bold">{formData.email}</span>. 
                Please click the link to continue your onboarding.
              </p>
            </div>
            <button 
              onClick={() => setSuccess(false)}
              className="text-[#1a6b3c] font-black hover:underline"
            >
              Try another email address
            </button>
          </motion.div>
        ) : (
          <>
            <form className="space-y-6" onSubmit={handleSignup}>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-2xl flex items-center font-medium"
                >
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[#1a6b3c] transition-colors" />
                    <input 
                      type="email" 
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="name@example.com"
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[#1a6b3c] transition-colors" />
                    <input 
                      type="password" 
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-[#1a6b3c] transition-colors" />
                    <input 
                      type="password" 
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-4 focus:ring-[#1a6b3c]/10 focus:border-[#1a6b3c] outline-none transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 py-2">
                <div className="relative flex items-center">
                  <input 
                    type="checkbox" 
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-zinc-200 bg-white transition-all checked:border-[#1a6b3c] checked:bg-[#1a6b3c] focus:outline-none" 
                  />
                  <CheckCircle2 className="pointer-events-none absolute left-0 top-0 h-5 w-5 text-white opacity-0 transition-opacity peer-checked:opacity-100" />
                </div>
                <span className="text-xs text-zinc-500 leading-relaxed font-medium">
                  I agree to Rent Easy <Link to="#" className="text-[#1a6b3c] font-black hover:underline">Terms of Service</Link> and <Link to="#" className="text-[#1a6b3c] font-black hover:underline">Privacy Policy</Link>.
                </span>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a6b3c] text-white py-5 rounded-2xl font-black text-lg hover:bg-[#14522e] transition-all shadow-xl shadow-[#1a6b3c]/20 flex items-center justify-center disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : null}
                Create Account <ArrowRight className="w-6 h-6 ml-2" />
              </button>
            </form>

            <p className="mt-10 text-center text-zinc-500 text-sm font-medium">
              Already have an account? <Link to="/login" className="text-[#1a6b3c] font-black hover:underline">Sign In</Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}

