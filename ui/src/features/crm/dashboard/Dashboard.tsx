// Source file for the dashboard area in the crm feature.

import { memo, useEffect, useState } from 'react';
import { useAppSelector } from '../hooks';
import {
  DashboardFinanceAnalysis,
  DashboardHeader,
  DashboardLoadingState,
  DashboardSchoolsOverview,
  DashboardScopeSelector,
  DashboardStatDetailsDialog,
  DashboardStatCards,
  DashboardStudentGrowthChart,
  DashboardTeacherChart,
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
  const { loading, scopeOptions, scopedCollections, statCards, finance, schoolDistribution, studentGrowth } = useDashboardData(
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

          <div className="animate-slide-up animation-delay-200">
            <DashboardStatCards cards={statCards} onCardClick={setDetailsCard} />
          </div>

          <DashboardStatDetailsDialog
            card={detailsCard}
            collections={scopedCollections}
            selectedMonth={selectedMonth}
            open={Boolean(detailsCard)}
            onOpenChange={(open) => {
              if (!open) setDetailsCard(null);
            }}
          />

          <div className="animate-fade-in animation-delay-300"><DashboardFinanceAnalysis
            finance={finance}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
            onMetricClick={setDetailsCard}
          /></div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in animation-delay-400">
            <DashboardStudentGrowthChart points={studentGrowth} />
            <DashboardTeacherChart collections={scopedCollections} />
          </div>

          <div className="animate-fade-in animation-delay-400">
            <DashboardSchoolsOverview schools={schoolDistribution} />
          </div>
        </>
      )}
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
