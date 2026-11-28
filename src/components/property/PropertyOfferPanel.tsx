import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Loader2, Tag, X, Check, Pencil, Megaphone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Property, PropertyOffer } from '../../types';
import { formatNaira } from '../../utils/format';

interface Props {
  property: Property;
}

const inputClass = "w-full rounded-xl border border-white/10 bg-[#0B0D10] px-3 py-3 text-[13px] text-paper outline-none focus:border-gold/60";
const labelClass = "mb-1.5 block text-[11px] font-semibold text-paper/55";

export default function PropertyOfferPanel({ property }: Props) {
  const { user } = useAuth();
  const [offer, setOffer] = useState<PropertyOffer | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [offerType, setOfferType] = useState<PropertyOffer['offer_type']>('price_reduction');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: offerError } = await supabase
      .from('property_offers')
      .select('id, property_id, offer_type, headline, description, reference_price, offer_price, payment_terms, starts_at, expires_at, status, created_at, updated_at')
      .eq('property_id', property.id)
      .eq('status', 'active')
      .lte('starts_at', new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .maybeSingle();

    if (offerError) {
      console.error('Unable to load property offer:', offerError);
      setOffer(null);
    } else {
      setOffer(data as PropertyOffer | null);
    }

    let permitted = false;
    if (user) {
      permitted = user.id === property.owner_id || user.id === property.agent_id;

      if (property.company_id && user.id !== property.owner_id) {
        const { data: assignment, error: assignmentError } = await supabase
          .from('property_agents')
          .select('agent_id')
          .eq('property_id', property.id)
          .eq('agent_id', user.id)
          .maybeSingle();

        const assigned = property.agent_id === user.id || (!assignmentError && Boolean(assignment));
        if (assigned) {
          const { data: membership, error: membershipError } = await supabase
            .from('company_members')
            .select('id')
            .eq('company_id', property.company_id)
            .eq('member_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          permitted = !membershipError && Boolean(membership);
        } else {
          permitted = false;
        }
      }
    }

    setCanManage(permitted);
    setLoading(false);
  }, [property.id, property.owner_id, property.agent_id, property.company_id, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const beginEdit = (existing?: PropertyOffer) => {
    setError(null);
    setNotice(null);
    setOfferType(existing?.offer_type ?? 'price_reduction');
    setHeadline(existing?.headline ?? '');
    setDescription(existing?.description ?? '');
    setOfferPrice(existing?.offer_price != null ? String(existing.offer_price) : '');
    setPaymentTerms(existing?.payment_terms ?? '');
    setExpiresAt(existing?.expires_at ? new Date(existing.expires_at).toISOString().slice(0, 16) : '');
    setEditing(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      if (headline.trim().length < 3) throw new Error('Give the offer a headline of at least 3 characters.');
      if (offerType === 'price_reduction') {
        const parsed = Number(offerPrice);
        if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= Number(property.price)) {
          throw new Error('The offer price must be positive and lower than the current asking price.');
        }
      }
      if (offerType === 'flexible_payment' && !paymentTerms.trim()) {
        throw new Error('Describe the flexible payment arrangement.');
      }

      const data = {
        offer_type: offerType,
        headline: headline.trim(),
        description: description.trim() || null,
        offer_price: offerType === 'price_reduction' ? Number(offerPrice) : null,
        payment_terms: paymentTerms.trim() || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      const { data: result, error: invokeError } = await supabase.functions.invoke('manage-property-offer', {
        body: offer
          ? { action: 'update', offerId: offer.id, data }
          : { action: 'create', propertyId: property.id, data },
      });

      if (invokeError) throw invokeError;
      if (!result?.success) throw new Error(result?.error || 'Unable to save this offer.');

      setEditing(false);
      setNotice(offer ? 'Offer updated.' : 'Offer published.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save this offer.');
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async () => {
    if (!offer || saving) return;
    if (!window.confirm('Withdraw this offer? It will no longer appear publicly.')) return;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('manage-property-offer', {
        body: { action: 'withdraw', offerId: offer.id },
      });
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error || 'Unable to withdraw this offer.');
      setOffer(null);
      setEditing(false);
      setNotice('Offer withdrawn.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to withdraw this offer.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const isDiscount = offer?.offer_type === 'price_reduction';

  return (
    <section className="rounded-2xl border border-gold/20 bg-[#111419] p-4 sm:p-5">
      {offer && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gold">
              <Tag className="h-3.5 w-3.5" /> Special property offer
            </span>
            {offer.expires_at && (
              <span className="flex items-center gap-1 text-[10px] text-paper/40">
                <CalendarClock className="h-3 w-3" />
                Ends {new Date(offer.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <h3 className="text-[17px] font-bold text-paper">{offer.headline}</h3>
          {offer.description && <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-paper/55">{offer.description}</p>}

          {isDiscount && offer.offer_price != null && (
            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="text-[22px] font-black text-gold">{formatNaira(Number(offer.offer_price))}</span>
              <span className="text-[12px] text-paper/35 line-through">{formatNaira(Number(offer.reference_price ?? property.price))}</span>
              <span className="rounded-md bg-gold/10 px-2 py-1 text-[10px] font-bold text-gold">
                {Math.round((1 - Number(offer.offer_price) / Number(offer.reference_price ?? property.price)) * 100)}% off
              </span>
            </div>
          )}

          {offer.payment_terms && (
            <p className="mt-3 rounded-xl border border-white/8 bg-black/20 p-3 text-[12px] leading-relaxed text-paper/65">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-paper/35">Payment arrangement</span>
              {offer.payment_terms}
            </p>
          )}
        </div>
      )}

      {notice && <p className="mt-3 text-[11px] text-emerald-400">{notice}</p>}
      {error && <p role="alert" className="mt-3 text-[11px] text-red-400">{error}</p>}

      {canManage && !editing && (
        <div className={offer ? "mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-3" : ""}>
          {offer ? (
            <>
              <button type="button" onClick={() => beginEdit(offer)} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-paper/65 hover:border-gold/40 hover:text-gold">
                <Pencil className="h-3 w-3" /> Edit offer
              </button>
              <button type="button" onClick={withdraw} disabled={saving} className="flex items-center gap-1.5 rounded-lg border border-red-400/20 px-3 py-2 text-[11px] font-semibold text-red-400/80 hover:bg-red-400/5 disabled:opacity-50">
                <X className="h-3 w-3" /> Withdraw
              </button>
            </>
          ) : (
            <button type="button" onClick={() => beginEdit()} className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-[12px] font-bold text-gold hover:bg-gold/10">
              <Megaphone className="h-4 w-4" /> Create property offer
            </button>
          )}
        </div>
      )}

      {editing && (
        <form onSubmit={submit} className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-bold text-paper">{offer ? 'Edit offer' : 'Create an offer'}</h4>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg p-1.5 text-paper/45 hover:bg-white/5" aria-label="Close offer form"><X className="h-4 w-4" /></button>
          </div>

          <div>
            <label className={labelClass}>Offer type</label>
            <select className={inputClass} value={offerType} onChange={e => setOfferType(e.target.value as PropertyOffer['offer_type'])}>
              <option value="price_reduction">Price reduction</option>
              <option value="rent_incentive">Rent incentive</option>
              <option value="flexible_payment">Flexible payment</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Headline</label>
            <input className={inputClass} maxLength={100} required value={headline} onChange={e => setHeadline(e.target.value)} placeholder="e.g. Reduced rent for a limited time" />
          </div>

          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea className={inputClass} rows={3} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain what makes this offer valuable." />
          </div>

          {offerType === 'price_reduction' && (
            <div>
              <label className={labelClass}>Offer price (current asking price: {formatNaira(Number(property.price))})</label>
              <input className={inputClass} type="number" min="1" max={Number(property.price) - 1} step="1" required value={offerPrice} onChange={e => setOfferPrice(e.target.value)} placeholder="Enter reduced price in naira" />
            </div>
          )}

          {offerType === 'flexible_payment' && (
            <div>
              <label className={labelClass}>Payment arrangement</label>
              <textarea className={inputClass} rows={3} maxLength={1000} required value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="Describe the instalment or flexible payment terms." />
            </div>
          )}

          {offerType === 'rent_incentive' && (
            <div>
              <label className={labelClass}>Incentive details (optional)</label>
              <textarea className={inputClass} rows={2} maxLength={1000} value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g. One month rent-free, subject to agreed terms." />
            </div>
          )}

          <div>
            <label className={labelClass}>Expiry (optional)</label>
            <input className={inputClass} type="datetime-local" min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-xl border border-white/10 px-3 py-3 text-[12px] font-semibold text-paper/55">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gold px-3 py-3 text-[12px] font-bold text-black disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving…' : offer ? 'Save changes' : 'Publish offer'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
