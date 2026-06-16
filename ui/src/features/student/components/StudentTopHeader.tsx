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
  <header className="sticky top-0 z-30 border-b border-white/50 bg-[#32164f]/90 text-white shadow-[0_12px_40px_-24px_rgba(49,22,79,0.8)] backdrop-blur-xl dark:border-white/10 dark:bg-[#171123]/92">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <button type="button" onClick={onHome} className="flex items-center gap-3 text-left">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 via-fuchsia-500 to-amber-300 text-white shadow-lg shadow-rose-500/25">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white">EduCRM</p>
          <p className="truncate text-xs font-medium text-amber-100/85">{t('Student Portal')}</p>
        </div>
      </button>

      <nav className="hidden items-center gap-2 md:flex">
        <Button variant="ghost" onClick={onHome} className="gap-2 text-white hover:bg-white/14 hover:text-white">
          <BookOpen className="h-4 w-4" />
          {t('Overview')}
        </Button>
        <Button variant="ghost" onClick={onTests} className="gap-2 text-white hover:bg-white/14 hover:text-white">
          <FileQuestion className="h-4 w-4" />
          {t('My Tests')}
        </Button>
        <Button variant="ghost" onClick={onCalendar} className="gap-2 text-white hover:bg-white/14 hover:text-white">
          <CalendarDays className="h-4 w-4" />
          {t('Calendar')}
        </Button>
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label={t('Notifications')} className="hidden rounded-lg border-white/20 bg-white/10 text-white hover:bg-amber-300 hover:text-[#32164f] sm:inline-flex">
          <Bell className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={onProfile}
          className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/12 px-2 py-1.5 shadow-sm transition hover:border-amber-200/70 hover:bg-white/20"
          aria-label={t('Open profile')}
        >
          <Avatar className="h-9 w-9 rounded-lg">
            <AvatarFallback className="rounded-lg bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 text-[#32164f]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[150px] truncate text-sm font-semibold text-white sm:block">
            {studentName}
          </span>
        </button>
        <Button
          variant="outline"
          size="icon"
          onClick={onLogout}
          aria-label={t('Logout')}
          className="rounded-lg border-rose-200/40 bg-rose-400/15 text-rose-50 hover:bg-rose-300 hover:text-[#32164f]"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </header>
);
