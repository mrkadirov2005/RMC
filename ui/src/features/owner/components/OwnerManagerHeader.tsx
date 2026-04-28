// Source file for the components area in the owner feature.

import { Database, Plus } from 'lucide-react';
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

const tabs: { value: OwnerManagerTabType; label: string }[] = [
  { value: 'centers', label: 'Centers' },
  { value: 'owners', label: 'Owners' },
  { value: 'superusers', label: 'Superusers' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'students', label: 'Students' },
  { value: 'statistics', label: 'Statistics' },
];

// Renders the owner manager header module.
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
  const CurrentIcon = currentMeta.icon;

  return (
    <Card className="overflow-hidden border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 backdrop-blur">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4 max-w-2xl">
            <Badge variant="outline" className="w-fit border-amber-400/30 bg-amber-400/10 text-amber-300">
              <Database className="mr-1.5 h-3.5 w-3.5" />
              Owner Console
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Database Manager</h1>
              <p className="max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                Manage centers, owners, superusers, teachers, and students from one polished control panel.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {dataCount} records in {currentMeta.label}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {centerCount} branches available
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {needsCenterScope || activeTab === 'statistics' ? `Scope: ${scopedMessage}` : 'Scope: System wide'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
            <Card className="border-white/10 bg-slate-950/40">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Active Branch</p>
                <p className="mt-2 text-lg font-semibold">{activeCenterLabel}</p>
                <p className="mt-1 text-sm text-white/55">Used for scoped management and new records.</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-slate-950/40">
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Current Section</p>
                <p className="mt-2 text-lg font-semibold">{currentMeta.label}</p>
                <p className="mt-1 text-sm text-white/55">{currentMeta.description}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-2xl font-semibold">
              <CurrentIcon className="h-5 w-5 text-amber-300" />
              {currentMeta.label}
            </h2>
            <p className="text-white/55">{currentMeta.description}</p>
          </div>

          {activeTab !== 'statistics' && (
            <Button
              onClick={onAdd}
              disabled={loading || isScopedAndMissingCenter}
              className={cn('bg-amber-400 text-slate-950 hover:bg-amber-300', isScopedAndMissingCenter && 'opacity-70')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add {currentMeta.label.slice(0, -1)}
            </Button>
          )}
        </div>

        {isScopedAndMissingCenter && (
          <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {scopedMessage}
          </p>
        )}

        <div className="mt-6 overflow-x-auto">
          <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as OwnerManagerTabType)}>
            <TabsList className="h-auto w-max gap-1 bg-white/5 p-1 text-white/70">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="px-4 py-2 data-[state=active]:bg-amber-400 data-[state=active]:text-slate-950"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};
