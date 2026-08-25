import { useState } from 'react';
import { List, Loader2, PieChart as PieChartIcon, BarChart3, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import { PaginationBar } from '@/components/common/PaginationBar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatMoney } from '@/utils/helpers';
import { useSalaryOverview } from './hooks/useSalaryOverview';
import { SalaryTotalTab } from './components/SalaryTotalTab';
import { SalaryMonthlyTab } from './components/SalaryMonthlyTab';
import { formatStudentPaidShare, monthInputValue, parseMonthInputValue, teacherFullName } from './model/salaryModel';
import type { SalaryOverviewRow } from './types';

type SalaryTab = 'total' | 'monthly' | 'list';

const TAB_CONFIG: Array<{ key: SalaryTab; label: string; icon: typeof PieChartIcon }> = [
  { key: 'total', label: 'Total', icon: PieChartIcon },
  { key: 'monthly', label: 'Monthly', icon: BarChart3 },
  { key: 'list', label: 'List', icon: List },
];

const SalaryPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SalaryTab>('total');
  const {
    year,
    month,
    setPeriod,
    search,
    setSearch,
    loading,
    rows,
    totalRows,
    currentPage,
    totalPages,
    start,
    end,
    pageSize,
    setPage,
    setPageSize,
    summary,
  } = useSalaryOverview();

  const handleMonthChange = (value: string) => {
    const parsed = parseMonthInputValue(value);
    if (parsed) setPeriod(parsed.year, parsed.month);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Teacher Salaries"
        description="Track monthly teacher salary payments alongside how many of their students paid tuition."
        icon={PieChartIcon}
        actions={
          <Input
            type="month"
            value={monthInputValue(year, month)}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="w-[160px]"
          />
        }
      />

      <div className="flex gap-1.5 rounded-lg border bg-muted/40 p-1.5">
        {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={
              activeTab === key
                ? 'flex flex-1 items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition'
                : 'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted'
            }
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'total' && (
        <SectionPanel>
          <SalaryTotalTab year={year} month={month} summary={summary} />
        </SectionPanel>
      )}

      {activeTab === 'monthly' && (
        <SectionPanel>
          <SalaryMonthlyTab />
        </SectionPanel>
      )}

      {activeTab === 'list' && (
        <>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground">Teachers</p>
              <p className="text-base font-black text-primary">{summary.teacherCount}</p>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground">Paid</p>
              <p className="text-base font-black text-emerald-600">{summary.paidCount}</p>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground">Unpaid</p>
              <p className="text-base font-black text-rose-600">{summary.unpaidCount}</p>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground">Avg. Students Paid</p>
              <p className="text-base font-black text-cyan-600">{summary.avgPaidPercent}%</p>
            </div>
          </div>

          <SectionPanel contentClassName="p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <h3 className="text-sm font-bold">All teachers ({totalRows})</h3>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search teachers..."
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {search ? 'No teachers match your search' : 'No teachers found'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Last-Month Salary</TableHead>
                      <TableHead>Paid?</TableHead>
                      <TableHead>Marked By</TableHead>
                      <TableHead>Students Paid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row: SalaryOverviewRow) => (
                      <TableRow
                        key={row.teacher_id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => navigate(`/salary/${row.teacher_id}`)}
                      >
                        <TableCell className="font-medium">{teacherFullName(row)}</TableCell>
                        <TableCell>{row.salary ? formatMoney(row.salary.amount) : '—'}</TableCell>
                        <TableCell>
                          {row.salary?.is_paid ? (
                            <Badge variant="success">Paid</Badge>
                          ) : (
                            <Badge variant="warning">Unpaid</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.salary?.marked_by_name
                            ? `${row.salary.marked_by_name} (${row.salary.marked_by_role || 'admin'})`
                            : '—'}
                        </TableCell>
                        <TableCell>{formatStudentPaidShare(row.student_stats)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="p-4">
              <PaginationBar
                total={totalRows}
                currentPage={currentPage}
                totalPages={totalPages}
                start={start}
                end={end}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
              />
            </div>
          </SectionPanel>
        </>
      )}
    </div>
  );
};

export default SalaryPage;
