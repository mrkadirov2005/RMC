// Source file for the components area in the system feature.

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAppSelector } from '../../crm/hooks';
import { useServiceStatus } from '../hooks/useServiceStatus';
import { showToast } from '../../../utils/toast';

interface ServiceStatusGuardProps {
  children: ReactNode;
}

// Renders the service status guard module.
export const ServiceStatusGuard = ({ children }: ServiceStatusGuardProps) => {
  const { status } = useAppSelector((state) => state.serviceStatus);
  useServiceStatus();

  useEffect(() => {
    if (status === 'offline') {
      showToast.error('You are offline. Some actions may not work until your connection is back.', {
        autoClose: false,
      });
      return;
    }

    if (status === 'backend-unreachable') {
      showToast.error('Backend is unreachable. Some actions may not work until the service is back.', {
        autoClose: false,
      });
      return;
    }

    if (status === 'healthy') {
      showToast.dismiss();
    }
  }, [status]);

  return <>{children}</>;
};
