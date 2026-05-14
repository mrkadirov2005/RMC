// Source file for top-of-screen status messages.

type TopMessageOptions = {
  autoClose?: number | false;
};

export const TOP_ERROR_MESSAGE_EVENT = 'app:top-error-message';

const showTopErrorMessage = (message: string, options?: TopMessageOptions) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(TOP_ERROR_MESSAGE_EVENT, {
      detail: {
        message,
        autoClose: options?.autoClose,
      },
    }),
  );
};

export const showToast = {
  success: (_message: string, _options?: TopMessageOptions) => {
    // Success feedback is intentionally silent.
  },

  error: (message: string, options?: TopMessageOptions) => {
    showTopErrorMessage(message, options);
  },

  warning: (message: string, options?: TopMessageOptions) => {
    showTopErrorMessage(message, options);
  },

  info: (_message: string, _options?: TopMessageOptions) => {
    // Informational feedback is intentionally silent.
  },

  loading: (_message: string, _options?: TopMessageOptions) => {
    return null;
  },

  update: (_toastId: any, options: any) => {
    if (options?.type === 'error' && options?.render) {
      showTopErrorMessage(String(options.render), options);
    }
  },

  dismiss: (_toastId?: any) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOP_ERROR_MESSAGE_EVENT, {
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
