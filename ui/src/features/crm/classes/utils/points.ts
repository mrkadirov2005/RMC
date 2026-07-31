export const getPointTone = (points: number | null) => {
  if (points === null) return { label: 'Missing', className: 'bg-rose-50 text-rose-800 border-rose-200', icon: '!' };
  if (points === 0) return { label: 'Zero', className: 'bg-slate-50 text-slate-700 border-slate-200', icon: '0' };
  if (points < 50) return { label: 'Low', className: 'bg-amber-50 text-amber-800 border-amber-200', icon: '-' };
  if (points < 80) return { label: 'Good', className: 'bg-sky-50 text-sky-800 border-sky-200', icon: '+' };
  return { label: 'Strong', className: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '✓' };
};

export type LessonPointRecord = {
  attendance_score?: number | string | null;
  homework_score?: number | string | null;
  activity_score?: number | string | null;
  points_score?: number | string | null;
};

export const getCombinedLessonPoints = (grade?: LessonPointRecord | null): number | null => {
  if (!grade) return null;
  const values = [grade.attendance_score, grade.homework_score, grade.activity_score, grade.points_score];
  if (values.every((value) => value === null || value === undefined || value === '')) return null;
  return values.reduce<number>((total, value) => {
    const points = Number(value ?? 0);
    return total + (Number.isFinite(points) ? points : 0);
  }, 0);
};
