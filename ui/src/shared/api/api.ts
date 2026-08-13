// Shared API client and endpoint wrappers.

import axios from 'axios';
import { showToast, handleApiError } from '../../utils/toast';
import { store } from '../../store';
import {
  setBackendUnreachable,
  setHealthy,
  setOffline,
} from '../../slices/serviceStatusSlice';
import { paymentLogout } from '../../slices/paymentAccessSlice';
import { getCenterScopeHeaders, isGlobalSuperuser, withCenterScopeParams, withCenterScopePayload } from '../auth/centerScope';
import { getStoredAuth } from '../auth/authStorage';

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');
export const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api');
export const buildApiUrl = (path: string) => `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getOrCreateDeviceId = (): string | null => {
  try {
    const existing = localStorage.getItem('device_id');
    if (existing && existing.trim()) return existing.trim();

    const id =
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`) || null;
    if (!id) return null;
    localStorage.setItem('device_id', id);
    return id;
  } catch {
    return null;
  }
};

const getHashRoute = () => window.location.hash.replace(/^#/, '') || '/';

const isAuthLoginUrl = (url: string) =>
  [
    '/students/auth/login',
    '/teachers/auth/login',
    '/teachers/auth/payment-login',
    '/superusers/auth/login',
    '/owners/auth/login',
  ].some((path) => url.startsWith(path));

const redirectToHashRoute = (path: string) => {
  window.location.hash = path;
};

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const { token, user } = getStoredAuth();
  const paymentToken = localStorage.getItem('payment_token');
// Handles headers.
  const headers = (config.headers ?? {}) as any;

  // Stable per-browser device id (NOT a MAC address).
  const deviceId = getOrCreateDeviceId();
  if (deviceId && !headers['x-device-id'] && !headers['X-Device-Id']) {
    headers['x-device-id'] = deviceId;
  }

  const skipCenterScope = Boolean(
    headers['x-skip-center-scope'] ||
      headers['X-Skip-Center-Scope'] ||
      headers['X-SKIP-CENTER-SCOPE']
  );

  if (config.url?.startsWith('/payments') && paymentToken && user?.userType === 'teacher') {
    headers.Authorization = `Bearer ${paymentToken}`;
    config.headers = headers;
    return config;
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    config.headers = headers;
  }

  const isOwnerEndpoint = String(config.url || '').startsWith('/owners');

  if (!skipCenterScope && !isOwnerEndpoint) {
    Object.assign(headers, getCenterScopeHeaders(user));
    config.headers = headers;
  }

  if (!skipCenterScope && isGlobalSuperuser(user) && !isOwnerEndpoint) {
    if (config.method === 'get' || config.method === 'delete') {
// Handles params.
      const params = (config.params ?? {}) as Record<string, unknown>;
      config.params = withCenterScopeParams(params, user);
    }
  }

  const isMutating = Boolean(config.method && ['post', 'put', 'patch'].includes(config.method));
  const hasBody = config.data && typeof config.data === 'object' && !(config.data instanceof FormData);
  const payload = hasBody ? (config.data as Record<string, unknown>) : undefined;
  if (!skipCenterScope && isMutating && payload && !isOwnerEndpoint) {
// Handles payload center id.
    config.data = withCenterScopePayload(payload, user);
  }
  return config;
});

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => {
    // Show success toast for POST, PUT, DELETE requests
    if (response.config.method && ['post', 'put', 'delete'].includes(response.config.method)) {
      const message = response.data?.message || 'Operation successful!';
      showToast.success(message);
    }
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      store.dispatch(setHealthy());
    }
    return response;
  },
  (error) => {
    if (!error.response) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        store.dispatch(setOffline());
      } else {
        store.dispatch(setBackendUnreachable());
      }
    }
// Handles should suppress access denied toast.
    const shouldSuppressAccessDeniedToast = () => {
      try {
        const path = window.location.pathname;
        const isStudentRoute = path.startsWith('/student') || path.startsWith('/my-tests');
        const userRaw = localStorage.getItem('user');
        const user = userRaw ? JSON.parse(userRaw) : null;
        return isStudentRoute && user?.userType === 'student';
      } catch {
        return false;
      }
    };

    // Handle 401 (unauthorized) - token expired or invalid
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      if (isAuthLoginUrl(url)) {
        return Promise.reject(error);
      }
      if (url.startsWith('/payments') && user?.userType === 'teacher') {
        localStorage.removeItem('payment_token');
        store.dispatch(paymentLogout());
        showToast.error(handleApiError(error) || 'Payment access expired. Please re-login.');
        return Promise.reject(error);
      }
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const errorMessage = handleApiError(error) || 'Session expired. Please log in again.';
      showToast.error(errorMessage);
      // Redirect to login page
      if (!getHashRoute().startsWith('/login')) {
        const loginUser = user?.role === 'owner' ? '/login/owner' : '/login/superuser';
        redirectToHashRoute(loginUser);
      }
      return Promise.reject(error);
    }

    // Handle 403 (forbidden) - insufficient permissions
    if (error.response?.status === 403) {
      const url = error.config?.url || '';
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const errorMessage = handleApiError(error) || 'Access denied. Insufficient permissions.';

      // Teachers require a separate payment login. If the backend denies access, drop any stale payment auth
      // so the Payments page can show the PaymentAccessGate again.
      if (url.startsWith('/payments') && user?.userType === 'teacher') {
        const requiresPaymentLogin = String(errorMessage).toLowerCase().includes('separate login');
        if (requiresPaymentLogin) {
          localStorage.removeItem('payment_token');
          store.dispatch(paymentLogout());
        }
      }
      if (!shouldSuppressAccessDeniedToast()) {
        showToast.error(errorMessage);
      }
      return Promise.reject(error);
    }

    const errorMessage = handleApiError(error);
    showToast.error(errorMessage);
    return Promise.reject(error);
  }
);

// API Services
export const studentAPI = {
  getAcquisitionSources: () => apiClient.get('/students/acquisition-sources'),
  createAcquisitionSource: (source_name: string) => apiClient.post('/students/acquisition-sources', { source_name }),
  getAll: (params?: object, options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/students', {
      params,
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  getById: (id: number) => apiClient.get(`/students/${id}`),
  getByClassWithTransfers: (classId: number, params?: Record<string, unknown>) =>
    apiClient.get(`/students/class/${classId}`, { params }),
  getDeleted: (options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/students/deleted', {
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  create: (data: any) => apiClient.post('/students', data),
  update: (id: number, data: any) => apiClient.put(`/students/${id}`, data),
  transfer: (id: number, targetClassId: number) => apiClient.post(`/students/${id}/transfer`, { target_class_id: targetClassId }),
  delete: (id: number) => apiClient.delete(`/students/${id}`),
  purge: (id: number) => apiClient.delete(`/students/${id}/purge`),
  setPassword: (id: number, data: { username: string; password: string }) =>
    apiClient.post(`/students/${id}/set-password`, data),
  getCoins: (id: number) => apiClient.get(`/students/${id}/coins`),
  addCoins: (id: number, data: { amount: number; direction?: 'add' | 'subtract'; reason?: string | null }) =>
    apiClient.post(`/students/${id}/coins`, data),
  updateCoinTransaction: (
    id: number,
    transactionId: number,
    data: { amount: number; direction?: 'add' | 'subtract'; reason?: string | null }
  ) => apiClient.put(`/students/${id}/coins/${transactionId}`, data),
  deleteCoinTransaction: (id: number, transactionId: number) =>
    apiClient.delete(`/students/${id}/coins/${transactionId}`),
};

export type DataEntity = 'students' | 'teachers' | 'classes' | 'payments' | 'rooms' | 'assignments' | 'subjects';

export const dataAPI = {
  importEntity: (entity: DataEntity, csv: string) =>
    apiClient.post(`/data/import/${entity}`, { csv }),
  exportEntity: (entity: DataEntity) =>
    apiClient.get(`/data/export/${entity}`, { responseType: 'blob' }),
  pushEntityToSheets: (entity: DataEntity) =>
    apiClient.post(`/data/sheets/push/${entity}`, {}),
  pullEntityFromSheets: (entity: DataEntity) =>
    apiClient.post(`/data/sheets/pull/${entity}`, {}),
};

export const archiveAPI = {
  getAll: () => apiClient.get('/archive'),
  restore: (entity: 'students' | 'teachers' | 'classes' | 'payments' | 'sessions', id: number) =>
    apiClient.post(`/archive/${entity}/${id}/restore`),
  purge: (entity: 'students' | 'teachers' | 'classes' | 'payments' | 'sessions', id: number) =>
    apiClient.delete(`/archive/${entity}/${id}/purge`),
};

export const reportAPI = {
  retention: (params?: { center_id?: number; month?: string; months?: number; limit?: number; view?: 'retention' | 'intake'; source_id?: number; referred_by_teacher_id?: number; source_detail?: string }) =>
    apiClient.get('/reports/retention', { params }),
};

export const telegramRegistrationAPI = {
  getAll: (params?: { status?: string }) => apiClient.get('/telegram-registrations', { params }),
  convert: (id: number, data?: { class_id?: number; teacher_id?: number }) => apiClient.post(`/telegram-registrations/${id}/convert`, data),
  reject: (id: number) => apiClient.post(`/telegram-registrations/${id}/reject`),
};

export const teacherAPI = {
  getAll: (params?: Record<string, unknown>, options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/teachers', {
      params,
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  getById: (id: number) => apiClient.get(`/teachers/${id}`),
  create: (data: any) => apiClient.post('/teachers', data),
  update: (id: number, data: any) => apiClient.put(`/teachers/${id}`, data),
  delete: (id: number, options?: { force?: boolean }) =>
    apiClient.delete(`/teachers/${id}`, { params: options?.force ? { force: 'true' } : undefined }),
  purge: (id: number) => apiClient.delete(`/teachers/${id}/purge`),
  setPassword: (id: number, data: { username: string; password: string }) =>
    apiClient.post(`/teachers/${id}/set-password`, data),
  setPaymentPassword: (id: number, data: { password: string }) =>
    apiClient.post(`/teachers/${id}/payment-password`, data),
};

export const classAPI = {
  getAll: (params?: Record<string, unknown>, options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/classes', {
      params,
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  getById: (id: number, params?: { center_id?: number }) => apiClient.get(`/classes/${id}`, { params }),
  getSessions: (id: number, params?: { center_id?: number }) => apiClient.get(`/classes/${id}/sessions`, { params }),
  getSessionsBulk: (classIds: number[]) =>
    apiClient.get('/classes/sessions/bulk', { params: { class_ids: classIds.join(',') } }),
  create: (data: any) => apiClient.post('/classes', data),
  update: (id: number, data: any) => apiClient.put(`/classes/${id}`, data),
  delete: (id: number, params?: { force?: boolean }) => apiClient.delete(`/classes/${id}`, { params }),
  purge: (id: number) => apiClient.delete(`/classes/${id}/purge`),
  generateSessions: (id: number, data: { month: number; year: number; duration_minutes: number; center_id?: number }) =>
    apiClient.post(`/classes/${id}/sessions/generate`, data),
  deleteSessions: (id: number, params: { from: string; to?: string }) =>
    apiClient.delete(`/classes/${id}/sessions`, { params }),
  deleteSessionById: (id: number, sessionId: number) =>
    apiClient.delete(`/classes/${id}/sessions/${sessionId}`),
  purgeSessionById: (id: number, sessionId: number) =>
    apiClient.delete(`/classes/${id}/sessions/${sessionId}/purge`),
  createSession: (id: number, data: { session_date: string; start_time: string; duration_minutes?: number; teacher_id?: number; center_id?: number }) =>
    apiClient.post(`/classes/${id}/sessions`, data),
};


export const paymentAPI = {
  getAll: (params?: Record<string, unknown>, options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/payments', {
      params,
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  getById: (id: number) => apiClient.get(`/payments/${id}`),
  getByStudent: (studentId: number, params?: Record<string, unknown>) =>
    apiClient.get(`/payments/student/${studentId}`, { params }),
  create: (data: any) => apiClient.post('/payments', data),
  update: (id: number, data: any) => apiClient.put(`/payments/${id}`, data),
  delete: (id: number) => apiClient.delete(`/payments/${id}`),
  purge: (id: number) => apiClient.delete(`/payments/${id}/purge`),
};

export const discountAPI = {
  getAll: (params?: Record<string, unknown>, options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/discounts', {
      params,
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  getById: (id: number) => apiClient.get(`/discounts/${id}`),
  getActiveSerialByStudent: (studentId: number) => apiClient.get(`/discounts/student/${studentId}/active`),
  getActiveByStudent: (studentId: number, params?: Record<string, unknown>) =>
    apiClient.get(`/discounts/student/${studentId}/active-any`, { params }),
  create: (data: any) => apiClient.post('/discounts', data),
  update: (id: number, data: any) => apiClient.put(`/discounts/${id}`, data),
  delete: (id: number) => apiClient.delete(`/discounts/${id}`),
};

export const gradeAPI = {
  getAll: () => apiClient.get('/grades'),
  getById: (id: number) => apiClient.get(`/grades/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/grades/student/${studentId}`),
  getBySession: (sessionId: number, params?: { center_id?: number }) => apiClient.get(`/grades/session/${sessionId}`, { params }),
  create: (data: any) => apiClient.post('/grades', data),
  bulkCreate: (grades: any[]) => apiClient.post('/grades/bulk', { grades }),
  update: (id: number, data: any) => apiClient.put(`/grades/${id}`, data),
  delete: (id: number) => apiClient.delete(`/grades/${id}`),
  upsertSessionScores: (data: any) => apiClient.post('/grades/session-scores', data),
  saveSessionWorkflow: (data: any) => apiClient.post('/grades/session-workflow', data),
};

export const attendanceAPI = {
  getAll: (params?: { center_id?: number }, options?: { skipCenterScope?: boolean }) => apiClient.get('/attendance', {
    params,
    headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
  }),
  getById: (id: number) => apiClient.get(`/attendance/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/attendance/student/${studentId}`),
  getByClass: (classId: number, params?: { center_id?: number }) => apiClient.get(`/attendance/class/${classId}`, { params }),
  getBySession: (sessionId: number, params?: { center_id?: number }) => apiClient.get(`/attendance/session/${sessionId}`, { params }),
  create: (data: any) => apiClient.post('/attendance', data),
  update: (id: number, data: any) => apiClient.put(`/attendance/${id}`, data),
  delete: (id: number, params?: { center_id?: number }) => apiClient.delete(`/attendance/${id}`, { params }),
};

export const assignmentAPI = {
  getAll: (params?: { center_id?: number; teacher_id?: number; class_id?: number; page?: number; limit?: number }) =>
    apiClient.get('/assignments', { params }),
  getById: (id: number) => apiClient.get(`/assignments/${id}`),
  create: (data: any) => apiClient.post('/assignments', data),
  update: (id: number, data: any) => apiClient.put(`/assignments/${id}`, data),
  delete: (id: number, params?: { center_id?: number }) => apiClient.delete(`/assignments/${id}`, { params }),
};

export const debtAPI = {
  getAll: () => apiClient.get('/debts'),
  getById: (id: number) => apiClient.get(`/debts/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/debts/student/${studentId}`),
  getPaymentSummary: (studentId: number) => apiClient.get(`/debts/student/${studentId}/summary`),
  analyzeUnpaidMonths: (params?: { center_id?: number; start_date?: string; end_date?: string }) => 
    apiClient.get('/debts/analyze', { params }),
  generateFromAnalysis: (data: { student_ids: number[]; monthly_fee: number; center_id?: number; remarks?: string }) =>
    apiClient.post('/debts/generate-from-analysis', data),
  create: (data: any) => apiClient.post('/debts', data),
  update: (id: number, data: any) => apiClient.put(`/debts/${id}`, data),
  delete: (id: number) => apiClient.delete(`/debts/${id}`),
};

export const testAPI = {
  // Test CRUD
  getAll: (params?: { center_id?: number; test_type?: string; is_active?: boolean; subject_id?: number }) =>
    apiClient.get('/tests', { params }),
  getById: (id: number) => apiClient.get(`/tests/${id}`),
  create: (data: any) => apiClient.post('/tests', data),
  update: (id: number, data: any) => apiClient.put(`/tests/${id}`, data),
  delete: (id: number) => apiClient.delete(`/tests/${id}`),
  
  // Questions
  addQuestion: (testId: number, data: any) => apiClient.post(`/tests/${testId}/questions`, data),
  updateQuestion: (questionId: number, data: any) => apiClient.put(`/tests/questions/${questionId}`, data),
  deleteQuestion: (questionId: number) => apiClient.delete(`/tests/questions/${questionId}`),
  
  // Passages
  addPassage: (testId: number, data: any) => apiClient.post(`/tests/${testId}/passages`, data),
  updatePassage: (passageId: number, data: any) => apiClient.put(`/tests/passages/${passageId}`, data),
  deletePassage: (passageId: number) => apiClient.delete(`/tests/passages/${passageId}`),
  
  // Submissions
  startTest: (testId: number, studentId: number, userType?: string) => 
    apiClient.post(`/tests/${testId}/start`, { student_id: studentId, user_type: userType }),
  submitTest: (submissionId: number, answers: any) => apiClient.post(`/tests/submissions/${submissionId}/submit`, { answers }),
  gradeSubmission: (submissionId: number, data: any) => apiClient.post(`/tests/submissions/${submissionId}/grade`, data),
  getSubmissionsByTest: (testId: number) => apiClient.get(`/tests/${testId}/submissions`),
  getSubmissionsByStudent: (studentId: number) => apiClient.get(`/tests/student/${studentId}/submissions`),
  getSubmissionDetails: (submissionId: number) => apiClient.get(`/tests/submissions/${submissionId}`),
  
  // Results
  getTestResults: (testId: number) => apiClient.get(`/tests/${testId}/results`),
  getStudentResults: (studentId: number) => apiClient.get(`/tests/student/${studentId}/results`),
  
  // Assignments
  assignTest: (testId: number, assignments: any[], assignedBy: number) =>
    apiClient.post(`/tests/${testId}/assign`, { assignments, assigned_by: assignedBy }),
  getAssignedTests: (type: 'student' | 'teacher' | 'class', id: number, studentId?: number) =>
    apiClient.get(`/tests/assigned/${type}/${id}${studentId ? `?student_id=${studentId}` : ''}`),
};

export const centerAPI = {
  getAll: () => apiClient.get('/centers'),
  getSummaries: (options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/centers/summaries', {
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  getById: (id: number) => apiClient.get(`/centers/${id}`),
  create: (data: any) => apiClient.post('/centers', data),
  update: (id: number, data: any) => apiClient.put(`/centers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/centers/${id}`),
};

export const subjectAPI = {
  getAll: () => apiClient.get('/subjects'),
  getById: (id: number) => apiClient.get(`/subjects/${id}`),
  getByClass: (classId: number, params?: { center_id?: number }) => apiClient.get(`/subjects/class/${classId}`, { params }),
  create: (data: any) => apiClient.post('/subjects', data),
  update: (id: number, data: any) => apiClient.put(`/subjects/${id}`, data),
  delete: (id: number) => apiClient.delete(`/subjects/${id}`),
};

export const superuserAPI = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post('/superusers/auth/login', credentials),
  getAll: () => apiClient.get('/superusers'),
  getById: (id: number) => apiClient.get(`/superusers/${id}`),
  create: (data: any) => apiClient.post('/superusers', data),
  update: (id: number, data: any) => apiClient.put(`/superusers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/superusers/${id}`),
};

export const ownerAPI = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post('/owners/auth/login', credentials),
  register: (data: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    invite_key: string;
  }) => apiClient.post('/owners/auth/register', data),
  getAll: () => apiClient.get('/owners'),
  getById: (id: number) => apiClient.get(`/owners/${id}`),
  create: (data: any) => apiClient.post('/owners', data),
  update: (id: number, data: any) => apiClient.put(`/owners/${id}`, data),
  delete: (id: number) => apiClient.delete(`/owners/${id}`),
  changePassword: (id: number, data: { old_password: string; new_password: string }) =>
    apiClient.post(`/owners/${id}/change-password`, data),
};

export const roomAPI = {
  getAll: (params?: { center_id?: number }) => apiClient.get('/rooms', { params }),
  getPhysical: (params?: Record<string, unknown>) => apiClient.get('/rooms/physical', { params }),
  getById: (id: number) => apiClient.get(`/rooms/${id}`),
  create: (data: any) => apiClient.post('/rooms', data),
  update: (id: number, data: any) => apiClient.put(`/rooms/${id}`, data),
  delete: (id: number, params?: { center_id?: number }) => apiClient.delete(`/rooms/${id}`, { params }),
  getOverview: (params?: Record<string, unknown>) => apiClient.get('/rooms/overview', { params }),
  getAvailability: (params?: Record<string, unknown>) => apiClient.get('/rooms/availability', { params }),
  getSchedule: (params?: Record<string, unknown>) => apiClient.get('/rooms/schedule', { params }),
  getUtilization: (params?: Record<string, unknown>) => apiClient.get('/rooms/reports/utilization', { params }),
};

export const roomSlotAPI = {
  getBookingsByClass: (classId: number, params?: { center_id?: number }) =>
    apiClient.get(`/room-slots/bookings/class/${classId}`, { params }),
};

export type TranslationRow = {
  id: string;
  english: string;
  uzbek: string;
};

export const translationAPI = {
  getAll: () => apiClient.get<TranslationRow[]>('/translations'),
  getById: (id: string) => apiClient.get<TranslationRow>(`/translations/${encodeURIComponent(id)}`),
  save: (id: string, data: Pick<TranslationRow, 'english' | 'uzbek'>) =>
    apiClient.put<TranslationRow>(`/translations/${encodeURIComponent(id)}`, data),
  bulkSave: (translations: TranslationRow[]) =>
    apiClient.post<TranslationRow[]>('/translations/bulk', { translations }),
  delete: (id: string) => apiClient.delete(`/translations/${encodeURIComponent(id)}`),
};

export const systemAPI = {
  getStats: () => apiClient.get('/system/stats'),
  getDatabaseTables: () => apiClient.get('/system/database/tables'),
  getDatabaseTableRows: (table: string, params?: { limit?: number; offset?: number; q?: string }) =>
    apiClient.get(`/system/database/tables/${encodeURIComponent(table)}/rows`, { params }),
  redeploy: (password: string) => apiClient.post('/system/redeploy', { password }),
  resetStudents: (confirmation: string) => apiClient.post('/system/dev/reset-students', { confirmation }),
  resetTeachers: (confirmation: string) => apiClient.post('/system/dev/reset-teachers', { confirmation }),
  resetClasses: (confirmation: string) => apiClient.post('/system/dev/reset-classes', { confirmation }),
  resetPayments: (confirmation: string) => apiClient.post('/system/dev/reset-payments', { confirmation }),
};

export const settingsAPI = {
  getOwnerPalette: () => apiClient.get('/settings/owner-palette'),
  saveOwnerPalette: (palette: { id: string; primary: string; secondary: string; tertiary: string } | string) => apiClient.put('/settings/owner-palette', { palette }),
  getVisualOverrides: () => apiClient.get('/settings/visual-overrides'),
  saveVisualOverrides: (overrides: Array<{ key: string; color?: string; textColor?: string; fontSize?: number; fontWeight?: string; fontStyle?: string; textDecoration?: string }>) => apiClient.put('/settings/visual-overrides', { overrides }),
  getLessonScoring: () => apiClient.get('/settings/lesson-scoring'),
  saveLessonScoring: (data: any) => apiClient.put('/settings/lesson-scoring', data),
  getSidebarOrder: () => apiClient.get('/settings/sidebar-order'),
  saveSidebarOrder: (order: string[]) => apiClient.put('/settings/sidebar-order', { order }),
};

export const portalAPI = {
  getDashboard: () => apiClient.get('/portal/dashboard'),
  getAttendance: () => apiClient.get('/portal/attendance'),
  getGrades: () => apiClient.get('/portal/grades'),
  getTests: () => apiClient.get('/portal/tests'),
  getSchedule: () => apiClient.get('/portal/schedule'),
};

// Mongo-backed request logs (superuser/owner only).
export const requestLogsAPI = {
  list: (params?: {
    kind?: 'owner' | 'superuser' | 'teacher' | 'student';
    q?: string;
    method?: string;
    result?: string;
    statusCode?: number | string;
    statusMin?: number | string;
    statusMax?: number | string;
    durationMin?: number | string;
    durationMax?: number | string;
    username?: string;
    ip?: string;
    path?: string;
    requestId?: string;
    role?: string;
    deviceId?: string;
    from?: string;
    to?: string;
    limit?: number;
    skip?: number;
  }) => apiClient.get('/request-logs', { params }),
};


export const authAPI = {
  loginSuperuser: (credentials: { username: string; password: string }) =>
    superuserAPI.login(credentials),
  loginOwner: (credentials: { username: string; password: string }) =>
    ownerAPI.login(credentials),
  registerOwner: (data: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    invite_key: string;
  }) => ownerAPI.register(data),
  loginTeacher: (credentials: { username: string; password: string }) =>
    apiClient.post('/teachers/auth/login', credentials),
  loginTeacherPayment: (credentials: { username: string; password: string }) =>
    apiClient.post('/teachers/auth/payment-login', credentials),
  loginStudent: (credentials: { username: string; password: string }) =>
    apiClient.post('/students/auth/login', credentials),
};
