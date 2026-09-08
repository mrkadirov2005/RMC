// API wrappers for the vocabulary consolidation exercise — both the public
// share-link flow (/consolidate/:shareToken, no auth) and the authenticated
// portal flow (/consolidations/..., requires a logged-in student).

import { apiClient, API_BASE_URL } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';
import { getStoredAuth } from '@/shared/auth/authStorage';

// Violation pings must survive the page actually unloading (a tab switch, a
// fullscreen-exit, a hard navigation) and must not depend on reading a response —
// `sendBeacon` is the textbook tool for this, but it cannot attach custom headers,
// which breaks it for the authenticated route (Bearer-token auth, no cookie
// session). `fetch` with `keepalive: true` gives the same unload-survival and
// fire-and-forget guarantee while still allowing an Authorization header, so it's
// used for both flows here instead.
const beaconPost = (url: string, body: unknown, authToken?: string | null) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  try {
    void fetch(url, { method: 'POST', headers, body: JSON.stringify(body), keepalive: true }).catch(() => {});
  } catch {
    // Best-effort — a dropped violation ping is not worth surfacing to the student.
  }
};

export interface ConsolidationWord {
  consolidation_word_id: number;
  word_order: number;
  main_word: string;
}

export interface ConsolidationTrial {
  trial_id: number;
  consolidation_set_id: number;
  student_id: number;
  status: 'in_progress' | 'completed' | 'auto_submitted';
  correct_count: number | null;
  total_words: number | null;
  is_passed: boolean | null;
  violation_count: number;
  access_token?: string | null;
}

export interface RosterEntry {
  student_id: number;
  first_name: string;
  last_name: string;
}

export type StartPublicTrialResponse =
  | { needs_confirmation: true; existing_today: ConsolidationTrial }
  | { needs_confirmation?: false; message: string; trial: ConsolidationTrial; words: ConsolidationWord[]; existing_today: ConsolidationTrial | null };

export interface PublicSetView {
  consolidation_set_id: number;
  title: string | null;
  class_name: string;
  session_date: string;
  violation_limit: number;
  words: ConsolidationWord[];
  roster: RosterEntry[];
}

export interface StudentSetView {
  consolidation_set_id: number;
  title: string | null;
  violation_limit: number;
  words: ConsolidationWord[];
}

export type TrialDetailWord = ConsolidationWord & { translations: string[]; student_answer: string | null; is_correct: boolean | null };

export const consolidatePublicAPI = {
  getSet: async (shareToken: string) => getApiPayload<PublicSetView>(await apiClient.get(`/consolidate/${shareToken}`)),

  // Without `confirm`, the backend refuses to create a trial (returning
  // `needs_confirmation: true` instead) when the student already completed
  // one today — call again with `confirm: true` once the student has
  // acknowledged the "continue anyway?" nudge to actually create it.
  startTrial: async (shareToken: string, studentId: number, confirm?: boolean) =>
    getApiPayload<StartPublicTrialResponse>(
      await apiClient.post(`/consolidate/${shareToken}/trials`, { student_id: studentId, ...(confirm ? { confirm: true } : {}) })
    ),

  saveAnswer: (shareToken: string, trialId: number, wordId: number, answer: string, trialToken: string | null) =>
    apiClient.patch(`/consolidate/${shareToken}/trials/${trialId}/answer`, {
      consolidation_word_id: wordId,
      answer,
      trial_token: trialToken,
    }),

  submitTrial: async (shareToken: string, trialId: number, trialToken: string | null) =>
    getApiPayload<{ message: string; trial: ConsolidationTrial }>(
      await apiClient.post(`/consolidate/${shareToken}/trials/${trialId}/submit`, { trial_token: trialToken })
    ),

  logViolation: (shareToken: string, trialId: number, trialToken: string | null) =>
    beaconPost(`${API_BASE_URL}/consolidate/${shareToken}/trials/${trialId}/violation`, { trial_token: trialToken }),
};

export const consolidationPortalAPI = {
  getStudentView: async (sessionId: number) => getApiPayload<StudentSetView>(await apiClient.get(`/consolidations/session/${sessionId}/student-view`)),

  startTrial: async (setId: number) =>
    getApiPayload<{ message: string; trial: ConsolidationTrial; words: ConsolidationWord[] }>(await apiClient.post(`/consolidations/${setId}/trials`)),

  saveAnswer: (trialId: number, wordId: number, answer: string) =>
    apiClient.patch(`/consolidations/trials/${trialId}/answer`, { consolidation_word_id: wordId, answer }),

  submitTrial: async (trialId: number) =>
    getApiPayload<{ message: string; trial: ConsolidationTrial }>(await apiClient.post(`/consolidations/trials/${trialId}/submit`)),

  getTrialDetail: async (trialId: number) =>
    getApiPayload<{ trial: ConsolidationTrial; words: TrialDetailWord[] }>(await apiClient.get(`/consolidations/trials/${trialId}`)),

  logViolation: (trialId: number) =>
    beaconPost(`${API_BASE_URL}/consolidations/trials/${trialId}/violation`, {}, getStoredAuth().token),
};
