import React, { useState } from 'react';
import { Mail, MessageSquare, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('contact_messages')
        .insert({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          message: `Subject: ${form.subject}\n\n${form.message}`,
        });
      if (err) throw err;
      setSuccess(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setError('Something went wrong. Please email us directly at joinrenteasy@gmail.com');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink pt-24 pb-20" style={font}>
      <div className="max-w-5xl mx-auto px-5">

        <div className="text-center mb-12">
          <div className="text-[11px] font-bold text-gold uppercase tracking-widest mb-3">Contact</div>
          <h1 className="text-[32px] font-black text-paper mb-4">Get in Touch</h1>
          <p className="text-[14px] text-paper/45 max-w-lg mx-auto">
            Have a question, complaint, or partnership inquiry? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Info */}
          <div className="space-y-4">
            <div className="bg-ink border border-white/6 rounded-2xl p-5">
              <div className="w-10 h-10 bg-gold/15 rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-[14px] font-bold text-paper mb-2">Email Us</h3>
              <a href="mailto:joinrenteasy@gmail.com" className="text-[13px] text-gold/70 hover:text-gold transition-colors">
                joinrenteasy@gmail.com
              </a>
              <p className="text-[12px] text-paper/30 mt-2">We respond within 48 hours</p>
            </div>
            <div className="bg-ink border border-white/6 rounded-2xl p-5">
              <div className="w-10 h-10 bg-gold/15 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-[14px] font-bold text-paper mb-2">Support Hours</h3>
              <p className="text-[13px] text-paper/50">Monday — Friday</p>
              <p className="text-[13px] text-paper/50">9:00 AM — 6:00 PM WAT</p>
            </div>
            <div className="bg-ink border border-white/6 rounded-2xl p-5">
              <h3 className="text-[14px] font-bold text-paper mb-3">Common Topics</h3>
              <div className="space-y-2">
                {['Account verification', 'Partnership inquiries', 'Bug reports', 'General questions'].map(t => (
                  <div key={t} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-gold rounded-full" />
                    <span className="text-[13px] text-paper/45">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-ink border border-white/6 rounded-2xl p-6 lg:p-8">
              {success ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-gold/20 border border-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-gold" />
                  </div>
                  <h3 className="text-[22px] font-black text-paper mb-3">Message sent!</h3>
                  <p className="text-[14px] text-paper/45 mb-8">
                    We'll get back to you within 48 hours at your email address.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="bg-gold text-black px-6 py-3 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-[18px] font-bold text-paper mb-6">Send us a message</h2>
                  {error && (
                    <div className="flex items-center gap-2 p-4 bg-danger/10 border border-danger/20 rounded-xl mb-6">
                      <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
                      <p className="text-[13px] text-danger">{error}</p>
                    </div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Full Name *</label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          required
                          placeholder="Your full name"
                          className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Email Address *</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          required
                          placeholder="your@email.com"
                          className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Subject</label>
                      <input
                        type="text"
                        value={form.subject}
                        onChange={e => setForm({ ...form, subject: e.target.value })}
                        placeholder="What is this about?"
                        className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-paper/40 uppercase tracking-wider mb-2">Message *</label>
                      <textarea
                        value={form.message}
                        onChange={e => setForm({ ...form, message: e.target.value })}
                        required
                        rows={6}
                        placeholder="Tell us how we can help..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/8 rounded-xl text-[13px] text-paper placeholder:text-paper/25 focus:outline-none focus:border-gold transition-colors resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gold text-black py-4 rounded-xl font-bold text-[14px] hover:bg-[#e0b030] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Message'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}