// Shared TypeScript types.

import type { LucideIcon } from 'lucide-react';

export type DashboardRole = 'superuser' | 'teacher' | 'student' | string;

export type DashboardRecord = Record<string, unknown>;

export interface DashboardCollections {
  students: DashboardRecord[];
  teachers: DashboardRecord[];
  classes: DashboardRecord[];
  centers: DashboardRecord[];
  tests: DashboardRecord[];
  attendance: DashboardRecord[];
  assignments: DashboardRecord[];
  payments: DashboardRecord[];
  debts: DashboardRecord[];
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalCenters: number;
  activeTests: number;
  pendingAssignments: number;
  attendanceToday: number;
  paymentsThisMonth: number;
  expectedPaymentsThisMonth: number;
  remainingPaymentsThisMonth: number;
  paidStudentsThisMonth: number;
  unpaidStudentsThisMonth: number;
  paymentCollectionRate: number;
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
  subValue?: string;
  progress?: number;
}

export interface DashboardFocusItem {
  label: string;
  value: string | number;
}
