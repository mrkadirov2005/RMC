// Compact content header with horizontal tabs for the owner manager.

import {
  BarChart3,
  Building2,
  CircleUserRound,
  GraduationCap,
  Plus,
  Shield,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

const tabs: { value: OwnerManagerTabType; label: string; icon: typeof Building2 }[] = [
  { value: 'centers', label: 'Centers', icon: Building2 },
  { value: 'owners', label: 'Owners', icon: Shield },
  { value: 'superusers', label: 'Admins', icon: CircleUserRound },
  { value: 'teachers', label: 'Teachers', icon: Users },
  { value: 'students', label: 'Students', icon: GraduationCap },
  { value: 'statistics', label: 'Statistics', icon: BarChart3 },
];

export const OwnerManagerContentHeader = ({
  currentMeta,
  activeTab,
  dataCount,
  activeCenterLabel,
  scopedMessage,
  needsCenterScope,
  isScopedAndMissingCenter,
  onAdd,
  onTabChange,
  loading,
}: OwnerManagerContentHeaderProps) => {
  const CurrentIcon = currentMeta.icon;

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
            <CurrentIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {currentMeta.label}
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/55">{currentMeta.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-slate-200/70 bg-slate-100/70 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            {dataCount} records
          </Badge>
          <Badge variant="outline" className="border-slate-200/70 bg-slate-100/70 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
            Branch: {activeCenterLabel}
          </Badge>

          {activeTab !== 'statistics' && (
            <Button
              onClick={onAdd}
              disabled={loading || isScopedAndMissingCenter}
              size="sm"
              className={cn('ml-1 bg-amber-400 text-slate-950 hover:bg-amber-300', isScopedAndMissingCenter && 'opacity-70')}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      </div>

      {/* Horizontal tabs */}
      <div className="overflow-x-auto">
        <div className="flex w-full gap-1 rounded-xl border border-slate-200/70 bg-white/80 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.04]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {isScopedAndMissingCenter && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:border-amber-400/20 dark:text-amber-100">
          {scopedMessage}
        </p>
      )}
    </div>
  );
};
