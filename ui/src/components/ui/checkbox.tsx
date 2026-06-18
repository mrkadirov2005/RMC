import * as React from 'react';

import { cn } from '@/lib/utils';

type CheckedState = boolean | 'indeterminate';

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'checked' | 'onChange' | 'type'> & {
  checked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = checked === 'indeterminate';
      }
    }, [checked]);

    return (
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked === true}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        className={cn(
          'h-4 w-4 shrink-0 rounded border border-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
