import { memo } from 'react';
import { useAppSelector } from '../hooks';
import { DashboardFocusToday, DashboardHeader, DashboardLoadingState, DashboardRecentActivity, DashboardStatCards } from './components';
import { useDashboardData } from './hooks/useDashboardData';

const Dashboard = memo(() => {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.userType || 'superuser';
  const { loading, statCards, recentActivity, focusItems } = useDashboardData(role);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <DashboardHeader firstName={user?.first_name} role={role} loading={loading} />

      {loading ? (
        <DashboardLoadingState />
      ) : (
        <>
          <DashboardStatCards cards={statCards} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DashboardRecentActivity items={recentActivity} />
            <DashboardFocusToday items={focusItems} />
          </div>
        </>
      )}
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
