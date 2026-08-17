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
  children,
  className,
  contentClassName,
}: SectionPanelProps) => {
  return (
    <section className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}>
      <div className={cn('p-5', contentClassName)}>{children}</div>
    </section>
  );
};
