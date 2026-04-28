// Source file for serviceStatusSlice.

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

type ServiceStatus = 'checking' | 'healthy' | 'offline' | 'backend-unreachable';

interface ServiceStatusState {
  status: ServiceStatus;
  lastCheckedAt: number | null;
}

const initialState: ServiceStatusState = {
  status: 'checking',
  lastCheckedAt: null,
};

const serviceStatusSlice = createSlice({
  name: 'serviceStatus',
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<ServiceStatus>) => {
      state.status = action.payload;
      state.lastCheckedAt = Date.now();
    },
    setChecking: (state) => {
      state.status = 'checking';
      state.lastCheckedAt = Date.now();
    },
    setHealthy: (state) => {
      state.status = 'healthy';
      state.lastCheckedAt = Date.now();
    },
    setOffline: (state) => {
      state.status = 'offline';
      state.lastCheckedAt = Date.now();
    },
    setBackendUnreachable: (state) => {
      state.status = 'backend-unreachable';
      state.lastCheckedAt = Date.now();
    },
  },
});

export const {
  setStatus,
  setChecking,
  setHealthy,
  setOffline,
  setBackendUnreachable,
} = serviceStatusSlice.actions;

export default serviceStatusSlice.reducer;
