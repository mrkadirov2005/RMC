// React hooks for the system feature.

import { useCallback, useEffect } from 'react';
import { useAppDispatch } from '../../crm/hooks';
import {
  setBackendUnreachable,
  setChecking,
  setHealthy,
  setOffline,
} from '../../../slices/serviceStatusSlice';
import { buildApiUrl } from '../../../shared/api/api';

const PING_TIMEOUT_MS = 6000;
const PING_INTERVAL_MS = 30000;
const PING_ATTEMPTS = 2;
const PING_RETRY_DELAY_MS = 5000;

// Handles ping backend.
const pingBackend = async () => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

  try {
    const response = await fetch(buildApiUrl('/health'), {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`Health check failed (${response.status})`);
    }
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
    // One slow answer (the server busy with a big response) is not an outage: ask again before warning.
    for (let attempt = 0; attempt < PING_ATTEMPTS; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => window.setTimeout(resolve, PING_RETRY_DELAY_MS));
      try {
        await pingBackend();
        dispatch(setHealthy());
        return;
      } catch {
        if (!navigator.onLine) {
          dispatch(setOffline());
          return;
        }
      }
    }
    dispatch(setBackendUnreachable());
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
