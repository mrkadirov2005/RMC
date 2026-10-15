import { describe, expect, it } from 'vitest';
import { kpiScoreOf } from '../utils';

describe('kpiScoreOf', () => {
  it('uses the saved KPI when there is one', () => {
    expect(kpiScoreOf({ teacher_id: 1, kpi: { final_score: '72.5' }, preview: { student_score: 90, retention_score: 100 } })).toBe(72.5);
  });

  it('falls back to lesson results and retention', () => {
    expect(kpiScoreOf({ teacher_id: 1, kpi: null, preview: { student_score: 80, retention_score: 90 } })).toBe(85);
  });

  it('gives 0 to a teacher with no lesson results', () => {
    expect(kpiScoreOf({ teacher_id: 1, kpi: null, preview: { student_score: 0, retention_score: 100 } })).toBe(0);
  });
});
