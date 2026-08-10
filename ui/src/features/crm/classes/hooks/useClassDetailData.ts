import { useEffect, useState } from 'react';
import { classAPI, roomAPI, roomSlotAPI, studentAPI, subjectAPI, testAPI } from '@/shared/api/api';
import { resolveClassSubjects } from '../classSubjects';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { unwrapRows } from '../utils/api';

export type ClassDetailClass = {
  class_id?: number;
  id?: number;
  class_name?: string;
  class_code?: string;
  center_id?: number;
  level?: number;
  capacity?: number;
  teacher_id?: number;
  teacher_name?: string;
  room_number?: string;
  room_assignments?: any[];
  payment_amount?: number;
  payment_frequency?: string;
  section?: string;
};

export type ClassDetailStudent = {
  student_id?: number;
  id?: number;
  class_id?: number;
  first_name?: string;
  last_name?: string;
  enrollment_number?: string;
  status?: string;
  phone?: string;
  deleted_at?: string | null;
};

export type AssignedTestItem = {
  test_id?: number;
  id?: number;
  test_name?: string;
  test_type?: string;
  description?: string;
  duration_minutes?: number;
  total_marks?: number;
  passing_marks?: number;
  is_active?: boolean;
  is_mandatory?: boolean;
  assigned_at?: string;
  due_date?: string;
  notes?: string;
};

export const useClassDetailData = (classId: string | undefined, authUser: any) => {
  const [classData, setClassData] = useState<ClassDetailClass | null>(null);
  const [students, setStudents] = useState<ClassDetailStudent[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [assignedTests, setAssignedTests] = useState<AssignedTestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!classId) return;
      setLoading(true);
      setError('');
      try {
        const targetClassId = Number(classId);
        const centerId = getResolvedCenterId(authUser) || undefined;
        const [classResponse, studentsResponse, subjectsResponse, sessionsResponse, testsResponse, roomsResponse, bookingResponse] = await Promise.all([
          classAPI.getById(targetClassId),
          studentAPI.getByClassWithTransfers(targetClassId).catch(() => ({ data: [] })),
          subjectAPI.getByClass(targetClassId).catch(() => ({ data: [] })),
          classAPI.getSessions(targetClassId).catch(() => ({ data: [] })),
          testAPI.getAssignedTests('class', targetClassId).catch(() => ({ data: [] })),
          roomAPI.getAll(centerId ? { center_id: centerId } : undefined).catch(() => ({ data: [] })),
          roomSlotAPI.getBookingsByClass(targetClassId, centerId ? { center_id: centerId } : undefined).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const nextClass = classResponse?.data ?? classResponse;
        const roomNumbers = new Set<string>();
        String(nextClass?.room_number || '').split(',').map((room: string) => room.trim()).filter(Boolean).forEach((room) => roomNumbers.add(room));
        const roomAssignments = Array.isArray(nextClass?.room_assignments) ? nextClass.room_assignments : [];
        roomAssignments.map((room: any) => String(room.room_number || '').trim()).filter(Boolean).forEach((room: string) => roomNumbers.add(room));
        unwrapRows(roomsResponse)
          .filter((room: any) => Number(room.class_id) === targetClassId)
          .map((room: any) => String(room.room_number || '').trim())
          .filter(Boolean)
          .forEach((room: string) => roomNumbers.add(room));
        unwrapRows(bookingResponse)
          .map((booking: any) => String(booking.room_number || '').trim())
          .filter(Boolean)
          .forEach((room: string) => roomNumbers.add(room));
        setClassData({ ...nextClass, room_number: Array.from(roomNumbers).join(', ') || nextClass?.room_number });
        setStudents(unwrapRows(studentsResponse));
        setSubjects(resolveClassSubjects(nextClass, subjectsResponse));
        setSessions(unwrapRows(sessionsResponse));
        setAssignedTests(unwrapRows(testsResponse));
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || err?.response?.data?.details || 'Failed to load class.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authUser, classId]);

  return {
    classData,
    students,
    subjects,
    sessions,
    setSessions,
    assignedTests,
    loading,
    error,
  };
};
