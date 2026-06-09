// Source file for the dashboard area in the crm feature.

import { School } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardSchoolSlice } from '../types';
import { useLanguage } from '../../../../i18n/LanguageContext';

interface DashboardSchoolsOverviewProps {
  schools: DashboardSchoolSlice[];
}

export const DashboardSchoolsOverview = ({ schools }: DashboardSchoolsOverviewProps) => {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/55 to-amber-50/50 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm dark:hover:shadow-md">
      <CardHeader className="relative flex flex-row items-center justify-between">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-fuchsia-400 dark:hidden" />
        <div>
          <CardTitle className="text-base text-slate-950 dark:text-card-foreground">{t('Schools of Students')}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{t('Distribution by student school records.')}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-transparent dark:text-muted-foreground">
          <School className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {schools.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('No school data yet.')}
          </div>
        ) : (
          schools.map((school) => (
            <div key={school.label} className="space-y-2 rounded-lg border border-white/90 bg-white/75 p-3 shadow-sm dark:border-transparent dark:bg-transparent dark:p-0 dark:shadow-none">
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
