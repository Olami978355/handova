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
          .from('profiles')
          .select('id, full_name, avatar_url, email, role')
          .eq('id', data.tenant_id)
          .single();
        tenantProfile = tenantData;
      }

      setDeal({ ...data, profiles: tenantProfile });

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
      return { success: true, data };
    } catch (err: any) {
      console.error(`Error calling ${functionName}:`, err);
      return { success: false, error: err.message };
    }
  };

  // ✅ Upload agreement and move to agreement_draft → pending_payment flow
  const uploadAgreement = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${dealId}/agreement.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agreements')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('agreements')
        .getPublicUrl(filePath);

      // Update deal with agreement URL and move to next stage
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          agreement_url: publicUrl,
          status: 'agreement_draft',
        })
        .eq('id', dealId);

      if (updateError) throw updateError;

      // Notify tenant that agreement is ready to review
      if (deal?.tenant_id) {
        await supabase.from('notifications').insert({
          user_id: deal.tenant_id,
          title: 'Tenancy Agreement Ready for Review',
          message: `Your tenancy agreement for ${deal.properties?.title || 'the property'} has been uploaded. Please review it before making your escrow payment.`,
          type: 'deal_state_change',
          link: `/deals/${dealId}`,
        });
      }

      await fetchDeal();
      return { success: true };
    } catch (err: any) {
      console.error('Error uploading agreement:', err);
      return { success: false, error: err.message };
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

      // Notify agent/landlord
      const ownerId = deal?.agent_id || deal?.landlord_id;
      if (ownerId) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          title: 'Tenant Approved the Agreement',
          message: `The tenant has reviewed and approved the tenancy agreement for ${deal?.properties?.title || 'your property'}. They will now proceed with escrow payment.`,
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

  // ✅ Tenant requests changes to draft agreement
  const requestAgreementChanges = async (reason: string) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ status: 'agreement_draft', notes: `Change requested: ${reason}` })
        .eq('id', dealId);

      if (error) throw error;

      const ownerId = deal?.agent_id || deal?.landlord_id;
      if (ownerId) {
        await supabase.from('notifications').insert({
          user_id: ownerId,
          title: 'Tenant Requested Agreement Changes',
          message: `The tenant has requested changes to the tenancy agreement: "${reason}". Please upload a revised agreement.`,
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

  const signAgreement = () => callEdgeFunction('sign-agreement');
  const confirmMoveIn = () => callEdgeFunction('confirm-move-in');
  const releaseFunds = () => callEdgeFunction('release-funds');
  const markDisputed = (reason: string) => callEdgeFunction('mark-disputed', { reason });

  return {
    deal,
    logs,
    loading,
    error,
    refresh: fetchDeal,
    uploadAgreement,
    approveDraftAgreement,
    requestAgreementChanges,
    signAgreement,
    confirmMoveIn,
    releaseFunds,
    markDisputed,
    isTenant: user?.id === deal?.tenant_id,
    isLandlord: user?.id === deal?.landlord_id,
    isAgent: user?.id === deal?.agent_id,
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'moderator',
  };
}