// Client for the unauthenticated test share link. These two calls are the only
// ones a holder of the link can make; everything else about a test stays behind
// the authenticated API.

import { apiClient } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';

export interface SharedTestView {
  test_name: string;
  test_type: string;
  description?: string | null;
  instructions?: string | null;
  total_marks?: number | null;
  passing_marks?: number | null;
  duration_minutes?: number | null;
  is_timed?: boolean | null;
}

export interface SharedTestStudent {
  student_id: number;
  first_name: string;
  last_name: string;
}

export type StartSharedTestResponse =
  | { needs_confirmation: true; attempts: number }
  | {
      needs_confirmation?: false;
      submission: { submission_id: number };
      access_token: string;
      student: SharedTestStudent;
    };

export interface SharedSubmissionView {
  submission: { submission_id: number; started_at?: string | null; status?: string };
  test: Record<string, unknown> & { questions: unknown[] };
}

export const sharedTestAPI = {
  getTest: async (shareToken: string) =>
    getApiPayload<SharedTestView>(await apiClient.get(`/share/tests/${shareToken}`)),

  // Without `confirm` the backend holds back a repeat attempt and answers
  // `needs_confirmation` instead, so a student who backs out at the nudge leaves
  // no half-started submission behind.
  start: async (shareToken: string, username: string, confirm?: boolean) =>
    getApiPayload<StartSharedTestResponse>(
      await apiClient.post(`/share/tests/${shareToken}/start`, { username, ...(confirm ? { confirm: true } : {}) })
    ),

  // Reopening and handing in an attempt are keyed by the secret minted when it
  // started, because there is no session to identify the student.
  getSubmission: async (shareToken: string, submissionId: number, accessToken: string) =>
    getApiPayload<SharedSubmissionView>(
      await apiClient.get(`/share/tests/${shareToken}/submissions/${submissionId}`, {
        params: { access_token: accessToken },
      })
    ),

  submit: (
    shareToken: string,
    submissionId: number,
    accessToken: string,
    answers: Record<number, unknown>,
    timeTakenSeconds: number | null
  ) =>
    apiClient.post(`/share/tests/${shareToken}/submissions/${submissionId}/submit`, {
      access_token: accessToken,
      answers,
      time_taken_seconds: timeTakenSeconds,
    }),
};
