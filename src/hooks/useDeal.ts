import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Deal, DealLog, DealStatus } from '../types';
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
        .select('*, properties(*), profiles!tenant_id(*)')
        .eq('id', dealId)
        .single();

      if (dealError) throw dealError;
      setDeal(data);

      const { data: logData, error: logError } = await supabase
        .from('deal_logs')
        .select('*, profiles!performed_by(*)')
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

      // Subscribe to deal changes
      const channelId = Math.random().toString(36).substring(7);
      const subscription = supabase
        .channel(`deal:${dealId}-${channelId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'deals', 
          filter: `id=eq.${dealId}` 
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

  const uploadAgreement = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('dealId', dealId);
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('upload-agreement', {
        body: formData,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error('Error uploading agreement:', err);
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
