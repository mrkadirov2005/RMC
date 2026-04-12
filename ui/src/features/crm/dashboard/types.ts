import type { LucideIcon } from 'lucide-react';

export type DashboardRole = 'superuser' | 'teacher' | 'student' | string;

export type DashboardRecord = Record<string, unknown>;

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalCenters: number;
  activeTests: number;
  pendingAssignments: number;
  attendanceToday: number;
  paymentsThisMonth: number;
  outstandingDebt: number;
}

export interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  date?: string;
  meta?: string;
}

export interface DashboardStatCard {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
}

export interface DashboardFocusItem {
  label: string;
  value: string | number;
}

