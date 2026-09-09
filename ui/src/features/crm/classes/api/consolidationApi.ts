import { apiClient } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';

export interface ConsolidationWordInput {
  main_word: string;
  translations: string[];
}

export interface ConsolidationSet {
  consolidation_set_id: number;
  center_id: number | null;
  class_id: number | null;
  session_id: number;
  teacher_id: number;
  title: string | null;
  violation_limit: number;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationWord {
  consolidation_word_id: number;
  consolidation_set_id: number;
  word_order: number;
  main_word: string;
  translations: string[];
}

export interface ConsolidationTrial {
  trial_id: number;
  consolidation_set_id: number;
  student_id: number;
  trial_number: number;
  status: 'in_progress' | 'completed' | 'auto_submitted';
  started_at: string;
  submitted_at: string | null;
  correct_count: number | null;
  total_words: number | null;
  is_passed: boolean | null;
  violation_count: number;
  time_taken_seconds: number | null;
  via_share_link: boolean;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ConsolidationResultsRow {
  student_id: number;
  first_name: string;
  last_name: string;
  submitted: boolean;
  trial_count: number;
  best_trial: ConsolidationTrial | null;
  latest_trial: ConsolidationTrial | null;
}

export interface ConsolidationResultsDashboard {
  set: ConsolidationSet;
  summary: { total: number; submitted: number };
  rows: ConsolidationResultsRow[];
}

export interface ConsolidationTrialDetailWord {
  consolidation_word_id: number;
  word_order: number;
  main_word: string;
  translations: string[];
  student_answer: string | null;
  is_correct: boolean | null;
}

export interface ConsolidationOverviewSet {
  consolidation_set_id: number;
  title: string | null;
  teacher_id: number;
  teacher_name: string;
  class_id: number;
  class_name: string;
  session_id: number;
  session_date: string;
  word_count: number;
  created_at: string;
  trial_count: number;
  student_count: number;
  passed_student_count: number;
  pass_rate: number | null;
  total_violations: number;
}

export interface ConsolidationOverviewTeacher {
  teacher_id: number;
  teacher_name: string;
  sets_count: number;
  trial_count: number;
  student_count: number;
  passed_student_count: number;
  pass_rate: number | null;
  total_violations: number;
}

export type ConsolidationOutcomeBucket = 'passed_1' | 'passed_2' | 'passed_3_plus' | 'never_passed';

export interface ConsolidationOutcome {
  student_id: number;
  student_name: string;
  consolidation_set_id: number;
  set_title: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  class_id: number | null;
  class_name: string | null;
  session_id: number | null;
  session_date: string | null;
  trial_count: number;
  first_pass_attempt: number | null;
  violation_count: number;
  bucket: ConsolidationOutcomeBucket;
}

export interface ConsolidationEffectiveness {
  passed_1: number;
  passed_2: number;
  passed_3_plus: number;
  never_passed: number;
  had_violations: number;
}

export interface ConsolidationOverview {
  totals: {
    total_sets: number;
    total_trials: number;
    total_students_submitted: number;
    total_students_passed: number;
    total_violations: number;
    overall_pass_rate: number | null;
  };
  by_teacher: ConsolidationOverviewTeacher[];
  sets: ConsolidationOverviewSet[];
  outcomes: ConsolidationOutcome[];
  effectiveness: ConsolidationEffectiveness;
}

export const consolidationApi = {
  async getForSession(sessionId: number): Promise<{ set: ConsolidationSet; words: ConsolidationWord[] } | null> {
    try {
      const data = getApiPayload<any>(await apiClient.get(`/consolidations/session/${sessionId}`));
      return { set: data, words: data.words };
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  async create(payload: {
    session_id: number;
    title?: string;
    violation_limit?: number;
    words: ConsolidationWordInput[];
  }): Promise<{ set: ConsolidationSet; words: ConsolidationWord[] }> {
    return getApiPayload<any>(await apiClient.post('/consolidations', payload));
  },

  async getResults(sessionId: number): Promise<ConsolidationResultsDashboard> {
    return getApiPayload<ConsolidationResultsDashboard>(await apiClient.get(`/consolidations/session/${sessionId}/results`));
  },

  async getTrialDetail(trialId: number): Promise<{ trial: ConsolidationTrial; words: ConsolidationTrialDetailWord[] }> {
    return getApiPayload<any>(await apiClient.get(`/consolidations/trials/${trialId}`));
  },

  async deleteSet(setId: number): Promise<void> {
    await apiClient.delete(`/consolidations/${setId}`);
  },

  async regenerateLink(setId: number): Promise<{ set: ConsolidationSet }> {
    const data = getApiPayload<any>(await apiClient.post(`/consolidations/${setId}/regenerate-link`));
    return { set: data.set ?? data };
  },

  async getOverview(): Promise<ConsolidationOverview> {
    return getApiPayload<ConsolidationOverview>(await apiClient.get('/consolidations/overview'));
  },
};
