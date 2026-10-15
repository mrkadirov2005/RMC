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

/** Ranks children by points; in the level and center views a child in several groups counts once. */
export const rankStudents = (rows: StudentRankingRow[], scope: RankingScope, filter: number | null = null): RankedStudent[] => {
  const picked = rows.filter((row) =>
    scope === 'group' ? row.class_id === filter : scope === 'level' ? row.level === filter : true
  );
  const byStudent = new Map<number, Omit<RankedStudent, 'place'>>();
  picked.forEach((row) => {
    const entry = byStudent.get(row.student_id) || { studentId: row.student_id, name: row.name, groups: [], lessons: 0, score: 0 };
    if (!entry.groups.includes(row.class_name)) entry.groups.push(row.class_name);
    entry.lessons += row.lessons;
    entry.score += row.score;
    byStudent.set(row.student_id, entry);
  });
  return Array.from(byStudent.values())
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
