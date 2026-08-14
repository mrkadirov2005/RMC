// Shared utility helpers.

import type {
  OwnerManagerDailyIncomeRow,
  OwnerManagerFormData,
  OwnerManagerPaymentMonthStats,
  OwnerManagerStatisticsCenterBreakdown,
  OwnerManagerStatisticsSummary,
  OwnerManagerTeacherEarningRow,
} from './types';

// Normalizes permissions.
export const normalizePermissions = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((permission) => String(permission)).filter(Boolean);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, boolean>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([permission]) => permission);
  }
  return [];
};

// Reads a center id from an API row. The centers endpoint returns Drizzle's
// camelCase keys (centerId), so snake_case alone yields NaN.
export const getCenterOptionId = (center: any): number | null => {
  const parsed = Number(center?.center_id ?? center?.centerId ?? center?.id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// Reads a center display name, falling back to the id when unnamed.
export const getCenterOptionName = (center: any): string => {
  const name = String(center?.center_name ?? center?.centerName ?? center?.name ?? '').trim();
  if (name) return name;
  const id = getCenterOptionId(center);
  return id ? `Center ${id}` : 'Center';
};

// Returns owner manager row id.
export const getOwnerManagerRowId = (item: any) =>
  item.id || item.owner_id || item.superuser_id || item.teacher_id || item.student_id || item.center_id;

// Summarizes attendance using the same present/absent rules as the owner overview.
export const summarizeOwnerAttendance = (rows: any[]) => rows.reduce(
  (summary, row) => {
    const status = String(row?.status || '').trim().toLowerCase();
    if (status === 'present' || status === 'late') summary.present += 1;
    if (status === 'absent' || status === 'absent nr' || status === 'absent r') summary.absent += 1;
    return summary;
  },
  { present: 0, absent: 0 },
);

// Creates initial form state.
export const createInitialFormState = (activeTab: string, activeCenterId: number | null): OwnerManagerFormData => {
  if (activeTab === 'superusers') {
    return {
      branch_id: activeCenterId ?? undefined,
      role: 'admin',
      status: 'Active',
      permissions: [],
    };
  }

  if (activeTab === 'teachers' || activeTab === 'students') {
    return activeCenterId ? { branch_id: activeCenterId } : {};
  }

  return {};
};

// Builds owner-facing student statistics.
export const buildOwnerStudentStatistics = (
  students: any[],
  centerLookup: Map<number, string>
): OwnerManagerStatisticsSummary => {
  const summary: OwnerManagerStatisticsSummary = {
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    otherStudents: 0,
    assignedToClass: 0,
    assignedToTeacher: 0,
    centerBreakdown: [],
  };

  const centerCounts = new Map<number, OwnerManagerStatisticsCenterBreakdown>();

  students.forEach((student) => {
    summary.totalStudents += 1;

    const status = String(student?.status || '').trim().toLowerCase();
    if (status === 'active') {
      summary.activeStudents += 1;
    } else {
      summary.inactiveStudents += 1;
    }

    const gender = String(student?.gender || '').trim().toLowerCase();
    if (gender === 'male') {
      summary.maleStudents += 1;
    } else if (gender === 'female') {
      summary.femaleStudents += 1;
    } else {
      summary.otherStudents += 1;
    }

    if (student?.class_id) {
      summary.assignedToClass += 1;
    }
    if (student?.teacher_id) {
      summary.assignedToTeacher += 1;
    }

    const centerId = Number(student?.center_id || 0);
    if (!Number.isFinite(centerId) || centerId <= 0) return;

    const existing = centerCounts.get(centerId) || {
      centerId,
      centerName: centerLookup.get(centerId) || `Center ${centerId}`,
      totalStudents: 0,
      activeStudents: 0,
    };

    existing.totalStudents += 1;
    if (status === 'active') {
      existing.activeStudents += 1;
    }
    centerCounts.set(centerId, existing);
  });

  summary.centerBreakdown = Array.from(centerCounts.values()).sort((a, b) => b.totalStudents - a.totalStudents);

  return summary;
};

// Normalizes a payment status for owner statistics.
const isCompletedPayment = (payment: any) => {
  const status = String(payment?.status || payment?.payment_status || '').trim().toLowerCase();
  return status === 'completed' || status === 'paid';
};

// Reads the most reliable date field available on a payment row.
export const getOwnerPaymentDateValue = (payment: any) =>
  payment?.payment_date || payment?.paid_at || payment?.date || payment?.created_at || payment?.updated_at;

// Reads the payment amount across API/import variants.
export const getOwnerPaymentAmount = (payment: any) =>
  Number(payment?.amount || payment?.paid_amount || payment?.payment_amount || 0);

// Returns the `YYYY-MM` month key for date-like values.
export const getOwnerMonthKey = (value: unknown): string | null => {
  if (!value) return null;
  const raw = String(value).trim();
  const isoMonth = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
  if (isoMonth) return `${isoMonth[1]}-${isoMonth[2]}`;
  const dottedMonth = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dottedMonth) return `${dottedMonth[3]}-${dottedMonth[2].padStart(2, '0')}`;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Returns the payment's month key from all known date fields.
export const getOwnerPaymentMonthKey = (payment: any): string | null =>
  getOwnerMonthKey(getOwnerPaymentDateValue(payment));

// Builds payments graph stats for the selected month.
export const buildOwnerPaymentMonthStats = (
  students: any[],
  payments: any[],
  selectedMonth: string
): OwnerManagerPaymentMonthStats => {
  const paidStudentIds = new Set<number>();

  payments.forEach((payment) => {
    if (!isCompletedPayment(payment)) return;
    if (getOwnerPaymentMonthKey(payment) !== selectedMonth) return;

    const studentId = Number(payment?.student_id || 0);
    if (studentId > 0) {
      paidStudentIds.add(studentId);
    }
  });

  const totalStudents = students.length;
  const paidStudents = paidStudentIds.size;
  const unpaidStudents = Math.max(totalStudents - paidStudents, 0);
  const paidPercent = totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0;

  return {
    totalStudents,
    paidStudents,
    unpaidStudents,
    paidPercent,
    unpaidPercent: Math.max(100 - paidPercent, 0),
  };
};

// Builds one income row per calendar day that received at least one paid payment in the selected month.
export const buildOwnerDailyIncomeRows = (
  payments: any[],
  selectedMonth: string
): OwnerManagerDailyIncomeRow[] => {
  const buckets = new Map<string, { dateLabel: string; paymentCount: number; students: Set<number>; total: number }>();

  payments.forEach((payment) => {
    if (!isCompletedPayment(payment)) return;
    if (getOwnerPaymentMonthKey(payment) !== selectedMonth) return;

    const raw = getOwnerPaymentDateValue(payment);
    if (!raw) return;
    const date = new Date(String(raw));
    if (Number.isNaN(date.getTime())) return;

    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    let bucket = buckets.get(dateKey);
    if (!bucket) {
      bucket = { dateLabel: date.toLocaleDateString(), paymentCount: 0, students: new Set<number>(), total: 0 };
      buckets.set(dateKey, bucket);
    }

    bucket.paymentCount += 1;
    bucket.total += getOwnerPaymentAmount(payment);
    const studentId = Number(payment?.student_id || 0);
    if (studentId) bucket.students.add(studentId);
  });

  return Array.from(buckets.entries())
    .map(([dateKey, bucket]) => ({
      dateKey,
      dateLabel: bucket.dateLabel,
      paymentCount: bucket.paymentCount,
      studentCount: bucket.students.size,
      total: bucket.total,
    }))
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
};

// Builds teacher earnings rows for the selected month.
export const buildOwnerTeacherEarnings = (
  students: any[],
  teachers: any[],
  classes: any[],
  payments: any[],
  selectedMonth: string
): OwnerManagerTeacherEarningRow[] => {
  const studentLookup = new Map<number, any>();
  students.forEach((student) => {
    const studentId = Number(student?.student_id || student?.id || 0);
    if (studentId > 0) {
      studentLookup.set(studentId, student);
    }
  });

  return teachers
    .map((teacher) => {
      const teacherId = Number(teacher?.teacher_id || teacher?.id || 0);
      if (!teacherId) return null;

      const teacherClasses = classes.filter((cls) => Number(cls?.teacher_id || 0) === teacherId);
      const teacherClassIds = new Set(
        teacherClasses.map((cls) => Number(cls?.class_id || cls?.id || 0)).filter((classId) => classId > 0)
      );
      const teacherStudents = students.filter((student) => teacherClassIds.has(Number(student?.class_id || 0)));
      const monthPayments = payments.filter((payment) => {
        if (!isCompletedPayment(payment)) return false;
        if (getOwnerPaymentMonthKey(payment) !== selectedMonth) return false;
        const studentId = Number(payment?.student_id || 0);
        const student = studentLookup.get(studentId);
        return Boolean(student && teacherClassIds.has(Number(student.class_id || 0)));
      });

      const paidStudentIds = new Set<number>();
      let earnedAmount = 0;
      monthPayments.forEach((payment) => {
        const studentId = Number(payment?.student_id || 0);
        if (studentId > 0) {
          paidStudentIds.add(studentId);
        }
        earnedAmount += getOwnerPaymentAmount(payment);
      });

      const totalStudents = teacherStudents.length;
      const paidStudents = paidStudentIds.size;
      const unpaidStudents = Math.max(totalStudents - paidStudents, 0);
      const teacherName = [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ').trim() || `Teacher ${teacherId}`;

      return {
        teacherId,
        teacherName,
        totalStudents,
        paidStudents,
        unpaidStudents,
        classCount: teacherClasses.length,
        paymentCount: monthPayments.length,
        earnedAmount,
      };
    })
    .filter((row): row is OwnerManagerTeacherEarningRow => Boolean(row))
    .sort((a, b) => b.earnedAmount - a.earnedAmount);
};
