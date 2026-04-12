import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardActivityItem } from '../types';
import { formatDashboardDate } from '../queries/dashboardQueries';

interface DashboardRecentActivityProps {
  items: DashboardActivityItem[];
}

export const DashboardRecentActivity = ({ items }: DashboardRecentActivityProps) => {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Activity</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No recent activity yet.</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0"
            >
              <div>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {item.type}
                  {item.meta ? ` • ${item.meta}` : ''}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{formatDashboardDate(item.date)}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

