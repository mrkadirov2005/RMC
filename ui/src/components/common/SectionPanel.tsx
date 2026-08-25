import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionPanelProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const SectionPanel = ({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: SectionPanelProps) => {
  const hasHeader = title || description || actions;

  return (
    <section className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-5', contentClassName)}>{children}</div>
    </section>
  );
};
