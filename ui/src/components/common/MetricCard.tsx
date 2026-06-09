import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: LucideIcon;
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
  onClick?: () => void;
  className?: string;
}

const toneClasses = {
  neutral: 'text-slate-700 bg-white/70 ring-slate-400/15 dark:text-slate-200 dark:bg-slate-900/60 dark:ring-slate-300/10',
  blue: 'text-blue-700 bg-white/75 ring-blue-500/15 dark:text-blue-200 dark:bg-blue-500/10 dark:ring-blue-300/10',
  green: 'text-emerald-700 bg-white/75 ring-emerald-500/15 dark:text-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-300/10',
  amber: 'text-amber-700 bg-white/75 ring-amber-500/15 dark:text-amber-200 dark:bg-amber-500/10 dark:ring-amber-300/10',
  red: 'text-rose-700 bg-white/75 ring-rose-500/15 dark:text-rose-200 dark:bg-rose-500/10 dark:ring-rose-300/10',
  purple: 'text-violet-700 bg-white/75 ring-violet-500/15 dark:text-violet-200 dark:bg-violet-500/10 dark:ring-violet-300/10',
};

const toneAccentClasses = {
  neutral: 'bg-slate-400',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
  purple: 'bg-violet-500',
};

const toneSurfaceClasses = {
  neutral: 'border-slate-300/80 bg-gradient-to-br from-slate-100 via-white to-slate-200 shadow-slate-200/80 dark:border-slate-600/70 dark:from-slate-800 dark:via-slate-900/85 dark:to-slate-700/70 dark:shadow-black/10',
  blue: 'border-blue-300/90 bg-gradient-to-br from-blue-100 via-sky-50 to-cyan-200/80 shadow-blue-200/80 dark:border-blue-400/30 dark:from-blue-900/55 dark:via-slate-950/80 dark:to-cyan-900/45 dark:shadow-black/10',
  green: 'border-emerald-300/90 bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-200/75 shadow-emerald-200/80 dark:border-emerald-400/30 dark:from-emerald-900/55 dark:via-slate-950/80 dark:to-teal-900/45 dark:shadow-black/10',
  amber: 'border-amber-300/90 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-200/85 shadow-amber-200/80 dark:border-amber-400/30 dark:from-amber-900/55 dark:via-slate-950/80 dark:to-orange-900/45 dark:shadow-black/10',
  red: 'border-rose-300/90 bg-gradient-to-br from-rose-100 via-pink-50 to-orange-200/70 shadow-rose-200/80 dark:border-rose-400/30 dark:from-rose-900/55 dark:via-slate-950/80 dark:to-pink-900/45 dark:shadow-black/10',
  purple: 'border-violet-300/90 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-200/75 shadow-violet-200/80 dark:border-violet-400/30 dark:from-violet-900/55 dark:via-slate-950/80 dark:to-fuchsia-900/45 dark:shadow-black/10',
};

const toneTextClasses = {
  neutral: 'text-slate-600 dark:text-slate-300/75',
  blue: 'text-blue-700/80 dark:text-blue-200/75',
  green: 'text-emerald-700/80 dark:text-emerald-200/75',
  amber: 'text-amber-700/80 dark:text-amber-200/75',
  red: 'text-rose-700/80 dark:text-rose-200/75',
  purple: 'text-violet-700/80 dark:text-violet-200/75',
};

export const MetricCard = ({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'neutral',
  onClick,
  className,
}: MetricCardProps) => {
  const Comp = onClick ? 'button' : 'div';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 text-left text-card-foreground shadow-sm transition-all duration-200',
        toneSurfaceClasses[tone],
        onClick && 'hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer',
        className
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1', toneAccentClasses[tone])} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-xs font-semibold uppercase', toneTextClasses[tone])}>{label}</p>
          <div className="mt-1 text-2xl font-semibold tracking-normal text-foreground">{value}</div>
          {detail && <div className={cn('mt-1 text-xs', toneTextClasses[tone])}>{detail}</div>}
        </div>
        {Icon && (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1', toneClasses[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </Comp>
  );
};
