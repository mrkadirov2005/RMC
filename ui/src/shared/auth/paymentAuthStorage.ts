const PAYMENT_TOKEN_KEY = 'payment_token';

type StoredPaymentAuth = {
  token: string | null;
};

export const getStoredPaymentAuth = (): StoredPaymentAuth => {
  try {
    const token = localStorage.getItem(PAYMENT_TOKEN_KEY);
    return { token: token || null };
  } catch {
    return { token: null };
  }
};

export const setStoredPaymentAuth = (token: string) => {
  localStorage.setItem(PAYMENT_TOKEN_KEY, token);
};

export const clearStoredPaymentAuth = () => {
  localStorage.removeItem(PAYMENT_TOKEN_KEY);
};
