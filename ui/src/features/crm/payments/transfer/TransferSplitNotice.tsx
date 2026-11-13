import { useEffect, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { paymentAPI } from '../api';
import { useLanguage } from '@/i18n/LanguageContext';
import { amountToFill, daysInMonthText, dueBreakdown, partFor, type TransferSplitPreview } from './transferSplitModel';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Shown in the payment form when the student moved to this group from another one in the month the
 * payment settles: each teacher, the days and lessons there, and how much of this payment each gets.
 */
export const TransferSplitNotice = ({ studentId, paymentDate, amount, onDue }: {
  studentId: number;
  paymentDate?: string;
  amount?: number;
  /** What the student still owes for the month(s) in all groups, or null; called when it changes. */
  onDue?: (due: number | null) => void;
}) => {
  const { t } = useLanguage();
  const [preview, setPreview] = useState<TransferSplitPreview>(null);
  const due = amountToFill(preview);
  useEffect(() => {
    onDue?.(due);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due]);

  useEffect(() => {
    if (!studentId || !paymentDate) {
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    // Wait for the admin to stop typing the amount.
    const timer = setTimeout(() => {
      paymentAPI.getTransferSplitPreview({ student_id: studentId, payment_date: paymentDate, amount: Number(amount || 0) })
        .then((response) => { if (!cancelled) setPreview(response.data || null); })
        .catch(() => { if (!cancelled) setPreview(null); });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [studentId, paymentDate, amount]);

  if (!preview || preview.months.length === 0) return null;
  const hasAmount = Number(amount || 0) > 0;

  return (
    <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="flex items-start gap-2">
        <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t('This student moved to another teacher. The payment is split by the lessons studied with each.')}</p>
          {preview.months.map(({ month, due: monthDue, owed, groups }) => {
            const [year, m] = month.split('-').map(Number);
            const monthName = `${t(MONTHS[m - 1])} ${year}`;
            return (
              <div key={month} className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">{monthName}</p>
                <p className="mt-1 text-sm font-semibold">
                  {t('Due for {month}: {amount} so\'m ({parts})', { month: monthName, amount: Math.round(monthDue).toLocaleString(), parts: dueBreakdown(groups) })}
                </p>
                {Math.round(owed) < Math.round(monthDue) ? (
                  <p className="text-xs text-amber-800/90 dark:text-amber-200/90">{t('Already paid {paid}, still owed {owed} so\'m.', { paid: Math.round(monthDue - owed).toLocaleString(), owed: Math.round(owed).toLocaleString() })}</p>
                ) : null}
                <ul className="mt-1.5 space-y-1.5">
                  {groups.map((group) => (
                    <li key={group.student_id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm">
                      <span className="min-w-0">
                        <span className="font-semibold">{group.teacher_name || t('No teacher')}</span>
                        {group.class_name ? <span className="text-amber-800/80 dark:text-amber-200/80"> · {group.class_name}</span> : null}
                        {group.current ? <span className="text-amber-800/80 dark:text-amber-200/80"> ({t('this group')})</span> : null}
                        <span className="block text-xs text-amber-800/90 dark:text-amber-200/90">
                          {t('Days {days}: {lessons} of 12 lessons', { days: daysInMonthText(month, group), lessons: group.lessons })}
                        </span>
                      </span>
                      {hasAmount ? (
                        <span className="font-semibold tabular-nums">{partFor(group, preview).toLocaleString()} {t("so'm")}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {!hasAmount ? <p className="mt-2 text-xs text-amber-800/90 dark:text-amber-200/90">{t('Enter the amount to see how much each teacher gets.')}</p> : null}
        </div>
      </div>
    </div>
  );
};
