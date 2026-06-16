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
  neutral: 'text-white/90 bg-white/20 ring-white/25',
  blue: 'text-white/90 bg-white/20 ring-white/25',
  green: 'text-white/90 bg-white/20 ring-white/25',
  amber: 'text-white/90 bg-white/20 ring-white/25',
  red: 'text-white/90 bg-white/20 ring-white/25',
  purple: 'text-white/90 bg-white/20 ring-white/25',
};

const toneAccentClasses = {
  neutral: 'bg-white/30',
  blue: 'bg-white/30',
  green: 'bg-white/30',
  amber: 'bg-white/30',
  red: 'bg-white/30',
  purple: 'bg-white/30',
};

const toneSurfaceClasses = {
  neutral: 'border-slate-500/20 bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 shadow-slate-500/40',
  blue: 'border-blue-500/20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-blue-500/40',
  green: 'border-emerald-500/20 bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-emerald-500/40',
  amber: 'border-amber-500/20 bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600 shadow-orange-500/40',
  red: 'border-rose-500/20 bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600 shadow-rose-500/40',
  purple: 'border-violet-500/20 bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600 shadow-violet-500/40',
};

const toneTextClasses = {
  neutral: 'text-white/80',
  blue: 'text-white/80',
  green: 'text-white/80',
  amber: 'text-white/80',
  red: 'text-white/80',
  purple: 'text-white/80',
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
        'relative overflow-hidden rounded-xl border p-4 text-left text-white shadow-md transition-all duration-200',
        toneSurfaceClasses[tone],
        onClick && 'hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer',
        className
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1', toneAccentClasses[tone])} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn('text-xs font-semibold uppercase', toneTextClasses[tone])}>{label}</p>
          <div className="mt-1 text-2xl font-bold tracking-normal text-white">{value}</div>
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
