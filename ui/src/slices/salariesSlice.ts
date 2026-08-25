// Source file for salariesSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { salaryAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';
import type {
  MarkSalaryPaidPayload,
  SalaryOverviewRow,
  SalaryTeacherDetail,
  UpdateSalaryPayload,
} from '../features/crm/salary/types';

interface SalariesState {
  overview: SalaryOverviewRow[];
  overviewYear: number | null;
  overviewMonth: number | null;
  overviewLoading: boolean;
  overviewError: string | null;
  teacherDetail: SalaryTeacherDetail | null;
  teacherDetailLoading: boolean;
  teacherDetailError: string | null;
  markPaidLoading: boolean;
}

const initialState: SalariesState = {
  overview: [],
  overviewYear: null,
  overviewMonth: null,
  overviewLoading: false,
  overviewError: null,
  teacherDetail: null,
  teacherDetailLoading: false,
  teacherDetailError: null,
  markPaidLoading: false,
};

export const fetchSalaryOverview = createAsyncThunk(
  'salaries/fetchOverview',
  async (params: { year?: number; month?: number; center_id?: number } | undefined, { rejectWithValue }) => {
    try {
      const res = await salaryAPI.getOverview(params);
      const data = (res as any).data ?? res;
      return {
        year: data?.year ?? params?.year ?? null,
        month: data?.month ?? params?.month ?? null,
        teachers: Array.isArray(data?.teachers) ? data.teachers : [],
      };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? 'Failed to fetch salary overview');
    }
  }
);

export const fetchTeacherSalaryDetail = createAsyncThunk(
  'salaries/fetchTeacherDetail',
  async (
    params: { teacherId: number; months?: number; center_id?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await salaryAPI.getTeacherDetail(params.teacherId, { months: params.months, center_id: params.center_id });
      const data = (res as any).data ?? res;
      return data as SalaryTeacherDetail;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? 'Failed to fetch teacher salary detail');
    }
  }
);

export const markSalaryPaid = createAsyncThunk(
  'salaries/markPaid',
  async (payload: MarkSalaryPaidPayload, { dispatch, getState, rejectWithValue }) => {
    try {
      const res = await salaryAPI.markPaid(payload);
      const data = (res as any).data ?? res;
      showToast.success('Salary marked as paid');
      const state = getState() as RootState;
      const { overviewYear, overviewMonth } = state.salaries;
      dispatch(fetchSalaryOverview({ year: overviewYear ?? undefined, month: overviewMonth ?? undefined }));
      dispatch(fetchTeacherSalaryDetail({ teacherId: payload.teacher_id }));
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to mark salary as paid';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateSalaryRecord = createAsyncThunk(
  'salaries/update',
  async ({ id, data, teacherId }: UpdateSalaryPayload, { dispatch, getState, rejectWithValue }) => {
    try {
      const res = await salaryAPI.update(id, data);
      const responseData = (res as any).data ?? res;
      showToast.success('Salary record updated');
      const state = getState() as RootState;
      const { overviewYear, overviewMonth } = state.salaries;
      dispatch(fetchSalaryOverview({ year: overviewYear ?? undefined, month: overviewMonth ?? undefined }));
      if (teacherId) dispatch(fetchTeacherSalaryDetail({ teacherId }));
      return responseData;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to update salary record';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const salariesSlice = createSlice({
  name: 'salaries',
  initialState,
  reducers: {
    clearSalariesError(state) {
      state.overviewError = null;
      state.teacherDetailError = null;
    },
    clearSalaryTeacherDetail(state) {
      state.teacherDetail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalaryOverview.pending, (state) => {
        state.overviewLoading = true;
        state.overviewError = null;
      })
      .addCase(fetchSalaryOverview.fulfilled, (state, action: PayloadAction<{ year: number | null; month: number | null; teachers: SalaryOverviewRow[] }>) => {
        state.overviewLoading = false;
        state.overview = action.payload.teachers;
        state.overviewYear = action.payload.year;
        state.overviewMonth = action.payload.month;
      })
      .addCase(fetchSalaryOverview.rejected, (state, action) => {
        state.overviewLoading = false;
        state.overviewError = action.payload as string;
      });

    builder
      .addCase(fetchTeacherSalaryDetail.pending, (state) => {
        state.teacherDetailLoading = true;
        state.teacherDetailError = null;
      })
      .addCase(fetchTeacherSalaryDetail.fulfilled, (state, action: PayloadAction<SalaryTeacherDetail>) => {
        state.teacherDetailLoading = false;
        state.teacherDetail = action.payload;
      })
      .addCase(fetchTeacherSalaryDetail.rejected, (state, action) => {
        state.teacherDetailLoading = false;
        state.teacherDetailError = action.payload as string;
      });

    builder
      .addCase(markSalaryPaid.pending, (state) => { state.markPaidLoading = true; })
      .addCase(markSalaryPaid.rejected, (state) => { state.markPaidLoading = false; })
      .addCase(markSalaryPaid.fulfilled, (state) => { state.markPaidLoading = false; });

    builder
      .addCase(updateSalaryRecord.pending, (state) => { state.markPaidLoading = true; })
      .addCase(updateSalaryRecord.rejected, (state) => { state.markPaidLoading = false; })
      .addCase(updateSalaryRecord.fulfilled, (state) => { state.markPaidLoading = false; });
  },
});

export const { clearSalariesError, clearSalaryTeacherDetail } = salariesSlice.actions;
export default salariesSlice.reducer;

export const selectSalaryOverview = (state: RootState) => state.salaries.overview;
export const selectSalaryOverviewLoading = (state: RootState) => state.salaries.overviewLoading;
export const selectSalaryOverviewPeriod = (state: RootState) => ({
  year: state.salaries.overviewYear,
  month: state.salaries.overviewMonth,
});
export const selectSalaryTeacherDetail = (state: RootState) => state.salaries.teacherDetail;
export const selectSalaryTeacherDetailLoading = (state: RootState) => state.salaries.teacherDetailLoading;
export const selectSalaryMarkPaidLoading = (state: RootState) => state.salaries.markPaidLoading;
