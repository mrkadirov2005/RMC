// Source file for teachersSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { teacherAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Teacher {
  teacher_id?: number;
  id?: number;
  center_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  qualification: string;
  specialization: string;
  status: string;
  roles?: string[];
  username?: string;
  password?: string;
}

interface TeachersState {
  items: Teacher[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: TeachersState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

// ── Thunks ──────────────────────────────────────────────────────────────────

export const fetchTeachers = createAsyncThunk(
  'teachers/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.teachers;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) {
      return null; // use cached data
    }
    try {
      const res = await teacherAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch teachers');
    }
  }
);

export const fetchTeachersForce = createAsyncThunk(
  'teachers/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await teacherAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch teachers');
    }
  }
);

export const createTeacher = createAsyncThunk(
  'teachers/create',
  async (payload: Partial<Teacher>, { dispatch, rejectWithValue }) => {
    try {
      await teacherAPI.create(payload);
      showToast.success('Teacher created successfully');
      dispatch(fetchTeachersForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create teacher';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateTeacher = createAsyncThunk(
  'teachers/update',
  async ({ id, data }: { id: number; data: Partial<Teacher> }, { dispatch, rejectWithValue }) => {
    try {
      await teacherAPI.update(id, data);
      showToast.success('Teacher updated successfully');
      dispatch(fetchTeachersForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update teacher';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteTeacher = createAsyncThunk(
  'teachers/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await teacherAPI.delete(id);
      showToast.success('Teacher deleted successfully');
      dispatch(fetchTeachersForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete teacher';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const teachersSlice = createSlice({
  name: 'teachers',
  initialState,
  reducers: {
    clearTeachersError(state) {
      state.error = null;
    },
    invalidateTeachers(state) {
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    // fetchTeachers
    builder
      .addCase(fetchTeachers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTeachers.fulfilled, (state, action: PayloadAction<Teacher[] | null>) => {
        state.loading = false;
        if (action.payload !== null) {
          state.items = action.payload;
          state.lastFetched = Date.now();
        }
      })
      .addCase(fetchTeachers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchTeachersForce
    builder
      .addCase(fetchTeachersForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTeachersForce.fulfilled, (state, action: PayloadAction<Teacher[]>) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchTeachersForce.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // mutations — show loading while chained refetch runs
    builder
      .addCase(createTeacher.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createTeacher.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createTeacher.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateTeacher.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateTeacher.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateTeacher.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteTeacher.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteTeacher.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteTeacher.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearTeachersError, invalidateTeachers } = teachersSlice.actions;
export default teachersSlice.reducer;

// ── Selectors ────────────────────────────────────────────────────────────────
export const selectTeachers = (state: RootState) => state.teachers.items;
// Selects teachers loading.
export const selectTeachersLoading = (state: RootState) => state.teachers.loading;
// Selects teachers error.
export const selectTeachersError = (state: RootState) => state.teachers.error;
