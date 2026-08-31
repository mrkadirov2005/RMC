// Source file for kpisSlice.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { kpiAPI } from '../shared/api/api';
import { showToast } from '../utils/toast';
import type { RootState } from '../store';
import type { KpiOverviewRow, KpiTeacherDetail, UpsertKpiPayload } from '../features/crm/teachers/kpi/types';

interface KpisState {
  overview: KpiOverviewRow[];
  overviewYear: number | null;
  overviewMonth: number | null;
  overviewLoading: boolean;
  overviewError: string | null;
  teacherDetail: KpiTeacherDetail | null;
  teacherDetailLoading: boolean;
  teacherDetailError: string | null;
  upsertLoading: boolean;
}

const initialState: KpisState = {
  overview: [],
  overviewYear: null,
  overviewMonth: null,
  overviewLoading: false,
  overviewError: null,
  teacherDetail: null,
  teacherDetailLoading: false,
  teacherDetailError: null,
  upsertLoading: false,
};

export const fetchKpiOverview = createAsyncThunk(
  'kpis/fetchOverview',
  async (params: { year?: number; month?: number; center_id?: number } | undefined, { rejectWithValue }) => {
    try {
      const res = await kpiAPI.getOverview(params);
      const data = (res as any).data ?? res;
      return {
        year: data?.year ?? params?.year ?? null,
        month: data?.month ?? params?.month ?? null,
        teachers: Array.isArray(data?.teachers) ? data.teachers : [],
      };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? 'Failed to fetch KPI overview');
    }
  }
);

export const fetchTeacherKpiDetail = createAsyncThunk(
  'kpis/fetchTeacherDetail',
  async (params: { teacherId: number; center_id?: number }, { rejectWithValue }) => {
    try {
      const res = await kpiAPI.getTeacherDetail(params.teacherId, { center_id: params.center_id });
      const data = (res as any).data ?? res;
      return data as KpiTeacherDetail;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.error ?? 'Failed to fetch teacher KPI detail');
    }
  }
);

export const upsertTeacherKpi = createAsyncThunk(
  'kpis/upsert',
  async (payload: UpsertKpiPayload, { dispatch, getState, rejectWithValue }) => {
    try {
      const res = await kpiAPI.upsert(payload);
      const data = (res as any).data ?? res;
      showToast.success('KPI saved');
      const state = getState() as RootState;
      const { overviewYear, overviewMonth } = state.kpis;
      dispatch(fetchKpiOverview({ year: overviewYear ?? undefined, month: overviewMonth ?? undefined }));
      dispatch(fetchTeacherKpiDetail({ teacherId: payload.teacher_id }));
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to save KPI';
      showToast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const kpisSlice = createSlice({
  name: 'kpis',
  initialState,
  reducers: {
    clearKpiTeacherDetail(state) {
      state.teacherDetail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKpiOverview.pending, (state) => {
        state.overviewLoading = true;
        state.overviewError = null;
      })
      .addCase(fetchKpiOverview.fulfilled, (state, action: PayloadAction<{ year: number | null; month: number | null; teachers: KpiOverviewRow[] }>) => {
        state.overviewLoading = false;
        state.overview = action.payload.teachers;
        state.overviewYear = action.payload.year;
        state.overviewMonth = action.payload.month;
      })
      .addCase(fetchKpiOverview.rejected, (state, action) => {
        state.overviewLoading = false;
        state.overviewError = action.payload as string;
      });

    builder
      .addCase(fetchTeacherKpiDetail.pending, (state) => {
        state.teacherDetailLoading = true;
        state.teacherDetailError = null;
      })
      .addCase(fetchTeacherKpiDetail.fulfilled, (state, action: PayloadAction<KpiTeacherDetail>) => {
        state.teacherDetailLoading = false;
        state.teacherDetail = action.payload;
      })
      .addCase(fetchTeacherKpiDetail.rejected, (state, action) => {
        state.teacherDetailLoading = false;
        state.teacherDetailError = action.payload as string;
      });

    builder
      .addCase(upsertTeacherKpi.pending, (state) => { state.upsertLoading = true; })
      .addCase(upsertTeacherKpi.rejected, (state) => { state.upsertLoading = false; })
      .addCase(upsertTeacherKpi.fulfilled, (state) => { state.upsertLoading = false; });
  },
});

export const { clearKpiTeacherDetail } = kpisSlice.actions;
export default kpisSlice.reducer;

export const selectKpiOverview = (state: RootState) => state.kpis.overview;
export const selectKpiOverviewLoading = (state: RootState) => state.kpis.overviewLoading;
export const selectKpiOverviewPeriod = (state: RootState) => ({
  year: state.kpis.overviewYear,
  month: state.kpis.overviewMonth,
});
export const selectKpiTeacherDetail = (state: RootState) => state.kpis.teacherDetail;
export const selectKpiTeacherDetailLoading = (state: RootState) => state.kpis.teacherDetailLoading;
export const selectKpiUpsertLoading = (state: RootState) => state.kpis.upsertLoading;
