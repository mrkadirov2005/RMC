// The results tab's pictures: how the scores spread (a bar per score band, the pass mark marked),
// and the questions students got wrong most.

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TestAnalysis } from '../api/testAnalysisApi';
import { passTone } from './PassRateLine';

const PASS_COLOR = '#10b981';
const FAIL_COLOR = '#f43f5e';

/** Bars for the score bands; a band at or above the pass mark is green, below it red. */
export const ScoreSpreadChart = ({ distribution, passPercent }: { distribution: TestAnalysis['distribution']; passPercent: number }) => {
  const { t } = useLanguage();
  const most = Math.max(1, ...distribution.map((band) => band.count));
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-44 items-end gap-2" role="img" aria-label={t('Score spread')}>
        {distribution.map((band) => {
          const passed = band.from >= passPercent;
          const height = band.count === 0 ? 2 : Math.max(8, Math.round((band.count / most) * 100));
          return (
            <Tooltip key={band.from}>
              <TooltipTrigger asChild>
                <div className="flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-1">
                  <span className="text-xs font-bold tabular-nums text-muted-foreground">{band.count || ''}</span>
                  <div
                    data-keep-bg
                    className="w-full rounded-t-md"
                    style={{ height: `${height}%`, backgroundColor: band.count === 0 ? 'rgba(148, 163, 184, 0.3)' : passed ? PASS_COLOR : FAIL_COLOR }}
                  />
                  <span className="whitespace-nowrap text-[0.625rem] tabular-nums text-muted-foreground">
                    {band.from}–{band.to}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs" data-keep-bg style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                {t('{count} attempts scored {from}–{to}%', { count: band.count, from: band.from, to: band.to })}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span data-keep-bg className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PASS_COLOR }} /> {t('Passed (from {percent}%)', { percent: passPercent })}
        </span>
        <span className="flex items-center gap-1.5">
          <span data-keep-bg className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: FAIL_COLOR }} /> {t('Not passed')}
        </span>
      </div>
    </TooltipProvider>
  );
};

/** The questions with the lowest share of right answers, hardest first. */
export const HardestQuestions = ({ questions, limit = 5, onOpen }: { questions: TestAnalysis['questions']; limit?: number; onOpen?: (questionId: number) => void }) => {
  const { t } = useLanguage();
  const ranked = questions
    .map((question, index) => ({ ...question, number: index + 1 }))
    .filter((question) => question.correct_rate !== null)
    .sort((a, b) => Number(a.correct_rate) - Number(b.correct_rate) || a.number - b.number)
    .slice(0, limit);
  if (!ranked.length) return <p className="text-sm text-muted-foreground">{t('Shows once someone has taken the test.')}</p>;
  return (
    <div className="divide-y">
      {ranked.map((question) => {
        const rate = Number(question.correct_rate);
        const tone = passTone(rate);
        return (
          <button key={question.question_id} type="button" onClick={() => onOpen?.(question.question_id)} className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-muted/40">
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2 text-xs font-black tabular-nums">{question.number}</span>
            <span className="min-w-0 flex-1 truncate text-sm">{question.question_text}</span>
            <span className="w-28 shrink-0">
              <span className={cn('block text-right text-xs font-bold tabular-nums', tone.text)}>{t('{rate}% right', { rate })}</span>
              <span data-keep-bg className="mt-1 block h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.25)' }}>
                <span data-keep-bg className="block h-full rounded-full" style={{ width: `${rate}%`, backgroundColor: tone.bar }} />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
