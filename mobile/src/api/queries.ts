import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type {
  AppNotification,
  NotificationPreference,
  Paged,
  AttendanceResponse,
  Child,
  CoinsResponse,
  Dashboard,
  Device,
  GradesResponse,
  Leaderboard,
  PaymentsResponse,
  ScheduleSlot,
} from './types';

// @MOB-102 One base path per learner: the student's own data, or a parent's chosen child.
export const learnerBase = (childId?: number | null) => (childId ? `/parent/children/${childId}` : '/student');

const get = <T,>(path: string) => api.request<T>(path);

// @MOB-031 @MOB-130 Home screen data.
export const useDashboard = (childId?: number | null, enabled = true) =>
  useQuery({ queryKey: ['dashboard', childId ?? 'me'], queryFn: () => get<Dashboard>(`${learnerBase(childId)}/dashboard`), enabled });

// @MOB-121
export const useSchedule = (childId?: number | null) =>
  useQuery({ queryKey: ['schedule', childId ?? 'me'], queryFn: () => get<{ items: ScheduleSlot[] }>(`${learnerBase(childId)}/schedule`) });

// @MOB-121
export const useAttendance = (childId?: number | null, pageSize = 50) =>
  useQuery({
    queryKey: ['attendance', childId ?? 'me', pageSize],
    queryFn: () => get<AttendanceResponse>(`${learnerBase(childId)}/attendance?page_size=${pageSize}`),
  });

// @MOB-122 @MOB-132
export const useGrades = (childId?: number | null, pageSize = 50) =>
  useQuery({
    queryKey: ['grades', childId ?? 'me', pageSize],
    queryFn: () => get<GradesResponse>(`${learnerBase(childId)}/grades?page_size=${pageSize}`),
  });

// @MOB-123
export const useCoins = (childId?: number | null) =>
  useQuery({ queryKey: ['coins', childId ?? 'me'], queryFn: () => get<CoinsResponse>(`${learnerBase(childId)}/coins?page_size=100`) });

// @MOB-133
export const usePayments = (childId?: number | null) =>
  useQuery({ queryKey: ['payments', childId ?? 'me'], queryFn: () => get<PaymentsResponse>(`${learnerBase(childId)}/payments?page_size=100`) });

// @MOB-123
export const useLeaderboard = (scope: 'class' | 'center') =>
  useQuery({ queryKey: ['leaderboard', scope], queryFn: () => get<Leaderboard>(`/student/leaderboard?scope=${scope}`) });

// @MOB-131
export const useChildren = (enabled = true) =>
  useQuery({ queryKey: ['children'], queryFn: () => get<{ items: Child[] }>('/parent/children'), enabled });

// @MOB-114
export const useDevices = () => useQuery({ queryKey: ['devices'], queryFn: () => get<{ items: Device[] }>('/devices') });

export const revokeDevice = (sessionId: number) => api.request(`/devices/${sessionId}`, { method: 'DELETE' });

// @MOB-126 Inbox; refetched every minute while a screen shows the bell.
export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: () => get<Paged<AppNotification> & { unread: number }>('/notifications?page_size=50'),
    refetchInterval: 60_000,
  });

export const markNotificationsRead = (notificationId?: number) =>
  api.request('/notifications/read', { method: 'POST', body: JSON.stringify(notificationId ? { notification_id: notificationId } : {}) });

// @MOB-114 Per-category notification switches.
export const useNotificationPreferences = () =>
  useQuery({ queryKey: ['notification-preferences'], queryFn: () => get<{ items: NotificationPreference[] }>('/notification-preferences') });

export const setNotificationPreference = (category: string, enabled: boolean) =>
  api.request<{ items: NotificationPreference[] }>('/notification-preferences', { method: 'PUT', body: JSON.stringify({ category, enabled }) });
