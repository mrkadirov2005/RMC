import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { gradeAPI, teacherAPI } from './api';

// A group's standings for the teacher's student table: points over all the group's lessons, the
// place (equal points share one), and whether recent lessons go better or worse (server side:
// grades/services/classStandings.service.ts).

export type StandingTrend = { direction: 'up' | 'down' | 'flat'; recent_average: number; previous_average: number } | null;
export type Standing = { student_id: number; total_points: number; lessons: number; place: number; trend: StandingTrend };
export type StandingsSort = 'all_time' | 'last_lesson' | 'name';

/** Places highlighted in the teacher's colour. */
export const TOP_PLACES = 5;
export const DEFAULT_TOP_COLOR = '#FACC15';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const normalizeTopColor = (value?: string | null) => (value && HEX_COLOR.test(value) ? value.toUpperCase() : DEFAULT_TOP_COLOR);

/** Row tint and edge in the teacher's colour; the tint is light enough to read in both themes. */
export const topRowStyle = (color: string) => ({
  backgroundColor: `${normalizeTopColor(color)}33`,
  boxShadow: `inset 4px 0 0 ${normalizeTopColor(color)}`,
});

export const isTopPlace = (standing?: Standing) => Boolean(standing && standing.lessons > 0 && standing.place <= TOP_PLACES);

type Named = { student_id?: number; id?: number; first_name?: string; last_name?: string };
const idOf = (student: Named) => Number(student.student_id || student.id || 0);
const nameOf = (student: Named) => `${student.last_name || ''} ${student.first_name || ''}`.trim();

/**
 * Students in table order. all_time: by place, students with no scored lesson last. last_lesson:
 * by the score of the latest lesson in lastLessonScores, unscored last. name: A–Z. Ties go A–Z.
 */
export const sortStudents = <T extends Named>(
  students: T[],
  mode: StandingsSort,
  standings: Map<number, Standing>,
  lastLessonScores: Map<number, number> = new Map()
) => {
  const byName = (a: T, b: T) => nameOf(a).localeCompare(nameOf(b));
  const rest = (key: (student: T) => number | null) => (a: T, b: T) => {
    const ka = key(a);
    const kb = key(b);
    if (ka === null && kb === null) return byName(a, b);
    if (ka === null) return 1;
    if (kb === null) return -1;
    return ka - kb || byName(a, b);
  };
  const sorted = [...students];
  if (mode === 'name') return sorted.sort(byName);
  if (mode === 'last_lesson') {
    return sorted.sort(rest((student) => (lastLessonScores.has(idOf(student)) ? -lastLessonScores.get(idOf(student))! : null)));
  }
  return sorted.sort(rest((student) => {
    const standing = standings.get(idOf(student));
    return standing && standing.lessons > 0 ? standing.place : null;
  }));
};

/** Loads a group's standings (again when the group changes; a saved lesson remounts the table). */
export const useClassStandings = (classId?: number | null) => {
  const [rows, setRows] = useState<Standing[]>([]);
  useEffect(() => {
    if (!classId) {
      setRows([]);
      return;
    }
    let active = true;
    gradeAPI
      .getClassStandings(classId)
      .then((response: any) => {
        if (active) setRows(Array.isArray(response?.data) ? response.data : []);
      })
      .catch(() => {
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, [classId]);
  return useMemo(() => new Map(rows.map((row) => [Number(row.student_id), row])), [rows]);
};

// The teacher's colour, shared by the profile setting and every student table.
let topColor: string | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const setTopColor = (value?: string | null) => {
  topColor = normalizeTopColor(value);
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const loadTopColor = () => {
  if (!loading) {
    loading = teacherAPI
      .getMyProfile()
      .then((response: any) => setTopColor((response?.data ?? response)?.top_students_color))
      .catch(() => setTopColor(null));
  }
  return loading;
};

/** The logged-in teacher's colour for the top places (yellow until they pick one; always for staff). */
export const useTopStudentsColor = (enabled = true) => {
  useEffect(() => {
    if (enabled && topColor === null) void loadTopColor();
  }, [enabled]);
  return useSyncExternalStore(subscribe, () => topColor ?? DEFAULT_TOP_COLOR);
};

/** Saves the colour on the teacher; null goes back to yellow. */
export const saveTopStudentsColor = async (color: string | null) => {
  const response: any = await teacherAPI.updateMyPreferences({ top_students_color: color ? normalizeTopColor(color) : null });
  setTopColor(response?.data?.top_students_color ?? null);
};

/** For tests: forget the loaded colour. */
export const resetTopStudentsColor = () => {
  topColor = null;
  loading = null;
};
