// How a test went, as a line: the share of graded attempts that passed, coloured by how many
// (green from 70%, amber from 40%, red below); hover for passed / graded and the average score.

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';

export interface PassStats {
  graded_count?: number | null;
  passed_count?: number | null;
  average_percentage?: number | null;
  awaiting_grading_count?: number | null;
}

export const passRate = (stats: PassStats) => {
  const graded = Number(stats.graded_count) || 0;
  return graded > 0 ? Math.round(((Number(stats.passed_count) || 0) / graded) * 100) : null;
};

export const passTone = (rate: number) =>
  rate >= 70 ? { bar: '#10b981', text: 'text-emerald-600' } : rate >= 40 ? { bar: '#f59e0b', text: 'text-amber-600' } : { bar: '#f43f5e', text: 'text-rose-600' };

export const PassRateLine = ({ stats, className }: { stats: PassStats; className?: string }) => {
  const { t } = useLanguage();
  const rate = passRate(stats);
  const graded = Number(stats.graded_count) || 0;
  if (rate === null) {
    return (
      <span className={cn('text-xs text-muted-foreground', className)}>
        {Number(stats.awaiting_grading_count) > 0 ? t('Waiting for grading') : t('Nobody has taken it yet')}
      </span>
    );
  }
  const tone = passTone(rate);
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('w-full cursor-default', className)}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className={cn('font-black tabular-nums', tone.text)}>{t('{rate}% passed', { rate })}</span>
              {stats.average_percentage != null && (
                <span className="tabular-nums text-muted-foreground">{t('avg {score}%', { score: Math.round(Number(stats.average_percentage)) })}</span>
              )}
            </div>
            <div data-keep-bg className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.25)' }}>
              <div data-keep-bg className="h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: tone.bar }} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs" data-keep-bg style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
          <div className="font-bold tabular-nums">{t('{passed} of {graded} passed', { passed: Number(stats.passed_count) || 0, graded })}</div>
          {stats.average_percentage != null && (
            <div className="tabular-nums opacity-80">{t('Average score: {score}%', { score: Math.round(Number(stats.average_percentage)) })}</div>
          )}
          {Number(stats.awaiting_grading_count) > 0 && (
            <div className="tabular-nums opacity-80">{t('{count} waiting for grading', { count: Number(stats.awaiting_grading_count) })}</div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
