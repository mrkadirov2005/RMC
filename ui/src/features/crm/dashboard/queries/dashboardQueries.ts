// Source file for the dashboard area in the crm feature.

import {
  GraduationCap,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  DashboardActivityItem,
  DashboardCollections,
  DashboardFinancialMonth,
  DashboardFocusItem,
  DashboardRecord,
  DashboardScope,
  DashboardScopeOption,
  DashboardScopeOptions,
  DashboardSchoolSlice,
  DashboardStatCard,
  DashboardStats,
  DashboardStudentGrowthPoint,
} from '../types';

const todayKey = new Date().toISOString().split('T')[0];
const schoolColors = ['#38bdf8', '#34d399', '#f59e0b', '#f472b6', '#a78bfa', '#94a3b8'];

// Formats money.
const formatMoney = (value: number) => `$${value.toLocaleString()}`;

// Returns record value.
const getRecordValue = (item: DashboardRecord, key: string) => item[key];

// Returns record string.
const getRecordString = (item: DashboardRecord, key: string): string | undefined => {
  const value = getRecordValue(item, key);
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

// Returns record number.
const getRecordNumber = (item: DashboardRecord, key: string): number | undefined => {
  const value = getRecordValue(item, key);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

// Returns record boolean.
const getRecordBoolean = (item: DashboardRecord, key: string): boolean => {
  return Boolean(getRecordValue(item, key));
};

// Creates initial dashboard stats.
export const createInitialDashboardStats = (): DashboardStats => ({
  totalStudents: 0,
  totalTeachers: 0,
  totalClasses: 0,
  totalCenters: 0,
  totalSchools: 0,
  newStudentsThisMonth: 0,
  activeTests: 0,
  pendingAssignments: 0,
  attendanceToday: 0,
  paymentsThisMonth: 0,
  expectedPaymentsThisMonth: 0,
  remainingPaymentsThisMonth: 0,
  paidStudentsThisMonth: 0,
  unpaidStudentsThisMonth: 0,
  paymentCollectionRate: 0,
  outstandingDebt: 0,
});

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthLabel = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const getValidDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isSameMonth = (date: Date, month: Date) =>
  date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();

const getSchoolLabel = (student: DashboardRecord) => {
  const raw = getRecordString(student, 'school_name')?.trim();
  return raw && raw.length > 0 ? raw : 'Unknown school';
};

const getStudentId = (student: DashboardRecord) => getRecordNumber(student, 'student_id') || getRecordNumber(student, 'id');

const getTeacherId = (item: DashboardRecord) => getRecordNumber(item, 'teacher_id') || getRecordNumber(item, 'id');

const getClassId = (item: DashboardRecord) => getRecordNumber(item, 'class_id') || getRecordNumber(item, 'id');

const getFullName = (item: DashboardRecord, fallback: string) => {
  const firstName = getRecordString(item, 'first_name')?.trim();
  const lastName = getRecordString(item, 'last_name')?.trim();
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return name || getRecordString(item, 'name') || fallback;
};

const getClassLabel = (item: DashboardRecord) =>
  getRecordString(item, 'class_name') ||
  getRecordString(item, 'name') ||
  `Class ${getClassId(item) || ''}`.trim();

const sortScopeOptions = (options: DashboardScopeOption[]) =>
  [...options].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

const countByValue = (items: DashboardRecord[], getValue: (item: DashboardRecord) => string | undefined) => {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const value = getValue(item);
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
};

const createIdSet = (items: DashboardRecord[], getId: (item: DashboardRecord) => number | undefined) => {
  const ids = new Set<number>();
  items.forEach((item) => {
    const id = getId(item);
    if (id) ids.add(id);
  });
  return ids;
};

const filterRelatedRecords = (
  items: DashboardRecord[],
  studentIds: Set<number>,
  classIds: Set<number>,
  teacherIds: Set<number>
) =>
  items.filter((item) => {
    const studentId = getRecordNumber(item, 'student_id');
    const classId = getRecordNumber(item, 'class_id');
    const teacherId = getRecordNumber(item, 'teacher_id');
    return Boolean(
      (studentId && studentIds.has(studentId)) ||
      (classId && classIds.has(classId)) ||
      (teacherId && teacherIds.has(teacherId))
    );
  });

// Builds dashboard scope options from the loaded collections.
export const buildDashboardScopeOptions = (collections: DashboardCollections): DashboardScopeOptions => {
  const studentsByTeacher = countByValue(collections.students, (student) => {
    const teacherId = getRecordNumber(student, 'teacher_id');
    return teacherId ? String(teacherId) : undefined;
  });
  const classesByTeacher = countByValue(collections.classes, (cls) => {
    const teacherId = getRecordNumber(cls, 'teacher_id');
    return teacherId ? String(teacherId) : undefined;
  });
  const studentsByClass = countByValue(collections.students, (student) => {
    const classId = getRecordNumber(student, 'class_id');
    return classId ? String(classId) : undefined;
  });
  const studentsBySchool = countByValue(collections.students, (student) => getSchoolLabel(student));
  const studentsByStatus = countByValue(collections.students, (student) => getRecordString(student, 'status') || 'Unknown');

  const teacherOptions: DashboardScopeOption[] = collections.teachers
    .map<DashboardScopeOption | null>((teacher) => {
      const id = getTeacherId(teacher);
      if (!id) return null;
      const value = String(id);
      const studentCount = studentsByTeacher.get(value) || 0;
      const classCount = classesByTeacher.get(value) || 0;
      return {
        value,
        label: getFullName(teacher, `Teacher ${id}`),
        count: studentCount,
        meta: `${classCount} classes`,
      };
    })
    .filter((option): option is DashboardScopeOption => option !== null);

  const classOptions: DashboardScopeOption[] = collections.classes
    .map<DashboardScopeOption | null>((cls) => {
      const id = getClassId(cls);
      if (!id) return null;
      const value = String(id);
      return {
        value,
        label: getClassLabel(cls),
        count: studentsByClass.get(value) || 0,
        meta: getRecordString(cls, 'section') || getRecordString(cls, 'class_code'),
      };
    })
    .filter((option): option is DashboardScopeOption => option !== null);

  const schoolOptions = Array.from(studentsBySchool.entries()).map(([value, count]) => ({
    value,
    label: value,
    count,
  }));

  const statusOptions = Array.from(studentsByStatus.entries()).map(([value, count]) => ({
    value,
    label: value,
    count,
  }));

  return {
    teacher: sortScopeOptions(teacherOptions),
    class: sortScopeOptions(classOptions),
    school: sortScopeOptions(schoolOptions),
    status: sortScopeOptions(statusOptions),
  };
};

// Filters every dashboard collection to match the selected statistics scope.
export const filterDashboardCollections = (
  collections: DashboardCollections,
  scope: DashboardScope
): DashboardCollections => {
  if (scope.type === 'all' || scope.value === 'all') return collections;

  const selectedNumber = Number(scope.value);
  const selectedValue = scope.value.toLowerCase();

  const students = collections.students.filter((student) => {
    if (scope.type === 'teacher') return getRecordNumber(student, 'teacher_id') === selectedNumber;
    if (scope.type === 'class') return getRecordNumber(student, 'class_id') === selectedNumber;
    if (scope.type === 'school') return getSchoolLabel(student).toLowerCase() === selectedValue;
    if (scope.type === 'status') return (getRecordString(student, 'status') || 'Unknown').toLowerCase() === selectedValue;
    return true;
  });

  const studentIds = createIdSet(students, getStudentId);
  const studentClassIds = createIdSet(students, (student) => getRecordNumber(student, 'class_id'));
  const classes = collections.classes.filter((cls) => {
    const classId = getClassId(cls);
    const teacherId = getRecordNumber(cls, 'teacher_id');
    if (scope.type === 'teacher') return teacherId === selectedNumber || Boolean(classId && studentClassIds.has(classId));
    if (scope.type === 'class') return classId === selectedNumber;
    return Boolean(classId && studentClassIds.has(classId));
  });
  const classIds = createIdSet(classes, getClassId);
  studentClassIds.forEach((id) => classIds.add(id));

  const studentTeacherIds = createIdSet(students, (student) => getRecordNumber(student, 'teacher_id'));
  const classTeacherIds = createIdSet(classes, (cls) => getRecordNumber(cls, 'teacher_id'));
  classTeacherIds.forEach((id) => studentTeacherIds.add(id));
  if (scope.type === 'teacher' && selectedNumber) studentTeacherIds.add(selectedNumber);

  const teachers = collections.teachers.filter((teacher) => {
    const teacherId = getTeacherId(teacher);
    return Boolean(teacherId && studentTeacherIds.has(teacherId));
  });

  return {
    ...collections,
    students,
    teachers,
    classes,
    attendance: filterRelatedRecords(collections.attendance, studentIds, classIds, studentTeacherIds),
    assignments: filterRelatedRecords(collections.assignments, studentIds, classIds, studentTeacherIds),
    payments: filterRelatedRecords(collections.payments, studentIds, classIds, studentTeacherIds),
    debts: filterRelatedRecords(collections.debts, studentIds, classIds, studentTeacherIds),
    tests: filterRelatedRecords(collections.tests, studentIds, classIds, studentTeacherIds),
  };
};

const getPaymentStatus = (payment: DashboardRecord) =>
  (
    getRecordString(payment, 'status') ||
    getRecordString(payment, 'payment_status') ||
    ''
  ).toLowerCase();

const isCompletedPayment = (payment: DashboardRecord) => {
  const status = getPaymentStatus(payment);
  return status === 'completed' || status === 'paid';
};

const getMonthlyCompletedPayments = (collections: DashboardCollections, selectedMonth: Date) =>
  collections.payments.filter((item) => {
    const date = getValidDate(getRecordString(item, 'payment_date'));
    return Boolean(date && isSameMonth(date, selectedMonth) && isCompletedPayment(item));
  });

const getExpectedByStudent = (collections: DashboardCollections) => {
  const classesById = new Map<number, DashboardRecord>();
  collections.classes.forEach((item) => {
    const classId = getRecordNumber(item, 'class_id') || getRecordNumber(item, 'id');
    if (classId) classesById.set(classId, item);
  });

  const expectedByStudent = new Map<number, number>();
  collections.students.forEach((student) => {
    const studentId = getRecordNumber(student, 'student_id') || getRecordNumber(student, 'id');
    const classId = getRecordNumber(student, 'class_id');
    if (!studentId || !classId) return;
    const cls = classesById.get(classId);
    const expectedAmount = cls ? getRecordNumber(cls, 'payment_amount') || 0 : 0;
    if (expectedAmount > 0) expectedByStudent.set(studentId, expectedAmount);
  });

  return expectedByStudent;
};

const getOutstandingDebt = (collections: DashboardCollections) =>
  collections.debts.reduce((sum, item) => {
    const debtAmount = getRecordNumber(item, 'debt_amount') || 0;
    const amountPaid = getRecordNumber(item, 'amount_paid') || 0;
    const remaining = debtAmount - amountPaid;
    return remaining > 0 ? sum + remaining : sum;
  }, 0);

const getFinancialTotals = (collections: DashboardCollections, selectedMonth: Date) => {
  const paymentsCompletedThisMonth = getMonthlyCompletedPayments(collections, selectedMonth);
  const paidPayments = paymentsCompletedThisMonth.reduce(
    (sum, item) => sum + (getRecordNumber(item, 'amount') || 0),
    0
  );
  const expectedByStudent = getExpectedByStudent(collections);
  const paidByStudent = new Map<number, number>();

  paymentsCompletedThisMonth.forEach((payment) => {
    const studentId = getRecordNumber(payment, 'student_id');
    if (!studentId) return;
    paidByStudent.set(studentId, (paidByStudent.get(studentId) || 0) + (getRecordNumber(payment, 'amount') || 0));
  });

  const expectedPayments = Array.from(expectedByStudent.values()).reduce((sum, amount) => sum + amount, 0);
  let paidStudents = 0;
  let unpaidStudents = 0;
  expectedByStudent.forEach((expected, studentId) => {
    const paid = paidByStudent.get(studentId) || 0;
    if (paid >= expected) {
      paidStudents += 1;
    } else {
      unpaidStudents += 1;
    }
  });

  const remainingPayments = Math.max(expectedPayments - paidPayments, 0);
  const collectionRate =
    expectedPayments > 0 ? Math.min(Math.round((paidPayments / expectedPayments) * 100), 100) : 0;

  return {
    paymentsCompletedThisMonth,
    expectedPayments,
    paidPayments,
    remainingPayments,
    paidStudents,
    unpaidStudents,
    collectionRate,
    outstandingDebt: getOutstandingDebt(collections),
  };
};

// Returns date value.
const getDateValue = (item: Record<string, unknown>): string | undefined =>
  (item.created_at as string | undefined) ||
  (item.updated_at as string | undefined) ||
  (item.payment_date as string | undefined) ||
  (item.attendance_date as string | undefined) ||
  (item.debt_date as string | undefined) ||
  (item.due_date as string | undefined) ||
  (item.date as string | undefined);

// Formats dashboard date.
export const formatDashboardDate = (value?: string) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

// Builds dashboard stats.
export const buildDashboardStats = (
  collections: DashboardCollections,
  isSuperuser: boolean,
  selectedMonth = new Date()
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

  const schoolNames = new Set(
    collections.students
      .map((student) => getRecordString(student, 'school_name')?.trim())
      .filter((schoolName): schoolName is string => Boolean(schoolName))
  );
  const newStudentsThisMonth = collections.students.filter((student) => {
    const createdAt = getValidDate(getRecordString(student, 'created_at'));
    return createdAt ? isSameMonth(createdAt, selectedMonth) : false;
  }).length;
  const financialTotals = getFinancialTotals(collections, selectedMonth);

  return {
    totalStudents: collections.students.length,
    totalTeachers: isSuperuser ? collections.teachers.length : 0,
    totalClasses: collections.classes.length,
    totalCenters: isSuperuser ? collections.centers.length : 0,
    totalSchools: schoolNames.size,
    newStudentsThisMonth,
    activeTests,
    pendingAssignments,
    attendanceToday,
    paymentsThisMonth: financialTotals.paidPayments,
    expectedPaymentsThisMonth: financialTotals.expectedPayments,
    remainingPaymentsThisMonth: financialTotals.remainingPayments,
    paidStudentsThisMonth: financialTotals.paidStudents,
    unpaidStudentsThisMonth: financialTotals.unpaidStudents,
    paymentCollectionRate: financialTotals.collectionRate,
    outstandingDebt: financialTotals.outstandingDebt,
  };
};

export const buildDashboardFinancialMonth = (
  collections: DashboardCollections,
  selectedMonth: Date
): DashboardFinancialMonth => {
  const totals = getFinancialTotals(collections, selectedMonth);
  const buckets = [
    { label: '1-7', paid: 0 },
    { label: '8-14', paid: 0 },
    { label: '15-21', paid: 0 },
    { label: '22+', paid: 0 },
  ];

  totals.paymentsCompletedThisMonth.forEach((payment) => {
    const date = getValidDate(getRecordString(payment, 'payment_date'));
    if (!date) return;
    const day = date.getDate();
    const index = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    buckets[index].paid += getRecordNumber(payment, 'amount') || 0;
  });

  return {
    monthKey: getMonthKey(selectedMonth),
    monthLabel: getMonthLabel(selectedMonth),
    expectedPayments: totals.expectedPayments,
    paidPayments: totals.paidPayments,
    remainingPayments: totals.remainingPayments,
    paidStudents: totals.paidStudents,
    unpaidStudents: totals.unpaidStudents,
    collectionRate: totals.collectionRate,
    outstandingDebt: totals.outstandingDebt,
    buckets,
  };
};

export const buildDashboardSchoolDistribution = (
  collections: DashboardCollections
): DashboardSchoolSlice[] => {
  const counts = new Map<string, number>();
  collections.students.forEach((student) => {
    const label = getSchoolLabel(student);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const total = collections.students.length;
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const topSchools = sorted.slice(0, 5);
  const otherTotal = sorted.slice(5).reduce((sum, [, value]) => sum + value, 0);
  const rows = otherTotal > 0 ? [...topSchools, ['Other schools', otherTotal] as [string, number]] : topSchools;

  return rows
    .map(([label, value], index) => ({
      label,
      value,
      percent: total > 0 ? Math.round((value / total) * 100) : 0,
      color: schoolColors[index % schoolColors.length],
    }));
};

export const buildDashboardStudentGrowth = (
  collections: DashboardCollections,
  monthCount = 12
): DashboardStudentGrowthPoint[] => {
  const now = new Date();
  const months = Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - index), 1);
    return {
      key: getMonthKey(date),
      label: date.toLocaleDateString(undefined, { month: 'short' }),
      newStudents: 0,
      totalStudents: 0,
      date,
    };
  });
  const monthMap = new Map(months.map((month) => [month.key, month]));

  collections.students.forEach((student) => {
    const date = getValidDate(getRecordString(student, 'created_at'));
    if (!date) return;
    const key = getMonthKey(new Date(date.getFullYear(), date.getMonth(), 1));
    const month = monthMap.get(key);
    if (month) month.newStudents += 1;
  });

  months.forEach((month) => {
    month.totalStudents = collections.students.filter((student) => {
      const createdAt = getValidDate(getRecordString(student, 'created_at'));
      return createdAt ? createdAt <= new Date(month.date.getFullYear(), month.date.getMonth() + 1, 0, 23, 59, 59) : false;
    }).length;
  });

  return months.map(({ label, newStudents, totalStudents }) => ({ label, newStudents, totalStudents }));
};

// Handles append activity.
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

// Builds dashboard activity.
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

// Returns dashboard stat cards.
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
        progress: 100,
        detailsType: 'students',
      },
      {
        label: 'Teachers',
        value: stats.totalTeachers,
        icon: GraduationCap,
        accent: 'from-emerald-500 to-teal-500',
        progress: 100,
        detailsType: 'teachers',
      },
      {
        label: 'New This Month',
        value: stats.newStudentsThisMonth,
        icon: UserPlus,
        accent: 'from-cyan-500 to-blue-500',
        progress: 100,
        detailsType: 'newStudents',
      },
    ];
  }

  return [
    {
      label: 'My Students',
    value: stats.totalStudents,
    icon: Users,
    accent: 'from-indigo-500 to-sky-500',
    progress: 100,
    detailsType: 'students',
  },
  {
    label: 'My Classes',
      value: stats.totalClasses,
      icon: GraduationCap,
      accent: 'from-emerald-500 to-teal-500',
      progress: 100,
    },
  ];
};

// Returns dashboard focus items.
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
    items.push({ label: 'Should Pay This Month', value: formatMoney(stats.expectedPaymentsThisMonth) });
    items.push({ label: 'Paid This Month', value: formatMoney(stats.paymentsThisMonth) });
    items.push({ label: 'Still Unpaid', value: formatMoney(stats.remainingPaymentsThisMonth) });
  }

  return items;
};
