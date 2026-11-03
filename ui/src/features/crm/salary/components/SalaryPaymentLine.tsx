// The students' payment line of the salary list and the teacher panel, and the salary status chips.

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { collectedPercent, progressTone, type SalaryStatus } from '../model/salaryModel';
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
