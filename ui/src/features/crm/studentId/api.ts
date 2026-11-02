import { apiClient } from '@/shared/api/api';

// @MOB-125 Checking a student's ID QR from the mobile app (service: /api/mobile-staff).

export type StudentIdCheck = {
  valid: boolean;
  reason: 'malformed' | 'bad_signature' | 'expired' | 'not_found' | 'other_center' | 'inactive' | null;
  student?: { student_id: number; first_name: string; last_name: string; status: string; is_frozen: boolean; groups: string[] };
};

export const studentIdAPI = {
  verify: (token: string) => apiClient.get('/mobile-staff/student-id/verify', { params: { token } }),
};
