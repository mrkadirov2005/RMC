import { Languages, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '../../crm/hooks';
import { logout } from '../../../slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useThemeMode } from '../../../theme/ThemeContext';

interface TeacherPortalTopBarProps {
  teacherName?: string;
}

export default function TeacherPortalTopBar({ teacherName }: TeacherPortalTopBarProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { toggleTheme, isDark } = useThemeMode();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login/teacher', { replace: true });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-sm font-bold text-white shadow-lg shadow-indigo-900/20">
            TS
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-foreground">{t('My Portal')}</p>
            <p className="truncate text-xs text-muted-foreground">
              {teacherName || t('Teacher')} • {t('Daily teaching workspace')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-muted/40">
            <Button
              type="button"
              size="sm"
              variant={language === 'uz' ? 'default' : 'ghost'}
              className="h-8 px-3 text-xs font-semibold"
              onClick={() => setLanguage('uz')}
            >
              <Languages className="mr-1.5 h-3.5 w-3.5" />
              UZ
            </Button>
            <Button
              type="button"
              size="sm"
              variant={language === 'en' ? 'default' : 'ghost'}
              className="h-8 px-3 text-xs font-semibold"
              onClick={() => setLanguage('en')}
            >
              EN
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={toggleTheme}
            aria-label={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button type="button" variant="outline" className="h-9 rounded-xl px-3 text-xs font-semibold" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('Logout')}
          </Button>
        </div>
      </div>
    </div>
  );
}
