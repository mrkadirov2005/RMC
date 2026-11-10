export { assignmentAPI, attendanceAPI, classAPI, discountAPI, paymentAPI, studentAPI, teacherAPI } from '@/shared/api/api';

import { apiClient } from '@/shared/api/api';

/** The child's whole journey through the center (owners and admins). */
export const journeyAPI = {
  get: <T,>(studentId: number) => apiClient.get<T>(`/students/${studentId}/journey`, { params: { _fresh: Date.now() } }),
};
