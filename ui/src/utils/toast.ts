// Source file for toast.

import { toast } from 'react-toastify';
import type { ToastOptions } from 'react-toastify';

export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      position: 'top-right',
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      position: 'top-right',
      autoClose: 3500,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  info: (message: string, options?: ToastOptions) => {
    toast.info(message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      ...options,
    });
  },

  loading: (message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      position: 'top-right',
      ...options,
    });
  },

  update: (toastId: any, options: any) => {
    toast.update(toastId, options);
  },

  dismiss: (toastId?: any) => {
    toast.dismiss(toastId);
  },
};

// Helper for API error handling
export const handleApiError = (error: any): string => {
  const toMessage = (value: any): string | null => {
    if (value == null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    // Common API error shapes
    if (typeof value === 'object') {
      const message =
        (value as any).message ??
        (value as any).error?.message ??
        (value as any).error_description ??
        null;
      if (typeof message === 'string' && message.trim()) return message;

      // Avoid throwing React error #31 by never returning raw objects
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  const message =
    toMessage(error?.response?.data?.message) ??
    toMessage(error?.response?.data?.error) ??
    toMessage(error?.response?.data) ??
    toMessage(error?.message) ??
    null;

  return message && message.trim() ? message : 'An error occurred. Please try again.';
};
