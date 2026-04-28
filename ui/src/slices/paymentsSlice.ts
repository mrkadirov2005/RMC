// Source file for paymentsSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { paymentAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Payment {
  payment_id?: number;
  id?: number;
  student_id: number;
  center_id: number;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_reference?: string;
  receipt_number?: string;
  payment_status: string;
  payment_type: string;
  notes?: string;
}

interface PaymentsState {
  items: Payment[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: PaymentsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

export const fetchPayments = createAsyncThunk(
  'payments/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.payments;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await paymentAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch payments');
    }
  }
);

export const fetchPaymentsForce = createAsyncThunk(
  'payments/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await paymentAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch payments');
    }
  }
);

export const createPayment = createAsyncThunk(
  'payments/create',
  async (payload: Partial<Payment>, { dispatch, rejectWithValue }) => {
    try {
      await paymentAPI.create(payload);
      showToast.success('Payment created successfully');
      dispatch(fetchPaymentsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create payment';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updatePayment = createAsyncThunk(
  'payments/update',
  async ({ id, data }: { id: number; data: Partial<Payment> }, { dispatch, rejectWithValue }) => {
    try {
      await paymentAPI.update(id, data);
      showToast.success('Payment updated successfully');
      dispatch(fetchPaymentsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update payment';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deletePayment = createAsyncThunk(
  'payments/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await paymentAPI.delete(id);
      showToast.success('Payment deleted successfully');
      dispatch(fetchPaymentsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete payment';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearPaymentsError(state) { state.error = null; },
    invalidatePayments(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPayments.fulfilled, (state, action: PayloadAction<Payment[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchPayments.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchPaymentsForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPaymentsForce.fulfilled, (state, action: PayloadAction<Payment[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchPaymentsForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createPayment.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createPayment.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createPayment.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updatePayment.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updatePayment.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updatePayment.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deletePayment.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deletePayment.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deletePayment.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearPaymentsError, invalidatePayments } = paymentsSlice.actions;
export default paymentsSlice.reducer;

// Selects payments.
export const selectPayments = (state: RootState) => state.payments.items;
// Selects payments loading.
export const selectPaymentsLoading = (state: RootState) => state.payments.loading;
// Selects payments error.
export const selectPaymentsError = (state: RootState) => state.payments.error;
