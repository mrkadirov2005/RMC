import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: LucideIcon;
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red';
  onClick?: () => void;
  className?: string;
}

const toneClasses = {
  neutral: 'text-muted-foreground bg-gradient-to-br from-muted to-muted/60',
  blue: 'text-blue-700 bg-gradient-to-br from-blue-100 to-sky-50 dark:text-blue-300 dark:from-blue-500/20 dark:to-sky-500/10',
  green: 'text-emerald-700 bg-gradient-to-br from-emerald-100 to-teal-50 dark:text-emerald-300 dark:from-emerald-500/20 dark:to-teal-500/10',
  amber: 'text-amber-700 bg-gradient-to-br from-amber-100 to-orange-50 dark:text-amber-300 dark:from-amber-500/20 dark:to-orange-500/10',
  red: 'text-rose-700 bg-gradient-to-br from-rose-100 to-pink-50 dark:text-rose-300 dark:from-rose-500/20 dark:to-pink-500/10',
};

const toneAccentClasses = {
  neutral: 'bg-muted-foreground/40',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
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
        'relative overflow-hidden rounded-xl border bg-card p-4 text-left text-card-foreground shadow-sm transition-all duration-200',
        onClick && 'hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer',
        className
      )}
    >
      <div className={cn('absolute inset-x-0 top-0 h-0.5', toneAccentClasses[tone])} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <div className="mt-1 text-2xl font-semibold tracking-normal text-foreground">{value}</div>
          {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
        </div>
        {Icon && (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', toneClasses[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </Comp>
  );
};
