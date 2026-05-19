// Source file for the dashboard area in the crm feature.

import { BookOpen, GraduationCap, Layers3, School, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DashboardScope, DashboardScopeOptions, DashboardScopeType } from '../types';

interface DashboardScopeSelectorProps {
  scope: DashboardScope;
  options: DashboardScopeOptions;
  onScopeChange: (scope: DashboardScope) => void;
}

const scopeTypes: Array<{
  value: DashboardScopeType;
  label: string;
  icon: typeof Layers3;
}> = [
  { value: 'all', label: 'All', icon: Layers3 },
  { value: 'teacher', label: 'Teacher', icon: GraduationCap },
  { value: 'class', label: 'Class', icon: BookOpen },
  { value: 'school', label: 'School', icon: School },
  { value: 'status', label: 'Status', icon: ShieldCheck },
];

const getOptionsForScope = (options: DashboardScopeOptions, type: DashboardScopeType) => {
  if (type === 'all') return [];
  return options[type];
};

const getSelectPlaceholder = (type: DashboardScopeType) => {
  if (type === 'teacher') return 'Choose teacher';
  if (type === 'class') return 'Choose class';
  if (type === 'school') return 'Choose school';
  if (type === 'status') return 'Choose status';
  return 'All statistics';
};

// Renders the dashboard scope selector module.
export const DashboardScopeSelector = ({ scope, options, onScopeChange }: DashboardScopeSelectorProps) => {
  const currentOptions = getOptionsForScope(options, scope.type);
  const selectedOption = currentOptions.find((option) => option.value === scope.value);
  const selectedLabel = scope.type === 'all' ? 'All students' : selectedOption?.label || getSelectPlaceholder(scope.type);
  const selectedCount = scope.type === 'all'
    ? options.status.reduce((sum, option) => sum + option.count, 0)
    : selectedOption?.count || 0;

  return (
    <div className="relative overflow-hidden rounded-lg border border-sky-100 bg-gradient-to-r from-white via-cyan-50/75 to-rose-50/60 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.55)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-amber-400 dark:hidden" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-52 bg-gradient-to-l from-amber-100/70 via-fuchsia-100/30 to-transparent dark:hidden" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-80 bg-gradient-to-r from-emerald-100/60 to-transparent dark:hidden" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-100 to-cyan-100 text-indigo-700 shadow-sm dark:hidden">
            <Layers3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950 dark:text-card-foreground">Statistics scope</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selectedLabel} · {selectedCount.toLocaleString()} students in view
          </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/80 bg-white/75 p-1 shadow-sm backdrop-blur sm:flex dark:border-transparent dark:bg-transparent dark:p-0 dark:shadow-none">
            {scopeTypes.map((item) => {
              const Icon = item.icon;
              const active = scope.type === item.value;
              return (
                <Button
                  key={item.value}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  className={
                    active
                      ? 'gap-2 shadow-md shadow-sky-900/10 dark:shadow-none'
                      : 'gap-2 border-transparent bg-transparent text-slate-600 shadow-none hover:bg-white hover:text-slate-950 dark:border-input dark:bg-background dark:text-foreground dark:shadow-sm dark:hover:bg-accent dark:hover:text-accent-foreground'
                  }
                  onClick={() => onScopeChange({ type: item.value, value: 'all' })}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </div>

          <Select
            value={scope.value}
            disabled={scope.type === 'all' || currentOptions.length === 0}
            onValueChange={(value) => onScopeChange({ ...scope, value })}
          >
            <SelectTrigger className="w-full border-white/80 bg-white/90 shadow-sm sm:w-[260px] dark:border-input dark:bg-background dark:shadow-none">
              <SelectValue placeholder={getSelectPlaceholder(scope.type)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {scope.type === 'all' ? 'statistics' : scope.type}</SelectItem>
              {currentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{option.label}</span>
                    <span className="text-muted-foreground">({option.count})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
