// The built-in English level tests (Beginner–C1): which this center has, and adding the rest.

import { apiClient } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';

export interface LevelTestSection {
  section: 'grammar' | 'vocabulary' | 'reading';
  title: string;
  questions: number;
}

export interface LevelTestEntry {
  key: string;
  level: string;
  title: string;
  duration_minutes: number;
  questions: number;
  sections: LevelTestSection[];
  /** The test in this center, once installed. */
  installed_test_id: number | null;
}

export const levelTestsApi = {
  list: async (): Promise<LevelTestEntry[]> =>
    getApiPayload<{ items?: LevelTestEntry[] }>(await apiClient.get('/tests/library/english-levels'))?.items || [],
  install: async (): Promise<{ created: Array<{ level: string; test_id: number }>; already_installed: number }> =>
    getApiPayload(await apiClient.post('/tests/library/english-levels/install')),
};
