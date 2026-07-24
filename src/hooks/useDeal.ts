import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Deal, DealLog } from '../types';
import { useAuth } from '../context/AuthContext';

export function useDeal(dealId: string) {
  const { user, profile } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [logs, setLogs] = useState<DealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeal = async () => {
    try {
      setLoading(true);

      const { data, error: dealError } = await supabase
        .from('deals')
        .select('*, properties(*)')
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;

      let tenantProfile = null;
      if (data.tenant_id) {
        const { data: tenantData } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, role, verification_status')
          .eq('id', data.tenant_id)
          .single();
        tenantProfile = tenantData;
      }

      let landlordProfile = null;
      if (data.landlord_id) {
        const { data: landlordData } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, role, verification_status')
          .eq('id', data.landlord_id)
          .single();
        landlordProfile = landlordData;
      }

      let agentProfile = null;
      if (data.agent_id) {
        const { data: agentData } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, role, verification_status')
          .eq('id', data.agent_id)
          .single();
        agentProfile = agentData;
      }

      setDeal({ ...data, profiles: tenantProfile, landlord: landlordProfile, agent: agentProfile });

      const { data: logData, error: logError } = await supabase
        .from('deal_logs')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (logError) throw logError;
      setLogs(logData || []);

    } catch (err: any) {
      console.error('Error fetching deal:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealId) {
      fetchDeal();

      const channelId = Math.random().toString(36).substring(7);
      const subscription = supabase
        .channel(`deal:${dealId}-${channelId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'deals',
          filter: `id=eq.${dealId}`,
        }, () => {
          fetchDeal();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [dealId]);

  const callEdgeFunction = async (functionName: string, body: any = {}) => {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { dealId, ...body },
      });
      if (error) throw error;
      // Refresh immediately rather than relying solely on the realtime
      // subscription, which can lag behind the Edge Function's write.
      await fetchDeal();
      return { success: true, data };
    } catch (err: any) {
      console.error(`Error calling ${functionName}:`, err);
      return { success: false, error: err.message };
    }
  };

  // ✅ Upload agreement and move to agreement_draft → pending_payment flow
 // ✅ Upload agreement and move to agreement_draft → pending_payment flow
  const uploadAgreement = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${dealId}/agreement.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('agreements')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // 'agreements' is a private bucket, so getPublicUrl() would return a
      // URL that never actually works. Generate a signed URL instead.
      // Signed URLs expire, so we store the file PATH (not the URL) and
      // regenerate a fresh signed URL each time it's needed for viewing.
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('agreements')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7-day signed URL
      if (signedUrlError) throw signedUrlError;

      // Update deal with agreement URL and move to next stage
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          agreement_url: signedUrlData.signedUrl,
          agreement_path: filePath,
          status: 'agreement_draft',
        })
        .eq('id', dealId);
      if (updateError) throw updateError;

      // Notify tenant that agreement is ready to review.
      // Wrapped separately so a notification failure never breaks the
      // core upload flow (which has already succeeded by this point).
      if (deal?.tenant_id) {
        try {
          await supabase.from('notifications').insert({
            user_id: deal.tenant_id,
            title: 'Tenancy Agreement Ready for Review',
            body: `Your tenancy agreement for ${deal.properties?.title || 'the property'} has been uploaded. Please review it before making your escrow payment.`,
            type: 'deal_state_change',
            link: `/deals/${dealId}`,
          });
        } catch (notifyErr) {
          console.error('Notification insert failed (non-fatal):', notifyErr);
        }
      }
      await fetchDeal();
      return { success: true };
    } catch (err: any) {
      console.error('Error uploading agreement:', err);
      return { success: false, error: err.message };
    }
  };

  // Generates a fresh signed URL for viewing the agreement, since stored
  // signed URLs expire after 7 days. Call this when a user clicks to view
  // the agreement, rather than relying solely on the stored agreement_url.
  const getAgreementViewUrl = async (): Promise<string | null> => {
    if (!deal?.agreement_path) return deal?.agreement_url || null;
    try {
      const { data, error } = await supabase.storage
        .from('agreements')
        .createSignedUrl(deal.agreement_path, 60 * 10); // 10-minute link, just for this view
      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error('Error generating agreement view URL:', err);
      return deal?.agreement_url || null;
    }
  };

  // ✅ Tenant approves draft agreement → moves to pending_payment
  const approveDraftAgreement = async () => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ status: 'pending_payment' })
        .eq('id', dealId);

      if (error) throw error;

      await supabase.from('deal_logs').insert({
        deal_id: dealId,
        action: 'pending_payment',
        performed_by: user?.id ?? null,
        details: { source: 'approveDraftAgreement' },
      });

      // Notify agent/landlord
      const ownerId = deal?.agent_id || deal?.landlord_id;
      if (ownerId) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          title: 'Tenant Approved the Agreement',
          body: `The tenant has reviewed and approved the tenancy agreement for ${deal?.properties?.title || 'your property'}. They will now proceed with escrow payment.`,
          type: 'deal_state_change',
          link: `/deals/${dealId}`,
        });
      }

      await fetchDeal();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // ✅ Landlord/agent skips the tenancy agreement entirely — moves straight to pending_payment
  const skipAgreement = () => callEdgeFunction('skip-agreement');

  // ✅ Tenant requests changes to draft agreement
  const requestAgreementChanges = async (reason: string) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ status: 'agreement_draft', notes: `Change requested: ${reason}` })
        .eq('id', dealId);

      if (error) throw error;

      await supabase.from('deal_logs').insert({
        deal_id: dealId,
        action: 'agreement_draft',
        performed_by: user?.id ?? null,
        details: { source: 'requestAgreementChanges', reason },
      });

      const ownerId = deal?.agent_id || deal?.landlord_id;
      if (ownerId) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          title: 'Tenant Requested Agreement Changes',
          body: `The tenant has requested changes to the tenancy agreement: "${reason}". Please upload a revised agreement.`,
          type: 'deal_state_change',
          link: `/deals/${dealId}`,
        });
      }

      await fetchDeal();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cancelDeal = (reason: string) => callEdgeFunction('cancel-deal', { reason });
  const cancelDealAsTenant = (reason: string) => callEdgeFunction('cancel-deal-tenant', { reason });
  const signAgreement = () => callEdgeFunction('sign-agreement');
  const confirmMoveIn = () => callEdgeFunction('confirm-move-in');
  const confirmHandover = () => callEdgeFunction('confirm-handover');
  const releaseFunds = () => callEdgeFunction('release-funds');
  const generateAgreement = () => callEdgeFunction('generate-agreement');
  const markDisputed = (reason: string) => callEdgeFunction('mark-disputed', { reason });

  return {
    deal,
    logs,
    loading,
    error,
    refresh: fetchDeal,
    uploadAgreement,
    getAgreementViewUrl,
    approveDraftAgreement,
    requestAgreementChanges,
    skipAgreement,
    signAgreement,
    confirmMoveIn,
    confirmHandover,
    releaseFunds,
    generateAgreement,
    markDisputed,
    cancelDeal,
    cancelDealAsTenant,
    isTenant: user?.id === deal?.tenant_id,
    isLandlord: user?.id === deal?.landlord_id,
    isAgent: user?.id === deal?.agent_id,
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'moderator',
  };
}