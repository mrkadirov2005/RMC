import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import SessionModal from '@/features/crm/classes/SessionModal';
import { useAppDispatch, useAppSelector } from '@/features/crm/hooks';
import { fetchClasses, fetchClassesForce } from '@/slices/classesSlice';
import { fetchStudents } from '@/slices/studentsSlice';
import { showToast } from '@/utils/toast';
import { calendarAPI, classAPI } from './api';
import { EMPTY_FILTERS, localDateKey, type CalendarEvent, type CalendarFilters, type CalendarView } from './calendarWorkspace';
import { CalendarEventDrawer } from './components/CalendarEventDrawer';
import { CalendarWorkspaceFilters } from './components/CalendarWorkspaceFilters';
import { CalendarWorkspaceToolbar } from './components/CalendarWorkspaceToolbar';
import { useCalendarWorkspace } from './hooks/useCalendarWorkspace';
import { AgendaCalendarView } from './views/AgendaCalendarView';
import { DayCalendarView } from './views/DayCalendarView';
import { MonthCalendarView } from './views/MonthCalendarView';
import { WeekCalendarView } from './views/WeekCalendarView';

const VIEW_KEY = 'rmc-calendar-view';
const validView = (value: string | null): value is CalendarView => ['day', 'week', 'month', 'agenda'].includes(value || '');
const initialState = () => {
  const params = new URLSearchParams(window.location.search);
  let stored: string | null = null;
  try { stored = window.localStorage.getItem(VIEW_KEY); } catch { stored = null; }
  const view = validView(params.get('view')) ? params.get('view') as CalendarView : validView(stored) ? stored : 'week';
  const parsedDate = new Date(`${params.get('date') || localDateKey(new Date())}T12:00:00`);
  return {
    view,
    anchor: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
    filters: {
      query: params.get('q') || '', teacherId: params.get('teacher') || '', classId: params.get('group') || '',
      subjectId: params.get('subject') || '', roomId: params.get('room') || '', status: params.get('status') || '',
    } as CalendarFilters,
  };
};

const minutesBetween = (start: string, end: string) => {
  const [startHour, startMinute] = start.split(':').map(Number); const [endHour, endMinute] = end.split(':').map(Number);
  const value = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return Number.isFinite(value) && value > 0 ? value : 60;
};

const CalendarPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const classes = useAppSelector(state => state.classes.items);
  const [state] = useState(initialState);
  const [anchor, setAnchor] = useState(state.anchor);
  const [view, setView] = useState<CalendarView>(state.view);
  const [filters, setFilters] = useState<CalendarFilters>(state.filters);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [sessionData, setSessionData] = useState<{ classData: any; id: number; date: string } | null>(null);
  const workspace = useCalendarWorkspace(anchor, view, filters);
  const classMap = useMemo(() => new Map(classes.map(item => [Number(item.class_id || item.id), item])), [classes]);
  const isStudent = user?.userType === 'student';
  const canManage = user?.userType === 'superuser' || user?.userType === 'teacher';
  const canDelete = user?.userType === 'superuser';

  useEffect(() => { if (!isStudent) { dispatch(fetchClasses()); dispatch(fetchStudents()); } }, [dispatch, isStudent]);

  useEffect(() => {
    try { window.localStorage.setItem(VIEW_KEY, view); } catch { /* Storage can be unavailable in restricted browsers. */ }
    const params = new URLSearchParams(); params.set('view', view); params.set('date', localDateKey(anchor));
    const mappings: Array<[keyof CalendarFilters, string]> = [['query', 'q'], ['teacherId', 'teacher'], ['classId', 'group'], ['subjectId', 'subject'], ['roomId', 'room'], ['status', 'status']];
    mappings.forEach(([key, name]) => filters[key] && params.set(name, filters[key]));
    window.history.replaceState(null, '', `${window.location.pathname}?${params}${window.location.hash}`);
  }, [anchor, filters, view]);

  const move = useCallback((direction: number) => setAnchor(current => {
    const next = new Date(current);
    if (view === 'month') next.setMonth(next.getMonth() + direction);
    else next.setDate(next.getDate() + direction * (view === 'week' ? 7 : view === 'agenda' ? 30 : 1));
    return next;
  }), [view]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const key = event.key.toLowerCase();
      if (key === 't') setAnchor(new Date());
      if (key === 'arrowleft') move(-1);
      if (key === 'arrowright') move(1);
      const keyboardView = ({ d: 'day', w: 'week', m: 'month', a: 'agenda' } as Record<string, CalendarView>)[key];
      if (keyboardView) setView(keyboardView);
    };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  }, [move]);

  const resolveClass = async (event: CalendarEvent) => {
    const cached = classMap.get(Number(event.class_id)); if (cached) return cached;
    const response = await classAPI.getById(event.class_id); return response?.data?.data ?? response?.data;
  };

  const openSession = async (event: CalendarEvent) => {
    if (!event.session_id) return;
    try { setSessionData({ classData: await resolveClass(event), id: event.session_id, date: event.date }); setSelectedEvent(null); }
    catch { showToast.error('Failed to open lesson.'); }
  };

  const startLesson = async (event: CalendarEvent) => {
    try {
      const classData = await resolveClass(event);
      const response = await classAPI.createSession(event.class_id, { session_date: event.date, start_time: event.start_time, duration_minutes: minutesBetween(event.start_time, event.end_time), teacher_id: event.teacher_id || (user?.id ? Number(user.id) : undefined) });
      const session = response?.data?.data ?? response?.data;
      if (!session?.session_id) throw new Error('Missing session');
      setSelectedEvent(null); setSessionData({ classData, id: session.session_id, date: event.date }); workspace.refresh();
    } catch { showToast.error('Failed to start lesson.'); }
  };

  const deleteSession = async (event: CalendarEvent) => {
    if (!event.session_id || !window.confirm('Delete this session?')) return;
    try { await classAPI.deleteSessionById(event.class_id, event.session_id); setSelectedEvent(null); workspace.refresh(); showToast.success('Session deleted.'); }
    catch { showToast.error('Failed to delete session.'); }
  };

  const moveRecurring = async (event: CalendarEvent, room: string, pattern: string, start: string, end: string) => {
    if (!canManage || event.source !== 'recurring') return;
    try {
      await calendarAPI.moveRecurring(event.class_id, { room_name: room, pattern, start_time: start, end_time: end });
      await dispatch(fetchClassesForce());
      workspace.refresh();
      showToast.success(`${event.class_name} moved to ${room}.`);
    } catch (error: any) { showToast.error(error?.response?.data?.error || 'Could not move this lesson.'); }
  };

  const counts = useMemo(() => ({
    total: workspace.events.length,
    conducted: workspace.events.filter(event => event.status === 'conducted').length,
    pending: workspace.events.filter(event => ['planned', 'ready', 'in_progress'].includes(event.status)).length,
    attendance: workspace.events.filter(event => (event.attendance?.unmarked || 0) > 0).length,
  }), [workspace.events]);
  const calendarRooms = useMemo(() => workspace.resources.filter(resource => resource.type === 'room').map(resource => resource.name), [workspace.resources]);

  return <div className="mx-auto max-w-[1600px] space-y-3 px-3 py-4 sm:px-5">
    <header className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground"><CalendarDays className="h-5 w-5" /></div><div><h1 className="text-2xl font-bold">Calendar</h1><p className="text-xs text-muted-foreground">Lessons, rooms, teachers and attendance in one schedule.</p></div></header>
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
      <CalendarWorkspaceToolbar anchor={anchor} view={view} onView={setView} onMove={move} onToday={() => setAnchor(new Date())} onDate={setAnchor} />
      <CalendarWorkspaceFilters filters={filters} resources={workspace.resources} onChange={setFilters} onClear={() => setFilters(EMPTY_FILTERS)} />
      <div className="grid grid-cols-2 border-b sm:grid-cols-4">{([
        ['Lessons', counts.total, CalendarDays], ['Conducted', counts.conducted, CheckCircle2], ['Pending', counts.pending, Clock3], ['Attendance missing', counts.attendance, AlertTriangle],
      ] as const).map(([label, value, Icon]) => <div key={label} className="flex items-center gap-2 border-r px-3 py-2 last:border-r-0"><Icon className="h-4 w-4 text-muted-foreground" /><div><div className="text-lg font-bold leading-none">{value}</div><div className="mt-1 text-[11px] text-muted-foreground">{label}</div></div></div>)}</div>
      {workspace.conflicts.length > 0 && <div className="flex items-center gap-2 border-b bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"><AlertTriangle className="h-4 w-4" />{workspace.conflicts.length} scheduling conflict{workspace.conflicts.length === 1 ? '' : 's'} need attention.</div>}
      {workspace.error && <div role="alert" className="border-b bg-destructive/10 p-3 text-sm text-destructive">{workspace.error}</div>}
      {workspace.loading ? <div className="grid min-h-[420px] place-items-center"><Loader2 aria-label="Loading calendar" className="h-7 w-7 animate-spin text-primary" /></div> : <>
        {view === 'day' && <DayCalendarView anchor={anchor} events={workspace.events} onSelect={setSelectedEvent} />}
        {view === 'week' && <WeekCalendarView anchor={anchor} events={workspace.events} rooms={calendarRooms} onSelect={setSelectedEvent} onMove={moveRecurring} canMove={canManage} />}
        {view === 'month' && <MonthCalendarView anchor={anchor} events={workspace.events} onSelect={setSelectedEvent} onDay={date => { setAnchor(date); setView('day'); }} />}
        {view === 'agenda' && <AgendaCalendarView events={workspace.events} onSelect={setSelectedEvent} />}
      </>}
    </Card>
    <CalendarEventDrawer event={selectedEvent} canManage={canManage} canDelete={canDelete} onClose={() => setSelectedEvent(null)} onStart={startLesson} onOpen={openSession} onDelete={deleteSession} />
    <SessionModal open={Boolean(sessionData)} classData={sessionData?.classData} sessionId={sessionData?.id || null} selectedDate={sessionData?.date} onClose={() => { setSessionData(null); workspace.refresh(); }} />
  </div>;
};

export default CalendarPage;
