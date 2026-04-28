// Source file for attendanceSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { attendanceAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';

export interface Attendance {
  attendance_id?: number;
  id?: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  session_id?: number;
  attendance_date: string;
  status: string;
  remarks?: string;
}

interface AttendanceState {
  items: Attendance[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: AttendanceState = {
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
};

const CACHE_TTL_MS = 60_000;

export const fetchAttendance = createAsyncThunk(
  'attendance/fetchAll',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { lastFetched } = state.attendance;
    if (lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) return null;
    try {
      const res = await attendanceAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch attendance');
    }
  }
);

export const fetchAttendanceForce = createAsyncThunk(
  'attendance/fetchAllForce',
  async (_, { rejectWithValue }) => {
    try {
      const res = await attendanceAPI.getAll();
// Handles data.
      const data = (res as any).data ?? res;
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message ?? 'Failed to fetch attendance');
    }
  }
);

export const createAttendance = createAsyncThunk(
  'attendance/create',
  async (payload: Partial<Attendance>, { dispatch, rejectWithValue }) => {
    try {
      await attendanceAPI.create(payload);
      showToast.success('Attendance recorded successfully');
      dispatch(fetchAttendanceForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to record attendance';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateAttendance = createAsyncThunk(
  'attendance/update',
  async ({ id, data }: { id: number; data: Partial<Attendance> }, { dispatch, rejectWithValue }) => {
    try {
      await attendanceAPI.update(id, data);
      showToast.success('Attendance updated successfully');
      dispatch(fetchAttendanceForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update attendance';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteAttendance = createAsyncThunk(
  'attendance/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await attendanceAPI.delete(id);
      showToast.success('Attendance record deleted');
      dispatch(fetchAttendanceForce());
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to delete attendance';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    clearAttendanceError(state) { state.error = null; },
    invalidateAttendance(state) { state.lastFetched = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAttendance.fulfilled, (state, action: PayloadAction<Attendance[] | null>) => {
        state.loading = false;
        if (action.payload !== null) { state.items = action.payload; state.lastFetched = Date.now(); }
      })
      .addCase(fetchAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(fetchAttendanceForce.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAttendanceForce.fulfilled, (state, action: PayloadAction<Attendance[]>) => {
        state.loading = false; state.items = action.payload; state.lastFetched = Date.now();
      })
      .addCase(fetchAttendanceForce.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; });

    builder
      .addCase(createAttendance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(createAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(createAttendance.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(updateAttendance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(updateAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(updateAttendance.fulfilled, (state) => { state.loading = false; });

    builder
      .addCase(deleteAttendance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(deleteAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(deleteAttendance.fulfilled, (state) => { state.loading = false; });
  },
});

export const { clearAttendanceError, invalidateAttendance } = attendanceSlice.actions;
export default attendanceSlice.reducer;

// Selects attendance.
export const selectAttendance = (state: RootState) => state.attendance.items;
// Selects attendance loading.
export const selectAttendanceLoading = (state: RootState) => state.attendance.loading;
// Selects attendance error.
export const selectAttendanceError = (state: RootState) => state.attendance.error;
