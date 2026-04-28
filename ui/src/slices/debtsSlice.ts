// Source file for debtsSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { debtAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Debt {
  debt_id?: number;
  id?: number;
  student_id: number;
  center_id: number;
  debt_amount: number;
  debt_date: string;
  due_date: string;
  amount_paid: number;
  remarks?: string;
}

interface DebtsState {
  items: Debt[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: DebtsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

export const fetchDebts = createAsyncThunk(
  'debts/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.debts;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await debtAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch debts');
    }
  }
);

export const fetchDebtsForce = createAsyncThunk(
  'debts/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await debtAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch debts');
    }
  }
);

export const createDebt = createAsyncThunk(
  'debts/create',
  async (payload: Partial<Debt>, { dispatch, rejectWithValue }) => {
    try {
      await debtAPI.create(payload);
      showToast.success('Debt recorded successfully');
      dispatch(fetchDebtsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to record debt';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateDebt = createAsyncThunk(
  'debts/update',
  async ({ id, data }: { id: number; data: Partial<Debt> }, { dispatch, rejectWithValue }) => {
    try {
      await debtAPI.update(id, data);
      showToast.success('Debt updated successfully');
      dispatch(fetchDebtsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update debt';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteDebt = createAsyncThunk(
  'debts/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await debtAPI.delete(id);
      showToast.success('Debt deleted successfully');
      dispatch(fetchDebtsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete debt';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const debtsSlice = createSlice({
  name: 'debts',
  initialState,
  reducers: {
    clearDebtsError(state) { state.error = null; },
    invalidateDebts(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDebts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDebts.fulfilled, (state, action: PayloadAction<Debt[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchDebts.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchDebtsForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDebtsForce.fulfilled, (state, action: PayloadAction<Debt[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchDebtsForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createDebt.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createDebt.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createDebt.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateDebt.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateDebt.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateDebt.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteDebt.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteDebt.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteDebt.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearDebtsError, invalidateDebts } = debtsSlice.actions;
export default debtsSlice.reducer;

// Selects debts.
export const selectDebts = (state: RootState) => state.debts.items;
// Selects debts loading.
export const selectDebtsLoading = (state: RootState) => state.debts.loading;
// Selects debts error.
export const selectDebtsError = (state: RootState) => state.debts.error;
