// Source file for classesSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { classAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Class {
  class_id?: number;
  id?: number;
  center_id: number;
  class_name: string;
  class_code: string;
  level: number;
  section?: string;
  capacity: number;
  teacher_id?: number;
  room_number: string;
  payment_amount: number;
  payment_frequency: string;
}

interface ClassesState {
  items: Class[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: ClassesState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

export const fetchClasses = createAsyncThunk(
  'classes/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.classes;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await classAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch classes');
    }
  }
);

export const fetchClassesForce = createAsyncThunk(
  'classes/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await classAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch classes');
    }
  }
);

export const createClass = createAsyncThunk(
  'classes/create',
  async (payload: Partial<Class>, { dispatch, rejectWithValue }) => {
    try {
      await classAPI.create(payload);
      showToast.success('Class created successfully');
      dispatch(fetchClassesForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create class';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateClass = createAsyncThunk(
  'classes/update',
  async ({ id, data }: { id: number; data: Partial<Class> }, { dispatch, rejectWithValue }) => {
    try {
      await classAPI.update(id, data);
      showToast.success('Class updated successfully');
      dispatch(fetchClassesForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update class';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteClass = createAsyncThunk(
  'classes/delete',
  async ({ id, force }: { id: number; force?: boolean }, { dispatch, rejectWithValue }) => {
    try {
      await classAPI.delete(id, { force });
      showToast.success('Class deleted successfully');
      dispatch(fetchClassesForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete class';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const classesSlice = createSlice({
  name: 'classes',
  initialState,
  reducers: {
    clearClassesError(state) { state.error = null; },
    invalidateClasses(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClasses.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchClasses.fulfilled, (state, action: PayloadAction<Class[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchClasses.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchClassesForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchClassesForce.fulfilled, (state, action: PayloadAction<Class[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchClassesForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createClass.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createClass.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createClass.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateClass.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateClass.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateClass.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteClass.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteClass.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteClass.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearClassesError, invalidateClasses } = classesSlice.actions;
export default classesSlice.reducer;

// Selects classes.
export const selectClasses = (state: RootState) => state.classes.items;
// Selects classes loading.
export const selectClassesLoading = (state: RootState) => state.classes.loading;
// Selects classes error.
export const selectClassesError = (state: RootState) => state.classes.error;
