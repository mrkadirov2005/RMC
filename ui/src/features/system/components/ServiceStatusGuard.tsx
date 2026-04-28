// Source file for the components area in the system feature.

import type { ReactNode } from 'react';
import { useAppSelector } from '../../crm/hooks';
import { useServiceStatus } from '../hooks/useServiceStatus';
import { ServiceUnavailablePage } from './ServiceUnavailablePage';

interface ServiceStatusGuardProps {
  children: ReactNode;
}

// Renders the service status guard module.
export const ServiceStatusGuard = ({ children }: ServiceStatusGuardProps) => {
  const { status } = useAppSelector((state) => state.serviceStatus);
  const { checkNow } = useServiceStatus();

  if (status === 'offline' || status === 'backend-unreachable') {
    return <ServiceUnavailablePage variant={status} onRetry={checkNow} />;
  }

  return <>{children}</>;
};
