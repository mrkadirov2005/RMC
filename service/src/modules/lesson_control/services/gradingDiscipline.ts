// Scoring discipline: lessons must be scored on the lesson day, within two hours of the start.
// Each lesson scored late or not at all costs 5 KPI points; a finished month with none earns 10.

const GRADING_WINDOW_MINUTES = 120;
const PENALTY = 5;
const MONTH_BONUS = 10;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

type ClassRow = { class_id: number; class_name: string; teacher_id: number | null; section?: string | null; starts_on?: string | null };
type DayOff = { off_date: string; class_id: number | null };
type Reschedule = { class_id: number; original_date: string; new_date: string; new_time?: string | null };
export type Lesson = { class_id: number; class_name: string; teacher_id: number | null; date: string; start: string };
type Session = { class_id: number; session_date: string; first_graded: string | null };

const schedule = (section?: string | null) => {
  try {
    const parsed = JSON.parse(String(section || ''));
    return {
      days: (Array.isArray(parsed?.days) ? parsed.days : []).map((day: unknown) => String(day).trim().toLowerCase()),
      time: String(parsed?.time || '').slice(0, 5),
    };
  } catch {
    return { days: [] as string[], time: '' };
  }
};

const datesBetween = (from: string, to: string) => {
  const dates: string[] = [];
  for (let day = new Date(`${from}T00:00:00Z`); day.toISOString().slice(0, 10) <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
};

/** The lessons a group's schedule expects between two dates (from the day the group started), minus days off, with approved moves. */
const expectedLessons = (classes: ClassRow[], from: string, to: string, daysOff: DayOff[], reschedules: Reschedule[]): Lesson[] => {
  const isOff = (classId: number, date: string) => daysOff.some((off) => off.off_date === date && (off.class_id == null || Number(off.class_id) === classId));
  const lessons: Lesson[] = [];
  const dates = datesBetween(from, to);
  classes.forEach((cls) => {
    const { days, time } = schedule(cls.section);
    const classId = Number(cls.class_id);
    const moves = reschedules.filter((move) => Number(move.class_id) === classId);
    if (time) {
      dates.forEach((date) => {
        const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
        if (!days.includes(weekday) || isOff(classId, date) || moves.some((move) => move.original_date === date)) return;
        if (cls.starts_on && date < cls.starts_on) return;
        lessons.push({ class_id: classId, class_name: cls.class_name, teacher_id: cls.teacher_id, date, start: time });
      });
    }
    moves.forEach((move) => {
      const start = String(move.new_time || time || '').slice(0, 5);
      if (move.new_date >= from && move.new_date <= to && start) {
        lessons.push({ class_id: classId, class_name: cls.class_name, teacher_id: cls.teacher_id, date: move.new_date, start });
      }
    });
  });
  return lessons.sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
};

/** "2026-10-09" + "10:00" -> "2026-10-09 12:00" (never past the end of the lesson day). */
const deadlineOf = (lesson: Lesson) => {
  const [hours, minutes] = lesson.start.split(':').map(Number);
  const total = Math.min(hours * 60 + minutes + GRADING_WINDOW_MINUTES, 23 * 60 + 59);
  return `${lesson.date} ${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Each lesson's status against the sessions actually scored (first grade time, Tashkent, as
 * "YYYY-MM-DD HH:MM"): on time, late, missing, or pending while its deadline has not passed.
 */
const evaluate = (lessons: Lesson[], sessions: Session[], now: string, monthFinished: boolean) => {
  const graded = new Map(sessions.map((session) => [`${Number(session.class_id)}|${session.session_date}`, session.first_graded]));
  const rows = lessons.map((lesson) => {
    const deadline = deadlineOf(lesson);
    const firstGraded = graded.get(`${lesson.class_id}|${lesson.date}`) || null;
    const status = firstGraded ? (firstGraded <= deadline ? 'on_time' : 'late') : now > deadline ? 'missing' : 'pending';
    return { ...lesson, deadline, first_graded: firstGraded, status };
  });
  const count = (status: string) => rows.filter((row) => row.status === status).length;
  const late = count('late');
  const missing = count('missing');
  const due = rows.length - count('pending');
  const bonus = monthFinished && due > 0 && late + missing === 0 ? MONTH_BONUS : 0;
  return { lessons: rows, summary: { due, on_time: count('on_time'), late, missing, pending: count('pending'), points: bonus - PENALTY * (late + missing), bonus } };
};

module.exports = { expectedLessons, evaluate, deadlineOf, GRADING_WINDOW_MINUTES };
export {};
