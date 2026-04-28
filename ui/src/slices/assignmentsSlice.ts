// Source file for assignmentsSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { assignmentAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  teacher_id?: number;
  assignment_title: string;
  description?: string;
  due_date: string;
  submission_date?: string;
  status: string;
  grade?: number;
}

interface AssignmentsState {
  items: Assignment[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: AssignmentsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

export const fetchAssignments = createAsyncThunk(
  'assignments/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.assignments;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await assignmentAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch assignments');
    }
  }
);

export const fetchAssignmentsForce = createAsyncThunk(
  'assignments/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await assignmentAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch assignments');
    }
  }
);

export const createAssignment = createAsyncThunk(
  'assignments/create',
  async (payload: Partial<Assignment>, { dispatch, rejectWithValue }) => {
    try {
      await assignmentAPI.create(payload);
      showToast.success('Assignment created successfully');
      dispatch(fetchAssignmentsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create assignment';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateAssignment = createAsyncThunk(
  'assignments/update',
  async ({ id, data }: { id: number; data: Partial<Assignment> }, { dispatch, rejectWithValue }) => {
    try {
      await assignmentAPI.update(id, data);
      showToast.success('Assignment updated successfully');
      dispatch(fetchAssignmentsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update assignment';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteAssignment = createAsyncThunk(
  'assignments/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await assignmentAPI.delete(id);
      showToast.success('Assignment deleted successfully');
      dispatch(fetchAssignmentsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete assignment';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const assignmentsSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    clearAssignmentsError(state) { state.error = null; },
    invalidateAssignments(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssignments.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAssignments.fulfilled, (state, action: PayloadAction<Assignment[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchAssignments.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchAssignmentsForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAssignmentsForce.fulfilled, (state, action: PayloadAction<Assignment[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchAssignmentsForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createAssignment.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createAssignment.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createAssignment.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateAssignment.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateAssignment.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateAssignment.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteAssignment.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteAssignment.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteAssignment.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearAssignmentsError, invalidateAssignments } = assignmentsSlice.actions;
export default assignmentsSlice.reducer;

// Selects assignments.
export const selectAssignments = (state: RootState) => state.assignments.items;
// Selects assignments loading.
export const selectAssignmentsLoading = (state: RootState) => state.assignments.loading;
// Selects assignments error.
export const selectAssignmentsError = (state: RootState) => state.assignments.error;
