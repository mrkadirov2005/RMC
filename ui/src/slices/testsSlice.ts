// Source file for testsSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { testAPI } from '../shared/api/api';
import type { RootState } from '../store';

const CACHE_TTL = 60 * 1000; // 60 seconds

interface TestState {
  items: any[];
  assignedItems: any[];
  submissionDetails: any | null;
  loading: boolean;
  assignedLoading: boolean;
  submissionDetailsLoading: boolean;
  error: string | null;
  assignedError: string | null;
  submissionDetailsError: string | null;
  lastFetched: number | null;
}

const initialState: TestState = {
  items: [],
  assignedItems: [],
  submissionDetails: null,
  loading: false,
  assignedLoading: false,
  submissionDetailsLoading: false,
  error: null,
  assignedError: null,
  submissionDetailsError: null,
  lastFetched: null,
};

// Internal actual fetch
export const fetchTestsForce = createAsyncThunk('tests/fetchForce', async () => {
  const response = await testAPI.getAll();
  return Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : [];
});

// Conditionally dispatched fetch using TTL Cache
export const fetchTests = createAsyncThunk(
  'tests/fetch',
  async (_, { dispatch, getState }) => {
    const state = getState() as { tests: TestState };
    const lastFetched = state.tests.lastFetched;
    const now = Date.now();

    if (lastFetched && now - lastFetched < CACHE_TTL) {
      return state.tests.items; // Return cached
    }
    const result = await dispatch(fetchTestsForce()).unwrap();
    return result;
  }
);

// Generic Thunks for Mutations
export const createTest = createAsyncThunk(
  'tests/create',
  async (data: any, { dispatch, rejectWithValue }) => {
    try {
      const response = await testAPI.create(data);
      dispatch(fetchTestsForce());
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to create test');
    }
  }
);

export const updateTest = createAsyncThunk(
  'tests/update',
  async ({ id, data }: { id: number; data: any }, { dispatch, rejectWithValue }) => {
    try {
      const response = await testAPI.update(id, data);
      dispatch(fetchTestsForce());
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to update test');
    }
  }
);

export const deleteTest = createAsyncThunk(
  'tests/delete',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await testAPI.delete(id);
      dispatch(fetchTestsForce());
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to delete test');
    }
  }
);

export const fetchAssignedTests = createAsyncThunk(
  'tests/fetchAssigned',
  async (
    { type, id, studentId }: { type: 'student' | 'teacher' | 'class'; id: number; studentId?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await testAPI.getAssignedTests(type, id, studentId);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch assigned tests');
    }
  }
);

export const fetchSubmissionDetails = createAsyncThunk(
  'tests/fetchSubmissionDetails',
  async (submissionId: number, { rejectWithValue }) => {
    try {
      const response = await testAPI.getSubmissionDetails(submissionId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to load submission details');
    }
  }
);

const testsSlice = createSlice({
  name: 'tests',
  initialState,
  reducers: {
    clearTestsError(state) {
      state.error = null;
    },
    clearAssignedTestsError(state) {
      state.assignedError = null;
    },
    clearSubmissionDetailsError(state) {
      state.submissionDetailsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTestsForce
      .addCase(fetchTestsForce.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTestsForce.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchTestsForce.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tests';
      })
      // fetchTests (uses cached, so only updates on unwrap if called)
      .addCase(fetchTests.pending, () => {
        // If not cached, it will show loading (though fetchTestsForce handles its own)
      })
      .addCase(fetchTests.fulfilled, (state, action) => {
        state.items = action.payload; // will be equivalent to state.items if cached
      })
      .addCase(fetchTests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch tests';
      })
      .addCase(createTest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTest.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createTest.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to create test';
      })
      .addCase(updateTest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTest.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateTest.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to update test';
      })
      .addCase(deleteTest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTest.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteTest.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || action.error.message || 'Failed to delete test';
      })
      .addCase(fetchAssignedTests.pending, (state) => {
        state.assignedLoading = true;
        state.assignedError = null;
      })
      .addCase(fetchAssignedTests.fulfilled, (state, action) => {
        state.assignedLoading = false;
        state.assignedItems = action.payload;
      })
      .addCase(fetchAssignedTests.rejected, (state, action) => {
        state.assignedLoading = false;
        state.assignedError =
          (action.payload as string) || action.error.message || 'Failed to fetch assigned tests';
      })
      .addCase(fetchSubmissionDetails.pending, (state) => {
        state.submissionDetailsLoading = true;
        state.submissionDetailsError = null;
      })
      .addCase(fetchSubmissionDetails.fulfilled, (state, action) => {
        state.submissionDetailsLoading = false;
        state.submissionDetails = action.payload;
      })
      .addCase(fetchSubmissionDetails.rejected, (state, action) => {
        state.submissionDetailsLoading = false;
        state.submissionDetailsError =
          (action.payload as string) || action.error.message || 'Failed to load submission details';
      });
  },
});

export const { clearTestsError, clearAssignedTestsError, clearSubmissionDetailsError } = testsSlice.actions;
export default testsSlice.reducer;

// Selects tests.
export const selectTests = (state: RootState) => state.tests.items;
// Selects tests loading.
export const selectTestsLoading = (state: RootState) => state.tests.loading;
// Selects tests error.
export const selectTestsError = (state: RootState) => state.tests.error;
// Selects assigned tests.
export const selectAssignedTests = (state: RootState) => state.tests.assignedItems;
// Selects assigned tests loading.
export const selectAssignedTestsLoading = (state: RootState) => state.tests.assignedLoading;
// Selects assigned tests error.
export const selectAssignedTestsError = (state: RootState) => state.tests.assignedError;
// Selects submission details.
export const selectSubmissionDetails = (state: RootState) => state.tests.submissionDetails;
// Selects submission details loading.
export const selectSubmissionDetailsLoading = (state: RootState) => state.tests.submissionDetailsLoading;
// Selects submission details error.
export const selectSubmissionDetailsError = (state: RootState) => state.tests.submissionDetailsError;
