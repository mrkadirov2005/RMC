// Compact content header with horizontal tabs for the owner manager.

import {
  CircleUserRound,
  Plus,
  Shield,
} from 'lucide-react';
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

export const OwnerManagerContentHeader = ({
  activeTab,
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white dark:bg-primary">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t('Owner Panel')}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex gap-1 rounded-md bg-slate-100 p-1 dark:bg-muted">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.value;
              return <button key={tab.value} type="button" onClick={() => onTabChange(tab.value)} className={cn('flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold', isActive ? 'bg-white text-slate-950 shadow-sm dark:bg-background dark:text-white' : 'text-muted-foreground hover:text-foreground')}><Icon className="h-4 w-4" />{t(tab.label)}</button>;
            })}
          </div>
          {activeTab !== 'statistics' && activeTab !== 'finance' && (
            <Button
              onClick={onAdd}
              disabled={loading || isScopedAndMissingCenter}
              size="sm"
              className={cn('h-8 bg-slate-950 text-white hover:bg-slate-800', isScopedAndMissingCenter && 'opacity-70')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t('Add')}
            </Button>
          )}
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
