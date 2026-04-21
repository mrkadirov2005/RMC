import { useEffect } from 'react';
import { attendanceAPI, classAPI, portalAPI } from '@/shared/api/api';

import { getStoredActiveCenterId } from '@/shared/auth/authStorage';
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

const normalizeDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  // Load classes
  useEffect(() => {
    const loadClasses = async () => {
      setLoading(true);
      try {
        if (user?.userType === 'student') {
          // For students, get data from the secure portal dashboard
          const response = await portalAPI.getDashboard();
          const data = response.data || response || {};
          if (data.classInfo) {
             setClasses([data.classInfo]);
          } else {
             setClasses([]);
          }
        } else {
          const response = await classAPI.getAll();
          const data = response.data || response || [];
          const items = Array.isArray(data) ? data : [];
          if (user?.userType === 'teacher') {
            const teacherId = Number(user.id);
            setClasses(items.filter((cls) => Number(cls.teacher_id) === teacherId));
          } else {
            setClasses(items);
          }
        }
      } catch (error) {
        console.error('Failed to load classes:', error);
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    loadClasses();
  }, [user, setClasses, setLoading]);


  // Load sessions
  useEffect(() => {
    const loadSessions = async () => {
      if (!user) return;
      try {
        if (user?.userType === 'student') {
          const response = await portalAPI.getDashboard();
          const data = response.data || response || {};
          setSessions(data.sessions || []);
        } else {
          const response = await classAPI.getAll();
          const data = response.data || response || [];
          const items = Array.isArray(data) ? data : [];
          
          let classes: ClassItem[] = [];
          if (user?.userType === 'teacher') {
            const teacherId = Number(user.id);
            classes = items.filter((cls) => Number(cls.teacher_id) === teacherId);
          } else {
            classes = items;
          }

          if (classes.length === 0) {
            setSessions([]);
            return;
          }

          const sessionResults = await Promise.all(
            classes.map((cls) => classAPI.getSessions(Number(cls.class_id || cls.id)).catch(() => ({ data: [] })))
          );
          const merged: SessionItem[] = [];
          sessionResults.forEach((res) => {
            const data = res.data || res || [];
            if (Array.isArray(data)) {
              merged.push(...data);
            }
          });
          setSessions(merged);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setSessions([]);
      }
    };

    loadSessions();
  }, [user, setSessions]);

  // Load attendance
  useEffect(() => {
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

        // Get all classes for superuser/teacher
        const classResponse = await classAPI.getAll();
        const classData = classResponse.data || classResponse || [];
        const classItems = Array.isArray(classData) ? classData : [];

        let classes: ClassItem[] = [];
        if (user?.userType === 'teacher') {
          const teacherId = Number(user.id);
          classes = classItems.filter((cls) => Number(cls.teacher_id) === teacherId);
        } else {
          classes = classItems;
        }

        const activeCenterId = getStoredActiveCenterId();
        const response = await attendanceAPI.getAll(activeCenterId ? { center_id: activeCenterId } : undefined).catch(
          () => ({ data: [] })
        );
        const data = response.data || response || [];
        const classIds = new Set(classes.map((cls) => Number(cls.class_id || cls.id)));
        const map = new Map<string, { present: number; absent: number }>();
        const sessionMap = new Map<number, { present: number; absent: number }>();
        if (Array.isArray(data)) {
          data.forEach((record: AttendanceItem) => {
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
      } catch (error) {
        console.error('Failed to load attendance:', error);
      }
    };

    loadAttendance();
  }, [user, setAttendanceByKey, setAttendanceBySession, setStudentAttendanceByDate, setStudentAttendanceBySession]);
};
