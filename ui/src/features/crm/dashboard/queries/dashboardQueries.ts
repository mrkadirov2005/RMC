import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileQuestion,
  GraduationCap,
  Users,
} from 'lucide-react';
import type {
  DashboardActivityItem,
  DashboardCollections,
  DashboardFocusItem,
  DashboardRole,
  DashboardRecord,
  DashboardStatCard,
  DashboardStats,
} from '../types';

const todayKey = new Date().toISOString().split('T')[0];

const formatMoney = (value: number) => `$${value.toLocaleString()}`;

const getRecordValue = (item: DashboardRecord, key: string) => item[key];

const getRecordString = (item: DashboardRecord, key: string): string | undefined => {
  const value = getRecordValue(item, key);
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

const getRecordNumber = (item: DashboardRecord, key: string): number | undefined => {
  const value = getRecordValue(item, key);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

const getRecordBoolean = (item: DashboardRecord, key: string): boolean => {
  return Boolean(getRecordValue(item, key));
};

export const createInitialDashboardStats = (): DashboardStats => ({
  totalStudents: 0,
  totalTeachers: 0,
  totalClasses: 0,
  totalCenters: 0,
  activeTests: 0,
  pendingAssignments: 0,
  attendanceToday: 0,
  paymentsThisMonth: 0,
  outstandingDebt: 0,
});

const getDateValue = (item: Record<string, unknown>): string | undefined =>
  (item.created_at as string | undefined) ||
  (item.updated_at as string | undefined) ||
  (item.payment_date as string | undefined) ||
  (item.attendance_date as string | undefined) ||
  (item.debt_date as string | undefined) ||
  (item.due_date as string | undefined) ||
  (item.date as string | undefined);

export const formatDashboardDate = (value?: string) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

export const buildDashboardStats = (
  collections: DashboardCollections,
  isSuperuser: boolean
): DashboardStats => {
  const attendanceToday = collections.attendance.filter(
    (item) => getRecordString(item, 'attendance_date')?.split('T')[0] === todayKey
  ).length;

  const activeTests = collections.tests.filter(
    (item) =>
      getRecordBoolean(item, 'is_active') ||
      getRecordString(item, 'status')?.toLowerCase() === 'active'
  ).length;

  const pendingAssignments = collections.assignments.filter(
    (item) => getRecordString(item, 'status')?.toLowerCase() === 'pending'
  ).length;

  const now = new Date();
  const paymentsThisMonth = collections.payments
    .filter((item) => {
      const value = getRecordString(item, 'payment_date');
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return false;
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear() &&
        getRecordString(item, 'status')?.toLowerCase() === 'completed'
      );
    })
    .reduce((sum, item) => sum + (getRecordNumber(item, 'amount') || 0), 0);

  const outstandingDebt = collections.debts.reduce((sum, item) => {
    const debtAmount = getRecordNumber(item, 'debt_amount') || 0;
    const amountPaid = getRecordNumber(item, 'amount_paid') || 0;
    const remaining = debtAmount - amountPaid;
    return remaining > 0 ? sum + remaining : sum;
  }, 0);

  return {
    totalStudents: collections.students.length,
    totalTeachers: isSuperuser ? collections.teachers.length : 0,
    totalClasses: collections.classes.length,
    totalCenters: isSuperuser ? collections.centers.length : 0,
    activeTests,
    pendingAssignments,
    attendanceToday,
    paymentsThisMonth,
    outstandingDebt,
  };
};

const appendActivity = (
  items: DashboardActivityItem[],
  collection: DashboardCollections[keyof DashboardCollections],
  type: string,
  getTitle: (item: DashboardRecord) => string,
  getMeta?: (item: DashboardRecord) => string | undefined
) => {
  collection.slice(0, 10).forEach((item, index) => {
    items.push({
      id: `${type.toLowerCase()}-${String(getRecordValue(item, 'id') ?? index)}`,
      type,
      title: getTitle(item),
      date: getDateValue(item),
      meta: getMeta?.(item),
    });
  });
};

export const buildDashboardActivity = (
  collections: DashboardCollections
): DashboardActivityItem[] => {
  const activityItems: DashboardActivityItem[] = [];

  appendActivity(
    activityItems,
    collections.payments,
    'Payment',
    (item) => {
      const receiptNumber = getRecordString(item, 'receipt_number') || getRecordString(item, 'id') || '';
      return `Payment ${receiptNumber}`.trim();
    },
    (item) => {
      const amount = getRecordNumber(item, 'amount');
      return amount ? formatMoney(amount) : undefined;
    }
  );

  appendActivity(
    activityItems,
    collections.tests,
    'Test',
    (item) => {
      const testName = getRecordString(item, 'test_name');
      return testName ? `Test: ${testName}` : 'New test created';
    },
    (item) => {
      const testType = getRecordString(item, 'test_type');
      return testType ? testType.replace(/_/g, ' ') : undefined;
    }
  );

  appendActivity(
    activityItems,
    collections.assignments,
    'Assignment',
    (item) =>
      getRecordString(item, 'assignment_name') ||
      getRecordString(item, 'title') ||
      'Assignment updated',
    (item) => getRecordString(item, 'status')
  );

  appendActivity(
    activityItems,
    collections.attendance,
    'Attendance',
    () => 'Attendance recorded',
    (item) => getRecordString(item, 'status')
  );

  activityItems.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  return activityItems.slice(0, 6);
};

export const getDashboardStatCards = (
  stats: DashboardStats,
  isSuperuser: boolean
): DashboardStatCard[] => {
  if (isSuperuser) {
    return [
      {
        label: 'Students',
        value: stats.totalStudents,
        icon: Users,
        accent: 'from-indigo-500 to-sky-500',
      },
      {
        label: 'Teachers',
        value: stats.totalTeachers,
        icon: GraduationCap,
        accent: 'from-emerald-500 to-teal-500',
      },
      {
        label: 'Classes',
        value: stats.totalClasses,
        icon: ClipboardList,
        accent: 'from-amber-500 to-orange-500',
      },
      {
        label: 'Centers',
        value: stats.totalCenters,
        icon: Building2,
        accent: 'from-slate-500 to-zinc-500',
      },
      {
        label: 'Payments (Month)',
        value: formatMoney(stats.paymentsThisMonth),
        icon: CreditCard,
        accent: 'from-cyan-500 to-blue-500',
      },
      {
        label: 'Outstanding Debt',
        value: formatMoney(stats.outstandingDebt),
        icon: AlertTriangle,
        accent: 'from-rose-500 to-red-500',
      },
    ];
  }

  return [
    {
      label: 'My Students',
      value: stats.totalStudents,
      icon: Users,
      accent: 'from-indigo-500 to-sky-500',
    },
    {
      label: 'My Classes',
      value: stats.totalClasses,
      icon: GraduationCap,
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      label: 'Active Tests',
      value: stats.activeTests,
      icon: FileQuestion,
      accent: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Attendance Today',
      value: stats.attendanceToday,
      icon: CalendarDays,
      accent: 'from-cyan-500 to-blue-500',
    },
    {
      label: 'Pending Assignments',
      value: stats.pendingAssignments,
      icon: ClipboardList,
      accent: 'from-rose-500 to-red-500',
    },
  ];
};

export const getDashboardFocusItems = (
  stats: DashboardStats,
  isSuperuser: boolean
): DashboardFocusItem[] => {
  const items: DashboardFocusItem[] = [
    { label: 'Active Tests', value: stats.activeTests },
    { label: 'Pending Assignments', value: stats.pendingAssignments },
    { label: 'Attendance Today', value: stats.attendanceToday },
  ];

  if (isSuperuser) {
    items.push({ label: 'Outstanding Debt', value: formatMoney(stats.outstandingDebt) });
    items.push({ label: 'Payments This Month', value: formatMoney(stats.paymentsThisMonth) });
  }

  return items;
};
