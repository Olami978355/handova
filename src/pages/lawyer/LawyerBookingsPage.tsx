import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Loader2, CheckCircle2, AlertTriangle, ArrowLeft, FileText } from 'lucide-react';
import { supabase, requireValidSession } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../utils/format';

const font = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

interface Booking {
  id: string;
  deal_id: string;
  lawyer_fee: number;
  status: string;
  response_deadline: string | null;
  deals?: { agreement_url: string | null; properties?: { title: string } | null };
}

export default function LawyerBookingsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<'fine' | 'concerns'>('fine');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lawyer_review_bookings')
      .select('*, deals(agreement_url, properties(title))')
      .eq('lawyer_id', user?.id)
      .order('created_at', { ascending: false });
    setBookings(data || []);
    setLoading(false);
  };

  const submitVerdict = async (bookingId: string) => {
    if (!notes.trim()) {
      setError('Please add a short note explaining the verdict.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setWarning(null);
    try {
      if (!(await requireValidSession())) return;
      const { data, error: fnError } = await supabase.functions.invoke('submit-lawyer-verdict', {
        body: { bookingId, verdict, verdictNotes: notes.trim() },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (data?.warning) setWarning(data.warning);
      setActiveId(null);
      setNotes('');
      await fetchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit verdict');
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile?.is_lawyer) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-5" style={font}>
        <p className="text-[13px] text-paper/40">This page is for verified lawyers only.</p>
      </div>
    );
  }

  const pending = bookings.filter(b => b.status === 'paid');
  const past = bookings.filter(b => b.status !== 'paid');

  return (
    <div className="min-h-screen bg-ink py-8 px-5" style={font}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[13px] font-semibold text-paper/40 hover:text-paper mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gold/15 rounded-xl flex items-center justify-center">
            <Scale className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h1 className="text-[22px] font-black text-paper">Review Requests</h1>
            <p className="text-[12px] text-paper/35">Agreements booked for your review</p>
          </div>
        </div>

        {warning && (
          <div className="mb-5 p-4 bg-gold/8 border border-gold/20 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-paper/70">
              {warning} <Link to="/profile" className="text-gold font-bold underline">Go to settings</Link>
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 bg-slate/20 border border-white/6 rounded-2xl">
            <Scale className="w-8 h-8 text-paper/15 mx-auto mb-3" />
            <p className="text-[13px] font-semibold text-paper/30">No review requests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(b => (
              <div key={b.id} className="bg-slate/20 border border-gold/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-bold text-paper">{b.deals?.properties?.title || 'Tenancy Agreement'}</p>
                  <span className="text-[11px] font-bold text-gold">{formatNaira(b.lawyer_fee)}</span>
                </div>
                {b.deals?.agreement_url && (
                  <a href={b.deals.agreement_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[12px] text-paper/60 hover:text-paper mb-3">
                    <FileText className="w-3.5 h-3.5 text-gold" /> View Agreement PDF
                  </a>
                )}
                {activeId === b.id ? (
                  <div className="space-y-3 mt-3">
                    <div className="flex gap-2">
                      <button onClick={() => setVerdict('fine')} className={`flex-1 py-2 rounded-lg text-[12px] font-bold ${verdict === 'fine' ? 'bg-gold text-black' : 'bg-white/5 text-paper/50'}`}>Looks Fine</button>
                      <button onClick={() => setVerdict('concerns')} className={`flex-1 py-2 rounded-lg text-[12px] font-bold ${verdict === 'concerns' ? 'bg-danger text-paper' : 'bg-white/5 text-paper/50'}`}>Has Concerns</button>
                    </div>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Explain your verdict..." className="w-full h-24 p-3 bg-white/5 border border-white/8 rounded-xl text-[12px] text-paper placeholder-paper/25 outline-none resize-none" />
                    {error && <p className="text-[11px] text-danger">{error}</p>}
                    <button onClick={() => submitVerdict(b.id)} disabled={submitting} className="w-full bg-gold text-black py-2.5 rounded-xl font-bold text-[12px] disabled:opacity-40 flex items-center justify-center gap-2">
                      {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Submit Verdict
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setActiveId(b.id)} className="w-full bg-gold text-black py-2.5 rounded-xl font-bold text-[12px]">Give Verdict</button>
                )}
              </div>
            ))}
            {past.map(b => (
              <div key={b.id} className="bg-slate/10 border border-white/6 rounded-2xl p-4 flex items-center justify-between">
                <p className="text-[12px] text-paper/50">{b.deals?.properties?.title || 'Tenancy Agreement'}</p>
                <span className="text-[11px] text-paper/30 capitalize">{b.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
