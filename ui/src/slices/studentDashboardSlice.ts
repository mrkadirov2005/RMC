// Source file for studentDashboardSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { portalAPI } from '../shared/api/api';

const CACHE_TTL = 60 * 1000; // 60 seconds

interface DashboardData {
  student: any;
  tests: any[];
  attendance: any[];
  grades: any[];
  payments: any[];
  debts: any[];
  assignments: any[];
  classInfo: any;
  subjects: any[];
  teacher: any;
  schedule: any[];
}

interface StudentDashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: StudentDashboardState = {
  data: null,
  loading: false,
  error: null,
  lastFetched: null,
};

// Internal actual fetch
export const fetchStudentDashboardForce = createAsyncThunk('studentDashboard/fetchForce', async () => {
  const response = await portalAPI.getDashboard();
  return response.data;
});

// Conditionally dispatched fetch using TTL Cache
export const fetchStudentDashboard = createAsyncThunk(
  'studentDashboard/fetch',
  async (_, { dispatch, getState }) => {
    const state = getState() as { studentDashboard: StudentDashboardState };
    const lastFetched = state.studentDashboard.lastFetched;
    const now = Date.now();

    if (lastFetched && now - lastFetched < CACHE_TTL && state.studentDashboard.data) {
      return state.studentDashboard.data; // Return cached
    }
    const result = await dispatch(fetchStudentDashboardForce()).unwrap();
    return result;
  }
);

const studentDashboardSlice = createSlice({
  name: 'studentDashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // fetchStudentDashboardForce
      .addCase(fetchStudentDashboardForce.pending, (state) => {
        if (!state.data) state.loading = true; // only flash loader if no data
        state.error = null;
      })
      .addCase(fetchStudentDashboardForce.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchStudentDashboardForce.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch student dashboard';
      })
      // fetchStudentDashboard 
      .addCase(fetchStudentDashboard.fulfilled, (state, action) => {
        state.data = action.payload; 
      });
  },
});

export default studentDashboardSlice.reducer;
