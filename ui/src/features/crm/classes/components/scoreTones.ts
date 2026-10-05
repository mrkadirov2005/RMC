import type { ScoreTone } from './SessionWorkflowScoring';

// Colours for each scoring option tone, shared by the scoring tables and the lesson summary.
export const optionToneClasses: Record<ScoreTone, { idle: string; active: string; fill: string; track: string }> = {
  emerald: {
    idle: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-400',
    active: 'border-emerald-600 bg-emerald-600 text-white shadow-emerald-100',
    fill: '#10b981',
    track: '#d1fae5',
  },
  sky: {
    idle: 'border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-400',
    active: 'border-sky-600 bg-sky-600 text-white shadow-sky-100',
    fill: '#0ea5e9',
    track: '#e0f2fe',
  },
  violet: {
    idle: 'border-violet-200 bg-violet-50 text-violet-900 hover:border-violet-400',
    active: 'border-violet-600 bg-violet-600 text-white shadow-violet-100',
    fill: '#7c3aed',
    track: '#ede9fe',
  },
  amber: {
    idle: 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400',
    active: 'border-amber-500 bg-amber-500 text-white shadow-amber-100',
    fill: '#f59e0b',
    track: '#fef3c7',
  },
  rose: {
    idle: 'border-rose-200 bg-rose-50 text-rose-900 hover:border-rose-400',
    active: 'border-rose-600 bg-rose-600 text-white shadow-rose-100',
    fill: '#f43f5e',
    track: '#ffe4e6',
  },
  orange: {
    idle: 'border-orange-200 bg-orange-50 text-orange-900 hover:border-orange-400',
    active: 'border-orange-500 bg-orange-500 text-white shadow-orange-100',
    fill: '#f97316',
    track: '#ffedd5',
  },
};
