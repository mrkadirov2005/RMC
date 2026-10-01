import { LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppDispatch } from '../../crm/hooks';
import { logout } from '../../../slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../i18n/LanguageContext';
import { useThemeMode } from '../../../theme/ThemeContext';


export default function TeacherPortalTopBar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { toggleTheme, isDark } = useThemeMode();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login/teacher', { replace: true });
  };

  return (
    <div className="rounded-2xl shadow-sm dark:bg-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
       
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={toggleTheme}
            aria-label={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button type="button" variant="default" className="h-9 rounded-xl px-3 text-xs font-semibold" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('Logout')}
          </Button>
        </div>
      </div>
    </div>
  );
}
