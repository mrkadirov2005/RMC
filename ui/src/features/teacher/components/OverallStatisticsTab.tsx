import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CalendarCheck, CalendarCheck2, CheckCircle2, ChevronLeft, ChevronRight, CircleDollarSign, Coins, PencilLine, Star, TrendingUp, Users } from 'lucide-react';
import { PieChart } from '@/shared/components/PieChart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { attendanceAPI, classAPI } from '../api';
import { getResolvedCenterId } from '../../../shared/auth/centerScope';
import { useAppSelector } from '../../crm/hooks';
import { showToast } from '../../../utils/toast';

type SectionKey = 'students' | 'attendance' | 'points' | 'payments';
type LessonAction = 'attendance' | 'homework' | 'activity' | 'coins' | 'points';

const defaultLessonActions: LessonAction[] = ['attendance', 'homework', 'activity', 'coins'];

const lessonActionOptions: Array<{
  id: LessonAction;
  label: string;
  detail: string;
  icon: typeof CalendarCheck;
}> = [
  { id: 'attendance', label: 'Attendance', detail: 'Mark present, late, excused, or absent.', icon: CalendarCheck },
  { id: 'homework', label: 'Homework', detail: 'Score homework completion.', icon: CheckCircle2 },
  { id: 'activity', label: 'Activity', detail: 'Score class activity.', icon: Star },
  { id: 'coins', label: 'Coins', detail: 'Apply coins from the final score.', icon: Coins },
  { id: 'points', label: 'Points', detail: 'Enter manual points for each student.', icon: PencilLine },
];

interface OverallStatisticsTabProps {
  teacherId?: number;
  classes?: any[];
  students?: any[];
  attendance?: any[];
  grades?: any[];
  payments?: any[];
}

const palette = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899'];

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDisplayName = (item: any, fallback: string) => {
  const value = item?.class_name ?? item?.name ?? item?.group_name ?? item?.title ?? fallback;
  return String(value || fallback);
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const parseClassSchedule = (item: any) => {
  try {
    const schedule = JSON.parse(String(item?.section || ''));
    const days = Array.isArray(schedule?.days) ? schedule.days.map((day: unknown) => String(day)) : [];
    const time = String(schedule?.time || '').slice(0, 5);
    const endTime = String(schedule?.endTime || '').slice(0, 5);
    if (!days.length || !time || !endTime) return null;
    return { days, time, endTime };
  } catch {
    return null;
  }
};

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : -1;
};

const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getCalendarDays = (month: Date) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const OverallStatisticsTab = ({
  teacherId,
  classes = [],
  students = [],
  attendance = [],
  grades = [],
  payments = [],
}: OverallStatisticsTabProps) => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const [activeSection, setActiveSection] = useState<SectionKey>('students');
  const [now, setNow] = useState(() => new Date());
  const [startingClassId, setStartingClassId] = useState<number | null>(null);
  const [lessonPickerOpen, setLessonPickerOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<typeof nextLessons[number] | null>(null);
  const [selectedLessonDate, setSelectedLessonDate] = useState(localDateKey(new Date()));
  const [attendanceDates, setAttendanceDates] = useState<Record<string, boolean>>({});
  const [loadingAttendanceDates, setLoadingAttendanceDates] = useState(false);
  const [lessonCalendarMonth, setLessonCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedLessonActions, setSelectedLessonActions] = useState<LessonAction[]>(defaultLessonActions);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const teacherClasses = useMemo(() => {
    if (!teacherId) return classes;
    return classes.filter((item) => Number(item?.teacher_id ?? item?.teacherId ?? 0) === Number(teacherId));
  }, [classes, teacherId]);

  const teacherClassIds = useMemo(
    () => new Set(
      teacherClasses
        .map((item) => Number(item?.class_id ?? item?.id ?? 0))
        .filter((id) => id > 0)
    ),
    [teacherClasses]
  );

  const teacherStudents = useMemo(() => {
    if (teacherId && teacherClassIds.size > 0) {
      return students.filter((student) => teacherClassIds.has(Number(student?.class_id ?? student?.classId ?? 0)));
    }

    if (teacherId) {
      return students.filter((student) => Number(student?.teacher_id ?? student?.teacherId ?? 0) === Number(teacherId));
    }

    return students;
  }, [students, teacherClassIds, teacherId]);

  const teacherAttendance = useMemo(() => {
    if (teacherId && teacherClassIds.size > 0) {
      return attendance.filter((record) => teacherClassIds.has(Number(record?.class_id ?? record?.classId ?? 0)));
    }

    if (teacherId) {
      const studentIds = new Set(
        teacherStudents.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
      );
      return attendance.filter((record) => studentIds.has(Number(record?.student_id ?? record?.studentId ?? 0)));
    }

    return attendance;
  }, [attendance, teacherClassIds, teacherId, teacherStudents]);

  const teacherGrades = useMemo(() => {
    const studentIds = new Set(
      teacherStudents.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
    );
    if (studentIds.size === 0) return grades;
    return grades.filter((grade) => studentIds.has(Number(grade?.student_id ?? grade?.studentId ?? 0)));
  }, [grades, teacherStudents]);

  const teacherPayments = useMemo(() => {
    const studentIds = new Set(
      teacherStudents.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
    );
    if (studentIds.size === 0) return payments;
    return payments.filter((payment) => studentIds.has(Number(payment?.student_id ?? payment?.studentId ?? 0)));
  }, [payments, teacherStudents]);

  const studentGroups = useMemo(() => {
    const items = teacherClasses.length > 0 ? teacherClasses : [{ class_name: 'All students', class_id: 0, id: 0 }];
    return items.map((item, index) => {
      const classId = Number(item?.class_id ?? item?.id ?? 0);
      const count = classId > 0
        ? teacherStudents.filter((student) => Number(student?.class_id ?? student?.classId ?? 0) === classId).length
        : teacherStudents.length;

      return {
        id: classId,
        label: getDisplayName(item, `Group ${index + 1}`),
        value: count,
        color: palette[index % palette.length],
      };
    }).filter((group) => group.value > 0);
  }, [teacherClasses, teacherStudents]);

  const attendanceGroups = useMemo(() => {
    if (teacherAttendance.length === 0) {
      return [{ label: 'No attendance', value: 1, color: '#cbd5e1' }];
    }

    const classLabels = teacherClasses.length > 0 ? teacherClasses : [{ class_name: 'All groups', class_id: 0, id: 0 }];

    return classLabels.map((item, index) => {
      const classId = Number(item?.class_id ?? item?.id ?? 0);
      const studentsInClass = classId > 0
        ? teacherStudents.filter((student) => Number(student?.class_id ?? student?.classId ?? 0) === classId)
        : teacherStudents;
      const studentIds = new Set(
        studentsInClass.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
      );
      const classRecords = teacherAttendance.filter((record) =>
        studentIds.has(Number(record?.student_id ?? record?.studentId ?? 0))
      );
      const present = classRecords.filter((record) => {
        const status = String(record?.status ?? '').toLowerCase();
        return ['present', 'paid', 'attended', 'on_time'].includes(status);
      }).length;
      const total = classRecords.length || 1;
      const percent = (present / total) * 100;

      return {
        id: classId,
        label: getDisplayName(item, `Group ${index + 1}`),
        value: percent,
        color: palette[index % palette.length],
      };
    }).filter((group) => Number.isFinite(group.value));
  }, [teacherAttendance, teacherClasses, teacherStudents]);

  const pointsGroups = useMemo(() => {
    const classLabels = teacherClasses.length > 0 ? teacherClasses : [{ class_name: 'All groups', class_id: 0, id: 0 }];

    return classLabels.map((item, index) => {
      const classId = Number(item?.class_id ?? item?.id ?? 0);
      const studentsInClass = classId > 0
        ? teacherStudents.filter((student) => Number(student?.class_id ?? student?.classId ?? 0) === classId)
        : teacherStudents;
      const studentIds = new Set(
        studentsInClass.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
      );
      const classGrades = teacherGrades.filter((grade) =>
        studentIds.has(Number(grade?.student_id ?? grade?.studentId ?? 0))
      );
      const valid = classGrades.filter((grade) => toNumber(grade?.max_value, 0) > 0);
      const average = valid.length > 0
        ? valid.reduce((sum, grade) => {
            const value = toNumber(grade?.grade_value, 0);
            const max = toNumber(grade?.max_value, 0) || 100;
            return sum + ((value / max) * 100);
          }, 0) / valid.length
        : 0;

      return {
        id: classId,
        label: getDisplayName(item, `Group ${index + 1}`),
        value: average,
        color: palette[index % palette.length],
      };
    }).filter((group) => group.value > 0);
  }, [teacherClasses, teacherGrades, teacherStudents]);

  const paymentGroups = useMemo(() => {
    const classLabels = teacherClasses.length > 0 ? teacherClasses : [{ class_name: 'All groups', class_id: 0, id: 0 }];

    return classLabels.map((item, index) => {
      const classId = Number(item?.class_id ?? item?.id ?? 0);
      const studentsInClass = classId > 0
        ? teacherStudents.filter((student) => Number(student?.class_id ?? student?.classId ?? 0) === classId)
        : teacherStudents;
      const studentIds = new Set(
        studentsInClass.map((student) => Number(student?.student_id ?? student?.id ?? 0)).filter((id) => id > 0)
      );
      const classPayments = teacherPayments.filter((payment) =>
        studentIds.has(Number(payment?.student_id ?? payment?.studentId ?? 0))
      );
      const paid = classPayments.filter((payment) => {
        const status = String(payment?.payment_status ?? payment?.status ?? '').toLowerCase();
        return status === 'completed' || status === 'paid' || payment?.is_complete === true;
      }).length;

      return {
        id: classId,
        label: getDisplayName(item, `Group ${index + 1}`),
        value: paid,
        color: palette[index % palette.length],
      };
    }).filter((group) => group.value > 0);
  }, [teacherClasses, teacherPayments, teacherStudents]);

  const totalAttendanceRecords = teacherAttendance.length;
  const presentCount = teacherAttendance.filter((record) => {
    const status = String(record?.status ?? '').toLowerCase();
    return ['present', 'paid', 'attended', 'on_time'].includes(status);
  }).length;
  const overallAttendanceRate = totalAttendanceRecords > 0 ? (presentCount / totalAttendanceRecords) * 100 : 0;

  const scoredGrades = teacherGrades.filter((grade) => toNumber(grade?.max_value, 0) > 0);
  const totalScore = scoredGrades.reduce((sum, grade) => {
    const value = toNumber(grade?.grade_value, 0);
    const max = toNumber(grade?.max_value, 0) || 100;
    return sum + ((value / max) * 100);
  }, 0);
  const averageGrade = scoredGrades.length > 0 ? totalScore / scoredGrades.length : 0;

  const completedPaymentStudentIds = new Set(
    teacherPayments
      .filter((payment) => {
        const status = String(payment?.payment_status ?? payment?.status ?? '').toLowerCase();
        return status === 'completed' || status === 'paid' || payment?.is_complete === true;
      })
      .map((p) => Number(p?.student_id ?? p?.studentId ?? 0))
      .filter((id) => id > 0)
  );

  const completedPayments = completedPaymentStudentIds.size; // unique students who paid
  const totalStudentsForPayments = teacherStudents.length > 0
    ? teacherStudents.length
    : Array.from(new Set(teacherPayments.map((p) => Number(p?.student_id ?? p?.studentId ?? 0))).values()).filter((id) => id > 0).length;

  const paymentRate = totalStudentsForPayments > 0 ? (completedPayments / totalStudentsForPayments) * 100 : 0;

  const sectionMap: Record<SectionKey, { label: string; total: string; detail: string; data: { label: string; value: number; color: string }[]; icon: any }> = {
    students: {
      label: 'Students',
      total: `${teacherStudents.length}`,
      detail: `${teacherClasses.length || 1} groups`,
      data: studentGroups,
      icon: Users,
    },
    attendance: {
      label: 'Attendance',
      total: `${overallAttendanceRate.toFixed(1)}%`,
      detail: `${presentCount}/${totalAttendanceRecords || 0} present`,
      data: attendanceGroups,
      icon: CalendarCheck2,
    },
    points: {
      label: 'Points',
      total: `${averageGrade.toFixed(1)}%`,
      detail: `${scoredGrades.length} grade entries`,
      data: pointsGroups,
      icon: TrendingUp,
    },
    payments: {
      label: 'Payments',
      total: `${paymentRate.toFixed(1)}%`,
      detail: `${completedPayments}/${totalStudentsForPayments || 0} paid`,
      data: paymentGroups,
      icon: CircleDollarSign,
    },
  };

  const selectedSection = sectionMap[activeSection];
  const chartData = selectedSection.data.length > 0 ? selectedSection.data : [{ id: 0, label: 'No data', value: 1, color: '#cbd5e1' }];
  const [selectedGroup, setSelectedGroup] = useState<{ id: number; label: string } | null>(null);
  const [groupSearch, setGroupSearch] = useState('');

  const nextLessons = useMemo(() => {
    const currentDay = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return teacherClasses
      .map((item) => {
        const schedule = parseClassSchedule(item);
        const classId = Number(item?.class_id ?? item?.id ?? 0);
        if (classId <= 0) return null;
        if (!schedule) {
          return {
            classId,
            label: getDisplayName(item, 'Group'),
            date: null,
            dayLabel: 'Schedule unavailable',
            time: '',
            endTime: '',
            room: String(item?.room_number || ''),
            isActive: false,
            sortKey: Number.MAX_SAFE_INTEGER,
          };
        }

        const normalizedDays: string[] = schedule.days.map((day: string) => day.toLowerCase());
        const occurrences = Array.from({ length: 7 }, (_, offset) => {
          const dayIndex = (currentDay + offset) % 7;
          const dayName = dayNames[dayIndex].toLowerCase();
          if (!normalizedDays.some((scheduledDay: string) => scheduledDay === dayName || scheduledDay.slice(0, 3) === dayName.slice(0, 3))) return null;
          const date = new Date(now);
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() + offset);
          return { offset, dayIndex, date };
        }).filter(Boolean) as Array<{ offset: number; dayIndex: number; date: Date }>;

        const occurrence = occurrences.find(({ offset }) => {
          if (offset > 0) return true;
          return timeToMinutes(schedule.endTime) >= currentMinutes;
        });
        if (!occurrence) return null;

        const startMinutes = timeToMinutes(schedule.time);
        const endMinutes = timeToMinutes(schedule.endTime);
        const isToday = occurrence.offset === 0;
        const isActive = isToday && currentMinutes >= startMinutes && currentMinutes < endMinutes;
        const nextDate = occurrence.date;
        return {
          classId,
          label: getDisplayName(item, 'Group'),
          date: localDateKey(nextDate),
          dayLabel: dayNames[occurrence.dayIndex],
          time: schedule.time,
          endTime: schedule.endTime,
          room: String(item?.room_number || ''),
          isActive,
          sortKey: occurrence.date.getTime() + startMinutes * 60_000,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a!.sortKey - b!.sortKey)) as Array<{
        classId: number;
        label: string;
        date: string | null;
        dayLabel: string;
        time: string;
        endTime: string;
        room: string;
        isActive: boolean;
        sortKey: number;
      }>;
  }, [now, teacherClasses]);

  const toggleLessonAction = (action: LessonAction, checked: boolean) => {
    setSelectedLessonActions((current) => {
      if (checked) return Array.from(new Set([...current, action]));
      return current.filter((item) => item !== action);
    });
  };

  const openLessonPicker = async (lesson: typeof nextLessons[number]) => {
    if (startingClassId) return;
    setSelectedLesson(lesson);
    const initialDate = lesson.date || localDateKey(new Date());
    setSelectedLessonDate(initialDate);
    const initialDateValue = parseDateKey(initialDate);
    setLessonCalendarMonth(new Date(initialDateValue.getFullYear(), initialDateValue.getMonth(), 1));
    setAttendanceDates({});
    setSelectedLessonActions(defaultLessonActions);
    setLessonPickerOpen(true);

    setLoadingAttendanceDates(true);
    try {
      const response = await classAPI.getSessions(lesson.classId);
      const sessions = Array.isArray(response?.data) ? response.data : [];
      const statusEntries = await Promise.all(
        sessions.map(async (session: any) => {
          const sessionId = Number(session?.session_id || session?.id || 0);
          const date = String(session?.session_date || '').slice(0, 10);
          if (!sessionId || !date) return null;
          const attendanceResponse = await attendanceAPI.getBySession(sessionId).catch(() => ({ data: [] }));
          const records = Array.isArray(attendanceResponse?.data) ? attendanceResponse.data : [];
          return [date, records.length > 0] as const;
        })
      );
      setAttendanceDates(
        Object.fromEntries(statusEntries.filter((entry): entry is readonly [string, boolean] => Boolean(entry)))
      );
    } catch (error) {
      console.error('Failed to load lesson attendance dates:', error);
    } finally {
      setLoadingAttendanceDates(false);
    }
  };

  const startNextLesson = async () => {
    if (!selectedLesson || startingClassId) return;
    const scoringActions = selectedLessonActions.filter((action) => action !== 'coins');
    if (scoringActions.length === 0) {
      showToast.error('Pick attendance, homework, activity, or points before starting.');
      return;
    }

    const lesson = selectedLesson;
    const sessionDate = selectedLessonDate;
    if (!sessionDate) {
      showToast.error('Choose a session date before starting the lesson.');
      return;
    }
    setStartingClassId(lesson.classId);
    try {
      const centerId = getResolvedCenterId(user) || undefined;
      const sessionsResponse = await classAPI.getSessions(lesson.classId);
      const sessions = Array.isArray(sessionsResponse?.data) ? sessionsResponse.data : [];
      const existing = sessions.find((session: any) => String(session?.session_date || '').slice(0, 10) === sessionDate);
      let session = existing;
      if (!session) {
        const startTime = lesson.time || new Date().toTimeString().slice(0, 5);
        const durationMinutes = lesson.time && lesson.endTime
          ? Math.max(1, timeToMinutes(lesson.endTime) - timeToMinutes(lesson.time))
          : 90;
        const response = await classAPI.createSession(lesson.classId, {
          center_id: centerId,
          session_date: sessionDate,
          start_time: startTime,
          duration_minutes: durationMinutes,
          teacher_id: teacherId || user?.id,
        });
        session = response?.data ?? response;
      }
      const sessionId = Number(session?.session_id || session?.id);
      if (!sessionId) throw new Error('Missing lesson session');
      setLessonPickerOpen(false);
      navigate(`/classes/${lesson.classId}/sessions/${sessionId}/workflow?actions=${selectedLessonActions.join(',')}&from=teacher`);
    } catch (error) {
      console.error('Failed to start lesson:', error);
      showToast.error('Failed to start lesson.');
    } finally {
      setStartingClassId(null);
    }
  };

  const selectedLessonSchedule = selectedLesson
    ? teacherClasses.find((item) => Number(item?.class_id ?? item?.id ?? 0) === selectedLesson.classId)
    : null;
  const selectedLessonDays = parseClassSchedule(selectedLessonSchedule)?.days.map((day: string) => day.toLowerCase()) || [];
  const calendarDays = getCalendarDays(lessonCalendarMonth);
  const calendarMonthLabel = lessonCalendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const studentsInSelectedGroup = useMemo(() => {
    if (!selectedGroup) return [] as any[];
    if (selectedGroup.id === 0) return teacherStudents;
    return teacherStudents.filter((s) => Number(s?.class_id ?? s?.classId ?? 0) === selectedGroup.id);
  }, [selectedGroup, teacherStudents]);

  const filteredGroupStudents = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return studentsInSelectedGroup;
    return studentsInSelectedGroup.filter((s) => {
      const name = `${s.first_name || ''} ${s.last_name || ''}`.trim().toLowerCase();
      const email = String(s.email || '').toLowerCase();
      const id = String(s.student_id || s.id || '').toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q);
    });
  }, [groupSearch, studentsInSelectedGroup]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/20">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3 dark:border-white/10">
        {(
          [
            { key: 'students', label: 'Student count', icon: Users },
            { key: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
            { key: 'points', label: 'Points', icon: TrendingUp },
            { key: 'payments', label: 'Payments', icon: CircleDollarSign },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition ${
              activeSection === key
                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4 dark:border-white/10 dark:from-slate-900/50 dark:via-slate-900/70 dark:to-slate-900">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            <span>{selectedSection.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {selectedSection.detail}
            </span>
          </div>

          <div className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <PieChart data={chartData} size={260} strokeWidth={42} />
            </div>
            <div className="relative z-10 flex h-[118px] w-[118px] items-center justify-center rounded-full border border-slate-200 bg-white shadow-inner dark:border-white/10 dark:bg-slate-950">
              <div className="text-center">
                <div className="text-3xl font-black leading-none text-slate-900 dark:text-white">{selectedSection.total}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                  {selectedSection.label}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 dark:border-white/10">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Groups</div>
            {studentGroups.length > 0 ? studentGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroup({ id: group.id, label: group.label })}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="truncate font-semibold">{group.label}</span>
                </span>
                <span className="font-black">{group.value}</span>
              </button>
            )) : <div className="text-sm text-muted-foreground">No groups available.</div>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Next lessons</div>
          {nextLessons.length > 0 ? nextLessons.map((lesson) => (
            <div key={lesson.classId} className={`rounded-2xl border p-3 ${lesson.isActive ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/40'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{lesson.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {lesson.dayLabel}{lesson.time ? ` · ${lesson.time}–${lesson.endTime}` : ''}
                    {lesson.room ? ` · Room ${lesson.room}` : ''}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={startingClassId !== null}
                  onClick={() => void openLessonPicker(lesson)}
                >
                  {startingClassId === lesson.classId ? 'Starting...' : 'Start lesson'}
                </Button>
              </div>
            </div>
          )) : <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No scheduled lessons found.</div>}
        </div>

        <Dialog open={lessonPickerOpen} onOpenChange={(open) => !startingClassId && setLessonPickerOpen(open)}>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pick lesson session</DialogTitle>
              <DialogDescription>
                Choose the date and what you want to record for {selectedLesson?.label || 'this group'}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Session date</Label>
              <div className="rounded-xl border p-3">
                <div className="mb-3 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLessonCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                    disabled={startingClassId !== null}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-bold capitalize">{calendarMonthLabel}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setLessonCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                    disabled={startingClassId !== null}
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold uppercase text-muted-foreground">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day: string) => <span key={day}>{day}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date) => {
                    const dateKey = localDateKey(date);
                    const inMonth = date.getMonth() === lessonCalendarMonth.getMonth();
                    const dayName = dayNames[date.getDay()].toLowerCase();
                    const isLessonDay = selectedLessonDays.some((day: string) => day === dayName || day.slice(0, 3) === dayName.slice(0, 3));
                    const isSelected = dateKey === selectedLessonDate;
                    const isPastOrToday = dateKey <= localDateKey(new Date());
                    const hasAttendance = attendanceDates[dateKey] === true;
                    const attendanceColor = hasAttendance
                      ? 'bg-emerald-100 font-semibold text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900'
                      : isLessonDay && isPastOrToday
                        ? 'bg-red-100 font-semibold text-red-900 hover:bg-red-200 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900'
                        : isLessonDay
                          ? 'bg-slate-200 font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          : 'hover:bg-muted';
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedLessonDate(dateKey)}
                        disabled={startingClassId !== null}
                        className={`relative h-9 rounded-md text-sm transition ${
                          isSelected
                            ? 'bg-primary font-bold text-primary-foreground'
                            : attendanceColor
                        } ${inMonth ? '' : 'text-muted-foreground/40'}`}
                        aria-label={`${dateKey}${isLessonDay ? ' scheduled lesson day' : ''}`}
                      >
                        {date.getDate()}
                        {isLessonDay && !isSelected && <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${hasAttendance ? 'bg-emerald-600 dark:bg-emerald-400' : isPastOrToday ? 'bg-red-600 dark:bg-red-400' : 'bg-slate-500 dark:bg-slate-400'}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">Green</span> means attendance was recorded, <span className="font-semibold text-red-700 dark:text-red-300">red</span> means a past lesson has no attendance, and <span className="font-semibold text-slate-600 dark:text-slate-300">gray</span> means the lesson has not happened yet.
              </p>
              {loadingAttendanceDates && <p className="text-xs text-muted-foreground">Loading attendance history...</p>}
              <div className="text-sm font-semibold">Selected: {selectedLessonDate}</div>
            </div>
            <div className="grid gap-2">
              {lessonActionOptions.map((option) => {
                const Icon = option.icon;
                const checked = selectedLessonActions.includes(option.id);
                return (
                  <label
                    key={option.id}
                    htmlFor={`overview-lesson-action-${option.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:bg-slate-50 dark:hover:bg-muted/40"
                  >
                    <Checkbox
                      id={`overview-lesson-action-${option.id}`}
                      checked={checked}
                      onCheckedChange={(value) => toggleLessonAction(option.id, value === true)}
                      className="mt-1"
                    />
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="block text-xs text-muted-foreground">{option.detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={startingClassId !== null} onClick={() => setLessonPickerOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={startingClassId !== null} onClick={() => void startNextLesson()}>
                {startingClassId !== null ? 'Starting...' : 'Start session'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedGroup} onOpenChange={(open) => { if (!open) { setSelectedGroup(null); setGroupSearch(''); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="flex items-center gap-2">{selectedGroup ? selectedGroup.label : 'Group'} <span className="text-sm font-normal text-slate-500">students</span></DialogTitle>
                <DialogDescription className="mt-1">{selectedGroup ? `${studentsInSelectedGroup.length} students` : ''}</DialogDescription>
              </div>
              <div className="min-w-[220px]">
                <Label className="mb-1 text-[11px] uppercase">Search students</Label>
                <Input value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} placeholder="Name, email, or id" />
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 max-h-[420px] overflow-auto">
            {filteredGroupStudents.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">No students found.</div>
            ) : (
              <div className="divide-y">
                {filteredGroupStudents.map((s) => {
                  const name = `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.name || 'Unnamed';
                  const initials = name.split(' ').map((p: string) => p[0]).slice(0,2).join('').toUpperCase();
                  return (
                    <div key={s.student_id ?? s.id} className="flex items-center justify-between gap-4 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{initials}</div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{name}</div>
                          <div className="text-xs text-slate-500">{s.email || s.enrollment || `ID: ${s.student_id ?? s.id ?? ''}`}</div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-700">{s.phone || ''}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="w-full flex justify-end">
              <Button variant="ghost" onClick={() => { setSelectedGroup(null); setGroupSearch(''); }}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-900/40">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          {selectedSection.label} overview
        </div>
        <div className="text-sm font-black text-slate-900 dark:text-white">{selectedSection.total}</div>
      </div>
    </div>
  );
};

export default OverallStatisticsTab;