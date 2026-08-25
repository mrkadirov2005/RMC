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
  <header className="sticky top-0 z-30 border-b bg-card/95 text-card-foreground shadow-sm backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <button type="button" onClick={onHome} className="flex items-center gap-3 text-left">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">EduCRM</p>
          <p className="truncate text-xs font-medium text-muted-foreground">{t('Student Portal')}</p>
        </div>
      </button>

      <nav className="hidden items-center gap-1 md:flex">
        <Button variant="ghost" onClick={onHome} className="gap-2 text-muted-foreground hover:text-foreground">
          <BookOpen className="h-4 w-4" />
          {t('Overview')}
        </Button>
        <Button variant="ghost" onClick={onTests} className="gap-2 text-muted-foreground hover:text-foreground">
          <FileQuestion className="h-4 w-4" />
          {t('My Tests')}
        </Button>
        <Button variant="ghost" onClick={onCalendar} className="gap-2 text-muted-foreground hover:text-foreground">
          <CalendarDays className="h-4 w-4" />
          {t('Calendar')}
        </Button>
      </nav>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label={t('Notifications')} className="hidden sm:inline-flex">
          <Bell className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={onProfile}
          className="flex items-center gap-2 rounded-lg border px-2 py-1.5 transition hover:bg-accent"
          aria-label={t('Open profile')}
        >
          <Avatar className="h-9 w-9 rounded-lg">
            <AvatarFallback className="rounded-lg bg-teal-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[150px] truncate text-sm font-semibold text-foreground sm:block">
            {studentName}
          </span>
        </button>
        <Button
          variant="outline"
          size="icon"
          onClick={onLogout}
          aria-label={t('Logout')}
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </header>
);
