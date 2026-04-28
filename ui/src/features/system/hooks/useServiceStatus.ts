// React hooks for the system feature.

import { useCallback, useEffect } from 'react';
import { useAppDispatch } from '../../crm/hooks';
import {
  setBackendUnreachable,
  setChecking,
  setHealthy,
  setOffline,
} from '../../../slices/serviceStatusSlice';
import { API_BASE_URL } from '../../../shared/api/api';

const PING_TIMEOUT_MS = 6000;
const PING_INTERVAL_MS = 30000;

// Handles ping backend.
const pingBackend = async () => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Provides service status.
export const useServiceStatus = () => {
  const dispatch = useAppDispatch();

// Memoizes the check now callback.
  const checkNow = useCallback(async () => {
    if (!navigator.onLine) {
      dispatch(setOffline());
      return;
    }

    dispatch(setChecking());
    try {
      await pingBackend();
      dispatch(setHealthy());
    } catch {
      if (!navigator.onLine) {
        dispatch(setOffline());
        return;
      }
      dispatch(setBackendUnreachable());
    }
  }, [dispatch]);

// Runs side effects for this component.
  useEffect(() => {
    checkNow();

// Handles online.
    const handleOnline = () => {
      checkNow();
    };

// Handles offline.
    const handleOffline = () => {
      dispatch(setOffline());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        checkNow();
      }
    }, PING_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(intervalId);
    };
  }, [checkNow, dispatch]);

  return { checkNow };
};
