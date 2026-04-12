import {
  assignmentAPI,
  attendanceAPI,
  centerAPI,
  classAPI,
  debtAPI,
  paymentAPI,
  studentAPI,
  teacherAPI,
  testAPI,
} from '../../../../shared/api/api';
import type { DashboardRecord } from '../types';

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

const emptyArrayResponse = { data: [] as DashboardRecord[] };

const normalizeArray = <T extends DashboardRecord>(response: unknown): T[] => {
  const value = (response as { data?: unknown })?.data ?? response;
  return Array.isArray(value) ? (value as T[]) : [];
};

export const fetchDashboardCollections = async (
  isSuperuser: boolean
): Promise<DashboardCollections> => {
  const baseRequests = [
    studentAPI.getAll().catch(() => emptyArrayResponse),
    classAPI.getAll().catch(() => emptyArrayResponse),
    testAPI.getAll().catch(() => emptyArrayResponse),
    attendanceAPI.getAll().catch(() => emptyArrayResponse),
    assignmentAPI.getAll().catch(() => emptyArrayResponse),
  ];

  const superRequests = [
    teacherAPI.getAll().catch(() => emptyArrayResponse),
    centerAPI.getAll().catch(() => emptyArrayResponse),
    paymentAPI.getAll().catch(() => emptyArrayResponse),
    debtAPI.getAll().catch(() => emptyArrayResponse),
  ];

  const responses = await Promise.all([
    ...baseRequests,
    ...(isSuperuser ? superRequests : []),
  ]);

  const [
    studentsRes,
    classesRes,
    testsRes,
    attendanceRes,
    assignmentsRes,
    teachersRes,
    centersRes,
    paymentsRes,
    debtsRes,
  ] = responses;

  return {
    students: normalizeArray(studentsRes),
    classes: normalizeArray(classesRes),
    tests: normalizeArray(testsRes),
    attendance: normalizeArray(attendanceRes),
    assignments: normalizeArray(assignmentsRes),
    teachers: normalizeArray(teachersRes),
    centers: normalizeArray(centersRes),
    payments: normalizeArray(paymentsRes),
    debts: normalizeArray(debtsRes),
  };
};

