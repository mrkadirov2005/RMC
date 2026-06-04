// Header for the owner analytics workspace.

import { BarChart3, Building2, CircleUserRound, GraduationCap, Plus, Shield, Sparkles, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { OwnerManagerTabType, OwnerManagerMeta } from '../types';

interface OwnerManagerHeaderProps {
  currentMeta: OwnerManagerMeta;
  activeTab: OwnerManagerTabType;
  dataCount: number;
  centerCount: number;
  activeCenterLabel: string;
  scopedMessage: string;
  needsCenterScope: boolean;
  isScopedAndMissingCenter: boolean;
  onAdd: () => void;
  onTabChange: (value: OwnerManagerTabType) => void;
  loading: boolean;
}

const operationsTabs: { value: OwnerManagerTabType; label: string; icon: typeof Building2 }[] = [
  { value: 'centers', label: 'Branches', icon: Building2 },
  { value: 'owners', label: 'Owners', icon: Shield },
  { value: 'superusers', label: 'Admins', icon: CircleUserRound },
  { value: 'teachers', label: 'Teachers', icon: Users },
  { value: 'students', label: 'Students', icon: GraduationCap },
];

const getEntityName = (label: string) => {
  if (label === 'Branches') return 'Branch';
  if (label.endsWith('s')) return label.slice(0, -1);
  return label;
};

export const OwnerManagerHeader = ({
  currentMeta,
  activeTab,
  dataCount,
  centerCount,
  activeCenterLabel,
  scopedMessage,
  needsCenterScope,
  isScopedAndMissingCenter,
  onAdd,
  onTabChange,
  loading,
}: OwnerManagerHeaderProps) => {
  const isAnalytics = activeTab === 'statistics';
  const activeOperation = operationsTabs.find((tab) => tab.value === activeTab);
  const addLabel = getEntityName(activeOperation?.label || currentMeta.label);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-slate-200/70 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.55)] dark:border-border dark:bg-card dark:shadow-sm">
        <CardContent className="p-0">
          <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
            <div className="space-y-5">
              <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Owner Analytics
              </Badge>
              <div className="space-y-2">
                <h1 className="max-w-3xl text-3xl font-bold tracking-normal text-slate-950 dark:text-foreground sm:text-4xl">
                  School performance command center
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-muted-foreground sm:text-base">
                  Track students, branches, payments, teacher performance, and growth from one owner-only statistics workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => onTabChange('statistics')}
                  className={cn(
                    'rounded-lg',
                    isAnalytics
                      ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-primary dark:text-primary-foreground'
                      : 'bg-white text-slate-800 hover:bg-slate-50 dark:bg-background dark:text-foreground'
                  )}
                  variant={isAnalytics ? 'default' : 'outline'}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </Button>
                <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as OwnerManagerTabType)}>
                  <TabsList className="h-10 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-muted">
                    {operationsTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger key={tab.value} value={tab.value} className="h-8 gap-1.5 rounded-md px-3">
                          <Icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-border dark:bg-background/70">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Branches</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-foreground">{centerCount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-border dark:bg-background/70">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Scope</p>
                <p className="mt-2 truncate text-sm font-semibold text-slate-950 dark:text-foreground">
                  {needsCenterScope ? activeCenterLabel : 'All branches'}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-border dark:bg-background/70">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{isAnalytics ? 'Mode' : 'Records'}</p>
                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-foreground">
                  {isAnalytics ? 'Statistics first' : `${dataCount.toLocaleString()} in ${currentMeta.label}`}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isAnalytics && (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-foreground">{currentMeta.label}</h2>
            <p className="text-sm text-muted-foreground">{scopedMessage}</p>
          </div>
          <Button
            onClick={onAdd}
            disabled={loading || isScopedAndMissingCenter}
            className={cn('rounded-lg bg-slate-950 text-white hover:bg-slate-800 dark:bg-primary dark:text-primary-foreground', isScopedAndMissingCenter && 'opacity-70')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {addLabel}
          </Button>
        </div>
      )}

      {isScopedAndMissingCenter && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
          {scopedMessage}
        </p>
      )}
    </div>
  );
};
