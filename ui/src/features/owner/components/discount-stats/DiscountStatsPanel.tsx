import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { BadgePercent, CalendarDays, Layers3, WalletCards } from 'lucide-react';
import { PieChart } from '@/shared/components/PieChart';
import { formatMoney } from '@/utils/helpers';
import type { OwnerManagerStatisticsCollections } from '../../types';

interface Props {
  collections: OwnerManagerStatisticsCollections;
}

const colors = {
  serial: '#2563eb',
  monthly: '#10b981',
  complete: '#059669',
  partial: '#f59e0b',
  unpaid: '#e11d48',
};

export const DiscountStatsPanel = ({ collections }: Props) => {
  const stats = useMemo(() => {
    const discounts = collections.discounts || [];
    const discountedPayments = collections.payments.filter((payment) => Number(payment?.discount_amount || 0) > 0);
    const source = discounts.length > 0 ? discounts : discountedPayments;
    const serial = source.filter((item) => item?.discount_kind === 'serial_discount');
    const monthly = source.filter((item) => item?.discount_kind === 'monthly_discount');
    const totalDiscount = source.reduce((sum, item) => {
      const original = Number(item?.original_price ?? item?.original_amount ?? item?.amount ?? 0);
      const finalAmount = Number(item?.final_price ?? item?.final_amount ?? item?.amount ?? original);
      return sum + Math.max(0, original - finalAmount);
    }, 0);
    const originalTotal = source.reduce((sum, item) => sum + Number(item?.original_price ?? item?.original_amount ?? item?.amount ?? 0), 0);
    const finalTotal = source.reduce((sum, item) => sum + Number(item?.final_price ?? item?.final_amount ?? item?.amount ?? 0), 0);
    const complete = discountedPayments.filter((payment) => payment?.is_complete === true);
    const partial = discountedPayments.filter((payment) => payment?.is_complete === false && Number(payment?.amount || 0) > 0);
    const unpaid = discountedPayments.filter((payment) => Number(payment?.amount || 0) <= 0);
    const studentMap = new Map(collections.students.map((student) => [Number(student.student_id || student.id), student]));
    const top = [...source]
      .sort((a, b) => {
        const aDiscount = Math.max(0, Number(a?.original_price ?? a?.original_amount ?? a?.amount ?? 0) - Number(a?.final_price ?? a?.final_amount ?? a?.amount ?? 0));
        const bDiscount = Math.max(0, Number(b?.original_price ?? b?.original_amount ?? b?.amount ?? 0) - Number(b?.final_price ?? b?.final_amount ?? b?.amount ?? 0));
        return bDiscount - aDiscount;
      })
      .slice(0, 8);

    return {
      discounts: source,
      discountedPayments,
      serial,
      monthly,
      totalDiscount,
      originalTotal,
      finalTotal,
      complete,
      partial,
      unpaid,
      studentMap,
      top,
    };
  }, [collections.discounts, collections.payments, collections.students]);

  const statusRows = [
    { label: 'Complete', value: stats.complete.length, color: colors.complete },
    { label: 'Partial', value: stats.partial.length, color: colors.partial },
    { label: 'Unpaid', value: stats.unpaid.length, color: colors.unpaid },
  ].filter((row) => row.value > 0);

  const kindRows = [
    { label: 'Serial', value: stats.serial.length, color: colors.serial },
    { label: 'One-time', value: stats.monthly.length, color: colors.monthly },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<BadgePercent className="h-5 w-5" />} label="Discount records" value={stats.discounts.length.toLocaleString()} tone="from-blue-600 to-cyan-600" />
        <MetricCard icon={<WalletCards className="h-5 w-5" />} label="Total discount" value={formatMoney(stats.totalDiscount)} tone="from-emerald-600 to-teal-600" />
        <MetricCard icon={<Layers3 className="h-5 w-5" />} label="Original total" value={formatMoney(stats.originalTotal)} tone="from-violet-600 to-fuchsia-600" />
        <MetricCard icon={<CalendarDays className="h-5 w-5" />} label="Final payable" value={formatMoney(stats.finalTotal)} tone="from-amber-500 to-orange-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Discount types" rows={kindRows} centerValue={stats.discounts.length.toLocaleString()} />
        <ChartCard title="Applied payment status" rows={statusRows} centerValue={stats.discountedPayments.length.toLocaleString()} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Highest discounts</h3>
            <p className="text-xs font-semibold text-slate-500">Top discount records by discount amount.</p>
          </div>
        </div>
        {stats.top.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 py-8 text-center text-sm font-semibold text-slate-500">
            No discounts yet.
          </div>
        ) : (
          <div className="space-y-2">
            {stats.top.map((item, index) => {
              const student = stats.studentMap.get(Number(item.student_id));
              const discountAmount = Math.max(0, Number(item?.original_price ?? item?.original_amount ?? item?.amount ?? 0) - Number(item?.final_price ?? item?.final_amount ?? item?.amount ?? 0));
              return (
              <div key={item.discount_id || item.payment_id || index} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                <span className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs font-black text-white">{index + 1}</span>
                <span className="min-w-44 font-black text-slate-900 dark:text-white">
                  {[item.student_first_name || student?.first_name, item.student_last_name || student?.last_name].filter(Boolean).join(' ') || `Student #${item.student_id}`}
                </span>
                <span className="rounded bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">{item.discount_kind === 'monthly_discount' ? 'one-time' : item.discount_kind || 'discount'}</span>
                <span className="rounded bg-rose-100 px-2 py-1 text-xs font-black text-rose-700">-{formatMoney(discountAmount)}</span>
                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700">final {formatMoney(Number(item.final_price || item.final_amount || item.amount || 0))}</span>
                <span className={`rounded px-2 py-1 text-xs font-black ${item.active === false ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.active === false ? 'inactive' : 'active'}</span>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) => (
  <div className={`rounded-lg bg-gradient-to-br ${tone} p-4 text-white shadow-lg`}>
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-white/20">{icon}</div>
    <p className="text-[10px] font-black uppercase text-white/75">{label}</p>
    <p className="text-xl font-black leading-tight">{value}</p>
  </div>
);

const ChartCard = ({ title, rows, centerValue }: { title: string; rows: Array<{ label: string; value: number; color: string }>; centerValue: string }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
    <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
    {rows.length === 0 ? (
      <div className="flex h-72 items-center justify-center text-sm font-semibold text-slate-500">No data</div>
    ) : (
      <div className="animate-chart-open mt-3 grid gap-3 md:grid-cols-[260px_1fr]">
        <div className="relative flex items-center justify-center">
          <PieChart
            size={230}
            strokeWidth={34}
            data={rows.map((row) => ({ label: row.label, value: row.value, color: row.color }))}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-black uppercase text-slate-400">Total</span>
            <span className="text-2xl font-black text-slate-950 dark:text-white">{centerValue}</span>
          </div>
        </div>
        <div className="space-y-2 self-center">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 dark:bg-white/[0.03]">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white/80">
                <span className="h-3 w-3 rounded-full" style={{ background: row.color }} />
                {row.label}
              </span>
              <span className="text-sm font-black text-slate-950 dark:text-white">{row.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
