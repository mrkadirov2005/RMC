// Source file for centersSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { centerAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Center {
  center_id?: number;
  id?: number;
  center_name: string;
  center_code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  principal_name: string;
}

interface CentersState {
  items: Center[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: CentersState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

export const fetchCenters = createAsyncThunk(
  'centers/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.centers;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await centerAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch centers');
    }
  }
);

export const fetchCentersForce = createAsyncThunk(
  'centers/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await centerAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch centers');
    }
  }
);

export const createCenter = createAsyncThunk(
  'centers/create',
  async (payload: Partial<Center>, { dispatch, rejectWithValue }) => {
    try {
      await centerAPI.create(payload);
      showToast.success('Center created successfully');
      dispatch(fetchCentersForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create center';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateCenter = createAsyncThunk(
  'centers/update',
  async ({ id, data }: { id: number; data: Partial<Center> }, { dispatch, rejectWithValue }) => {
    try {
      await centerAPI.update(id, data);
      showToast.success('Center updated successfully');
      dispatch(fetchCentersForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update center';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteCenter = createAsyncThunk(
  'centers/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await centerAPI.delete(id);
      showToast.success('Center deleted successfully');
      dispatch(fetchCentersForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete center';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const centersSlice = createSlice({
  name: 'centers',
  initialState,
  reducers: {
    clearCentersError(state) { state.error = null; },
    invalidateCenters(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCenters.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCenters.fulfilled, (state, action: PayloadAction<Center[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchCenters.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchCentersForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchCentersForce.fulfilled, (state, action: PayloadAction<Center[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchCentersForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createCenter.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createCenter.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createCenter.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateCenter.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateCenter.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateCenter.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteCenter.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteCenter.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteCenter.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearCentersError, invalidateCenters } = centersSlice.actions;
export default centersSlice.reducer;

// Selects centers.
export const selectCenters = (state: RootState) => state.centers.items;
// Selects centers loading.
export const selectCentersLoading = (state: RootState) => state.centers.loading;
// Selects centers error.
export const selectCentersError = (state: RootState) => state.centers.error;
