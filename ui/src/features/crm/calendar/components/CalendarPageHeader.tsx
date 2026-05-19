// Source file for the calendar area in the crm feature.

import { CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAppSelector } from '@/features/crm/hooks';

interface CalendarPageHeaderProps {
  today: Date;
}

// Renders the calendar page header module.
export const CalendarPageHeader = ({ today }: CalendarPageHeaderProps) => {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-emerald-50/55 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-72 bg-gradient-to-l from-fuchsia-100/45 via-amber-100/35 to-transparent dark:hidden" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-900/10 dark:shadow-none">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-950 dark:text-foreground">Calendar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {user?.userType === 'teacher'
                ? 'Your class schedule for the month.'
                : user?.userType === 'student'
                ? 'Your class schedule for the month.'
                : 'All classes, sessions, rooms, and attendance touchpoints.'}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-2 border-white/80 bg-white/80 px-3 py-2 shadow-sm dark:border-border dark:bg-muted dark:shadow-none">
          <CalendarDays className="h-4 w-4" />
          {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Badge>
      </div>
    </div>
  );
};
