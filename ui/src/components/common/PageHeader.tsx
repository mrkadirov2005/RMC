import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  primaryAction?: ReactNode;
  meta?: ReactNode;
  user?: unknown;
  variant?: 'default' | 'hero';
  heroGradient?: string;
  className?: string;
  compact?: boolean;
}

export const PageHeader = ({
  title,
  description,
  icon: Icon,
  actions,
  primaryAction,
  meta,
  user: _user,
  variant = 'default',
  heroGradient = 'from-indigo-600 via-sky-600 to-emerald-500',
  className,
  compact = false,
}: PageHeaderProps) => {
  const isHero = variant === 'hero';

  return (
    <section
      className={cn(
        compact
          ? 'relative overflow-hidden rounded-lg border px-2 py-2 shadow-sm'
          : 'relative overflow-hidden rounded-lg border px-5 py-5 shadow-sm sm:px-6',
        isHero
          ? `border-transparent bg-gradient-to-br ${heroGradient} text-white`
          : 'bg-card text-card-foreground',
        className
      )}
    >
      {!isHero && (
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden="true" />
      )}

      <div className={cn('flex gap-4', compact ? 'items-center justify-end' : 'flex-col lg:flex-row lg:items-start lg:justify-between')}>
        {!compact && (
          <div className="flex min-w-0 gap-3">
            {Icon && (
              <div className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border',
                isHero ? 'border-white/20 bg-white/10 text-white' : 'bg-primary/10 text-primary'
              )}>
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
                {meta && <div className="flex flex-wrap items-center gap-2">{meta}</div>}
              </div>

              {description && (
                <p className={cn('mt-2 max-w-3xl text-sm', isHero ? 'text-white/80' : 'text-muted-foreground')}>
                  {description}
                </p>
              )}
            </div>
          </div>
        )}

        {(actions || primaryAction) && (
          <div className="flex flex-wrap items-center gap-2 self-start">
            {actions}
            {primaryAction}
          </div>
        )}
      </div>
    </section>
  );
};
