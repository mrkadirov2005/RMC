// Source file for the dashboard area in the crm feature.

import { School } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSchoolSlice } from '../types';

interface DashboardSchoolsOverviewProps {
  schools: DashboardSchoolSlice[];
}

export const DashboardSchoolsOverview = ({ schools }: DashboardSchoolsOverviewProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Schools of Students</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Distribution by student school records.</p>
        </div>
        <School className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {schools.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No school data yet.
          </div>
        ) : (
          schools.map((school) => (
            <div key={school.label} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: school.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium">{school.label}</span>
                </div>
                <span className="shrink-0 text-sm font-semibold">
                  {school.value.toLocaleString()} · {school.percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${school.percent}%`, backgroundColor: school.color }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
