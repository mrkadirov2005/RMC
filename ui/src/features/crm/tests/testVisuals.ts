import { cn } from '@/lib/utils';

export const testTypeThemes: Record<string, { badge: string; panel: string; dot: string }> = {
  multiple_choice: {
    badge: 'bg-indigo-500 text-white',
    panel: 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50',
    dot: 'bg-indigo-500',
  },
  essay: {
    badge: 'bg-rose-500 text-white',
    panel: 'border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50',
    dot: 'bg-rose-500',
  },
  short_answer: {
    badge: 'bg-sky-500 text-white',
    panel: 'border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50',
    dot: 'bg-sky-500',
  },
  true_false: {
    badge: 'bg-emerald-500 text-white',
    panel: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50',
    dot: 'bg-emerald-500',
  },
  form_filling: {
    badge: 'bg-fuchsia-500 text-white',
    panel: 'border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-pink-50',
    dot: 'bg-fuchsia-500',
  },
  reading_passage: {
    badge: 'bg-violet-500 text-white',
    panel: 'border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50',
    dot: 'bg-violet-500',
  },
  writing: {
    badge: 'bg-pink-500 text-white',
    panel: 'border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50',
    dot: 'bg-pink-500',
  },
  matching: {
    badge: 'bg-teal-500 text-white',
    panel: 'border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50',
    dot: 'bg-teal-500',
  },
};

export const formatTestType = (type?: string) =>
  type?.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || '';

export const getTestTypeTheme = (type?: string) =>
  testTypeThemes[type || ''] || {
    badge: 'bg-slate-500 text-white',
    panel: 'border-slate-200 bg-gradient-to-br from-slate-50 to-zinc-50',
    dot: 'bg-slate-500',
  };

export const getTestTypeBadgeClass = (type?: string) =>
  cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', getTestTypeTheme(type).badge);

export const testSurfaceClass =
  'overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm';

export const testStatCardClass =
  'overflow-hidden border-slate-200/80 bg-white shadow-[0_16px_45px_-38px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:shadow-sm';
