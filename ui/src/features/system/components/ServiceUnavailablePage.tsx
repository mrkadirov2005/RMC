// Page component for the components screen in the system feature.

import type { ReactNode } from 'react';
import { Button } from '../../../components/ui/button';
import { WifiOff, ServerCrash } from 'lucide-react';

type ServiceUnavailableVariant = 'offline' | 'backend-unreachable';

interface ServiceUnavailablePageProps {
  variant: ServiceUnavailableVariant;
  onRetry?: () => void;
}

const variantContent: Record<ServiceUnavailableVariant, { title: string; message: string; icon: ReactNode }> = {
  offline: {
    title: 'Check internet connection',
    message: 'You are offline. Please check your internet connection and try again.',
    icon: <WifiOff className="h-10 w-10 text-muted-foreground" />,
  },
  'backend-unreachable': {
    title: 'Out of service',
    message: 'Our servers are not responding right now. Please try again shortly.',
    icon: <ServerCrash className="h-10 w-10 text-muted-foreground" />,
  },
};

// Renders the service unavailable page screen.
export const ServiceUnavailablePage = ({ variant, onRetry }: ServiceUnavailablePageProps) => {
  const { title, message, icon } = variantContent[variant];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-full bg-muted p-4">{icon}</div>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button onClick={onRetry} variant="secondary">
          Try again
        </Button>
      ) : null}
    </div>
  );
};
