// Shared UI primitive used across the application.

import * as React from 'react';
import { cn } from '@/lib/utils';
import { formControlClassName } from './form-control';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onWheel, ...props }, ref) => {
    return (
      <input
        type={type}
        // A focused number field changes its value on the mouse wheel; drop focus so the page scrolls
        // instead and an amount can't change by accident.
        onWheel={(event) => {
          if (type === 'number') event.currentTarget.blur();
          onWheel?.(event);
        }}
        className={cn(
          'flex h-10 w-full rounded-xl border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none',
          formControlClassName,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
