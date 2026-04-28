// Source file for the dashboard area in the crm feature.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardFocusItem } from '../types';

interface DashboardFocusTodayProps {
  items: DashboardFocusItem[];
}

// Renders the dashboard focus today module.
export const DashboardFocusToday = ({ items }: DashboardFocusTodayProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Focus Today</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-semibold">{item.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

