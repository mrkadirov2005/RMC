// Source file for the dashboard area in the crm feature.

import { LayoutDashboard } from 'lucide-react';
import { useLanguage } from '../../../../i18n/LanguageContext';

interface DashboardHeaderProps {
  firstName?: string;
  role: string;
  loading: boolean;
}

// Renders the dashboard header module.
export const DashboardHeader = ({ firstName, role, loading }: DashboardHeaderProps) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"><LayoutDashboard className="h-5 w-5" /></div>
        <div><h1 className="text-2xl font-black text-slate-950 dark:text-white">{t('Good to see you')}, {firstName || t('User')}</h1><p className="text-sm text-slate-500">{t('The signals that need your attention today.')}</p></div>
      </div>
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className={`h-2 w-2 rounded-full ${loading ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />{loading ? t('Updating...') : t('Up to date')} · {role.toUpperCase()}</div>
    </div>
  );
};
