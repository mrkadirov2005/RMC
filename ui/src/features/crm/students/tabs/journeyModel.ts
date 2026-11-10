// Helpers for the student Journey tab (GET /students/:id/journey).
import type { TranslateFn } from '@/i18n/LanguageContext';

export interface JourneyTeacherSegment {
  teacher_id: number | null;
  name: string | null;
  from: string;
  to: string;
  days: number;
}

export type JourneyOutcome = 'active' | 'transferred' | 'left' | 'ended';

export interface JourneyStint {
  student_id: number;
  matched_by: 'self' | 'group' | 'transfer' | 'enrollment' | 'phone';
  class_id: number | null;
  class_name: string | null;
  subject_name: string | null;
  level_name: string | null;
  status: string | null;
  from: string;
  to: string | null;
  from_approx: boolean;
  days: number;
  parallel: boolean;
  outcome: JourneyOutcome;
  transfer_reason: string | null;
  transferred_to: { student_id: number; class_name: string | null } | null;
  leave_reason: string | null;
  leave_note: string | null;
  teachers: JourneyTeacherSegment[];
  attended: number;
  missed: number;
  excused: number;
  lessons_marked: number;
  avg_grade: number | null;
  coins: number;
  paid: number;
  discounts: number;
  expected: number;
  payments_count: number;
  last_payment: string | null;
}

export interface JourneyTeacher {
  teacher_id: number | null;
  name: string | null;
  days: number;
  from: string;
  to: string;
  groups: string[];
  attended: number;
  missed: number;
  paid: number;
  expected: number;
  current: boolean;
  /** "active", "transferred: <reason>", "left: <reason>", "ended", "teacher_changed". */
  outcomes: string[];
}

export interface StudentJourney {
  student: { student_id: number; name: string; enrollment_number: string | null };
  summary: {
    first_day: string;
    first_day_approx: boolean;
    last_day: string | null;
    days: number;
    status: JourneyOutcome;
    groups: number;
    teachers: number;
    attended: number;
    missed: number;
    excused: number;
    coins: number;
    paid: number;
    discounts: number;
    expected: number;
  };
  teachers: JourneyTeacher[];
  /** Newest first. */
  stints: JourneyStint[];
}

/** "1 year 2 months 5 days" from a number of days (30-day months, 365-day years). */
export const formatDuration = (days: number, t: TranslateFn) => {
  const total = Math.max(0, Math.round(days));
  const years = Math.floor(total / 365);
  const months = Math.floor((total % 365) / 30);
  const rest = total - years * 365 - months * 30;
  const parts = [
    years ? t('{count} y', { count: years }) : '',
    months ? t('{count} mo', { count: months }) : '',
    rest || (!years && !months) ? t('{count} d', { count: rest }) : '',
  ].filter(Boolean);
  return parts.join(' ');
};

/** Lessons attended out of the lessons marked attended or absent, as a percentage (null if none). */
export const attendanceRate = (attended: number, missed: number) =>
  attended + missed > 0 ? Math.round((attended / (attended + missed)) * 100) : null;

/** A teacher outcome code ("left: Boshqa markazga ketdi") as readable text. */
export const describeOutcome = (outcome: string, t: TranslateFn) => {
  const [code, ...rest] = outcome.split(': ');
  const reason = rest.join(': ');
  const label =
    code === 'active' ? t('Still studying')
      : code === 'transferred' ? t('Transferred')
        : code === 'left' ? t('Left the center')
          : code === 'teacher_changed' ? t('Group got another teacher')
            : t('Group ended');
  return reason ? `${label}: ${reason}` : label;
};

export const formatDay = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
