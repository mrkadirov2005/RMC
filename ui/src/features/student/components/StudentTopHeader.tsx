import { Bell, BookOpen, CalendarDays, FileQuestion, GraduationCap, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface StudentTopHeaderProps {
  initials: string;
  studentName: string;
  t: (value: string) => string;
  onHome: () => void;
  onTests: () => void;
  onCalendar: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

export const StudentTopHeader = ({
  initials,
  studentName,
  t,
  onHome,
  onTests,
  onCalendar,
  onProfile,
  onLogout,
}: StudentTopHeaderProps) => (
  <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-xl dark:border-border dark:bg-background/90">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <button type="button" onClick={onHome} className="flex items-center gap-3 text-left">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400 text-white shadow-lg shadow-sky-500/25">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-950 dark:text-foreground">EduCRM</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{t('Student Portal')}</p>
        </div>
      </button>

      <nav className="hidden items-center gap-2 md:flex">
        <Button variant="ghost" onClick={onHome} className="gap-2">
          <BookOpen className="h-4 w-4" />
          {t('Overview')}
        </Button>
        <Button variant="ghost" onClick={onTests} className="gap-2">
          <FileQuestion className="h-4 w-4" />
          {t('My Tests')}
        </Button>
        <Button variant="ghost" onClick={onCalendar} className="gap-2">
          <CalendarDays className="h-4 w-4" />
          {t('Calendar')}
        </Button>
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label={t('Notifications')} className="hidden rounded-lg sm:inline-flex">
          <Bell className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={onProfile}
          className="flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-2 py-1.5 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 dark:border-border dark:bg-card dark:hover:bg-muted"
          aria-label={t('Open profile')}
        >
          <Avatar className="h-9 w-9 rounded-lg">
            <AvatarFallback className="rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[150px] truncate text-sm font-semibold text-slate-900 dark:text-foreground sm:block">
            {studentName}
          </span>
        </button>
        <Button
          variant="outline"
          size="icon"
          onClick={onLogout}
          aria-label={t('Logout')}
          className="rounded-lg border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/30 dark:text-rose-300"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </header>
);
