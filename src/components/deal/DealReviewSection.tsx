import React, { useEffect, useState } from 'react';
import { Star, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ReviewCandidate {
  id: string;
  full_name: string;
}

interface ExistingReview {
  reviewee_id: string;
  rating: number;
}

interface DealReviewSectionProps {
  dealId: string;
  dealStatus: string;
  currentUserId?: string;
  isTenant: boolean;
  isLandlord: boolean;
  isAgent: boolean;
  tenantName?: string;
  landlordName?: string;
  agentName?: string;
  tenantId?: string;
  landlordId?: string;
  agentId?: string;
}

const StarInput: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n)}
        className="p-0.5"
      >
        <Star
          className={`w-5 h-5 ${n <= value ? 'fill-[#f0c040] text-[#f0c040]' : 'text-white/15'}`}
        />
      </button>
    ))}
  </div>
);

export const DealReviewSection: React.FC<DealReviewSectionProps> = ({
  dealId, dealStatus, currentUserId, isTenant, isLandlord, isAgent,
  tenantName, landlordName, agentName, tenantId, landlordId, agentId,
}) => {
  const [existingReviews, setExistingReviews] = useState<ExistingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (dealStatus !== 'funds_released' || !currentUserId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('deal_reviews')
        .select('reviewee_id, rating')
        .eq('deal_id', dealId)
        .eq('reviewer_id', currentUserId);
      setExistingReviews(data || []);
      setLoading(false);
    })();
  }, [dealId, dealStatus, currentUserId]);

  if (dealStatus !== 'funds_released' || !currentUserId || loading) return null;

  // Who the current user is allowed to review, based on their role on this deal
  let candidates: ReviewCandidate[] = [];
  if (isTenant) {
    if (landlordId) candidates.push({ id: landlordId, full_name: landlordName || 'Landlord' });
    if (agentId) candidates.push({ id: agentId, full_name: agentName || 'Agent' });
  } else if (isLandlord || isAgent) {
    if (tenantId) candidates.push({ id: tenantId, full_name: tenantName || 'Tenant' });
  }

  if (candidates.length === 0) return null;

  const alreadyReviewed = (revieweeId: string) => existingReviews.find(r => r.reviewee_id === revieweeId);

  const handleSubmit = async (revieweeId: string) => {
    const rating = ratings[revieweeId];
    if (!rating) {
      setSubmitError('Please select a star rating.');
      return;
    }
    setSubmitting(revieweeId);
    setSubmitError(null);
    try {
      const { error } = await supabase.functions.invoke('submit-deal-review', {
        body: { dealId, revieweeId, rating, comment: comments[revieweeId] || '' },
      });
      if (error) throw error;
      setExistingReviews(prev => [...prev, { reviewee_id: revieweeId, rating }]);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="bg-[#0a1f11] border border-white/6 rounded-2xl p-5">
      <h3 className="text-[13px] font-bold text-white mb-4">Leave a Review</h3>
      <div className="space-y-4">
        {candidates.map(c => {
          const existing = alreadyReviewed(c.id);
          if (existing) {
            return (
              <div key={c.id} className="flex items-center justify-between p-3 bg-white/4 rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#4ade80]" />
                  <p className="text-[12px] text-white/60">You reviewed <span className="font-bold text-white">{c.full_name}</span></p>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`w-3.5 h-3.5 ${n <= existing.rating ? 'fill-[#f0c040] text-[#f0c040]' : 'text-white/15'}`} />
                  ))}
                </div>
              </div>
            );
          }
          return (
            <div key={c.id} className="p-3 bg-white/4 border border-white/8 rounded-xl space-y-2.5">
              <p className="text-[12px] font-semibold text-white">Rate {c.full_name}</p>
              <StarInput
                value={ratings[c.id] || 0}
                onChange={(v) => setRatings(prev => ({ ...prev, [c.id]: v }))}
              />
              <textarea
                value={comments[c.id] || ''}
                onChange={(e) => setComments(prev => ({ ...prev, [c.id]: e.target.value }))}
                placeholder="Optional comment..."
                rows={2}
                className="w-full px-3 py-2 bg-white/5 border border-white/8 rounded-lg text-[12px] text-white placeholder-white/25 outline-none focus:border-[#1a6b3c]/50 transition-colors resize-none"
              />
              {submitError && <p className="text-[11px] text-red-400">{submitError}</p>}
              <button
                onClick={() => handleSubmit(c.id)}
                disabled={submitting === c.id}
                className="w-full bg-[#1a6b3c] text-white py-2 rounded-lg font-bold text-[11px] hover:bg-[#0f4a2a] transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
              >
                {submitting === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Submit Review
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
