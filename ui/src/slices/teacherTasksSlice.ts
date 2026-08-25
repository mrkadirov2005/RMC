// Source file for teacherTasksSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { teacherTaskAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface TeacherTask {
  task_id?: number;
  id?: number;
  center_id?: number;
  teacher_id?: number | null;
  admin_id?: number | null;
  assignee_type: 'teacher' | 'admin';
  created_by?: number;
  task_title: string;
  task_definition?: string;
  deadline?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'done';
  status_note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TeacherTaskStats {
  pending: number;
  accepted: number;
  rejected: number;
  done: number;
  total: number;
  efficiency: number;
}

interface TeacherTasksState {
  items: TeacherTask[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  stats: TeacherTaskStats | null;
  statsLoading: boolean;
}

const initialState: TeacherTasksState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
  stats: null,
  statsLoading: false,
};

const CACHE_TTL_MS = 60_000;

export const fetchTeacherTasks = createAsyncThunk(
  'teacherTasks/fetchAll',
  async (params: { teacher_id?: number; admin_id?: number } | undefined, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.teacherTasks;
    if (!params?.teacher_id && !params?.admin_id && lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await teacherTaskAPI.getAll(params);
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? 'Failed to fetch tasks');
    }
  }
);

export const fetchTeacherTasksForce = createAsyncThunk(
  'teacherTasks/fetchAllForce',
  async (params: { teacher_id?: number; admin_id?: number } | undefined, { rejectWithValue }) => {
    try {
      const res = await teacherTaskAPI.getAll(params);
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? 'Failed to fetch tasks');
    }
  }
);

export const fetchTeacherTaskStats = createAsyncThunk(
  'teacherTasks/fetchStats',
  async (params: { teacher_id?: number; admin_id?: number } | undefined, { rejectWithValue }) => {
    try {
      const res = await teacherTaskAPI.getStats(params);
      const data = (res as any).data ?? res;
      return data as TeacherTaskStats;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? 'Failed to fetch task stats');
    }
  }
);

export const createTeacherTask = createAsyncThunk(
  'teacherTasks/create',
  async (payload: Partial<TeacherTask>, { dispatch, rejectWithValue }) => {
    try {
      await teacherTaskAPI.create(payload);
      showToast.success('Task assigned to teacher');
      dispatch(fetchTeacherTasksForce());
      dispatch(fetchTeacherTaskStats());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to create task';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateTeacherTask = createAsyncThunk(
  'teacherTasks/update',
  async ({ id, data }: { id: number; data: Partial<TeacherTask> }, { dispatch, rejectWithValue }) => {
    try {
      await teacherTaskAPI.update(id, data);
      showToast.success('Task updated');
      dispatch(fetchTeacherTasksForce());
      dispatch(fetchTeacherTaskStats());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to update task';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteTeacherTask = createAsyncThunk(
  'teacherTasks/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await teacherTaskAPI.delete(id);
      showToast.success('Task deleted');
      dispatch(fetchTeacherTasksForce());
      dispatch(fetchTeacherTaskStats());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to delete task';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateTeacherTaskStatus = createAsyncThunk(
  'teacherTasks/updateStatus',
  async (
    { id, action, reason, note }: { id: number; action: 'accept' | 'reject' | 'done'; reason?: string; note?: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await teacherTaskAPI.updateStatus(id, { action, reason, note });
      showToast.success('Task status updated');
      dispatch(fetchTeacherTasksForce());
      dispatch(fetchTeacherTaskStats());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to update task status';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const teacherTasksSlice = createSlice({
  name: 'teacherTasks',
  initialState,
  reducers: {
    clearTeacherTasksError(state) { state.error = null; },
    invalidateTeacherTasks(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeacherTasks.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTeacherTasks.fulfilled, (state, action: PayloadAction<TeacherTask[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchTeacherTasks.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchTeacherTasksForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTeacherTasksForce.fulfilled, (state, action: PayloadAction<TeacherTask[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchTeacherTasksForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchTeacherTaskStats.pending, (state) => { state.statsLoading = true; })
      .addCase(fetchTeacherTaskStats.fulfilled, (state, action: PayloadAction<TeacherTaskStats>) => {
        state.statsLoading = false; state.stats = action.payload;
      })
      .addCase(fetchTeacherTaskStats.rejected, (state) => { state.statsLoading = false; });

    builder
      .addCase(createTeacherTask.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createTeacherTask.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createTeacherTask.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateTeacherTask.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateTeacherTask.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateTeacherTask.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteTeacherTask.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteTeacherTask.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteTeacherTask.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateTeacherTaskStatus.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateTeacherTaskStatus.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateTeacherTaskStatus.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearTeacherTasksError, invalidateTeacherTasks } = teacherTasksSlice.actions;
export default teacherTasksSlice.reducer;

export const selectTeacherTasks = (state: RootState) => state.teacherTasks.items;
export const selectTeacherTasksLoading = (state: RootState) => state.teacherTasks.loading;
export const selectTeacherTasksError = (state: RootState) => state.teacherTasks.error;
export const selectTeacherTaskStats = (state: RootState) => state.teacherTasks.stats;
export const selectTeacherTaskStatsLoading = (state: RootState) => state.teacherTasks.statsLoading;
