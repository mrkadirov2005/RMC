// Source file for the dashboard area in the crm feature.

import { memo, useState } from 'react';
import { useAppSelector } from '../hooks';
import {
  DashboardFinanceAnalysis,
  DashboardHeader,
  DashboardLoadingState,
  DashboardSchoolsOverview,
  DashboardStatCards,
  DashboardStudentGrowthChart,
} from './components';
import { useDashboardData } from './hooks/useDashboardData';

// Renders the dashboard module.
const Dashboard = memo(() => {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.userType || 'superuser';
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const { loading, statCards, finance, schoolDistribution, studentGrowth } = useDashboardData(role, selectedMonth);

  const goToPreviousMonth = () => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <DashboardHeader firstName={user?.first_name} role={role} loading={loading} />

      {loading ? (
        <DashboardLoadingState />
      ) : (
        <>
          <DashboardStatCards cards={statCards} />

          <DashboardFinanceAnalysis
            finance={finance}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <DashboardStudentGrowthChart points={studentGrowth} />
            <DashboardSchoolsOverview schools={schoolDistribution} />
          </div>
        </>
      )}
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
