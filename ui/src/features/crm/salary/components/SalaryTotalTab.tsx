// "Total" tab: paid vs unpaid teacher count for the selected month, as a pie chart.

import { PieChart } from '@/shared/components/PieChart';
import { formatMoney } from '@/utils/helpers';
import { formatSalaryPeriod } from '../model/salaryModel';

interface SalaryTotalTabSummary {
  teacherCount: number;
  paidCount: number;
  unpaidCount: number;
  totalPaidAmount: number;
}

interface SalaryTotalTabProps {
  year: number;
  month: number;
  summary: SalaryTotalTabSummary;
}

const PAID_COLOR = '#10b981';
const UNPAID_COLOR = '#f43f5e';

export const SalaryTotalTab = ({ year, month, summary }: SalaryTotalTabProps) => {
  const { teacherCount, paidCount, unpaidCount, totalPaidAmount } = summary;
  const paidPercent = teacherCount > 0 ? Math.round((paidCount / teacherCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Salary status for <span className="font-semibold text-foreground">{formatSalaryPeriod(year, month)}</span>
      </p>

      {teacherCount === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No teachers found.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="relative mx-auto flex items-center justify-center">
            <PieChart
              size={220}
              strokeWidth={32}
              data={[
                { label: 'Paid', value: paidCount, color: PAID_COLOR },
                { label: 'Unpaid', value: unpaidCount, color: UNPAID_COLOR },
              ]}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black">{teacherCount}</span>
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">Teachers</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border bg-card px-3 py-2.5 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground">Teachers</p>
              <p className="text-xl font-black text-primary">{teacherCount}</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PAID_COLOR }} />
                Paid
              </div>
              <p className="text-xl font-black text-emerald-600">{paidCount}</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: UNPAID_COLOR }} />
                Unpaid
              </div>
              <p className="text-xl font-black text-rose-600">{unpaidCount}</p>
            </div>
            <div className="rounded-md border bg-card px-3 py-2.5 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground">Total Paid</p>
              <p className="text-xl font-black">{formatMoney(totalPaidAmount)}</p>
            </div>
            <div className="col-span-2 rounded-md border bg-card px-3 py-2.5 shadow-sm sm:col-span-4">
              <p className="text-[11px] font-semibold text-muted-foreground">Paid Share</p>
              <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs font-bold text-muted-foreground">{paidPercent}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
