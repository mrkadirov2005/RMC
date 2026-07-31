import { useEffect, useMemo, useState } from 'react';
import { gradeAPI } from '@/shared/api/api';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import type { ClassSchedule } from '../types';
import { unwrapRows } from '../utils/api';
import { getMonthKey, toDateKey } from '../utils/date';
import { dayNames } from '../utils/schedule';
import { getCombinedLessonPoints } from '../utils/points';

type StudentLike = {
  student_id?: number;
  id?: number;
};

type SessionLike = {
  session_id?: number;
  id?: number;
  session_date?: string;
};

type UseMonthlyClassPointsParams = {
  authUser: any;
  centerId?: number;
  schedule: ClassSchedule;
  sessions: SessionLike[];
  students: StudentLike[];
  todayKey: string;
};

const getSessionDateKey = (session: SessionLike) => session?.session_date ? new Date(session.session_date).toISOString().split('T')[0] : '';

export const useMonthlyClassPoints = ({ authUser, centerId, schedule, sessions, students, todayKey }: UseMonthlyClassPointsParams) => {
  const [pointsMonth, setPointsMonth] = useState('');
  const [monthlyPointsGrades, setMonthlyPointsGrades] = useState<Record<string, any[]>>({});
  const [pointsLoading, setPointsLoading] = useState(false);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionLike>();
    [...sessions]
      .filter((session) => getSessionDateKey(session))
      .sort((a, b) => Number(b.session_id || b.id || 0) - Number(a.session_id || a.id || 0))
      .forEach((session) => {
        const key = getSessionDateKey(session);
        if (key && !map.has(key)) map.set(key, session);
      });
    return map;
  }, [sessions]);

  const latestLessonDate = useMemo(() => {
    const datedSessions = [...sessionsByDate.entries()].sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
    return datedSessions.find(([date]) => date <= todayKey)?.[0] || datedSessions[0]?.[0] || '';
  }, [sessionsByDate, todayKey]);

  useEffect(() => {
    if (!pointsMonth) setPointsMonth(getMonthKey(latestLessonDate));
  }, [latestLessonDate, pointsMonth]);

  const monthlyLessonDays = useMemo(() => {
    if (!pointsMonth) return [];
    const [yearRaw, monthRaw] = pointsMonth.split('-');
    const year = Number(yearRaw);
    const monthIndex = Number(monthRaw) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return [];
    const scheduledDays = new Set(schedule.days.map((day) => day.trim().toLowerCase()).filter(Boolean));
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(year, monthIndex, index + 1);
      const dateKey = toDateKey(date);
      const dayName = dayNames[date.getDay()];
      return {
        dateKey,
        day: index + 1,
        dayName,
        session: sessionsByDate.get(dateKey),
        isClassDay: scheduledDays.has(dayName.toLowerCase()),
      };
    }).filter((day) => day.isClassDay);
  }, [pointsMonth, schedule.days, sessionsByDate]);

  const monthlySessionIds = useMemo(() => {
    return Array.from(new Set(monthlyLessonDays
      .map((day) => Number(day.session?.session_id || day.session?.id || 0))
      .filter(Boolean)));
  }, [monthlyLessonDays]);

  useEffect(() => {
    let cancelled = false;
    const loadPoints = async () => {
      if (monthlySessionIds.length === 0) {
        setMonthlyPointsGrades({});
        return;
      }
      setPointsLoading(true);
      try {
        const resolvedCenterId = Number(centerId || 0) || getResolvedCenterId(authUser) || undefined;
        const responses = await Promise.all(monthlySessionIds.map(async (sessionId) => {
          const response = await gradeAPI.getBySession(sessionId, resolvedCenterId ? { center_id: resolvedCenterId } : undefined);
          return [String(sessionId), unwrapRows(response)] as const;
        }));
        if (!cancelled) setMonthlyPointsGrades(Object.fromEntries(responses));
      } catch (err) {
        console.error('Failed to load lesson points:', err);
        if (!cancelled) setMonthlyPointsGrades({});
      } finally {
        if (!cancelled) setPointsLoading(false);
      }
    };
    loadPoints();
    return () => {
      cancelled = true;
    };
  }, [authUser, centerId, monthlySessionIds]);

  const monthlyPointsBySessionStudent = useMemo(() => {
    const map = new Map<string, any>();
    Object.entries(monthlyPointsGrades).forEach(([sessionId, grades]) => {
      grades.forEach((grade) => {
        const studentId = Number(grade.student_id || 0);
        if (studentId) map.set(`${sessionId}:${studentId}`, grade);
      });
    });
    return map;
  }, [monthlyPointsGrades]);

  const monthlyPointStats = useMemo(() => {
    const cells = monthlyLessonDays.length * students.length;
    const values: number[] = [];
    let missing = 0;
    monthlyLessonDays.forEach((day) => {
      const sessionId = Number(day.session?.session_id || day.session?.id || 0);
      students.forEach((student) => {
        const studentId = Number(student.student_id || student.id || 0);
        const grade = sessionId ? monthlyPointsBySessionStudent.get(`${sessionId}:${studentId}`) : null;
        const combinedPoints = getCombinedLessonPoints(grade);
        if (combinedPoints === null) missing += 1;
        else values.push(combinedPoints);
      });
    });
    const average = values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    return { cells, filled: values.length, missing, average };
  }, [monthlyLessonDays, monthlyPointsBySessionStudent, students]);

  return {
    pointsMonth,
    setPointsMonth,
    pointsLoading,
    monthlyLessonDays,
    monthlyPointsBySessionStudent,
    monthlyPointStats,
    sessionsByDate,
    latestLessonDate,
  };
};
