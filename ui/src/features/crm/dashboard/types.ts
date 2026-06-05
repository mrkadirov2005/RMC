// Shared TypeScript types.

import type { LucideIcon } from 'lucide-react';

export type DashboardRole = 'superuser' | 'teacher' | 'student' | string;

export type DashboardRecord = Record<string, unknown>;

export type DashboardScopeType = 'all' | 'teacher' | 'class' | 'school' | 'status';

export interface DashboardScope {
  type: DashboardScopeType;
  value: string;
}

export interface DashboardScopeOption {
  value: string;
  label: string;
  count: number;
  meta?: string;
}

export type DashboardScopeOptions = Record<Exclude<DashboardScopeType, 'all'>, DashboardScopeOption[]>;

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
  multiClassStudents: number;
  totalCenters: number;
  totalSchools: number;
  newStudentsThisMonth: number;
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

export interface DashboardFinancialBucket {
  label: string;
  paid: number;
}

export interface DashboardFinancialMonth {
  monthKey: string;
  monthLabel: string;
  expectedPayments: number;
  paidPayments: number;
  remainingPayments: number;
  paidStudents: number;
  unpaidStudents: number;
  collectionRate: number;
  outstandingDebt: number;
  buckets: DashboardFinancialBucket[];
}

export interface DashboardSchoolSlice {
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface DashboardStudentGrowthPoint {
  label: string;
  newStudents: number;
  totalStudents: number;
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
  detailsType?:
    | 'students'
    | 'teachers'
    | 'schools'
    | 'newStudents'
    | 'expectedPayments'
    | 'collectedPayments'
    | 'remainingPayments'
    | 'outstandingDebts';
}

export interface DashboardFocusItem {
  label: string;
  value: string | number;
}
