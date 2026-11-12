import { describe, expect, it } from 'vitest';
import { rankStudents, rankingFilters, type StudentRankingRow } from '../studentRankingModel';

const row = (studentId: number, classId: number, level: number | null, score: number, lessons = 2): StudentRankingRow => ({
  student_id: studentId, name: `S${studentId}`, center_id: 1, class_id: classId, class_name: `G${classId}`, level, lessons, score,
});

const rows = [row(1, 10, 1, 120), row(1, 20, 2, 90), row(2, 10, 1, 150), row(3, 20, 2, 100), row(4, 30, null, 0)];

describe('student ranking', () => {
  it('ranks each subject on its own: a child in two groups never gets both scores added', () => {
    // Student 1 studies in G10 (120) and G20 (90): two separate places, not one 210.
    expect(rankStudents(rows, 'center').map((item) => [item.place, item.studentId, item.score, item.lessons, item.groups])).toEqual([
      [1, 2, 150, 2, ['G10']],
      [2, 1, 120, 2, ['G10']],
      [3, 3, 100, 2, ['G20']],
      [4, 1, 90, 2, ['G20']],
      [5, 4, 0, 2, ['G30']],
    ]);
  });

  it('ranks only one group or one level', () => {
    expect(rankStudents(rows, 'group', 20).map((item) => [item.place, item.studentId, item.score])).toEqual([[1, 3, 100], [2, 1, 90]]);
    expect(rankStudents(rows, 'level', 1).map((item) => item.studentId)).toEqual([2, 1]);
  });

  it('lists the groups and levels to filter by', () => {
    expect(rankingFilters(rows)).toEqual({
      groups: [{ id: 10, name: 'G10' }, { id: 20, name: 'G20' }, { id: 30, name: 'G30' }],
      levels: [1, 2],
    });
  });
});
