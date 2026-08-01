// Source file for the dashboard area in the crm feature.

import { memo, useEffect, useState } from 'react';
import { useAppSelector } from '../hooks';
import {
  DashboardCommandCenter,
  DashboardHeader,
  DashboardLoadingState,
  DashboardScopeSelector,
  DashboardStatDetailsDialog,
} from './components';
import { useDashboardData } from './hooks/useDashboardData';
import type { DashboardScope, DashboardStatCard } from './types';

// Renders the dashboard module.
const Dashboard = memo(() => {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.userType || 'superuser';
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [scope, setScope] = useState<DashboardScope>({ type: 'all', value: 'all' });
  const [detailsCard, setDetailsCard] = useState<DashboardStatCard | null>(null);
  const { loading, scopeOptions, scopedCollections, stats, finance, studentGrowth } = useDashboardData(
    role,
    selectedMonth,
    scope
  );

  useEffect(() => {
    if (scope.type === 'all' || scope.value === 'all') return;
    const stillAvailable = scopeOptions[scope.type].some((option) => option.value === scope.value);
    if (!stillAvailable) setScope({ type: scope.type, value: 'all' });
  }, [scope, scopeOptions]);

  const goToPreviousMonth = () => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <DashboardHeader firstName={user?.first_name} role={role} loading={loading} />

      {loading ? (
        <DashboardLoadingState />
      ) : (
        <>
          <div className="animate-slide-up animation-delay-100">
            <DashboardScopeSelector scope={scope} options={scopeOptions} onScopeChange={setScope} />
          </div>

          <div className="animate-slide-up animation-delay-200"><DashboardCommandCenter stats={stats} finance={finance} growth={studentGrowth} selectedMonth={selectedMonth} onPreviousMonth={goToPreviousMonth} onNextMonth={goToNextMonth} onOpenDetails={setDetailsCard} /></div>

          <DashboardStatDetailsDialog
            card={detailsCard}
            collections={scopedCollections}
            selectedMonth={selectedMonth}
            open={Boolean(detailsCard)}
            onOpenChange={(open) => {
              if (!open) setDetailsCard(null);
            }}
          />

        </>
      )}
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
