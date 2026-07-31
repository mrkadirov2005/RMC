import { describe, expect, it } from 'vitest';
import reducer, { clearSessionWorkflowDraft, saveSessionWorkflowDraft } from '../sessionWorkflowDraftsSlice';

const draft = {
  attendance: [[1, 'On time']] as [number, string][],
  homeworkScores: [[1, 'Good']] as [number, string][],
  activityScores: [[1, 'Average']] as [number, string][],
  pointsScores: [[1, '10']] as [number, string][],
  stellarStudentId: 1,
  activeTab: 'activity' as const,
};

describe('session workflow draft reducer', () => {
  it('stores drafts independently by session key', () => {
    const state = reducer(undefined, saveSessionWorkflowDraft({ key: '4:9', draft }));
    expect(state.drafts['4:9']).toEqual(draft);
  });

  it('clears only the successfully saved session', () => {
    let state = reducer(undefined, saveSessionWorkflowDraft({ key: '4:9', draft }));
    state = reducer(state, saveSessionWorkflowDraft({ key: '4:10', draft }));
    state = reducer(state, clearSessionWorkflowDraft('4:9'));
    expect(state.drafts['4:9']).toBeUndefined();
    expect(state.drafts['4:10']).toEqual(draft);
  });
});
