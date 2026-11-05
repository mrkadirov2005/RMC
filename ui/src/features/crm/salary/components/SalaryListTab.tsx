// "List" tab: every teacher for the salary month at a glance. How much of what their students owe came
// in (a line; hover for the figures), the salary by the teacher's pay rate, how much of it the teacher
// has received (advances and the paid salary, a line) and received / owed.
// A click opens the teacher's salary page for the month.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PaginationBar } from '@/components/common/PaginationBar';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  collectedPercent,
  formatAmount,
  formatSalaryPeriod,
  monthInputValue,
  payoutParts,
  payoutStatus,
  progressTone,
  teacherFullName,
} from '../model/salaryModel';
import type { SalaryOverviewRow } from '../types';
import { PaymentLine, PayoutLine, STATUS_STYLE } from './SalaryPaymentLine';

const COLUMNS = 'lg:grid-cols-[36px_minmax(160px,1.2fr)_minmax(170px,1.4fr)_minmax(120px,0.9fr)_minmax(180px,1.4fr)_minmax(150px,1fr)_20px]';

const Tile = ({ label, value, detail, tone }: { label: string; value: string | number; detail?: string; tone?: string }) => (
  <div className="rounded-lg border bg-card px-3 py-2.5 shadow-sm">
    <p className="text-[0.6875rem] font-semibold text-muted-foreground">{label}</p>
    <p className={cn('text-lg font-black tabular-nums', tone)}>{value}</p>
    {detail && <p className="text-[0.6875rem] text-muted-foreground">{detail}</p>}
  </div>
);

interface SalaryListTabProps {
  year: number;
  month: number;
  /** Every teacher of the month (for the totals); `rows` is the current page of the filtered list. */
  allRows: SalaryOverviewRow[];
  rows: SalaryOverviewRow[];
  loading: boolean;
  search: string;
  onSearch: (value: string) => void;
  pagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    start: number;
    end: number;
    pageSize: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
  };
}

const rowFigures = (row: SalaryOverviewRow) => {
  const { advances, paidOut } = payoutParts(row.salary, row.advance_total, row.salary_paid_total);
  const due = Number(row.earnings?.due) || 0;
  return { advances, paidOut, received: advances + paidOut, due };
};

export const SalaryListTab = ({ year, month, allRows, rows, loading, search, onSearch, pagination }: SalaryListTabProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const totals = useMemo(
    () =>
      allRows.reduce(
        (sum, row) => {
          const progress = row.payment_progress;
          const figures = rowFigures(row);
          return {
            teachers: sum.teachers + 1,
            settled: sum.settled + (payoutStatus(figures.received, figures.due) === 'paid' && figures.due > 0 ? 1 : 0),
            due: sum.due + figures.due,
            advances: sum.advances + figures.advances,
            received: sum.received + figures.received,
            left: sum.left + Math.max(0, figures.due - figures.received),
            expected: sum.expected + (progress?.expected || 0),
            collected: sum.collected + (progress?.collected || 0),
          };
        },
        { teachers: 0, settled: 0, due: 0, advances: 0, received: 0, left: 0, expected: 0, collected: 0 }
      ),
    [allRows]
  );
  const overallPercent = collectedPercent(totals);
  const monthKey = monthInputValue(year, month);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tile
          label={t('Students paid')}
          value={`${overallPercent}%`}
          detail={`${formatMoney(totals.collected)} / ${formatMoney(totals.expected)}`}
          tone={progressTone(overallPercent).text}
        />
        <Tile label={t('Salaries by pay rate')} value={formatMoney(totals.due)} detail={t('{count} of {total} fully paid', { count: totals.settled, total: totals.teachers })} tone="text-primary" />
        <Tile label={t('Teachers received')} value={formatMoney(totals.received)} detail={t('Advances: {amount}', { amount: formatMoney(totals.advances) })} tone="text-emerald-600" />
        <Tile label={t('Left to pay')} value={formatMoney(totals.left)} tone="text-rose-600" />
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
          <h3 className="text-sm font-bold">
            {t('All teachers ({count})', { count: pagination.total })} · {formatSalaryPeriod(year, month)}
          </h3>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={t('Search teachers...')} className="h-9 pl-9" />
          </div>
        </div>

        {/* Column titles (wide screens; on a phone each row stacks). */}
        <div className={cn('hidden gap-4 border-b px-4 py-2 text-[0.6875rem] font-bold uppercase tracking-wide text-muted-foreground lg:grid', COLUMNS)}>
          <span>№</span>
          <span>{t('Teacher')}</span>
          <span>{t('Student payments')}</span>
          <span className="text-right">{t('Salary')}</span>
          <span>{t('Received of salary')}</span>
          <span>{t('Status')}</span>
          <span />
        </div>

        {loading && !rows.length ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{search ? t('No teachers match your search') : t('No teachers found')}</p>
        ) : (
          <div className="divide-y">
            {rows.map((row, index) => {
              const figures = rowFigures(row);
              const style = STATUS_STYLE[payoutStatus(figures.received, figures.due)];
              const rate = Number(row.earnings?.rate ?? row.salary_percentage) || 0;
              return (
                <button
                  key={row.teacher_id}
                  type="button"
                  onClick={() => navigate(`/salary/${row.teacher_id}?month=${monthKey}`)}
                  className={cn('grid w-full grid-cols-2 items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-muted/40', COLUMNS)}
                >
                  {/* The row's place in the whole list, carried on across pages. */}
                  <span className="hidden text-sm font-bold tabular-nums text-muted-foreground lg:block">{pagination.start + index + 1}</span>
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <div className="truncate font-semibold">
                      <span className="mr-1.5 tabular-nums text-muted-foreground lg:hidden">{pagination.start + index + 1}.</span>
                      {teacherFullName(row)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('{count} students', { count: row.payment_progress?.students ?? row.student_stats?.total_students ?? 0 })}
                    </div>
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <PaymentLine progress={row.payment_progress} />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 lg:block lg:text-right">
                    <span className="text-xs text-muted-foreground lg:hidden">{t('Salary')}</span>
                    <span>
                      <span className="block font-bold tabular-nums">{formatMoney(figures.due)}</span>
                      <span className="block text-[0.6875rem] text-muted-foreground">
                        {rate > 0 ? t('{rate}% rate', { rate }) : t('No pay rate set')}
                        {row.earnings?.late_count ? ` · ${t('{count} late', { count: row.earnings.late_count })}` : ''}
                      </span>
                    </span>
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <PayoutLine advances={figures.advances} paidOut={figures.paidOut} due={figures.due} />
                  </div>
                  <span className={cn('w-fit whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold tabular-nums', style.className)}>
                    {formatAmount(figures.received)} / {formatAmount(figures.due)}
                  </span>
                  <ChevronRight className="hidden h-4 w-4 text-muted-foreground lg:block" />
                </button>
              );
            })}
          </div>
        )}

        <div className="border-t p-3">
          <PaginationBar
            total={pagination.total}
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            start={pagination.start}
            end={pagination.end}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={(size) => {
              pagination.setPageSize(size);
              pagination.setPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
};
