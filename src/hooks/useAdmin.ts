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

  // Data states
  const [users, setUsers] = useState<Profile[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<VerificationRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);

  const isAdmin = profile?.role === 'admin';
  const isModerator = profile?.role === 'moderator' || isAdmin;

  // Fetch Users (Admin Only)
  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Pending Verifications (Moderator/Admin)
  const fetchPendingVerifications = async () => {
    if (!isModerator) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            role,
            avatar_url,
            verification_status,
            lasrera_id
          ),
          profiles_private:user_id (*)
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true });
      
      if (error) throw error;
      setPendingVerifications(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Properties for Moderation
  const fetchProperties = async () => {
    if (!isModerator) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*, profiles:owner_id (*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProperties(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Admin Logs (Admin Only)
  const fetchLogs = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select('*, actor:actor_id (*)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const approveVerification = async (requestId: string, userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-verification', {
        body: { requestId, userId, action: 'approve' }
      });
      if (error) throw error;
      
      // Refresh data
      fetchPendingVerifications();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const rejectVerification = async (requestId: string, userId: string, notes: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-verification', {
        body: { requestId, userId, action: 'reject', notes }
      });
      if (error) throw error;
      
      fetchPendingVerifications();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (targetUserId: string, newRole: UserRole) => {
    if (!isAdmin) return { success: false, error: 'Unauthorized' };
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-role', {
        body: { targetUserId, newRole }
      });
      if (error) throw error;
      
      fetchUsers();
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

      // Log action
      await supabase.from('admin_logs').insert({
        actor_id: profile?.id,
        action: `moderate_property_${newStatus}`,
        target_id: propertyId,
        details: { propertyId, newStatus }
      });

      fetchProperties();
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
    moderateProperty
  };
}
