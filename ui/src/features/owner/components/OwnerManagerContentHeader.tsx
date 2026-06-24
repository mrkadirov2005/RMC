// Compact content header with horizontal tabs for the owner manager.

import {
  CircleUserRound,
  Plus,
  Shield,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { OwnerManagerTabType, OwnerManagerMeta } from '../types';

interface OwnerManagerContentHeaderProps {
  currentMeta: OwnerManagerMeta;
  activeTab: OwnerManagerTabType;
  dataCount: number;
  activeCenterLabel: string;
  scopedMessage: string;
  needsCenterScope: boolean;
  isScopedAndMissingCenter: boolean;
  onAdd: () => void;
  onTabChange: (value: OwnerManagerTabType) => void;
  loading: boolean;
}

const tabs: { value: OwnerManagerTabType; label: string; icon: typeof Shield }[] = [
  { value: 'superusers', label: 'Admins', icon: CircleUserRound },
  { value: 'owners', label: 'Owners', icon: Shield },
];

const tabTone: Record<OwnerManagerTabType, string> = {
  centers: 'from-cyan-600 to-blue-600 shadow-cyan-500/25',
  owners: 'from-violet-600 to-fuchsia-600 shadow-violet-500/25',
  superusers: 'from-indigo-600 to-blue-600 shadow-indigo-500/25',
  teachers: 'from-emerald-600 to-teal-600 shadow-emerald-500/25',
  students: 'from-amber-500 to-orange-600 shadow-orange-500/25',
  finance: 'from-rose-600 to-pink-600 shadow-rose-500/25',
  statistics: 'from-slate-800 to-slate-950 shadow-slate-500/25',
};

export const OwnerManagerContentHeader = ({
  currentMeta,
  activeTab,
  dataCount,
  activeCenterLabel,
  scopedMessage,
  needsCenterScope: _needsCenterScope,
  isScopedAndMissingCenter,
  onAdd,
  onTabChange,
  loading,
}: OwnerManagerContentHeaderProps) => {
  const { t } = useLanguage();
  const helperMessage = isScopedAndMissingCenter
    ? t(scopedMessage)
    : activeTab === 'statistics' || activeTab === 'finance' || activeTab === 'teachers'
      ? t('Showing combined data from every center.')
      : `${t('Working inside')} ${activeCenterLabel}.`;

  return (
    <div className="overflow-hidden rounded-lg border border-cyan-200 bg-gradient-to-br from-white via-cyan-50 to-fuchsia-50 p-4 shadow-sm dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.03] dark:to-white/[0.04]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-600 to-indigo-700 text-white shadow-lg shadow-fuchsia-500/25">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {t('Owner Panel')}
            </h1>
            <p className="max-w-2xl text-sm text-slate-500 dark:text-white/55">
              {t('Manage owner access and branch administrators. Use the sidebar Centers page for branch management and Reports for analytics.')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
          <Badge variant="outline" className="border-blue-200 bg-blue-600 px-2 py-1 text-xs font-black text-white dark:border-blue-400/20">
            {t(currentMeta.label)}: {dataCount}
          </Badge>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-600 px-2 py-1 text-xs font-black text-white dark:border-emerald-400/20">
            {t('Branch')}: {activeCenterLabel}
          </Badge>

          {activeTab !== 'statistics' && activeTab !== 'finance' && (
            <Button
              onClick={onAdd}
              disabled={loading || isScopedAndMissingCenter}
              size="sm"
              className={cn('ml-1 h-8 border-0 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:from-fuchsia-700 hover:to-indigo-700', isScopedAndMissingCenter && 'opacity-70')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t('Add')}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-black uppercase text-slate-500">{t('Manage')}</span>
        <div className="inline-flex gap-1 rounded-md border border-slate-200/70 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded px-3 py-1.5 text-xs font-black transition-colors whitespace-nowrap',
                  isActive
                    ? cn('bg-gradient-to-r text-white shadow-md', tabTone[tab.value])
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white'
                )}
                >
                  <Icon className="h-4 w-4" />
                {t(tab.label)}
              </button>
            );
          })}
        </div>
      </div>

      {isScopedAndMissingCenter && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          {helperMessage}
        </p>
      )}
    </div>
  );
};
