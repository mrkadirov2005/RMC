// "List" tab: every teacher for the salary month at a glance. How much of what their students owe came
// in (a line; hover for the figures), the salary, the advances and what the teacher has received.
// A click opens the teacher's panel with everything for the month.

import { useMemo, useState } from 'react';
import { ChevronRight, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PaginationBar } from '@/components/common/PaginationBar';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { collectedPercent, formatSalaryPeriod, progressTone, receivedSoFar, resolveSalaryStatus, teacherFullName } from '../model/salaryModel';
import type { SalaryOverviewRow } from '../types';
import { PaymentLine, STATUS_STYLE } from './SalaryPaymentLine';
import { TeacherSalaryPanel } from './TeacherSalaryPanel';


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

export const SalaryListTab = ({ year, month, allRows, rows, loading, search, onSearch, pagination }: SalaryListTabProps) => {
  const { t } = useLanguage();
  const [openTeacherId, setOpenTeacherId] = useState<number | null>(null);

  const totals = useMemo(
    () =>
      allRows.reduce(
        (sum, row) => {
          const progress = row.payment_progress;
          return {
            teachers: sum.teachers + 1,
            paid: sum.paid + (row.salary?.is_paid ? 1 : 0),
            salaries: sum.salaries + (Number(row.salary?.amount) || 0),
            advances: sum.advances + (Number(row.advance_total) || 0),
            received: sum.received + receivedSoFar(row.salary, row.advance_total),
            expected: sum.expected + (progress?.expected || 0),
            collected: sum.collected + (progress?.collected || 0),
          };
        },
        { teachers: 0, paid: 0, salaries: 0, advances: 0, received: 0, expected: 0, collected: 0 }
      ),
    [allRows]
  );
  const overallPercent = collectedPercent(totals);
  const openRow = allRows.find((row) => row.teacher_id === openTeacherId) || null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Tile
          label={t('Students paid')}
          value={`${overallPercent}%`}
          detail={`${formatMoney(totals.collected)} / ${formatMoney(totals.expected)}`}
          tone={progressTone(overallPercent).text}
        />
        <Tile label={t('Salaries paid')} value={`${totals.paid}/${totals.teachers}`} detail={formatMoney(totals.salaries)} tone="text-primary" />
        <Tile label={t('Advances given')} value={formatMoney(totals.advances)} tone="text-sky-600" />
        <Tile label={t('Teachers received')} value={formatMoney(totals.received)} detail={t('advances + paid salaries')} tone="text-emerald-600" />
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
        <div className="hidden grid-cols-[minmax(160px,1.3fr)_minmax(180px,1.6fr)_repeat(3,minmax(110px,1fr))_110px_20px] gap-4 border-b px-4 py-2 text-[0.6875rem] font-bold uppercase tracking-wide text-muted-foreground lg:grid">
          <span>{t('Teacher')}</span>
          <span>{t('Student payments')}</span>
          <span className="text-right">{t('Salary')}</span>
          <span className="text-right">{t('Advance')}</span>
          <span className="text-right">{t('Received')}</span>
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
            {rows.map((row) => {
              const status = resolveSalaryStatus(row.salary, row.advance_total);
              const style = STATUS_STYLE[status];
              return (
                <button
                  key={row.teacher_id}
                  type="button"
                  onClick={() => setOpenTeacherId(row.teacher_id)}
                  className="grid w-full grid-cols-2 items-center gap-x-4 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 lg:grid-cols-[minmax(160px,1.3fr)_minmax(180px,1.6fr)_repeat(3,minmax(110px,1fr))_110px_20px]"
                >
                  <div className="col-span-2 min-w-0 lg:col-span-1">
                    <div className="truncate font-semibold">{teacherFullName(row)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t('{count} students', { count: row.payment_progress?.students ?? row.student_stats?.total_students ?? 0 })}
                    </div>
                  </div>
                  <div className="col-span-2 lg:col-span-1">
                    <PaymentLine progress={row.payment_progress} />
                  </div>
                  <Figure label={t('Salary')} value={row.salary ? formatMoney(row.salary.amount) : '—'} />
                  <Figure label={t('Advance')} value={Number(row.advance_total) > 0 ? formatMoney(row.advance_total || 0) : '—'} tone="text-sky-600" />
                  <Figure label={t('Received')} value={receivedSoFar(row.salary, row.advance_total) > 0 ? formatMoney(receivedSoFar(row.salary, row.advance_total)) : '—'} tone="text-emerald-600" />
                  <span className={cn('w-fit rounded-full px-2.5 py-1 text-xs font-bold', style.className)}>{t(style.label)}</span>
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

      {openRow && <TeacherSalaryPanel row={openRow} year={year} month={month} onClose={() => setOpenTeacherId(null)} />}
    </div>
  );
};

/** A money figure: right-aligned in the wide layout, labelled when the row stacks on a phone. */
const Figure = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="flex items-baseline justify-between gap-2 lg:block lg:text-right">
    <span className="text-xs text-muted-foreground lg:hidden">{label}</span>
    <span className={cn('font-semibold tabular-nums', value !== '—' && tone)}>{value}</span>
  </div>
);
