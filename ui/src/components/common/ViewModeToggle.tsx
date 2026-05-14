import { Grid2X2, List, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'compact' | 'cards';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}

const options = [
  { value: 'list' as const, label: 'List view', icon: List },
  { value: 'compact' as const, label: 'Compact folder view', icon: Rows3 },
  { value: 'cards' as const, label: 'Card view', icon: Grid2X2 },
];

export const ViewModeToggle = ({ value, onChange, className }: ViewModeToggleProps) => (
  <TooltipProvider>
    <div className={cn('inline-flex h-9 items-center rounded-md border bg-background p-1', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={value === option.value ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => onChange(option.value)}
                aria-label={option.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{option.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  </TooltipProvider>
);
