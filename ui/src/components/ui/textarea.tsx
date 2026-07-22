// Shared UI primitive used across the application.

import * as React from 'react';
import { cn } from '@/lib/utils';
import { formControlClassName } from './form-control';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[104px] w-full rounded-xl border px-3 py-2.5 text-sm focus-visible:outline-none resize-y',
          formControlClassName,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
