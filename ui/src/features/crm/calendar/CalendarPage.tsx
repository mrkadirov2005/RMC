// Page component for the calendar screen in the crm feature.

import { useMemo, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { classAPI, portalAPI } from '@/shared/api/api';
import { useAppDispatch, useAppSelector } from '@/features/crm/hooks';
import { fetchStudents, fetchStudentsForce } from '@/slices/studentsSlice';
import { fetchGrades, fetchGradesForce } from '@/slices/gradesSlice';
import { fetchRooms, fetchRoomsForce } from '@/slices/roomsSlice';
import { showToast } from '@/utils/toast';
import ClassDetailModal from '@/features/crm/classes/ClassDetailModal';
import SessionModal from '@/features/crm/classes/SessionModal';
import { CalendarHeader } from './CalendarHeader';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayModal } from './DayModal';
import { DetailsModal } from './DetailsModal';
import { useCalendarData } from './hooks/useCalendarData';
import { buildCalendarDays, getConfiguredLessonDurationMinutes, toLocalDateKey } from './utils';
import type { ClassItem, AttendanceItem, GradeItem, SessionItem, StudentItem } from './types';
import { RoomFilter } from './components/RoomFilter';
import { CalendarPageHeader } from './components/CalendarPageHeader';



// Renders the calendar page screen.
const CalendarPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const allAttendance = useAppSelector((state) => state.attendance.items) as AttendanceItem[];
  const allGrades = useAppSelector((state) => state.grades.items) as GradeItem[];
  const allStudents = useAppSelector((state) => state.students.items) as StudentItem[];
  const rooms = useAppSelector((state) => state.rooms.items) as any[];
  const [loading, setLoading] = useState(true);

  // Calendar navigation state
  const today = new Date();
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });

  // Modal states
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Selected items
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState('');
  const [sessionModalClass, setSessionModalClass] = useState<any>(null);
  const [sessionModalId, setSessionModalId] = useState<number | null>(null);
  const [sessionModalDate, setSessionModalDate] = useState<string>('');
  const [selectedDayEvents, setSelectedDayEvents] = useState<Array<{ cls: ClassItem; session?: SessionItem }>>([]);
  const [schedule, setSchedule] = useState<any[]>([]);


  // Data states
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [attendanceByKey, setAttendanceByKey] = useState<Map<string, { present: number; absent: number }>>(new Map());
  const [attendanceBySession, setAttendanceBySession] = useState<Map<number, { present: number; absent: number }>>(new Map());
  const [studentAttendanceByDate, setStudentAttendanceByDate] = useState<Map<string, string>>(new Map());
  const [studentAttendanceBySession, setStudentAttendanceBySession] = useState<Map<number, string>>(new Map());

  // Lesson details
  const [lessonAttendance, setLessonAttendance] = useState<AttendanceItem[]>([]);
  const [lessonGrades, setLessonGrades] = useState<GradeItem[]>([]);
  const [lessonStudents, setLessonStudents] = useState<StudentItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');


  // Use custom hook for data loading
  useCalendarData({
    user,
    setClasses,
    setLoading,
    setSessions,
    setAttendanceByKey,
    setAttendanceBySession,
    setStudentAttendanceByDate,
    setStudentAttendanceBySession,
  });

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchRooms());
    if (user?.userType !== 'student') {
      dispatch(fetchStudents());
      dispatch(fetchGrades());
    }
  }, [dispatch, user?.userType]);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      dispatch(fetchRoomsForce());
      if (user?.userType !== 'student') {
        dispatch(fetchStudentsForce());
        dispatch(fetchGradesForce());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, user?.userType]);

  // Load schedule for student or teacher
  useEffect(() => {
// Loads schedule.
    const loadSchedule = async () => {
      if (user?.userType === 'student') {
        try {
          const res = await portalAPI.getSchedule();
          setSchedule(Array.isArray(res) ? res : res.data || []);
        } catch (error) {
          console.error('Failed to load schedule:', error);
        }
      } else if (user?.userType === 'teacher') {
        // For teachers, we derive schedule from rooms which we already loaded
        const teacherId = Number(user.id);
        const teacherSchedule = rooms
          .filter(r => Number(r.teacher_id) === teacherId && r.day && r.time)
          .map(r => ({
            day: r.day,
            time: r.time,
            room_number: r.room_number,
            class_id: r.class_id,
            class_name: r.class_name
          }));
        setSchedule(teacherSchedule);
      }
    };
    loadSchedule();
  }, [user, rooms]);



  // Filtered rooms list for dropdown
  const uniqueRoomNumbers = useMemo(() => {
    const numbers = new Set<string>();
    rooms.forEach(r => {
      if (r.room_number) numbers.add(r.room_number);
    });
    return Array.from(numbers).sort();
  }, [rooms]);

  // Map of Class ID to assigned room number from the rooms schedule
  const classToRoomMap = useMemo(() => {
    const map = new Map<number, Set<string>>();
    rooms.forEach(r => {
      const classId = Number(r.class_id);
      if (classId && r.room_number) {
        if (!map.has(classId)) map.set(classId, new Set());
        map.get(classId)?.add(r.room_number);
      }
    });
    return map;
  }, [rooms]);

  // Filtered sessions and classes
  const filteredSessions = useMemo(() => {
    if (selectedRoom === 'all') return sessions;
    return sessions.filter(s => {
      const assignedRooms = classToRoomMap.get(Number(s.class_id));
      return assignedRooms?.has(selectedRoom);
    });
  }, [sessions, selectedRoom, classToRoomMap]);


  // Calendar calculations
  const calendarDays = useMemo(
    () => buildCalendarDays(displayYear, displayMonth),
    [displayYear, displayMonth]
  );

// Memoizes the weeks derived value.
  const weeks = useMemo(() => {
    const rows: any[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

// Returns week days.
  const getWeekDays = () => {
    const weekDaysData: any[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
// Handles day index.
      const dayIndex = (date.getDay() + 6) % 7;
      weekDaysData.push({
        date: date.getDate(),
        isCurrentMonth: date.getMonth() === displayMonth,
        dayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex],
        isoDate: toLocalDateKey(date),
      });
    }
    return weekDaysData;
  };

// Memoizes the events by date derived value.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Array<{ cls: ClassItem; session?: SessionItem }>>();
    const classById = new Map<number, ClassItem>();
    classes.forEach((cls) => {
      const classId = Number(cls.class_id || cls.id);
      if (classId) classById.set(classId, cls);
    });

    sessions.forEach((session) => {
      const cls = classById.get(Number(session.class_id));
      if (!cls) return;
      
      // Filter by room if selected
      if (selectedRoom !== 'all') {
        const assignedRooms = classToRoomMap.get(Number(session.class_id));
        if (!assignedRooms?.has(selectedRoom)) return;
      }

      const dateKey = toLocalDateKey(session.session_date);
      const existing = map.get(dateKey) || [];
      existing.push({ cls, session });
      map.set(dateKey, existing);
    });

    return map;
  }, [classes, sessions, selectedRoom, classToRoomMap]);


  // User type checks
  const isSuperuser = user?.userType === 'superuser';
  const isStudent = user?.userType === 'student';
  const canViewDetails = isSuperuser || user?.userType === 'teacher' || isStudent;

  // Handlers
  const handleStartLesson = async (classId: number, date: string, time: string) => {
    try {
      const cls = classes.find(c => Number(c.class_id || c.id) === classId);
      if (!cls) return;
      const durationMinutes = getConfiguredLessonDurationMinutes();

      const res = await classAPI.createSession(classId, {
        session_date: date,
        start_time: time,
        duration_minutes: durationMinutes,
        teacher_id: user?.id ? Number(user.id) : Number(cls.teacher_id)
      });
      
      const newSession = res.data;
      if (newSession?.session_id) {
        setSessions(prev => [...prev, newSession]);
        handleOpenSessionModal(cls, newSession.session_id, date);
        setDayModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to start lesson:', error);
      showToast.error('Failed to start lesson');
    }
  };

// Handles delete session.
  const handleDeleteSession = async (classId: number, sessionId: number) => {

    if (!window.confirm('Delete this session?')) return;
    try {
      await classAPI.deleteSessionById(classId, sessionId);
      setSessions((prev) => prev.filter((s) => Number(s.session_id) !== sessionId));
      setAttendanceBySession((prev) => {
        const next = new Map(prev);
        next.delete(sessionId);
        return next;
      });
      setStudentAttendanceBySession((prev) => {
        const next = new Map(prev);
        next.delete(sessionId);
        return next;
      });
      showToast.success('Session deleted.');
    } catch (error) {
      console.error('Failed to delete session:', error);
      showToast.error('Failed to delete session');
    }
  };

// Handles prev month.
  const handlePrevMonth = () => {
    setDisplayMonth((prev) => (prev === 0 ? 11 : prev - 1));
    setDisplayYear((prev) => (displayMonth === 0 ? prev - 1 : prev));
  };

// Handles next month.
  const handleNextMonth = () => {
    setDisplayMonth((prev) => (prev === 11 ? 0 : prev + 1));
    setDisplayYear((prev) => (displayMonth === 11 ? prev + 1 : prev));
  };

// Handles prev week.
  const handlePrevWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStartDate(newDate);
    setDisplayMonth(newDate.getMonth());
    setDisplayYear(newDate.getFullYear());
  };

// Handles next week.
  const handleNextWeek = () => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStartDate(newDate);
    setDisplayMonth(newDate.getMonth());
    setDisplayYear(newDate.getFullYear());
  };

// Handles open day.
  const handleOpenDay = (isoDate: string) => {
    const events = eventsByDate.get(isoDate) || [];
    setSelectedDay(isoDate);
    setSelectedDayEvents(events);
    setDayModalOpen(true);
  };

// Handles open session modal.
  const handleOpenSessionModal = (cls: ClassItem, sid: number, date: string) => {
    setSessionModalClass(cls);
    setSessionModalId(sid);
    setSessionModalDate(date);
    setSessionModalOpen(true);
  };

// Handles open details.
  const handleOpenDetails = (cls: ClassItem, isoDate: string) => {
    if (!canViewDetails) return;
    setSelectedClass(cls);
    setSelectedDate(isoDate);
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const classId = Number(cls.class_id || cls.id);
      const sessionIdsForDate = sessions
        .filter((session) => Number(session.class_id) === classId && toLocalDateKey(session.session_date) === isoDate)
        .map((session) => Number(session.session_id));

      const filteredAttendance = allAttendance.filter((a: AttendanceItem) => {
        if (Number(a.class_id) !== classId) return false;
        if (sessionIdsForDate.length > 0 && a.session_id) {
          return sessionIdsForDate.includes(Number(a.session_id));
        }
        return toLocalDateKey(a.attendance_date) === isoDate;
      });
      const filteredGrades = allGrades.filter((g: GradeItem) => {
        if (Number(g.class_id) !== classId) return false;
        if (sessionIdsForDate.length > 0 && g.session_id) {
          return sessionIdsForDate.includes(Number(g.session_id));
        }
        const gradeDate = g.created_at ? toLocalDateKey(g.created_at) : toLocalDateKey(new Date());
        return gradeDate === isoDate;
      });
      const filteredStudents = allStudents.filter((s: StudentItem) => Number(s.class_id) === classId);

      setLessonAttendance(filteredAttendance);
      setLessonGrades(filteredGrades);
      setLessonStudents(filteredStudents);
    } catch (error) {
      console.error('Failed to load lesson details:', error);
      setLessonAttendance([]);
      setLessonGrades([]);
      setLessonStudents([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <CalendarPageHeader today={today} />

      <RoomFilter
        selectedRoom={selectedRoom}
        setSelectedRoom={setSelectedRoom}
        uniqueRoomNumbers={uniqueRoomNumbers}
      />


      {loading ? (

        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CalendarHeader
              calendarView={calendarView}
              displayMonth={displayMonth}
              displayYear={displayYear}
              weekStartDate={weekStartDate}
              onViewChange={setCalendarView}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
            />
          </CardHeader>
          <CardContent>
            {calendarView === 'month' ? (
              <MonthView
                weeks={weeks}
                eventsByDate={eventsByDate}
                attendanceByKey={attendanceByKey}
                attendanceBySession={attendanceBySession}
                studentAttendanceByDate={studentAttendanceByDate}
                studentAttendanceBySession={studentAttendanceBySession}
                today={today}
                displayMonth={displayMonth}
                displayYear={displayYear}
                isSuperuser={isSuperuser}
                isStudent={isStudent || false}
                canViewDetails={canViewDetails}
                schedule={schedule}
                onOpenDay={handleOpenDay}
                onDeleteSession={handleDeleteSession}
              />

            ) : (
              <WeekView
                weekDays={getWeekDays()}
                sessions={filteredSessions}
                classes={classes}
                today={today}
                displayMonth={displayMonth}
                displayYear={displayYear}
                isSuperuser={isSuperuser}
                schedule={schedule}
                onOpenSessionModal={handleOpenSessionModal}
              />

            )}


            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded border border-amber-400/80 bg-amber-50/60" />
                Today
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DayModal
        open={dayModalOpen}
        selectedDay={selectedDay}
        selectedDayEvents={selectedDayEvents}
        attendanceByKey={attendanceByKey}
        attendanceBySession={attendanceBySession}
        isSuperuser={isSuperuser}
        isStudent={isStudent || false}
        canViewDetails={canViewDetails}
        onOpenSessionModal={handleOpenSessionModal}
        onDeleteSession={handleDeleteSession}
        onOpenDetails={handleOpenDetails}
        onOpenChange={setDayModalOpen}
        onStartLesson={handleStartLesson}
        classes={classes}
        schedule={schedule}
      />



      <DetailsModal
        open={detailsOpen}
        loading={detailsLoading}
        selectedClass={selectedClass}
        selectedDate={selectedDate}
        lessonAttendance={lessonAttendance}
        lessonGrades={lessonGrades}
        lessonStudents={lessonStudents}
        isStudent={isStudent || false}
        user={user}
        onOpenChange={setDetailsOpen}
      />

      <ClassDetailModal
        open={classModalOpen}
        classData={selectedClass as any}
        onClose={() => setClassModalOpen(false)}
      />

      <SessionModal
        open={sessionModalOpen}
        classData={sessionModalClass}
        sessionId={sessionModalId}
        selectedDate={sessionModalDate}
        onClose={() => {
          setSessionModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
};

export default CalendarPage;
