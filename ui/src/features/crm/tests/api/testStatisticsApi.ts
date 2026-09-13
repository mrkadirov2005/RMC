// Overview statistics for the Tests section. One round trip feeds all three
// bands of the overview, computed in SQL rather than derived from whatever
// happens to be in the browser.

import { testAPI } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';

export interface TestTotals {
  tests: number;
  active: number;
  submissions: number;
  awaiting_grading: number;
  average_score: number | null;
  pass_rate: number | null;
}

export interface TestTypeCount {
  test_type: string;
  tests: number;
}

export interface TeacherTestStats {
  teacher_id: number;
  teacher_name: string;
  tests: number;
  submissions: number;
  graded_submissions: number;
  average_score: number | null;
  pass_rate: number | null;
  ranked: boolean;
}

export interface TestStatistics {
  totals: TestTotals;
  by_type: TestTypeCount[];
  by_teacher: TeacherTestStats[];
  center_median: { average_score: number | null; pass_rate: number | null; ranked_teachers: number };
  ranking: { metric: string; minimum_graded_submissions: number };
  scope: 'center' | 'self';
}

export const testStatisticsApi = {
  get: async () => getApiPayload<TestStatistics>(await testAPI.getStatistics()),
};
