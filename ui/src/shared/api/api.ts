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
import { getResolvedCenterId } from '../auth/centerScope';

// Default to relative `/api` so the same frontend build works behind:
// - Vite dev proxy (local development)
// - Nginx reverse proxy (Docker/production)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

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

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const paymentToken = localStorage.getItem('payment_token');
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
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

  const normalizedRole = String(user?.role || '').toLowerCase();
  const isGlobalSuperuser = user?.userType === 'superuser' && normalizedRole === 'owner';
  const isOwnerEndpoint = String(config.url || '').startsWith('/owners');
  const activeCenterId = getResolvedCenterId(user);

  if (!skipCenterScope && isGlobalSuperuser && activeCenterId && !isOwnerEndpoint) {
    if (config.method === 'get' || config.method === 'delete') {
// Handles params.
      const params = (config.params ?? {}) as Record<string, unknown>;
      if (params.center_id == null || params.center_id === 0) {
        config.params = { ...params, center_id: activeCenterId };
      }
    }
  }

  const isMutating = Boolean(config.method && ['post', 'put', 'patch'].includes(config.method));
  const hasBody = config.data && typeof config.data === 'object' && !(config.data instanceof FormData);
  const payload = hasBody ? (config.data as Record<string, unknown>) : undefined;
  if (!skipCenterScope && isMutating && payload && !isOwnerEndpoint) {
// Handles payload center id.
    const payloadCenterId = (payload as any).center_id;
    if (payloadCenterId == null || payloadCenterId === 0) {
      const scopedCenterId = isGlobalSuperuser ? activeCenterId : (user?.center_id ?? null);
      if (scopedCenterId) {
        config.data = { ...payload, center_id: scopedCenterId };
      }
    }
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
      if (url.startsWith('/payments') && user?.userType === 'teacher') {
        localStorage.removeItem('payment_token');
        store.dispatch(paymentLogout());
        showToast.error(error.response?.data?.error || 'Payment access expired. Please re-login.');
        return Promise.reject(error);
      }
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const errorMessage = error.response?.data?.error || 'Session expired. Please log in again.';
      showToast.error(errorMessage);
      // Redirect to login page
      if (!window.location.pathname.includes('/login')) {
        const loginUser = user?.role === 'owner' ? '/login/owner' : '/login/superuser';
        window.location.href = loginUser;
      }
      return Promise.reject(error);
    }

    // Handle 403 (forbidden) - insufficient permissions
    if (error.response?.status === 403) {
      const url = error.config?.url || '';
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const errorMessage = error.response?.data?.error || 'Access denied. Insufficient permissions.';

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
  getAll: (params?: Record<string, unknown>, options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/students', {
      params,
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  getById: (id: number) => apiClient.get(`/students/${id}`),
  create: (data: any) => apiClient.post('/students', data),
  update: (id: number, data: any) => apiClient.put(`/students/${id}`, data),
  delete: (id: number) => apiClient.delete(`/students/${id}`),
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

export const teacherAPI = {
  getAll: (params?: Record<string, unknown>, options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/teachers', {
      params,
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  getById: (id: number) => apiClient.get(`/teachers/${id}`),
  create: (data: any) => apiClient.post('/teachers', data),
  update: (id: number, data: any) => apiClient.put(`/teachers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/teachers/${id}`),
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
  getById: (id: number) => apiClient.get(`/classes/${id}`),
  getSessions: (id: number) => apiClient.get(`/classes/${id}/sessions`),
  create: (data: any) => apiClient.post('/classes', data),
  update: (id: number, data: any) => apiClient.put(`/classes/${id}`, data),
  delete: (id: number, params?: { force?: boolean }) => apiClient.delete(`/classes/${id}`, { params }),
  generateSessions: (id: number, data: { month: number; year: number; duration_minutes: number }) =>
    apiClient.post(`/classes/${id}/sessions/generate`, data),
  deleteSessions: (id: number, params: { from: string; to?: string }) =>
    apiClient.delete(`/classes/${id}/sessions`, { params }),
  deleteSessionById: (id: number, sessionId: number) =>
    apiClient.delete(`/classes/${id}/sessions/${sessionId}`),
  createSession: (id: number, data: { session_date: string; start_time: string; duration_minutes?: number; teacher_id?: number }) =>
    apiClient.post(`/classes/${id}/sessions`, data),
};


export const paymentAPI = {
  getAll: (params?: Record<string, unknown>, options?: { skipCenterScope?: boolean }) =>
    apiClient.get('/payments', {
      params,
      headers: options?.skipCenterScope ? { 'X-Skip-Center-Scope': '1' } : undefined,
    }),
  getById: (id: number) => apiClient.get(`/payments/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/payments/student/${studentId}`),
  create: (data: any) => apiClient.post('/payments', data),
  update: (id: number, data: any) => apiClient.put(`/payments/${id}`, data),
  delete: (id: number) => apiClient.delete(`/payments/${id}`),
};

export const gradeAPI = {
  getAll: () => apiClient.get('/grades'),
  getById: (id: number) => apiClient.get(`/grades/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/grades/student/${studentId}`),
  getBySession: (sessionId: number) => apiClient.get(`/grades/session/${sessionId}`),
  create: (data: any) => apiClient.post('/grades', data),
  bulkCreate: (grades: any[]) => apiClient.post('/grades/bulk', { grades }),
  update: (id: number, data: any) => apiClient.put(`/grades/${id}`, data),
  delete: (id: number) => apiClient.delete(`/grades/${id}`),
  upsertSessionScores: (data: any) => apiClient.post('/grades/session-scores', data),
};

export const attendanceAPI = {
  getAll: (params?: { center_id?: number }) => apiClient.get('/attendance', { params }),
  getById: (id: number) => apiClient.get(`/attendance/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/attendance/student/${studentId}`),
  getByClass: (classId: number, params?: { center_id?: number }) => apiClient.get(`/attendance/class/${classId}`, { params }),
  getBySession: (sessionId: number) => apiClient.get(`/attendance/session/${sessionId}`),
  create: (data: any) => apiClient.post('/attendance', data),
  update: (id: number, data: any) => apiClient.put(`/attendance/${id}`, data),
  delete: (id: number, params?: { center_id?: number }) => apiClient.delete(`/attendance/${id}`, { params }),
};

export const assignmentAPI = {
  getAll: () => apiClient.get('/assignments'),
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
  getById: (id: number) => apiClient.get(`/centers/${id}`),
  create: (data: any) => apiClient.post('/centers', data),
  update: (id: number, data: any) => apiClient.put(`/centers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/centers/${id}`),
};

export const subjectAPI = {
  getAll: () => apiClient.get('/subjects'),
  getById: (id: number) => apiClient.get(`/subjects/${id}`),
  getByClass: (classId: number) => apiClient.get(`/subjects/class/${classId}`),
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
  getById: (id: number) => apiClient.get(`/rooms/${id}`),
  create: (data: any) => apiClient.post('/rooms', data),
  update: (id: number, data: any) => apiClient.put(`/rooms/${id}`, data),
  delete: (id: number, params?: { center_id?: number }) => apiClient.delete(`/rooms/${id}`, { params }),
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
