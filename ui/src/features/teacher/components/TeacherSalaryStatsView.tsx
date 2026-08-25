// Statistics view (default) for the logged-in teacher's own salary: paid vs unpaid months as a pie chart.

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart } from '@/shared/components/PieChart';
import { formatMoney } from '@/utils/helpers';
import type { SalaryTeacherDetail } from '../../crm/salary/types';

interface TeacherSalaryStatsViewProps {
  detail: SalaryTeacherDetail | null;
  loading: boolean;
  onViewDetails: () => void;
}

const PAID_COLOR = '#10b981';
const UNPAID_COLOR = '#f43f5e';

const TeacherSalaryStatsView = ({ detail, loading, onViewDetails }: TeacherSalaryStatsViewProps) => {
  const stats = useMemo(() => {
    const history = detail?.history || [];
    const paidEntries = history.filter((entry) => entry.salary?.is_paid);
    const paid = paidEntries.length;
    const unpaid = history.length - paid;
    const totalReceived = paidEntries.reduce((sum, entry) => sum + (Number(entry.salary?.amount) || 0), 0);
    return { paid, unpaid, tracked: history.length, totalReceived };
  }, [detail]);

  if (loading && !detail) {
    return (
      <div className="flex h-52 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!detail || stats.tracked === 0) {
    return (
      <div className="space-y-3 py-6 text-center text-sm text-muted-foreground">
        <p>No salary records yet. Once your center marks a monthly salary as paid, statistics will show up here.</p>
        <Button variant="outline" size="sm" onClick={onViewDetails}>View Details</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
      <div className="relative mx-auto flex items-center justify-center">
        <PieChart
          size={200}
          strokeWidth={28}
          data={[
            { label: 'Paid', value: stats.paid, color: PAID_COLOR },
            { label: 'Unpaid', value: stats.unpaid, color: UNPAID_COLOR },
          ]}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black">{stats.tracked}</span>
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Months</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border bg-card px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PAID_COLOR }} />
              Paid
            </div>
            <p className="text-xl font-black text-emerald-600">{stats.paid}</p>
          </div>
          <div className="rounded-md border bg-card px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: UNPAID_COLOR }} />
              Unpaid
            </div>
            <p className="text-xl font-black text-rose-600">{stats.unpaid}</p>
          </div>
          <div className="rounded-md border bg-card px-3 py-2.5 shadow-sm">
            <p className="text-[11px] font-semibold text-muted-foreground">Total Received</p>
            <p className="text-xl font-black">{formatMoney(stats.totalReceived)}</p>
          </div>
        </div>

        <Button
          className="gap-2 border-0 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/30 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700"
          onClick={onViewDetails}
        >
          View Details
        </Button>
      </div>
    </div>
  );
};

export default TeacherSalaryStatsView;
