// Source file for subjectsSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { subjectAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Subject {
  subject_id?: number;
  id?: number;
  class_id: number;
  subject_name: string;
  subject_code: string;
  teacher_id?: number;
  total_marks: number;
  passing_marks: number;
}

interface SubjectsState {
  items: Subject[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: SubjectsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

export const fetchSubjects = createAsyncThunk(
  'subjects/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.subjects;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await subjectAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch subjects');
    }
  }
);

export const fetchSubjectsForce = createAsyncThunk(
  'subjects/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await subjectAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch subjects');
    }
  }
);

export const createSubject = createAsyncThunk(
  'subjects/create',
  async (payload: Partial<Subject>, { dispatch, rejectWithValue }) => {
    try {
      await subjectAPI.create(payload);
      showToast.success('Subject created successfully');
      dispatch(fetchSubjectsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create subject';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateSubject = createAsyncThunk(
  'subjects/update',
  async ({ id, data }: { id: number; data: Partial<Subject> }, { dispatch, rejectWithValue }) => {
    try {
      await subjectAPI.update(id, data);
      showToast.success('Subject updated successfully');
      dispatch(fetchSubjectsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update subject';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteSubject = createAsyncThunk(
  'subjects/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await subjectAPI.delete(id);
      showToast.success('Subject deleted successfully');
      dispatch(fetchSubjectsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete subject';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const subjectsSlice = createSlice({
  name: 'subjects',
  initialState,
  reducers: {
    clearSubjectsError(state) { state.error = null; },
    invalidateSubjects(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubjects.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSubjects.fulfilled, (state, action: PayloadAction<Subject[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchSubjects.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchSubjectsForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchSubjectsForce.fulfilled, (state, action: PayloadAction<Subject[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchSubjectsForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createSubject.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createSubject.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createSubject.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateSubject.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateSubject.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateSubject.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteSubject.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteSubject.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteSubject.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearSubjectsError, invalidateSubjects } = subjectsSlice.actions;
export default subjectsSlice.reducer;

// Selects subjects.
export const selectSubjects = (state: RootState) => state.subjects.items;
// Selects subjects loading.
export const selectSubjectsLoading = (state: RootState) => state.subjects.loading;
// Selects subjects error.
export const selectSubjectsError = (state: RootState) => state.subjects.error;
