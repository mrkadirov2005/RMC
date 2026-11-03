// How one test went: totals, the spread of scores and each question's share of right answers.

import { apiClient } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';

export interface TestAnalysis {
  totals: {
    attempts: number;
    students: number;
    passed: number;
    average: number | null;
    best: number | null;
    average_seconds: number | null;
    waiting: number;
    pass_rate: number | null;
  };
  distribution: Array<{ from: number; to: number; count: number }>;
  questions: Array<{
    question_id: number;
    question_order: number;
    question_text: string;
    question_type: string;
    answered: number;
    correct: number;
    attempts: number;
    correct_rate: number | null;
  }>;
}

export const testAnalysisApi = {
  get: async (testId: number): Promise<TestAnalysis> => getApiPayload<TestAnalysis>(await apiClient.get(`/tests/${testId}/analysis`)),
};
