// Source file for teachersSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { teacherAPI } from '../shared/api/api';
import { handleApiError, showToast } from '../utils/toast';
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
  salary_percentage?: number;
  status: string;
  roles?: string[];
  username?: string;
  password?: string;
  student_count?: number;
  class_count?: number;
}

export interface TeacherListParams extends Record<string, unknown> {
  q?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface TeachersMeta {
  total: number;
  page: number;
  limit: number;
}

interface TeachersState {
  items: Teacher[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  // True only when `items`/`meta` came from an unparameterized fetch (the full roster) - see
  // the matching flag in studentsSlice.ts for why a size-based "looks complete" heuristic isn't
  // safe here: a scoped, paginated/searched fetch (e.g. the Teachers page's own search+page
  // params) can look "complete" by that heuristic too, and would otherwise get reused as if it
  // were the full list by a page that actually wants everyone.
  lastFetchWasFull: boolean;
  meta: TeachersMeta;
  activeListRequestId: string | null;
}

const initialState: TeachersState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
  lastFetchWasFull: false,
  meta: { total: 0, page: 1, limit: 20 },
  activeListRequestId: null,
};

const CACHE_TTL_MS = 60_000;

// ── Thunks ──────────────────────────────────────────────────────────────────

export const fetchTeachers = createAsyncThunk(
  'teachers/fetchAll',
  async (params: TeacherListParams | undefined = undefined, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched, lastFetchWasFull } = state.teachers;
    if (!params && lastFetched && lastFetchWasFull && Date.now() - lastFetched < CACHE_TTL_MS) {
      return null; // use cached data
    }
    try {
      const res = await teacherAPI.getAll(params);
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data)
        ? { items: data, meta: { total: data.length, page: 1, limit: data.length || 20 } }
        : {
            items: Array.isArray(data?.data) ? data.data : [],
            meta: {
              total: Number(data?.total || 0),
              page: Number(data?.page || params?.page || 1),
              limit: Number(data?.limit || params?.limit || 20),
            },
          };
    } catch (err: any) {
      return rejectWithValue(handleApiError(err) || 'Failed to fetch teachers');
    }
  }
);

export const fetchTeachersForce = createAsyncThunk(
  'teachers/fetchAllForce',
  async (params: TeacherListParams | undefined = undefined, { rejectWithValue }) => {
    try {
      const res = await teacherAPI.getAll(params);
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data)
        ? { items: data, meta: { total: data.length, page: 1, limit: data.length || 20 } }
        : {
            items: Array.isArray(data?.data) ? data.data : [],
            meta: {
              total: Number(data?.total || 0),
              page: Number(data?.page || params?.page || 1),
              limit: Number(data?.limit || params?.limit || 20),
            },
          };
    } catch (err: any) {
      return rejectWithValue(handleApiError(err) || 'Failed to fetch teachers');
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
      const msg = handleApiError(err) || 'Failed to create teacher';
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
      const msg = handleApiError(err) || 'Failed to update teacher';
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
      const status = err?.response?.status;
      const data = err?.response?.data;
      if (status === 409 && data?.dependencies && data?.reason !== 'history') {
        const ok = window.confirm(`${data.message || 'Teacher is assigned to active records.'}\n\nUnassign related records and delete this teacher?`);
        if (ok) {
          try {
            await teacherAPI.delete(id, { force: true });
            showToast.success('Teacher deleted successfully');
            dispatch(fetchTeachersForce());
            return true;
          } catch (forceErr: any) {
            const forceMsg = handleApiError(forceErr) || 'Failed to delete teacher';
            showToast.error(forceMsg);
            return rejectWithValue(forceMsg);
          }
        }
      }
      const msg = handleApiError(err) || 'Failed to delete teacher';
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
    patchTeacher(state, action: PayloadAction<{ id: number; changes: Partial<Teacher> }>) {
      const teacher = state.items.find((item) => Number(item.teacher_id || item.id) === action.payload.id);
      if (teacher) Object.assign(teacher, action.payload.changes);
    },
  },
  extraReducers: (builder) => {
    // fetchTeachers
    builder
      .addCase(fetchTeachers.pending, (state, action) => { state.loading = true; state.error = null; state.activeListRequestId = action.meta.requestId; })
      .addCase(fetchTeachers.fulfilled, (state, action) => {
        if (state.activeListRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.activeListRequestId = null;
        if (action.payload !== null) {
          state.items = action.payload.items;
          state.meta = action.payload.meta;
          state.lastFetched = Date.now();
          state.lastFetchWasFull = !action.meta.arg;
        }
      })
      .addCase(fetchTeachers.rejected, (state, action) => {
        if (state.activeListRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.activeListRequestId = null;
        state.error = action.payload as string;
      });

    // fetchTeachersForce
    builder
      .addCase(fetchTeachersForce.pending, (state, action) => { state.loading = true; state.error = null; state.activeListRequestId = action.meta.requestId; })
      .addCase(fetchTeachersForce.fulfilled, (state, action) => {
        if (state.activeListRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.activeListRequestId = null;
        state.items = action.payload.items;
        state.meta = action.payload.meta;
        state.lastFetched = Date.now();
        state.lastFetchWasFull = !action.meta.arg;
      })
      .addCase(fetchTeachersForce.rejected, (state, action) => {
        if (state.activeListRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.activeListRequestId = null;
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

export const { clearTeachersError, invalidateTeachers, patchTeacher } = teachersSlice.actions;
export default teachersSlice.reducer;

// ── Selectors ────────────────────────────────────────────────────────────────
export const selectTeachers = (state: RootState) => state.teachers.items;
// Selects teachers loading.
export const selectTeachersLoading = (state: RootState) => state.teachers.loading;
// Selects teachers error.
export const selectTeachersError = (state: RootState) => state.teachers.error;
export const selectTeachersMeta = (state: RootState) => state.teachers.meta;
