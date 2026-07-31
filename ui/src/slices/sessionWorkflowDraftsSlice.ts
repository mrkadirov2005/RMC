import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SessionWorkflowTab = 'attendance' | 'homework' | 'activity' | 'points';

export type SessionWorkflowDraft = {
  attendance: [number, string][];
  homeworkScores: [number, string][];
  activityScores: [number, string][];
  pointsScores: [number, string][];
  stellarStudentId: number | null;
  activeTab: SessionWorkflowTab;
};

type SessionWorkflowDraftsState = {
  drafts: Record<string, SessionWorkflowDraft>;
};

const initialState: SessionWorkflowDraftsState = { drafts: {} };

const sessionWorkflowDraftsSlice = createSlice({
  name: 'sessionWorkflowDrafts',
  initialState,
  reducers: {
    saveSessionWorkflowDraft: (
      state,
      action: PayloadAction<{ key: string; draft: SessionWorkflowDraft }>,
    ) => {
      state.drafts[action.payload.key] = action.payload.draft;
    },
    clearSessionWorkflowDraft: (state, action: PayloadAction<string>) => {
      delete state.drafts[action.payload];
    },
  },
});

export const { saveSessionWorkflowDraft, clearSessionWorkflowDraft } = sessionWorkflowDraftsSlice.actions;
export default sessionWorkflowDraftsSlice.reducer;
