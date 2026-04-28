// Shared authentication helpers and storage utilities.

const PAYMENT_TOKEN_KEY = 'payment_token';

type StoredPaymentAuth = {
  token: string | null;
};

// Returns stored payment auth.
export const getStoredPaymentAuth = (): StoredPaymentAuth => {
  try {
    const token = localStorage.getItem(PAYMENT_TOKEN_KEY);
    return { token: token || null };
  } catch {
    return { token: null };
  }
};

// Sets stored payment auth.
export const setStoredPaymentAuth = (token: string) => {
  localStorage.setItem(PAYMENT_TOKEN_KEY, token);
};

// Handles clear stored payment auth.
export const clearStoredPaymentAuth = () => {
  localStorage.removeItem(PAYMENT_TOKEN_KEY);
};
