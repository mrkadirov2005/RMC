// Source file for top-of-screen status messages.

type TopMessageOptions = {
  autoClose?: number | false;
};

export type TopMessageVariant = 'success' | 'error' | 'warning' | 'info';

export const TOP_STATUS_MESSAGE_EVENT = 'app:top-status-message';

const defaultAutoClose: Record<TopMessageVariant, number> = {
  success: 3000,
  error: 4000,
  warning: 3500,
  info: 3000,
};

const showTopStatusMessage = (
  message: string,
  variant: TopMessageVariant,
  options?: TopMessageOptions,
) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(TOP_STATUS_MESSAGE_EVENT, {
      detail: {
        message,
        variant,
        autoClose: options?.autoClose ?? defaultAutoClose[variant],
      },
    }),
  );
};

export const showToast = {
  success: (message: string, options?: TopMessageOptions) => {
    showTopStatusMessage(message, 'success', options);
  },

  error: (message: string, options?: TopMessageOptions) => {
    showTopStatusMessage(message, 'error', options);
  },

  warning: (message: string, options?: TopMessageOptions) => {
    showTopStatusMessage(message, 'warning', options);
  },

  info: (message: string, options?: TopMessageOptions) => {
    showTopStatusMessage(message, 'info', options);
  },

  loading: (_message: string, _options?: TopMessageOptions) => {
    return null;
  },

  update: (_toastId: any, options: any) => {
    if (options?.render) {
      const variant: TopMessageVariant =
        options?.type === 'success' ||
        options?.type === 'error' ||
        options?.type === 'warning' ||
        options?.type === 'info'
          ? options.type
          : 'info';

      showTopStatusMessage(String(options.render), variant, options);
    }
  },

  dismiss: (_toastId?: any) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOP_STATUS_MESSAGE_EVENT, {
          detail: { message: '' },
        }),
      );
    }
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
