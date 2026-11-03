// The students' payment line, the payout line (what the teacher received of the month's salary) and
// the salary status chips.

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { collectedPercent, payoutProgress, progressTone, type SalaryStatus } from '../model/salaryModel';
import type { SalaryPaymentProgress } from '../types';

export const STATUS_STYLE: Record<SalaryStatus, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  pending: { label: 'Advance given', className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200' },
  unpaid: { label: 'Unpaid', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' },
};

/** The students' payment line: the part that came in, coloured by how much; the figures on hover. */
export const PaymentLine = ({ progress, className }: { progress?: SalaryPaymentProgress | null; className?: string }) => {
  const { t } = useLanguage();
  if (!progress || progress.students === 0) {
    return <span className="text-xs text-muted-foreground">{t('No students')}</span>;
  }
  const percent = collectedPercent(progress);
  const tone = progressTone(percent);
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('w-full cursor-default', className)}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className={cn('font-black tabular-nums', tone.text)}>{percent}%</span>
              <span className="truncate tabular-nums text-muted-foreground">
                {progress.paid_students}/{progress.students} {t('paid')}
              </span>
            </div>
            <div data-keep-bg className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.25)' }}>
              <div data-keep-bg className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: tone.bar }} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs" data-keep-bg style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
          <div className="font-bold tabular-nums">
            {formatMoney(progress.collected)} / {formatMoney(progress.expected)}
          </div>
          <div className="tabular-nums opacity-80">
            {t('{paid} paid · {partial} partly · {unpaid} not yet', {
              paid: progress.paid_students,
              partial: progress.partial_students,
              unpaid: progress.unpaid_students,
            })}
          </div>
          {progress.remaining > 0 && <div className="tabular-nums opacity-80">{t('Still owed')}: {formatMoney(progress.remaining)}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ADVANCE_COLOR = '#0ea5e9';
const SALARY_COLOR = '#10b981';

/**
 * What the teacher received of the month's salary by pay rate: the advances (blue), then the salary
 * paid out (green); the grey rest is still owed. The figures on hover.
 */
export const PayoutLine = ({ advances, paidOut, due, className }: { advances: number; paidOut: number; due: number; className?: string }) => {
  const { t } = useLanguage();
  const received = advances + paidOut;
  const { percent, left, over } = payoutProgress(received, due);
  const scale = Math.max(due, received) || 1;
  const width = (amount: number) => `${Math.min(100, (amount / scale) * 100)}%`;
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('w-full cursor-default', className)}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="font-black tabular-nums">{percent}%</span>
              <span className={cn('truncate tabular-nums', left > 0 ? 'text-rose-600' : 'text-emerald-600')}>
                {left > 0 ? t('{amount} left', { amount: formatMoney(left) }) : t('All received')}
              </span>
            </div>
            <div data-keep-bg className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(148, 163, 184, 0.25)' }}>
              {advances > 0 && <div data-keep-bg className="h-full rounded-full" style={{ width: width(advances), backgroundColor: ADVANCE_COLOR }} />}
              {paidOut > 0 && <div data-keep-bg className="h-full rounded-full" style={{ width: width(paidOut), backgroundColor: SALARY_COLOR }} />}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs" data-keep-bg style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
          <div className="font-bold tabular-nums">
            {formatMoney(received)} / {formatMoney(due)}
          </div>
          <div className="flex items-center gap-1.5 tabular-nums opacity-90">
            <span data-keep-bg className="h-2 w-2 rounded-sm" style={{ backgroundColor: ADVANCE_COLOR }} />
            {t('Advance')}: {formatMoney(advances)}
          </div>
          <div className="flex items-center gap-1.5 tabular-nums opacity-90">
            <span data-keep-bg className="h-2 w-2 rounded-sm" style={{ backgroundColor: SALARY_COLOR }} />
            {t('Salary paid out')}: {formatMoney(paidOut)}
          </div>
          {left > 0 && <div className="tabular-nums opacity-90">{t('Left to pay')}: {formatMoney(left)}</div>}
          {over > 0 && <div className="tabular-nums opacity-90">{t('Paid over the rate')}: {formatMoney(over)}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
