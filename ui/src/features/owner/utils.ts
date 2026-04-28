// Shared utility helpers.

import type {
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

// Returns owner manager row id.
export const getOwnerManagerRowId = (item: any) =>
  item.id || item.owner_id || item.superuser_id || item.teacher_id || item.student_id || item.center_id;

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

// Returns the `YYYY-MM` month key for date-like values.
const getMonthKey = (value: unknown): string | null => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Builds payments graph stats for the selected month.
export const buildOwnerPaymentMonthStats = (
  students: any[],
  payments: any[],
  selectedMonth: string
): OwnerManagerPaymentMonthStats => {
  const paidStudentIds = new Set<number>();

  payments.forEach((payment) => {
    if (!isCompletedPayment(payment)) return;
    if (getMonthKey(payment?.payment_date) !== selectedMonth) return;

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
        if (getMonthKey(payment?.payment_date) !== selectedMonth) return false;
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
        earnedAmount += Number(payment?.amount || 0);
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
