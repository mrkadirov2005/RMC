import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import type { StudentPaymentState } from './types';

const styles: Record<StudentPaymentState, { label: string; className: string; dot: string }> = {
  paid: {
    label: 'Paid',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  partial: {
    label: 'Partly paid',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  unpaid: {
    label: 'Unpaid',
    className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
};

export function PaymentStateBadge({ state, className }: { state: StudentPaymentState; className?: string }) {
  const { t } = useLanguage();
  const style = styles[state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold', style.className, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {t(style.label)}
    </span>
  );
}

/** Green when everyone paid, amber when some did, red when nobody did. */
export function GroupPaidBadge({ paid, total }: { paid: number; total: number }) {
  const { t } = useLanguage();
  const tone =
    total === 0 ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-border dark:bg-muted dark:text-muted-foreground'
      : paid >= total ? styles.paid.className
      : paid > 0 ? styles.partial.className
      : styles.unpaid.className;
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums', tone)}>
      {t('{paid} / {total} paid', { paid: String(paid), total: String(total) })}
    </span>
  );
}
