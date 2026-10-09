import { CalendarCheck, CheckCircle2, Coins, PencilLine, Star } from 'lucide-react';

// Shared by every "Start lesson" entry point (teacher Overall, teacher My Classes, admin class page)
// and by the session workflow page itself, so the action list and URL shape stay in one place.

export type LessonAction = 'attendance' | 'homework' | 'activity' | 'coins' | 'points';

export const defaultLessonActions: LessonAction[] = ['attendance', 'homework', 'activity', 'coins'];

export const lessonActionOptions: Array<{ id: LessonAction; label: string; detail: string; icon: typeof CalendarCheck }> = [
  { id: 'attendance', label: 'Attendance', detail: 'Mark present, late, excused, or absent.', icon: CalendarCheck },
  { id: 'homework', label: 'Homework', detail: 'Score homework completion.', icon: CheckCircle2 },
  { id: 'activity', label: 'Activity', detail: 'Score class activity.', icon: Star },
  { id: 'coins', label: 'Coins', detail: 'Apply coins from the final score.', icon: Coins },
  { id: 'points', label: 'Points', detail: 'Enter a 100-point score for each student; replaces homework and activity.', icon: PencilLine },
];

/** Route segment used in place of a session id for a lesson that has no session row yet. */
export const NEW_SESSION_SEGMENT = 'new';

/** session_date arrives as a plain `YYYY-MM-DD` string; never round-trip it through Date/UTC. */
export const sessionDateKey = (session: any) => String(session?.session_date || '').slice(0, 10);

export const getSessionId = (session: any) => Number(session?.session_id || session?.id || 0) || 0;

export const findSessionOnDate = (sessions: any[], dateKey: string) =>
  sessions.find((session) => !session?.deleted_at && sessionDateKey(session) === dateKey);

// The 100-point score replaces homework and activity in the lesson total, so they never go together.
const POINTS_EXCLUDES: LessonAction[] = ['homework', 'activity'];

/** Turns an action on or off; choosing points drops homework and activity, and vice versa. */
export const toggleLessonAction = (actions: LessonAction[], action: LessonAction, checked: boolean): LessonAction[] => {
  if (!checked) return actions.filter((item) => item !== action);
  const kept = action === 'points'
    ? actions.filter((item) => !POINTS_EXCLUDES.includes(item))
    : POINTS_EXCLUDES.includes(action) ? actions.filter((item) => item !== 'points') : actions;
  return Array.from(new Set([...kept, action]));
};

/** Drops points from an action list that also has homework or activity (e.g. an old link). */
export const resolveLessonActions = <T extends string>(actions: T[]): T[] =>
  actions.some((item) => POINTS_EXCLUDES.includes(item as LessonAction)) ? actions.filter((item) => item !== 'points') : actions;

export const hasScoringAction = (actions: LessonAction[]) => actions.some((action) => action !== 'coins');

export const buildSessionWorkflowPath = ({
  classId,
  sessionId,
  date,
  actions,
  from,
  tab,
  view = false,
}: {
  classId: number;
  sessionId?: number | null;
  date?: string;
  actions: string[];
  from?: string | null;
  tab?: string | null;
  /** Open a saved lesson read-only. */
  view?: boolean;
}) => {
  const params = new URLSearchParams({ actions: actions.join(',') });
  if (!sessionId && date) params.set('date', date);
  if (tab) params.set('tab', tab);
  if (from) params.set('from', from);
  if (view && sessionId) params.set('mode', 'view');
  return `/classes/${classId}/sessions/${sessionId || NEW_SESSION_SEGMENT}/workflow?${params.toString()}`;
};
