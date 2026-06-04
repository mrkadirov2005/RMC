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
  return (
    <section className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-5', contentClassName)}>{children}</div>
    </section>
  );
};
