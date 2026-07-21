import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminStats {
  totalUsers: number;
  activeProperties: number;
  pendingVerifications: number;
  totalRevenue: number;
  activeDeals: number;
  lastUpdated: string;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Total Users
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (usersError) throw usersError;

      // Active Properties
      const { count: propertiesCount, error: propertiesError } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active').is('deleted_at', null).eq('is_delisted', false);
      if (propertiesError) throw propertiesError;

      // Pending Verifications
      const { count: verificationsCount, error: verificationsError } = await supabase
        .from('verification_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (verificationsError) throw verificationsError;

      // Total Revenue (Funds Released)
      const { data: revenueData, error: revenueError } = await supabase
        .from('deals')
        .select('amount, platform_fee')
        .eq('status', 'funds_released');
      if (revenueError) throw revenueError;
      
      const totalRevenue = revenueData?.reduce(
        (sum, deal) => sum + (deal.platform_fee || (deal.amount || 0) * 0.02), 
        0
      ) || 0;

      // Active Deals (Not funds_released, not disputed)
      const { count: dealsCount, error: dealsError } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '("funds_released","disputed")');
      if (dealsError) throw dealsError;

      setStats({
        totalUsers: usersCount || 0,
        activeProperties: propertiesCount || 0,
        pendingVerifications: verificationsCount || 0,
        totalRevenue,
        activeDeals: dealsCount || 0,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { stats, loading, error, refresh: fetchStats };
}
