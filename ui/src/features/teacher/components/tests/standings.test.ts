import { describe, expect, it } from 'vitest';
import { DEFAULT_TOP_COLOR, isTopPlace, normalizeTopColor, sortStudents, topRowStyle, type Standing } from '../../standings';

const student = (id: number, last: string) => ({ student_id: id, first_name: 'X', last_name: last });
const standing = (id: number, place: number, total: number, lessons = 3): Standing => ({ student_id: id, place, total_points: total, lessons, trend: null });

describe('teacher table standings', () => {
  const students = [student(1, 'Aliyev'), student(2, 'Botirov'), student(3, 'Valiyev'), student(4, 'Gulomov')];
  const standings = new Map([
    [3, standing(3, 1, 300)],
    [1, standing(1, 2, 250)],
    [4, standing(4, 2, 250)],
  ]);

  it('orders by place over all lessons; ties A–Z; no lessons last', () => {
    expect(sortStudents(students, 'all_time', standings).map((s) => s.student_id)).toEqual([3, 1, 4, 2]);
  });

  it('orders by the last lesson score, unscored last', () => {
    const last = new Map([[2, 90], [4, 40], [1, 90]]);
    expect(sortStudents(students, 'last_lesson', standings, last).map((s) => s.student_id)).toEqual([1, 2, 4, 3]);
  });

  it('orders A–Z', () => {
    expect(sortStudents(students, 'name', standings).map((s) => s.last_name)).toEqual(['Aliyev', 'Botirov', 'Gulomov', 'Valiyev']);
  });

  it('places 1–5 are top; ties at 5 are all top; no lessons is never top', () => {
    expect(isTopPlace(standing(1, 5, 10))).toBe(true);
    expect(isTopPlace(standing(1, 6, 10))).toBe(false);
    expect(isTopPlace(standing(1, 1, 0, 0))).toBe(false);
    expect(isTopPlace(undefined)).toBe(false);
  });

  it('uses yellow unless a valid #RRGGBB colour is set', () => {
    expect(DEFAULT_TOP_COLOR).toBe('#FACC15');
    expect(normalizeTopColor(null)).toBe('#FACC15');
    expect(normalizeTopColor('red')).toBe('#FACC15');
    expect(normalizeTopColor('#38bdf8')).toBe('#38BDF8');
    expect(topRowStyle('#38bdf8')).toEqual({ backgroundColor: '#38BDF833', boxShadow: 'inset 4px 0 0 #38BDF8' });
  });
});
