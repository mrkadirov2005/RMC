import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageToolbarProps {
  children: ReactNode;
  className?: string;
}

export const PageToolbar = ({ children, className }: PageToolbarProps) => {
  return (
    <div className={cn('rounded-lg border bg-card p-3 text-card-foreground shadow-sm', className)}>
      {children}
    </div>
  );
};
