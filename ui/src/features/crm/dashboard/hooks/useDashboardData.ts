import { useEffect, useMemo, useState } from 'react';
import type {
  DashboardActivityItem,
  DashboardFocusItem,
  DashboardRole,
  DashboardStatCard,
  DashboardStats,
} from '../types';
import { fetchDashboardCollections } from '../requests/dashboardRequests';
import {
  buildDashboardActivity,
  buildDashboardStats,
  createInitialDashboardStats,
  getDashboardFocusItems,
  getDashboardStatCards,
} from '../queries/dashboardQueries';

interface UseDashboardDataResult {
  loading: boolean;
  stats: DashboardStats;
  recentActivity: DashboardActivityItem[];
  statCards: DashboardStatCard[];
  focusItems: DashboardFocusItem[];
}

export const useDashboardData = (role: DashboardRole): UseDashboardDataResult => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(createInitialDashboardStats());
  const [recentActivity, setRecentActivity] = useState<DashboardActivityItem[]>([]);

  const isSuperuser = role === 'superuser';

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const collections = await fetchDashboardCollections(isSuperuser);
        if (!isMounted) return;

        setStats(buildDashboardStats(collections, isSuperuser));
        setRecentActivity(buildDashboardActivity(collections));
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [isSuperuser]);

  const statCards = useMemo(() => getDashboardStatCards(stats, isSuperuser), [isSuperuser, stats]);
  const focusItems = useMemo(() => getDashboardFocusItems(stats, isSuperuser), [isSuperuser, stats]);

  return {
    loading,
    stats,
    recentActivity,
    statCards,
    focusItems,
  };
};

