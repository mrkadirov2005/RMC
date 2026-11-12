// The full student ranking (Reports -> O'quvchilar and the dashboard's top three): this month's
// lesson points per child, ranked within one group, one level, or the whole center.

export interface StudentRankingRow {
  student_id: number;
  name: string;
  center_id: number;
  class_id: number;
  class_name: string;
  level: number | null;
  lessons: number;
  score: number;
}

export type RankingScope = 'center' | 'group' | 'level';

export interface RankedStudent {
  place: number;
  studentId: number;
  name: string;
  groups: string[];
  lessons: number;
  score: number;
}

/** Ranks students by points. Each group (subject) is ranked on its own: a child in two subjects
 * appears once per subject, and the points of different subjects are never added together. */
export const rankStudents = (rows: StudentRankingRow[], scope: RankingScope, filter: number | null = null): RankedStudent[] => {
  const picked = rows.filter((row) =>
    scope === 'group' ? row.class_id === filter : scope === 'level' ? row.level === filter : true
  );
  const byStudentGroup = new Map<string, Omit<RankedStudent, 'place'>>();
  picked.forEach((row) => {
    const key = `${row.student_id}:${row.class_id}`;
    const entry = byStudentGroup.get(key) || { studentId: row.student_id, name: row.name, groups: [row.class_name], lessons: 0, score: 0 };
    entry.lessons += row.lessons;
    entry.score += row.score;
    byStudentGroup.set(key, entry);
  });
  return Array.from(byStudentGroup.values())
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, place: index + 1 }));
};

/** The groups and levels that have lessons this month, for the filter lists. */
export const rankingFilters = (rows: StudentRankingRow[]) => {
  const groups = new Map<number, string>();
  const levels = new Set<number>();
  rows.forEach((row) => {
    groups.set(row.class_id, row.class_name);
    if (row.level !== null) levels.add(row.level);
  });
  return {
    groups: Array.from(groups, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    levels: Array.from(levels).sort((a, b) => a - b),
  };
};
