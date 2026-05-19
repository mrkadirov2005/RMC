// Source file for the dashboard area in the crm feature.

import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStudentGrowthPoint } from '../types';

interface DashboardStudentGrowthChartProps {
  points: DashboardStudentGrowthPoint[];
}

export const DashboardStudentGrowthChart = ({ points }: DashboardStudentGrowthChartProps) => {
  const maxTotal = Math.max(...points.map((point) => point.totalStudents), 1);
  const maxNew = Math.max(...points.map((point) => point.newStudents), 1);
  const hasData = points.some((point) => point.newStudents > 0 || point.totalStudents > 0);
  const chartPoints = points.map((point, index) => {
    const x = points.length > 1 ? (index / (points.length - 1)) * 100 : 0;
    const y = 100 - (point.totalStudents / maxTotal) * 100;
    return `${x},${y}`;
  });

  return (
    <Card className="overflow-hidden border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/45 to-cyan-50/55 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm dark:hover:shadow-md">
      <CardHeader className="relative flex flex-row items-center justify-between">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <div>
          <CardTitle className="text-base text-slate-950 dark:text-card-foreground">Student Growth</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Growth according to student registry dates.</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-transparent dark:text-muted-foreground">
          <TrendingUp className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No registry-date data yet.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="h-56 rounded-lg border border-indigo-100 bg-gradient-to-b from-white via-cyan-50/60 to-emerald-50/40 p-4 shadow-inner dark:border-border dark:bg-muted/20 dark:bg-none dark:shadow-none">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
                <polyline
                  points={chartPoints.join(' ')}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((point, index) => {
                  const x = points.length > 1 ? (index / (points.length - 1)) * 100 : 0;
                  const y = 100 - (point.totalStudents / maxTotal) * 100;
                  return (
                    <circle
                      key={`${point.label}-${index}`}
                      cx={x}
                      cy={y}
                      r="1.8"
                      fill="#10b981"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {points.slice(-6).map((point) => {
                const height = Math.max((point.newStudents / maxNew) * 100, point.newStudents > 0 ? 8 : 0);
                return (
                  <div key={point.label} className="rounded-lg border border-cyan-100 bg-white/85 p-2 shadow-sm dark:border-border dark:bg-card dark:shadow-none">
                    <div className="flex h-16 items-end rounded bg-gradient-to-b from-sky-50 to-emerald-50 px-2 dark:bg-muted/40 dark:bg-none">
                      <div
                        className="w-full rounded-t bg-emerald-500"
                        style={{ height: `${height}%` }}
                        title={`${point.newStudents} new students`}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{point.label}</span>
                      <span className="text-xs text-muted-foreground">+{point.newStudents}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
