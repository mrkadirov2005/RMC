// Source file for studentsSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { studentAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Student {
  student_id?: number;
  id?: number;
  center_id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  gender: string;
  status: string;
  teacher_id?: number;
  class_id?: number;
  coins?: number;
  username?: string;
  password?: string;
}

interface StudentsState {
  items: Student[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: StudentsState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

// ── Thunks ──────────────────────────────────────────────────────────────────

export const fetchStudents = createAsyncThunk(
  'students/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.students;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await studentAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch students');
    }
  }
);

export const fetchStudentsForce = createAsyncThunk(
  'students/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await studentAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch students');
    }
  }
);

export const createStudent = createAsyncThunk(
  'students/create',
  async (payload: Partial<Student>, { dispatch, rejectWithValue }) => {
    try {
      await studentAPI.create(payload);
      showToast.success('Student created successfully');
      dispatch(fetchStudentsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create student';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateStudent = createAsyncThunk(
  'students/update',
  async ({ id, data }: { id: number; data: Partial<Student> }, { dispatch, rejectWithValue }) => {
    try {
      await studentAPI.update(id, data);
      showToast.success('Student updated successfully');
      dispatch(fetchStudentsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update student';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteStudent = createAsyncThunk(
  'students/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await studentAPI.delete(id);
      showToast.success('Student deleted successfully');
      dispatch(fetchStudentsForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete student';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const studentsSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    clearStudentsError(state) { state.error = null; },
    invalidateStudents(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStudents.fulfilled, (state, action: PayloadAction<Student[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchStudents.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchStudentsForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStudentsForce.fulfilled, (state, action: PayloadAction<Student[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchStudentsForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createStudent.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createStudent.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createStudent.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateStudent.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateStudent.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateStudent.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteStudent.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteStudent.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteStudent.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearStudentsError, invalidateStudents } = studentsSlice.actions;
export default studentsSlice.reducer;

// Selects students.
export const selectStudents = (state: RootState) => state.students.items;
// Selects students loading.
export const selectStudentsLoading = (state: RootState) => state.students.loading;
// Selects students error.
export const selectStudentsError = (state: RootState) => state.students.error;
