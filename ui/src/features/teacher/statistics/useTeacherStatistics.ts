import { useEffect, useMemo, useState } from 'react';
import { classAPI } from '@/shared/api/api';
import { unwrapRows } from '../../crm/classes/utils/api';
import { useAppDispatch, useAppSelector } from '../../crm/hooks';
import { fetchGrades, fetchGradesForce } from '../../../slices/gradesSlice';
import { getCombinedLessonPoints } from '../../crm/classes/utils/points';

export type ChartType = 'line' | 'bar';
export type Granularity = 'daily' | 'monthly';

const dateKey = (value: string) => new Date(value).toISOString().split('T')[0];

const getDisplayName = (item: any, fallback: string) =>
  String(item?.class_name ?? item?.name ?? item?.group_name ?? item?.title ?? fallback);

export const useTeacherStatistics = (
  teacherId?: number,
  classes: any[] = [],
  students: any[] = [],
  teachers: any[] = []
) => {
  const dispatch = useAppDispatch();
  const grades = useAppSelector((state) => state.grades.items);

  useEffect(() => {
    dispatch(fetchGrades());
  }, [dispatch]);

  // Grades are center-scoped server-side too; refresh them when the owner switches branches
  // (the owner-wide statistics tab also force-refetches classes/students/teachers and remounts
  // this hook's consumer on that same event - see OwnerTeacherStatisticsTab.tsx).
  useEffect(() => {
    const handleActiveCenterChanged = () => dispatch(fetchGradesForce());
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch]);

  // Owner-wide view (Statistics menu next to Teachers/KPI) supplies the full teacher list so the
  // right-hand panel can ask "which teacher?" before "which class?". The teacher's own portal
  // passes a fixed teacherId and no teachers list, so it skips straight to the class list.
  const isGlobalMode = teachers.length > 0 && !teacherId;

  const [panelTeacherId, setPanelTeacherId] = useState<number | null>(null);

  const activeTeacherId = isGlobalMode ? panelTeacherId : (teacherId ?? null);

  const teacherClasses = useMemo(() => {
    if (isGlobalMode) {
      if (!activeTeacherId) return [] as any[];
      return classes.filter((item) => Number(item?.teacher_id ?? item?.teacherId ?? 0) === activeTeacherId);
    }
    if (!teacherId) return classes;
    return classes.filter((item) => Number(item?.teacher_id ?? item?.teacherId ?? 0) === Number(teacherId));
  }, [classes, teacherId, isGlobalMode, activeTeacherId]);

  const groups = useMemo(
    () =>
      teacherClasses
        .map((item, index) => ({
          id: Number(item?.class_id ?? item?.id ?? 0),
          label: getDisplayName(item, `Group ${index + 1}`),
        }))
        .filter((group) => group.id > 0),
    [teacherClasses]
  );

  const teacherOptions = useMemo(() => {
    if (!isGlobalMode) return [] as { id: number; label: string; classCount: number }[];
    const classCountByTeacher = new Map<number, number>();
    classes.forEach((item) => {
      const id = Number(item?.teacher_id ?? item?.teacherId ?? 0);
      if (!id) return;
      classCountByTeacher.set(id, (classCountByTeacher.get(id) || 0) + 1);
    });
    return teachers
      .map((teacher) => {
        const id = Number(teacher?.teacher_id ?? teacher?.id ?? 0);
        const label = `${teacher?.first_name || ''} ${teacher?.last_name || ''}`.trim() || `Teacher #${id}`;
        return { id, label, classCount: classCountByTeacher.get(id) || 0 };
      })
      .filter((teacher) => teacher.id > 0 && teacher.classCount > 0)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [isGlobalMode, teachers, classes]);

  const selectedTeacher = teacherOptions.find((teacher) => teacher.id === panelTeacherId) || null;

  // Defaults to 'center' so the owner-wide view opens straight into a whole-center aggregate;
  // this is meaningless for the teacher-portal (non-global) case, where loading is always gated
  // on `selectedClassId` regardless of scope.
  const [scope, setScope] = useState<'center' | 'class'>('center');
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const allClassIds = useMemo(
    () => Array.from(new Set(classes.map((item) => Number(item?.class_id ?? item?.id ?? 0)).filter((id) => id > 0))),
    [classes]
  );

  const selectPanelTeacher = (id: number) => {
    setPanelTeacherId(id);
    setSelectedClassId(null);
  };

  const backToTeacherList = () => {
    setPanelTeacherId(null);
    setSelectedClassId(null);
  };

  const selectCenter = () => {
    setScope('center');
    setPanelTeacherId(null);
    setSelectedClassId(null);
    setSelectedStudentId('all');
    setDateRange({ start: '', end: '' });
    setGroupsOpen(false);
  };

  const selectClass = (classId: number) => {
    setScope('class');
    setSelectedClassId(classId);
    setSelectedStudentId('all');
    setDateRange({ start: '', end: '' });
    setGroupsOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    if (isGlobalMode && scope === 'center') {
      if (allClassIds.length === 0) {
        setSessions([]);
        return;
      }
      setSessionsLoading(true);
      classAPI
        .getSessionsBulk(allClassIds)
        .then((response) => {
          if (!cancelled) setSessions(unwrapRows(response));
        })
        .catch(() => {
          if (!cancelled) setSessions([]);
        })
        .finally(() => {
          if (!cancelled) setSessionsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }

    if (!selectedClassId) {
      setSessions([]);
      return;
    }
    setSessionsLoading(true);
    classAPI
      .getSessions(selectedClassId)
      .then((response) => {
        if (!cancelled) setSessions(unwrapRows(response));
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isGlobalMode, scope, allClassIds, selectedClassId]);

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [] as any[];
    return students.filter((student) => Number(student?.class_id ?? student?.classId ?? 0) === selectedClassId);
  }, [students, selectedClassId]);

  const sortedSessions = useMemo(
    () =>
      [...sessions]
        .filter((session) => session?.session_date)
        .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime()),
    [sessions]
  );

  const globalMin = sortedSessions[0] ? dateKey(sortedSessions[0].session_date) : '';
  const globalMax = sortedSessions.length ? dateKey(sortedSessions[sortedSessions.length - 1].session_date) : '';

  useEffect(() => {
    if (globalMin && globalMax && !dateRange.start && !dateRange.end) {
      setDateRange({ start: globalMin, end: globalMax });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalMin, globalMax]);

  const rangeStart = dateRange.start || globalMin;
  const rangeEnd = dateRange.end || globalMax;

  const gradesBySession = useMemo(() => {
    const map = new Map<number, any[]>();
    (grades || []).forEach((grade: any) => {
      const sessionId = Number(grade?.session_id ?? 0);
      if (!sessionId) return;
      if (!map.has(sessionId)) map.set(sessionId, []);
      map.get(sessionId)!.push(grade);
    });
    return map;
  }, [grades]);

  const studentIdFilter = selectedStudentId !== 'all' ? Number(selectedStudentId) : null;

  const lessonPoints = useMemo(() => {
    return sortedSessions
      .filter((session) => {
        const key = dateKey(session.session_date);
        if (rangeStart && key < rangeStart) return false;
        if (rangeEnd && key > rangeEnd) return false;
        return true;
      })
      .map((session) => {
        const sessionId = Number(session.session_id ?? session.id ?? 0);
        const sessionGrades = gradesBySession.get(sessionId) || [];
        const relevantGrades = studentIdFilter
          ? sessionGrades.filter((grade) => Number(grade?.student_id ?? 0) === studentIdFilter)
          : sessionGrades;
        const values = relevantGrades
          .map((grade) => getCombinedLessonPoints(grade))
          .filter((value): value is number => value !== null);
        if (values.length === 0) return null;
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        return { dateKey: dateKey(session.session_date), value: Math.round(average * 10) / 10 };
      })
      .filter((point): point is { dateKey: string; value: number } => point !== null);
  }, [sortedSessions, gradesBySession, studentIdFilter, rangeStart, rangeEnd]);

  const dailyPalette = '#2563eb';
  const monthlyPalette = '#7c3aed';

  // Group by day (daily) or month (monthly) rather than plotting one point per lesson session,
  // so that e.g. a whole-center view with several classes meeting the same day still yields a
  // single averaged point for that day instead of overlapping duplicate x-axis entries.
  const chartData = useMemo(() => {
    const color = granularity === 'daily' ? dailyPalette : monthlyPalette;
    const grouped = new Map<string, number[]>();
    lessonPoints.forEach((point) => {
      const key = granularity === 'daily' ? point.dateKey : point.dateKey.slice(0, 7);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(point.value);
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => ({
        label: granularity === 'daily' ? key.slice(5) : key,
        value: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
        color,
      }));
  }, [lessonPoints, granularity]);

  const selectedClass = groups.find((group) => group.id === selectedClassId) || null;
  const hasSelection = isGlobalMode ? (scope === 'center' || !!selectedClassId) : !!selectedClassId;

  return {
    isGlobalMode,
    scope,
    selectCenter,
    teacherOptions,
    panelTeacherId,
    selectedTeacher,
    selectPanelTeacher,
    backToTeacherList,
    groups,
    groupsOpen,
    setGroupsOpen,
    selectedClassId,
    selectClass,
    selectedClass,
    classStudents,
    selectedStudentId,
    setSelectedStudentId,
    chartType,
    setChartType,
    granularity,
    setGranularity,
    dateRange: { start: rangeStart, end: rangeEnd },
    setDateRange,
    globalMin,
    globalMax,
    lessonMarkers: sortedSessions.map((session) => dateKey(session.session_date)),
    chartData,
    lessonCount: lessonPoints.length,
    sessionsLoading,
    hasClassSelected: !!selectedClassId,
    hasSelection,
  };
};
