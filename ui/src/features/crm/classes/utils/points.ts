export const getPointTone = (points: number | null) => {
  if (points === null) return { label: 'Missing', className: 'bg-rose-50 text-rose-800 border-rose-200', icon: '!' };
  if (points === 0) return { label: 'Zero', className: 'bg-slate-50 text-slate-700 border-slate-200', icon: '0' };
  if (points < 50) return { label: 'Low', className: 'bg-amber-50 text-amber-800 border-amber-200', icon: '-' };
  if (points < 80) return { label: 'Good', className: 'bg-sky-50 text-sky-800 border-sky-200', icon: '+' };
  return { label: 'Strong', className: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '✓' };
};
