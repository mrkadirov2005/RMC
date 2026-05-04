// Normalizes unknown error-like values into a render-safe string.

export const getErrorMessage = (error: unknown): string => {
  if (!error) return '';

  if (typeof error === 'string') return error;
  if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') return String(error);

  if (error instanceof Error) return error.message || 'Unknown error';

  if (typeof error === 'object') {
    const maybe = error as { message?: unknown; error?: unknown; code?: unknown };

    if (typeof maybe.message === 'string' && maybe.message.trim()) return maybe.message;
    if (typeof maybe.error === 'string' && maybe.error.trim()) return maybe.error;

    try {
      const asJson = JSON.stringify(error);
      if (asJson && asJson !== '{}' && asJson !== '[]') return asJson;
    } catch {
      // ignore
    }

    if (typeof maybe.code === 'string' && maybe.code.trim()) return maybe.code;
  }

  return 'Unknown error';
};

