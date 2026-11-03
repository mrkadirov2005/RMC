// The day's till for the CEO: per method what came in, what was spent and what is left, then
// every payment — first the ones for the day's own month, then the ones for other months, month by
// month; each part cash first, then card, then bank account — and the day's expenses.
import { Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  METHOD_GROUPS,
  METHOD_LABELS,
  formatTime,
  monthNameParts,
  paymentsByMonth,
  type DailyCashReport as Report,
  type MethodGroup,
  type MonthSection,
} from '../cashFormat';

const TONES: Record<MethodGroup, string> = {
  cash: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30',
  card: 'border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/30',
  bank: 'border-violet-200 bg-violet-50/70 dark:border-violet-900 dark:bg-violet-950/30',
  other: 'border-slate-200 bg-slate-50/70 dark:border-border dark:bg-muted/30',
};

export function DailyCashReport({ report }: { report: Report }) {
  const { t } = useLanguage();
  // "Other" (cheques and old values) only shows up when that day had some.
  const groups = METHOD_GROUPS.filter((group) => group !== 'other' || report.income.other || report.expenses_total.other);
  const sections = paymentsByMonth(report.payments, report.month || report.date.slice(0, 7));
  const current = sections.find((section) => section.current);
  const others = sections.filter((section) => !section.current);
  const othersTotal = others.reduce((sum, section) => sum + section.total, 0);
  const monthLabel = (month: string) => {
    const { name, year } = monthNameParts(month);
    return `${t(name)} ${year}`;
  };

  /** One month's payments, method by method, each with its total. */
  const monthRows = (section: MonthSection) =>
    section.methods.map((method) => (
      <Fragment key={`${section.month}-${method.group}`}>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableCell colSpan={5} className="py-1.5 pl-6 text-xs font-black uppercase">{t(METHOD_LABELS[method.group])}</TableCell>
        </TableRow>
        {method.rows.map((row) => (
          <TableRow key={row.payment_id}>
            <TableCell className="tabular-nums">{formatTime(row.paid_at)}</TableCell>
            <TableCell className="font-semibold">{row.student_name || '—'}</TableCell>
            <TableCell>{row.class_name || '—'}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{formatMoney(row.amount)}</TableCell>
            <TableCell>{row.received_by_name || '—'}</TableCell>
          </TableRow>
        ))}
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={3} className="text-right text-xs font-bold">{t('Total ({method})', { method: t(METHOD_LABELS[method.group]) })}</TableCell>
          <TableCell className="text-right font-black tabular-nums">{formatMoney(method.total)}</TableCell>
          <TableCell />
        </TableRow>
      </Fragment>
    ));

  /** A heading row across the table: what the rows below are for, and their total. */
  const headingRow = (key: string, label: string, total: number, background: string) => (
    <TableRow key={key} className="hover:bg-transparent" data-keep-bg style={{ backgroundColor: background }}>
      <TableCell colSpan={3} className="py-2 text-sm font-black">{label}</TableCell>
      <TableCell className="py-2 text-right text-sm font-black tabular-nums">{formatMoney(total)}</TableCell>
      <TableCell />
    </TableRow>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => (
          <div key={group} className={cn('rounded-xl border p-3', TONES[group])} data-testid={`cash-total-${group}`}>
            <div className="text-sm font-bold">{t(METHOD_LABELS[group])}</div>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('Received')}</dt><dd className="font-semibold tabular-nums">{formatMoney(report.income[group])}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t('Spent')}</dt><dd className="font-semibold tabular-nums text-rose-600">{formatMoney(report.expenses_total[group])}</dd></div>
              <div className="flex justify-between border-t pt-1"><dt className="font-bold">{t('Left over')}</dt><dd className="font-black tabular-nums">{formatMoney(report.remaining[group])}</dd></div>
            </dl>
          </div>
        ))}
        <div className="rounded-xl border-2 border-primary/40 bg-card p-3" data-testid="cash-total-all">
          <div className="text-sm font-bold">{t('Day total')}</div>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t('Received')}</dt><dd className="font-semibold tabular-nums">{formatMoney(report.income.total)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t('Spent')}</dt><dd className="font-semibold tabular-nums text-rose-600">{formatMoney(report.expenses_total.total)}</dd></div>
            <div className="flex justify-between border-t pt-1"><dt className="font-bold">{t('Left over')}</dt><dd className="font-black tabular-nums">{formatMoney(report.remaining.total)}</dd></div>
          </dl>
        </div>
      </div>

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <h2 className="text-sm font-bold">{t('Payments received ({count})', { count: report.payments.length })}</h2>
          {others.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                {t('This month: {amount}', { amount: formatMoney(current?.total || 0) })}
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {t('Other months: {amount}', { amount: formatMoney(othersTotal) })}
              </span>
            </div>
          )}
        </div>
        {report.payments.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{t('No payments on this day.')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t('Time')}</TableHead>
                  <TableHead>{t('Student')}</TableHead>
                  <TableHead>{t('Group')}</TableHead>
                  <TableHead className="text-right">{t('Amount')}</TableHead>
                  <TableHead>{t('Received by')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current && headingRow('current', t('For this month — {month}', { month: monthLabel(current.month) }), current.total, 'rgba(16, 185, 129, 0.14)')}
                {current && monthRows(current)}
                {others.length > 0 && headingRow('others', t('For other months'), othersTotal, 'rgba(245, 158, 11, 0.2)')}
                {others.map((section) => (
                  <Fragment key={section.month}>
                    {headingRow(`month-${section.month}`, t('For {month}', { month: monthLabel(section.month) }), section.total, 'rgba(245, 158, 11, 0.08)')}
                    {monthRows(section)}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card shadow-sm">
        <h2 className="border-b px-3 py-2 text-sm font-bold">{t('Expenses ({count})', { count: report.expenses.length })}</h2>
        {report.expenses.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{t('No expenses on this day.')}</p>
        ) : (
          <ul className="divide-y">
            {report.expenses.map((expense) => (
              <li key={expense.expense_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-semibold">{expense.description}</span>
                  <span className="text-muted-foreground"> · {t(METHOD_LABELS[expense.method_group || 'cash'])}{expense.created_by_name ? ` · ${expense.created_by_name}` : ''}</span>
                </span>
                <span className="font-black tabular-nums text-rose-600">−{formatMoney(expense.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
