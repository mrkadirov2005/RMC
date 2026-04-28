// Source file for authSlice.

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, AuthUser } from '../types';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../shared/auth/authStorage';
import { clearStoredPaymentAuth } from '../shared/auth/paymentAuthStorage';

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    loginSuccess: (state, action: PayloadAction<{ user: AuthUser; token: string }>) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      state.isInitialized = true;
      setStoredAuth(action.payload.token, action.payload.user);
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isInitialized = true;
      clearStoredAuth();
      clearStoredPaymentAuth();
    },
    setUser: (state, action: PayloadAction<AuthUser | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isInitialized = true;
    },
    initializeAuth: (state) => {
      const { token, user } = getStoredAuth();
      if (token && user) {
        state.user = user;
        state.isAuthenticated = true;
      }
      state.isInitialized = true;
    },
  },
});

export const { setLoading, loginSuccess, loginFailure, logout, setUser, initializeAuth } =
  authSlice.actions;
export default authSlice.reducer;
