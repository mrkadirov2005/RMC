import { apiClient } from '@/shared/api/api';

export { classAPI } from '@/shared/api/api';

// @MOB-160 @MOB-161 @MOB-162 @MOB-164 Content of the student and parent mobile app
// (service: /api/mobile-admin).

export type MobileLink = { link_id: number; center_id: number | null; title: string; url: string; icon: string | null; sort_order: number; is_active: boolean };
export type MobileAnnouncement = {
  announcement_id: number;
  title: string;
  body: string;
  audience: 'all' | 'student' | 'parent';
  class_id: number | null;
  class_name: string | null;
  send_push: boolean;
  published_at: string;
  created_by_name: string | null;
};
export type MobilePolicy = {
  policy_id: number;
  center_id: number | null;
  title: string;
  current_version: number;
  body: string;
  requires_acceptance: boolean;
  published_at: string;
  accepted_count: number;
};
export type MobileHelpRequest = {
  request_id: number;
  user_type: 'student' | 'parent';
  sender_name: string | null;
  kind: 'help' | 'complaint' | 'thanks' | 'suggestion';
  message: string;
  status: 'submitted' | 'in_review' | 'resolved';
  response: string | null;
  created_at: string;
};

// @MOB-166 App adoption numbers.
export type MobileAdoption = {
  parents_total: number;
  parents_signed_in: number;
  parents_weekly_active: number;
  students_total: number;
  students_signed_in: number;
  students_weekly_active: number;
  homework_submitted_week: number;
  homework_submitted_total: number;
  link_requests_pending: number;
};

export const mobileAdminAPI = {
  adoption: () => apiClient.get('/mobile-admin/adoption'),

  links: () => apiClient.get('/mobile-admin/links'),
  createLink: (data: { title: string; url: string; icon?: string; sort_order?: number }) => apiClient.post('/mobile-admin/links', data),
  updateLink: (id: number, data: Partial<MobileLink>) => apiClient.put(`/mobile-admin/links/${id}`, data),
  deleteLink: (id: number) => apiClient.delete(`/mobile-admin/links/${id}`),

  announcements: () => apiClient.get('/mobile-admin/announcements'),
  createAnnouncement: (data: { title: string; body: string; audience: string; class_id?: number | null; send_push: boolean }) =>
    apiClient.post('/mobile-admin/announcements', data),
  deleteAnnouncement: (id: number) => apiClient.delete(`/mobile-admin/announcements/${id}`),

  policies: () => apiClient.get('/mobile-admin/policies'),
  createPolicy: (data: { title: string; body: string; requires_acceptance: boolean }) => apiClient.post('/mobile-admin/policies', data),
  publishPolicyVersion: (id: number, data: { body: string; requires_acceptance: boolean }) => apiClient.post(`/mobile-admin/policies/${id}/versions`, data),

  helpRequests: (status?: string) => apiClient.get('/mobile-admin/help-requests', { params: status ? { status } : undefined }),
  updateHelpRequest: (id: number, data: { status?: string; response?: string }) => apiClient.patch(`/mobile-admin/help-requests/${id}`, data),
};
