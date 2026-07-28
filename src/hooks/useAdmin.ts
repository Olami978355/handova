import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Profile,
  Property,
  VerificationRequest,
  AdminLog,
  UserRole,
  PropertyStatus
} from '../types';
import { useAuth } from '../context/AuthContext';

export function useAdmin() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<(Profile & { strike_count?: number })[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<VerificationRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);

  const isAdmin = profile?.role === 'admin';
  const isModerator = profile?.role === 'moderator' || isAdmin;

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = (data || []).map(u => u.id);
      let strikeCounts: Record<string, number> = {};
      if (userIds.length > 0) {
        const { data: strikeRows } = await supabase
          .from('strikes')
          .select('user_id')
          .in('user_id', userIds);
        (strikeRows || []).forEach(s => {
          strikeCounts[s.user_id] = (strikeCounts[s.user_id] || 0) + 1;
        });
      }

      const enriched = (data || []).map(u => ({ ...u, strike_count: strikeCounts[u.id] || 0 }));
      setUsers(enriched);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed — no FK joins, fetch profiles and private data separately
  const fetchPendingVerifications = async () => {
    if (!isModerator) return;
    setLoading(true);
    try {
      const { data: requests, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((requests || []).map(r => r.user_id).filter(Boolean))];

      let profilesMap: Record<string, any> = {};
      let privateMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, avatar_url, verification_status, lasrera_id')
          .in('id', userIds);
        if (profilesData) {
          profilesMap = Object.fromEntries(profilesData.map(p => [p.id, p]));
        }

       const { data: privateData } = await supabase
  .from('profiles_private')
  .select('*')
  .in('id', userIds);
if (privateData) {
  privateMap = Object.fromEntries(privateData.map(p => [p.id, p]));
}
      }

      const enriched = (requests || []).map(r => ({
        ...r,
        profiles: profilesMap[r.user_id] || null,
        profiles_private: privateMap[r.user_id] || null,
      }));

      setPendingVerifications(enriched);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed — no FK join, fetch owner profiles separately
  const fetchProperties = async () => {
    if (!isModerator) return;
    setLoading(true);
    try {
      const { data: propsData, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ownerIds = [...new Set((propsData || []).map(p => p.owner_id).filter(Boolean))];
      let ownerMap: Record<string, any> = {};

      if (ownerIds.length > 0) {
        const { data: ownersData } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, verification_status')
          .in('id', ownerIds);
        if (ownersData) {
          ownerMap = Object.fromEntries(ownersData.map(p => [p.id, p]));
        }
      }

      const enriched = (propsData || []).map(p => ({
        ...p,
        profiles: ownerMap[p.owner_id] || null,
      }));

      setProperties(enriched);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed — no FK join, fetch actor profiles separately
  const fetchLogs = async (filters?: { search?: string; dateFrom?: string; dateTo?: string }) => {
    if (!isAdmin) return;
    setLoading(true);
    try {

    let query = supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters?.search) {
      query = query.or('action.ilike.%' + filters.search + '%,target_id.ilike.%' + filters.search + '%');
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data: logsData, error } = await query;

      if (error) throw error;

      const actorIds = [...new Set((logsData || []).map(l => l.actor_id).filter(Boolean))];
      let actorMap: Record<string, any> = {};

      if (actorIds.length > 0) {
        const { data: actorsData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', actorIds);
        if (actorsData) {
          actorMap = Object.fromEntries(actorsData.map(p => [p.id, p]));
        }
      }

      const enriched = (logsData || []).map(l => ({
        ...l,
        actor: actorMap[l.actor_id] || null,
      }));

      setLogs(enriched);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed — direct table update instead of relying on Edge Function
  const approveVerification = async (requestId: string, userId: string) => {
    setLoading(true);
    try {
      // Update verification_requests
      const { error: reqError } = await supabase
        .from('verification_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
        })
        .eq('id', requestId);
      if (reqError) throw reqError;

      // Update profile verification status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', userId);
      if (profileError) throw profileError;

      // Log the action
      await supabase.from('admin_logs').insert({
        actor_id: profile?.id,
        action: 'verification_approved',
        target_id: userId,
        target_type: 'profile',
        details: { request_id: requestId },
      });

      // Notify user
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Verification Approved',
        body: 'Congratulations! Your identity has been verified. Your listings can now go live instantly.',
        type: 'verification_approved',
        link: '/profile',
      });

      await fetchPendingVerifications();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed — direct table update
  const rejectVerification = async (requestId: string, userId: string, notes: string) => {
    setLoading(true);
    try {
      const { error: reqError } = await supabase
        .from('verification_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: profile?.id,
          rejection_notes: notes,
        })
        .eq('id', requestId);
      if (reqError) throw reqError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('id', userId);
      if (profileError) throw profileError;

      await supabase.from('admin_logs').insert({
        actor_id: profile?.id,
        action: 'verification_rejected',
        target_id: userId,
        target_type: 'profile',
        details: { request_id: requestId, reason: notes },
      });

      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Verification Needs Attention',
        body: `Your verification was not approved. Reason: ${notes}. Please resubmit with the correct documents.`,
        type: 'verification_rejected',
        link: '/verification',
      });

      await fetchPendingVerifications();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fixed — direct table update instead of Edge Function
  const updateUserRole = async (targetUserId: string, newRole: UserRole) => {
    if (!isAdmin) return { success: false, error: 'Unauthorized' };
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUserId);
      if (error) throw error;

      await supabase.from('admin_logs').insert({
        actor_id: profile?.id,
        action: 'role_updated',
        target_id: targetUserId,
        target_type: 'profile',
        details: { new_role: newRole },
      });

      await fetchUsers();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // ✅ Suspend a user account
  const suspendUser = async (targetUserId: string, reason: string) => {
    if (!isModerator) return { success: false, error: 'Unauthorized' };
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: 'suspended' })
        .eq('id', targetUserId);
      if (error) throw error;

      await supabase.from('admin_logs').insert({
        actor_id: profile?.id,
        action: 'user_suspended',
        target_id: targetUserId,
        target_type: 'profile',
        details: { reason },
      });

      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title: 'Account Suspended',
        body: `Your account has been suspended. Reason: ${reason}. Contact support if you believe this is an error.`,
        type: 'warning',
        link: '/contact',
      });

      await fetchUsers();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const moderateProperty = async (propertyId: string, newStatus: PropertyStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', propertyId);
      if (error) throw error;

      await supabase.from('admin_logs').insert({
        actor_id: profile?.id,
        action: `property_${newStatus}`,
        target_id: propertyId,
        target_type: 'property',
        details: { new_status: newStatus },
      });

      await fetchProperties();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    users,
    pendingVerifications,
    properties,
    logs,
    isAdmin,
    isModerator,
    fetchUsers,
    fetchPendingVerifications,
    fetchProperties,
    fetchLogs,
    setUsers,
    setPendingVerifications,
    setProperties,
    setLogs,
    approveVerification,
    rejectVerification,
    updateUserRole,
    suspendUser,
    moderateProperty,
  };
}