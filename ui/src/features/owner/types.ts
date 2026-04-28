// Shared TypeScript types.

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type OwnerManagerTabType = 'centers' | 'owners' | 'superusers' | 'teachers' | 'students' | 'statistics';

export interface OwnerManagerFormData {
  [key: string]: string | number | boolean | string[] | Record<string, boolean> | undefined;
  permissions?: string[] | Record<string, boolean>;
}

export interface OwnerManagerColumnDef {
  key: string;
  label: string;
  render?: (item: any) => ReactNode;
}

export interface OwnerManagerFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'date' | 'password';
  required?: boolean;
}

export interface OwnerManagerMeta {
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface OwnerManagerStatisticsCenterBreakdown {
  centerId: number;
  centerName: string;
  totalStudents: number;
  activeStudents: number;
}

export interface OwnerManagerStatisticsSummary {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  maleStudents: number;
  femaleStudents: number;
  otherStudents: number;
  assignedToClass: number;
  assignedToTeacher: number;
  centerBreakdown: OwnerManagerStatisticsCenterBreakdown[];
}

export interface OwnerManagerStatisticsCollections {
  students: any[];
  teachers: any[];
  classes: any[];
  payments: any[];
}

export type OwnerManagerStatisticsSection = 'overview' | 'payments' | 'teachers' | 'statistics';

export interface OwnerManagerPaymentMonthStats {
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  paidPercent: number;
  unpaidPercent: number;
}

export interface OwnerManagerTeacherEarningRow {
  teacherId: number;
  teacherName: string;
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  classCount: number;
  paymentCount: number;
  earnedAmount: number;
}
