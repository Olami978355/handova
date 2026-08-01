import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Deal, DealLog, AcceptedDelegate } from '../types';
import { useAuth } from '../context/AuthContext';

export function useDeal(dealId: string) {
  const { user, profile } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [logs, setLogs] = useState<DealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [delegatePreview, setDelegatePreview] = useState<{
    delegate_row_id: string;
    status: string;
    property_title: string;
    duration: string;
    transaction_type: string;
    principal_full_name: string;
    can_sign: boolean;
    can_pay: boolean;
    can_confirm_movein: boolean;
  } | null>(null);

  const fetchDeal = async () => {
    try {
      setLoading(true);

      const { data, error: dealError } = await supabase
        .from('deals')
        .select('*, properties(*)')
        .eq('id', dealId)
        .single();

      if (dealError) {
        if (dealError.code === 'PGRST116') {
          const { data: previewData, error: previewError } = await supabase
            .rpc('get_deal_delegate_preview', { p_deal_id: dealId });
          if (!previewError && previewData && previewData.length > 0) {
            setDelegatePreview(previewData[0]);
            setDeal(null);
            setError(null);
            setLoading(false);
            return;
          }
        }
        throw dealError;
      }
      setDelegatePreview(null);

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

      // Accepted delegates (including any system account) shown as
      // additional parties on the deal.
      let acceptedDelegates: AcceptedDelegate[] = [];
      const { data: delegateRows } = await supabase
        .from('deal_delegates')
        .select('id, principal_id, delegate_id, can_sign, can_pay, can_confirm_movein')
        .eq('deal_id', dealId)
        .eq('status', 'accepted');

      if (delegateRows && delegateRows.length > 0) {
        const delegateIds = delegateRows.map(d => d.delegate_id);
        const { data: delegateProfiles } = await supabase
          .from('public_profiles')
          .select('id, full_name, avatar_url, role, verification_status, is_system_account')
          .in('id', delegateIds);

        acceptedDelegates = delegateRows.map(d => ({
          ...d,
          delegate: delegateProfiles?.find(p => p.id === d.delegate_id) || null,
        }));
      }

      setDeal({
        ...data,
        profiles: tenantProfile,
        landlord: landlordProfile,
        agent: agentProfile,
        accepted_delegates: acceptedDelegates,
      });

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
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        await supabase.auth.signOut();
        window.location.href = '/login';
        return { success: false, error: 'Your session has expired. Please log in again.' };
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { dealId, ...body },
      });
      if (error) throw error;
      await fetchDeal();
      return { success: true, data };
    } catch (err: any) {
      console.error(`Error calling ${functionName}:`, err);
      return { success: false, error: err.message };
    }
  };

  const uploadAgreement = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${dealId}/agreement.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('agreements')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('agreements')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);
      if (signedUrlError) throw signedUrlError;

      const { error: updateError } = await supabase
        .from('deals')
        .update({
          agreement_url: signedUrlData.signedUrl,
          agreement_path: filePath,
          status: 'agreement_draft',
        })
        .eq('id', dealId);
      if (updateError) throw updateError;

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

  const getAgreementViewUrl = async (): Promise<string | null> => {
    if (!deal?.agreement_path) return deal?.agreement_url || null;
    try {
      const { data, error } = await supabase.storage
        .from('agreements')
        .createSignedUrl(deal.agreement_path, 60 * 10);
      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error('Error generating agreement view URL:', err);
      return deal?.agreement_url || null;
    }
  };

  const approveDraftAgreement = async () => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ status: 'agreement_sent' })
        .eq('id', dealId);

      if (error) throw error;

      await supabase.from('deal_logs').insert({
        deal_id: dealId,
        action: 'pending_payment',
        performed_by: user?.id ?? null,
        details: { source: 'approveDraftAgreement' },
      });

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

  const skipAgreement = () => callEdgeFunction('skip-agreement');

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
    delegatePreview,
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
