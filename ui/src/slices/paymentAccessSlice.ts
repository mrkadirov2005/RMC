// Source file for paymentAccessSlice.

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { clearStoredPaymentAuth, getStoredPaymentAuth, setStoredPaymentAuth } from '../shared/auth/paymentAuthStorage';

export interface PaymentAccessState {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

const initialState: PaymentAccessState = {
  isAuthenticated: false,
  loading: false,
  error: null,
  isInitialized: false,
};

const paymentAccessSlice = createSlice({
  name: 'paymentAccess',
  initialState,
  reducers: {
    setPaymentLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    paymentLoginSuccess: (state, action: PayloadAction<{ token: string }>) => {
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      state.isInitialized = true;
      setStoredPaymentAuth(action.payload.token);
    },
    paymentLoginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    paymentLogout: (state) => {
      state.isAuthenticated = false;
      state.error = null;
      state.isInitialized = true;
      clearStoredPaymentAuth();
    },
    initializePaymentAccess: (state) => {
      const { token } = getStoredPaymentAuth();
      if (token) {
        state.isAuthenticated = true;
      }
      state.isInitialized = true;
    },
  },
});

export const {
  setPaymentLoading,
  paymentLoginSuccess,
  paymentLoginFailure,
  paymentLogout,
  initializePaymentAccess,
} = paymentAccessSlice.actions;

export default paymentAccessSlice.reducer;
