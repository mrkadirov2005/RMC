// Payments for an earlier month that came in during this one. The month they were for paid nothing for
// them; they are part of this month's salary instead. Shown to the owner and to the teacher alike.

import { Clock } from 'lucide-react';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import type { TeacherEarnings } from './types';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthParts = (key: string | null) => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  return match ? { name: MONTHS[Number(match[2]) - 1], year: match[1] } : null;
};

const formatDay = (value: string | null) => {
  const day = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day.slice(8, 10)}.${day.slice(5, 7)}.${day.slice(0, 4)}` : '—';
};

export const LatePaymentsSection = ({ earnings }: { earnings: TeacherEarnings }) => {
  const { t } = useLanguage();
  const late = earnings.late_payments;
  const lateShare = late.reduce((sum, payment) => sum + payment.teacher_share, 0);

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Clock className="h-4 w-4 text-amber-600" />
            {t('Late payments added this month')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('Paid this month for an earlier month. That month did not include them, so they are paid with this one.')}
          </p>
        </div>
        {late.length > 0 && (
          <div className="text-right">
            <div className="text-lg font-black tabular-nums text-amber-600">+{formatMoney(lateShare)}</div>
            <div className="text-[0.6875rem] text-muted-foreground">{t('{count} payments · {amount}', { count: late.length, amount: formatMoney(earnings.late_amount) })}</div>
          </div>
        )}
      </div>

      {late.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('No late payments this month.')}</p>
      ) : (
        <div className="divide-y rounded-lg border text-sm">
          <div className="hidden grid-cols-[minmax(140px,1.4fr)_minmax(110px,1fr)_110px_100px_minmax(100px,1fr)_minmax(100px,1fr)] gap-3 px-3 py-2 text-[0.6875rem] font-bold uppercase tracking-wide text-muted-foreground md:grid">
            <span>{t('Student')}</span>
            <span>{t('Group')}</span>
            <span>{t('For month')}</span>
            <span>{t('Paid on')}</span>
            <span className="text-right">{t('Amount')}</span>
            <span className="text-right">{t('Teacher share')}</span>
          </div>
          {late.map((payment) => (
            <div
              key={payment.payment_id}
              className="grid grid-cols-2 items-center gap-x-3 gap-y-1 px-3 py-2 md:grid-cols-[minmax(140px,1.4fr)_minmax(110px,1fr)_110px_100px_minmax(100px,1fr)_minmax(100px,1fr)]"
            >
              <span className="truncate font-semibold">{payment.name}</span>
              <span className="truncate text-xs text-muted-foreground">{payment.class_name || '—'}</span>
              <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {(() => {
                  const month = monthParts(payment.for_month);
                  return month ? `${t(month.name)} ${month.year}` : '—';
                })()}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{formatDay(payment.entered_at)}</span>
              <span className="tabular-nums md:text-right">{formatMoney(payment.amount)}</span>
              <span className="font-bold tabular-nums text-amber-600 md:text-right">+{formatMoney(payment.teacher_share)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
