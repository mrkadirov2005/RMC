// Source file for the dashboard area in the crm feature.

import { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CalendarCheck2, CheckCircle2, CircleDollarSign, Plus, UserRoundX, Users } from 'lucide-react';
import { useAppSelector } from '../hooks';
import { useDashboardData } from './hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { usePaymentsPage } from '../payments/hooks/usePaymentsPage';
import { PaymentFormDialog } from '../payments/components/PaymentFormDialog';
import type { DashboardScope } from './types';

// Renders the dashboard module.
const Dashboard = memo(() => {
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.userType || 'superuser';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'payments' | 'attendance'>('payments');
  const selectedMonth = useMemo(() => new Date(), []);
  const scope: DashboardScope = { type: 'all', value: 'all' };
  const { loading, scopedCollections, stats } = useDashboardData(role, selectedMonth, scope);
  const paymentHook = usePaymentsPage();
  const today = new Date();
  const dateKey = (date: Date) => date.toISOString().slice(0, 10);
  const todayKey = dateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);
  const payments = scopedCollections.payments;
  const attendance = scopedCollections.attendance;
  const isPaid = (payment: Record<string, unknown>) =>
    payment.is_complete === true ||
    ['paid', 'completed', 'complete', 'success'].includes(String(payment.status || payment.payment_status || '').toLowerCase());
  const paymentDays = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = new Date(year, month, index + 1);
      const key = dateKey(day);
      return {
        key,
        label: String(index + 1),
        count: payments.filter((payment) => isPaid(payment) && String(payment.payment_date || '').slice(0, 10) === key).length,
      };
    });
  }, [payments, today]);
  const paidToday = paymentDays.find((day) => day.key === todayKey)?.count || 0;
  const paidYesterday = payments.filter((payment) => isPaid(payment) && String(payment.payment_date || '').slice(0, 10) === yesterdayKey).length;
  const attendanceToday = attendance.filter((record) => String(record.attendance_date || '').slice(0, 10) === todayKey);
  const presentToday = attendanceToday.filter((record) => ['Present', 'Late'].includes(String(record.status))).length;
  const absentToday = attendanceToday.filter((record) => String(record.status).toLowerCase().startsWith('absent')).length;
  const maxPaymentCount = Math.max(1, ...paymentDays.map((day) => day.count));
  const { handleOpenModal, handleCloseModal, handleSubmit, isModalOpen, formData, setFormData, studentOptions, centerOptions, isLoadingOptions, state } = paymentHook;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">Admin overview</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">Operations dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor payments and attendance across the center.</p>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus className="mr-2 h-4 w-4" /> Add payment</Button>
      </div>

      <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.04]">
        {(['payments', 'attendance'] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-md px-4 py-2 text-sm font-bold capitalize ${activeTab === tab ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? <div className="rounded-xl border p-10 text-center text-sm text-slate-500">Loading dashboard data...</div> : activeTab === 'payments' ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric icon={CircleDollarSign} label="Paid yesterday" value={paidYesterday} tone="text-amber-600 bg-amber-50" />
            <Metric icon={CheckCircle2} label="Paid today" value={paidToday} tone="text-emerald-600 bg-emerald-50" />
            <Metric icon={Users} label="Students this month" value={stats.totalStudents} tone="text-cyan-600 bg-cyan-50" />
          </div>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="font-black">Monthly payment activity</h2><p className="text-sm text-slate-500">Number of completed student payments per day.</p></div><BarChart3 className="h-5 w-5 text-cyan-600" /></div>
            <div className="flex h-48 items-end gap-1 overflow-x-auto pb-6">{paymentDays.map((day) => <div key={day.key} className="flex min-w-[14px] flex-1 flex-col items-center justify-end gap-1"><div title={`${day.key}: ${day.count}`} className={`w-full rounded-t-sm ${day.key === todayKey ? 'bg-emerald-500' : day.key === yesterdayKey ? 'bg-amber-500' : 'bg-cyan-500/70'}`} style={{ height: `${Math.max(4, (day.count / maxPaymentCount) * 140)}px` }} /><span className="text-[9px] text-slate-400">{day.label}</span></div>)}</div>
          </section>
          <Button variant="outline" onClick={() => navigate('/payments')}>Open payments management</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric icon={CalendarCheck2} label="Present or late today" value={presentToday} tone="text-emerald-600 bg-emerald-50" />
            <Metric icon={UserRoundX} label="Absent today" value={absentToday} tone="text-rose-600 bg-rose-50" />
            <Metric icon={Users} label="Attendance records today" value={attendanceToday.length} tone="text-cyan-600 bg-cyan-50" />
          </div>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="font-black">Attendance overview</h2>
            <p className="mt-1 text-sm text-slate-500">Overall attendance for {today.toLocaleDateString()}.</p>
            <div className="mt-5 h-4 overflow-hidden rounded-full bg-rose-100"><div className="h-full bg-emerald-500" style={{ width: `${attendanceToday.length ? (presentToday / attendanceToday.length) * 100 : 0}%` }} /></div>
            <div className="mt-3 flex justify-between text-sm font-bold"><span className="text-emerald-600">{presentToday} present</span><span className="text-rose-600">{absentToday} absent</span></div>
          </section>
          <Button variant="outline" onClick={() => navigate('/attendance')}>Open attendance management</Button>
        </div>
      )}
      <PaymentFormDialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }} title="Add Payment" description="Record a payment without leaving the dashboard." formData={formData} setFormData={setFormData} onSubmit={handleSubmit} isSubmitting={state.loading} submitLabel="Save payment" studentOptions={studentOptions} centerOptions={centerOptions} isLoadingOptions={isLoadingOptions} showStudentSelect showCenterSelect={Boolean(centerOptions.length)} submitDisabled={!formData.student_id} />
    </div>
  );
});

const Metric = ({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString()}</p></div>
);

Dashboard.displayName = 'Dashboard';

export default Dashboard;
