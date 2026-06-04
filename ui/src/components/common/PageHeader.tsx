import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  meta?: ReactNode;
  actions?: ReactNode;
  variant?: 'default' | 'hero';
  heroGradient?: string;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  icon: Icon,
  meta,
  actions,
  variant = 'default',
  heroGradient = 'from-indigo-600 via-sky-600 to-emerald-500',
  className,
}: PageHeaderProps) => {
  const isHero = variant === 'hero';

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-lg border px-5 py-5 shadow-sm sm:px-6',
        isHero
          ? `border-transparent bg-gradient-to-br ${heroGradient} text-white`
          : 'bg-card text-card-foreground',
        className
      )}
    >
      {!isHero && (
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon && (
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                isHero
                  ? 'bg-white/20 text-white shadow-lg shadow-black/10'
                  : 'border bg-muted text-primary'
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className={cn(
                  'text-2xl font-semibold tracking-normal sm:text-3xl',
                  isHero ? 'text-white' : 'text-foreground'
                )}
              >
                {title}
              </h1>
              {meta}
            </div>
            {description && (
              <p
                className={cn(
                  'mt-1 max-w-3xl text-sm leading-6',
                  isHero ? 'text-white/80' : 'text-muted-foreground'
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
      </div>
    </section>
  );
};
