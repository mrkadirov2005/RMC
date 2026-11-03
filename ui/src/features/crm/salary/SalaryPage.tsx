import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Input } from '@/components/ui/input';
import { useSalaryOverview } from './hooks/useSalaryOverview';
import { SalaryOverviewTab } from './components/SalaryOverviewTab';
import { SalaryStudentsTab } from './components/SalaryStudentsTab';
import { SalaryListTab } from './components/SalaryListTab';
import { monthInputValue, parseMonthInputValue } from './model/salaryModel';
import { PERMISSION_CODES } from '@/types';
import { useRBAC } from '../hooks/useRBAC';
import { resolveSubPageView } from '../rbac/adminPageAccess';

type SalaryTab = 'total' | 'list' | 'students';

const isSalaryTab = (value: string | null): value is SalaryTab => value === 'total' || value === 'list' || value === 'students';
// Total and Monthly are one tab now; old ?view=monthly links open it.
const normalizeView = (value: string | null) => (value === 'monthly' ? 'total' : value);

const SalaryPage = () => {
  const [searchParams] = useSearchParams();
  const { canAccessSubPage } = useRBAC();
  // Only the salary views this admin was given; a hidden one falls back to an allowed view.
  const allowedView = resolveSubPageView(PERMISSION_CODES.MANAGE_SALARY, normalizeView(searchParams.get('view')) || 'total', canAccessSubPage);
  const activeTab: SalaryTab = isSalaryTab(allowedView) ? allowedView : 'total';
  const {
    year,
    month,
    setPeriod,
    search,
    setSearch,
    loading,
    rows,
    allRows,
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
        title=""
        compact
        actions={
          <Input
            type="month"
            value={monthInputValue(year, month)}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="w-[160px]"
          />
        }
      />

      {activeTab === 'total' && <SalaryOverviewTab year={year} month={month} summary={summary} />}

      {/* Which students of each teacher paid this month (what teachers see in their own account). */}
      {activeTab === 'students' && <SalaryStudentsTab year={year} month={month} />}

      {/* Every teacher: students' payments, salary, advances and what they received; a click opens the teacher. */}
      {activeTab === 'list' && (
        <SalaryListTab
          year={year}
          month={month}
          allRows={allRows}
          rows={rows}
          loading={loading}
          search={search}
          onSearch={setSearch}
          pagination={{ total: totalRows, currentPage, totalPages, start, end, pageSize, setPage, setPageSize }}
        />
      )}
    </div>
  );
};

export default SalaryPage;
