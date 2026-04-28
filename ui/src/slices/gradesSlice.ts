// Source file for gradesSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { gradeAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Grade {
  grade_id?: number;
  id?: number;
  student_id: number;
  teacher_id: number;
  subject: number | string;
  class_id?: number;
  marks_obtained?: number;
  total_marks?: number;
  percentage: number;
  grade_letter: string;
  academic_year?: number;
  term: string;
  session_id?: number;
  score?: number;
}

interface GradesState {
  items: Grade[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: GradesState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

export const fetchGrades = createAsyncThunk(
  'grades/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.grades;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await gradeAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch grades');
    }
  }
);

export const fetchGradesForce = createAsyncThunk(
  'grades/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await gradeAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch grades');
    }
  }
);

export const createGrade = createAsyncThunk(
  'grades/create',
  async (payload: Partial<Grade>, { dispatch, rejectWithValue }) => {
    try {
      await gradeAPI.create(payload);
      showToast.success('Grade saved successfully');
      dispatch(fetchGradesForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to save grade';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateGrade = createAsyncThunk(
  'grades/update',
  async ({ id, data }: { id: number; data: Partial<Grade> }, { dispatch, rejectWithValue }) => {
    try {
      await gradeAPI.update(id, data);
      showToast.success('Grade updated successfully');
      dispatch(fetchGradesForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update grade';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteGrade = createAsyncThunk(
  'grades/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await gradeAPI.delete(id);
      showToast.success('Grade deleted successfully');
      dispatch(fetchGradesForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete grade';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const gradesSlice = createSlice({
  name: 'grades',
  initialState,
  reducers: {
    clearGradesError(state) { state.error = null; },
    invalidateGrades(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGrades.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchGrades.fulfilled, (state, action: PayloadAction<Grade[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchGrades.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchGradesForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchGradesForce.fulfilled, (state, action: PayloadAction<Grade[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchGradesForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createGrade.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createGrade.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createGrade.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateGrade.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateGrade.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateGrade.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteGrade.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteGrade.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteGrade.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearGradesError, invalidateGrades } = gradesSlice.actions;
export default gradesSlice.reducer;

// Selects grades.
export const selectGrades = (state: RootState) => state.grades.items;
// Selects grades loading.
export const selectGradesLoading = (state: RootState) => state.grades.loading;
// Selects grades error.
export const selectGradesError = (state: RootState) => state.grades.error;
