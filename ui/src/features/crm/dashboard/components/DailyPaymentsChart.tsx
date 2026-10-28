// Bar chart of the money collected each day of a month; shared by the dashboard and Reports → Moliya.

import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatMoney } from '@/utils/helpers';
import { buildPaymentDays, centerDayKey, previousCenterDayKey } from '../dailyPayments';

interface Props {
  payments: Record<string, unknown>[];
  /** Any moment in the month to draw; defaults to now. */
  month?: Date;
}

export const DailyPaymentsChart = ({ payments, month }: Props) => {
  const { t } = useLanguage();
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);
  const shownMonth = useMemo(() => month ?? new Date(), [month]);
  // Days in Tashkent time: a UTC date would put each bar on the day before.
  const todayKey = centerDayKey();
  const yesterdayKey = previousCenterDayKey();
  const paymentDays = useMemo(() => buildPaymentDays(payments, shownMonth), [payments, shownMonth]);
  const shownDay = paymentDays.find((day) => day.key === hoveredDayKey) || paymentDays.find((day) => day.key === todayKey);
  const maxPaymentAmount = Math.max(1, ...paymentDays.map((day) => day.amount));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-black">{t('Monthly payment activity')}</h2><p className="text-sm text-slate-500">{t('Money collected each day. Hover over a day to see how much came in.')}</p></div>
        {shownDay ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-right dark:bg-white/[0.06]" aria-live="polite">
            <p className="text-xs font-bold text-slate-500">{new Date(`${shownDay.key}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</p>
            <p className="text-lg font-black text-slate-950 dark:text-white">{formatMoney(shownDay.amount)}</p>
            <p className="text-xs text-slate-500">{t('{count} payments', { count: shownDay.count })}</p>
          </div>
        ) : <BarChart3 className="h-5 w-5 text-cyan-600" />}
      </div>
      <div className="flex h-48 items-end gap-1 overflow-x-auto pb-6" onMouseLeave={() => setHoveredDayKey(null)}>
        {paymentDays.map((day) => (
          <button
            key={day.key}
            type="button"
            aria-label={`${day.key}: ${formatMoney(day.amount)}`}
            title={`${formatMoney(day.amount)} · ${t('{count} payments', { count: day.count })}`}
            onMouseEnter={() => setHoveredDayKey(day.key)}
            onFocus={() => setHoveredDayKey(day.key)}
            onClick={() => setHoveredDayKey(day.key)}
            className="group flex h-full min-w-[14px] flex-1 flex-col items-center justify-end gap-1"
          >
            <div className={`w-full rounded-t-sm transition-opacity group-hover:opacity-80 ${day.key === hoveredDayKey ? 'ring-2 ring-slate-900/30 dark:ring-white/40' : ''} ${day.key === todayKey ? 'bg-emerald-500' : day.key === yesterdayKey ? 'bg-amber-500' : 'bg-cyan-500/70'}`} style={{ height: `${Math.max(4, (day.amount / maxPaymentAmount) * 140)}px` }} />
            <span className="text-[0.5625rem] text-slate-400">{day.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
