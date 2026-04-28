// React hooks for the crm feature.

import { useEffect, useMemo } from 'react';
import { attendanceAPI, classAPI, portalAPI } from '@/shared/api/api';
import { useAppDispatch, useAppSelector } from '@/features/crm/hooks';
import { fetchClasses, fetchClassesForce } from '@/slices/classesSlice';
import { fetchAttendance, fetchAttendanceForce } from '@/slices/attendanceSlice';
import { makeSelectCalendarClassesForUser } from '@/store/selectors';
import type { ClassItem, AttendanceItem, SessionItem } from '../types';

interface UseCalendarDataProps {
  user: any;
  setClasses: (classes: ClassItem[]) => void;
  setLoading: (loading: boolean) => void;
  setSessions: (sessions: SessionItem[]) => void;
  setAttendanceByKey: (
    map: Map<string, { present: number; absent: number }>
  ) => void;
  setAttendanceBySession: (
    map: Map<number, { present: number; absent: number }>
  ) => void;
  setStudentAttendanceByDate: (map: Map<string, string>) => void;
  setStudentAttendanceBySession: (map: Map<number, string>) => void;
}

// Normalizes date.
const normalizeDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Provides calendar data.
export const useCalendarData = ({
  user,
  setClasses,
  setLoading,
  setSessions,
  setAttendanceByKey,
  setAttendanceBySession,
  setStudentAttendanceByDate,
  setStudentAttendanceBySession,
}: UseCalendarDataProps) => {
  const dispatch = useAppDispatch();
// Memoizes the select calendar classes derived value.
  const selectCalendarClasses = useMemo(makeSelectCalendarClassesForUser, []);
  const classes = useAppSelector((state) => selectCalendarClasses(state, user)) as ClassItem[];
  const classesLoading = useAppSelector((state) => state.classes.loading);
  const attendanceItems = useAppSelector((state) => state.attendance.items) as AttendanceItem[];
  const attendanceLoading = useAppSelector((state) => state.attendance.loading);

// Runs side effects for this component.
  useEffect(() => {
    if (!user || user?.userType === 'student') return;
    dispatch(fetchClasses());
    dispatch(fetchAttendance());
  }, [dispatch, user]);

// Runs side effects for this component.
  useEffect(() => {
    if (!user || user?.userType === 'student') return;
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      dispatch(fetchClassesForce());
      dispatch(fetchAttendanceForce());
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, user]);

// Runs side effects for this component.
  useEffect(() => {
    if (!user || user?.userType === 'student') return;
    setClasses(classes);
  }, [classes, setClasses, user]);

// Runs side effects for this component.
  useEffect(() => {
    if (!user || user?.userType === 'student') return;
    setLoading(classesLoading || attendanceLoading);
  }, [attendanceLoading, classesLoading, setLoading, user]);

  // Load student calendar data from portal
  useEffect(() => {
    if (!user || user?.userType !== 'student') return;

    let cancelled = false;

// Loads classes.
    const loadClasses = async () => {
      setLoading(true);
      try {
        const response = await portalAPI.getDashboard();
        const data = response.data || response || {};
        if (cancelled) return;

        if (data.classInfo) {
          setClasses([data.classInfo]);
        } else {
          setClasses([]);
        }

        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      } catch (error) {
        console.error('Failed to load classes:', error);
        if (!cancelled) {
          setClasses([]);
          setSessions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadClasses();
    return () => {
      cancelled = true;
    };
  }, [setClasses, setLoading, setSessions, user]);

  // Load sessions for teacher/superuser
  useEffect(() => {
    if (!user || user?.userType === 'student') return;

    let cancelled = false;

// Loads sessions.
    const loadSessions = async () => {
      try {
        if (classes.length === 0) {
          setSessions([]);
          return;
        }

        const sessionResults = await Promise.all(
          classes.map((cls) => classAPI.getSessions(Number(cls.class_id || cls.id)).catch(() => ({ data: [] })))
        );
        if (cancelled) return;

        const merged: SessionItem[] = [];
        sessionResults.forEach((res) => {
          const data = res.data || res || [];
          if (Array.isArray(data)) {
            merged.push(...data);
          }
        });
        setSessions(merged);
      } catch (error) {
        console.error('Failed to load sessions:', error);
        if (!cancelled) {
          setSessions([]);
        }
      }
    };

    void loadSessions();
    return () => {
      cancelled = true;
    };
  }, [classes, setSessions, user]);

  // Load attendance
  useEffect(() => {
// Loads attendance.
    const loadAttendance = async () => {
      if (!user) return;
      try {
        if (user.userType === 'student') {
          const response = await attendanceAPI.getByStudent(Number(user.id)).catch(() => ({ data: [] }));
          const data = response.data || response || [];
          const map = new Map<string, string>();
          const sessionMap = new Map<number, string>();
          if (Array.isArray(data)) {
            data.forEach((record: AttendanceItem) => {
              const dateKey = normalizeDate(record.attendance_date);
              if (dateKey) {
                map.set(dateKey, record.status);
              }
              if (record.session_id) {
                sessionMap.set(Number(record.session_id), record.status);
              }
            });
          }
          setStudentAttendanceByDate(map);
          setStudentAttendanceBySession(sessionMap);
          setAttendanceByKey(new Map());
          setAttendanceBySession(new Map());
          return;
        }

        const classIds = new Set(classes.map((cls) => Number(cls.class_id || cls.id)));
        const map = new Map<string, { present: number; absent: number }>();
        const sessionMap = new Map<number, { present: number; absent: number }>();

        if (Array.isArray(attendanceItems)) {
          attendanceItems.forEach((record: AttendanceItem) => {
            const classId = Number(record.class_id);
            if (!classIds.has(classId)) return;
            const dateKey = normalizeDate(record.attendance_date);
            if (!dateKey) return;
            const key = `${classId}|${dateKey}`;
            const current = map.get(key) || { present: 0, absent: 0 };
            const status = String(record.status || '').toLowerCase();
            if (status === 'present') current.present += 1;
            if (status === 'absent') current.absent += 1;
            map.set(key, current);

            if (record.session_id) {
              const sessionId = Number(record.session_id);
              const sessionCurrent = sessionMap.get(sessionId) || { present: 0, absent: 0 };
              if (status === 'present') sessionCurrent.present += 1;
              if (status === 'absent') sessionCurrent.absent += 1;
              sessionMap.set(sessionId, sessionCurrent);
            }
          });
        }

        setAttendanceByKey(map);
        setAttendanceBySession(sessionMap);
        setStudentAttendanceByDate(new Map());
        setStudentAttendanceBySession(new Map());
      } catch (error) {
        console.error('Failed to load attendance:', error);
      }
    };

    void loadAttendance();
  }, [
    attendanceItems,
    classes,
    setAttendanceByKey,
    setAttendanceBySession,
    setStudentAttendanceByDate,
    setStudentAttendanceBySession,
    user,
  ]);
};
