// Source file for the dashboard area in the crm feature.

import { memo, useMemo, useState } from 'react';
import { useUrlTab } from '@/shared/hooks/useUrlTab';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CalendarCheck2, CheckCircle2, CircleDollarSign, Plus, UserRoundX, Users, Wallet } from 'lucide-react';
import { useAppSelector } from '../hooks';
import { useDashboardData } from './hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { usePaymentsPage } from '../payments/hooks/usePaymentsPage';
import { PaymentFormDialog } from '../payments/components/PaymentFormDialog';
import type { DashboardScope } from './types';
import { useLanguage } from '@/i18n/LanguageContext';
import { AbsenceAlertsPanel } from '../absenceAlerts/AbsenceAlertsPanel';
import { TelegramInboxPanel } from '../telegramBot/TelegramInboxPanel';
import { studentAPI } from '@/shared/api/api';
import { showToast } from '@/utils/toast';
import { LeadsReminder } from '../telegram/LeadsReminder';
import { formatMoney } from '@/utils/helpers';
import { buildPaymentDays, centerDayKey, previousCenterDayKey } from './dailyPayments';

// Renders the dashboard module.
const Dashboard = memo(() => {
  const { t } = useLanguage();
  const { user } = useAppSelector((state) => state.auth);
  const role = user?.userType || 'superuser';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useUrlTab<'payments' | 'attendance'>('payments', ['payments', 'attendance']);
  const selectedMonth = useMemo(() => new Date(), []);
  const scope: DashboardScope = { type: 'all', value: 'all' };
  const { loading, scopedCollections, stats } = useDashboardData(role, selectedMonth, scope);
  const paymentHook = usePaymentsPage();
  const selectedStudent = paymentHook.students.find(
    (student) => Number(student.student_id || student.id || 0) === Number(paymentHook.formData.student_id || 0)
  );
  const selectedClass = paymentHook.classes.find(
    (classItem) => Number(classItem.class_id || classItem.id || 0) === Number(selectedStudent?.class_id || 0)
  );
  const selectedStudentHistory = useMemo(
    () =>
      paymentHook.state.items.filter(
        (payment) => Number(payment.student_id || 0) === Number(paymentHook.formData.student_id || 0)
      ),
    [paymentHook.formData.student_id, paymentHook.state.items]
  );
  const today = selectedMonth;
  // Days in Tashkent time: a UTC date would put each bar on the day before.
  const todayKey = centerDayKey(today);
  const yesterdayKey = previousCenterDayKey(today);
  const payments = scopedCollections.payments;
  const attendance = scopedCollections.attendance;
  const paymentDays = useMemo(() => buildPaymentDays(payments, today), [payments, today]);
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);
  const paidToday = paymentDays.find((day) => day.key === todayKey) || { amount: 0, count: 0 };
  // Yesterday can be last month (on the 1st), so it is counted from the month it falls in.
  const paidYesterday = buildPaymentDays(payments, new Date(`${yesterdayKey}T12:00:00+05:00`)).find((day) => day.key === yesterdayKey) || { amount: 0, count: 0 };
  const shownDay = paymentDays.find((day) => day.key === hoveredDayKey) || paymentDays.find((day) => day.key === todayKey);
  const attendanceToday = attendance.filter((record) => String(record.attendance_date || '').slice(0, 10) === todayKey);
  const presentToday = attendanceToday.filter((record) => ['Present', 'Late'].includes(String(record.status))).length;
  const absentToday = attendanceToday.filter((record) => String(record.status).toLowerCase().startsWith('absent')).length;
  const maxPaymentAmount = Math.max(1, ...paymentDays.map((day) => day.amount));
  const { handleOpenModal, handleCloseModal, handleSubmit, isModalOpen, formData, setFormData, studentOptions, centerOptions, isLoadingOptions, state } = paymentHook;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">{t('Admin overview')}</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{t('Operations dashboard')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('Monitor payments and attendance across the center.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleOpenModal()}><Plus className="mr-2 h-4 w-4" /> {t('Add payment')}</Button>
          {/* Every student's payments, with filters (status, dates, teacher, subject, group). */}
          <Button variant="outline" onClick={() => navigate('/dashboard/payments')}><Wallet className="mr-2 h-4 w-4" /> {t('Payments')}</Button>
        </div>
      </div>

      <AbsenceAlertsPanel
        canResolve
        onArchive={async (studentId, reasonId, note) => {
          try {
            await studentAPI.delete(studentId, reasonId, note);
            showToast.success(t('Student archived successfully'));
          } catch (error: any) {
            showToast.error(error?.response?.data?.error || error?.response?.data?.details || t('Failed to archive student'));
            throw error;
          }
        }}
        teacherOptions={scopedCollections.teachers.map((teacher: any) => ({
          id: Number(teacher.teacher_id || teacher.id),
          label: [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || `Teacher #${teacher.teacher_id || teacher.id}`,
        })).filter((teacher) => teacher.id > 0)}
        classOptions={scopedCollections.classes.map((item: any) => ({
          id: Number(item.class_id || item.id),
          label: item.class_name || `Class #${item.class_id || item.id}`,
          teacher_id: Number(item.teacher_id || 0) || null,
        })).filter((item) => item.id > 0)}
      />
      <LeadsReminder />
      <TelegramInboxPanel hideWhenEmpty />

      <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.04]">
        {(['payments', 'attendance'] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-md px-4 py-2 text-sm font-bold ${activeTab === tab ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white' : 'text-slate-500'}`}>
            {tab === 'payments' ? "To'lovlar" : t('Attendance')}
          </button>
        ))}
      </div>

      {loading ? <div className="rounded-xl border p-10 text-center text-sm text-slate-500">{t('Loading dashboard data...')}</div> : activeTab === 'payments' ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric icon={CircleDollarSign} label={t('Paid yesterday')} value={formatMoney(paidYesterday.amount)} hint={t('{count} payments', { count: paidYesterday.count })} tone="text-amber-600 bg-amber-50" />
            <Metric icon={CheckCircle2} label={t('Paid today')} value={formatMoney(paidToday.amount)} hint={t('{count} payments', { count: paidToday.count })} tone="text-emerald-600 bg-emerald-50" />
            <Metric icon={Users} label={t('Students this month')} value={stats.totalStudents} tone="text-cyan-600 bg-cyan-50" />
          </div>
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
          <Button variant="outline" onClick={() => navigate('/payments')}>{t('Open payments management')}</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric icon={CalendarCheck2} label={t('Present or late today')} value={presentToday} tone="text-emerald-600 bg-emerald-50" />
            <Metric icon={UserRoundX} label={t('Absent today')} value={absentToday} tone="text-rose-600 bg-rose-50" />
            <Metric icon={Users} label={t('Attendance records today')} value={attendanceToday.length} tone="text-cyan-600 bg-cyan-50" />
          </div>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <h2 className="font-black">{t('Attendance overview')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('Overall attendance for {date}.', { date: today.toLocaleDateString() })}</p>
            <div className="mt-5 h-4 overflow-hidden rounded-full bg-rose-100"><div className="h-full bg-emerald-500" style={{ width: `${attendanceToday.length ? (presentToday / attendanceToday.length) * 100 : 0}%` }} /></div>
            <div className="mt-3 flex justify-between text-sm font-bold"><span className="text-emerald-600">{presentToday} {t('present')}</span><span className="text-rose-600">{t('{count} absent', { count: absentToday })}</span></div>
          </section>
          <Button variant="outline" onClick={() => navigate('/attendance')}>{t('Open attendance management')}</Button>
        </div>
      )}
      <PaymentFormDialog
        open={isModalOpen}
        onOpenChange={(open) => { if (!open) handleCloseModal(); }}
        title={t('Add Payment')}
        description={t('Record a payment without leaving the dashboard.')}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={state.loading}
        submitLabel="Save payment"
        studentOptions={studentOptions}
        centerOptions={centerOptions}
        isLoadingOptions={isLoadingOptions}
        showStudentSelect
        showCenterSelect={Boolean(centerOptions.length)}
        selectedStudent={
          selectedStudent
            ? {
                name: `${selectedStudent.first_name || ''} ${selectedStudent.last_name || ''}`.trim(),
                subtitle: `ID ${selectedStudent.student_id || selectedStudent.id || ''}${selectedStudent.phone ? ` / ${selectedStudent.phone}` : ''}`,
                className: selectedClass?.class_name || selectedStudent.class_name || undefined,
                amount: selectedClass?.payment_amount,
              }
            : null
        }
        paymentHistory={selectedStudentHistory}
        historyExpectedAmount={Number(selectedClass?.payment_amount || 0)}
        historyBillingPeriod={selectedStudent}
        amountHint={
          selectedClass?.payment_amount
            ? `Suggested from ${selectedClass.class_name || 'selected class'} fee: ${Number(selectedClass.payment_amount).toLocaleString()}`
            : undefined
        }
        submitDisabled={!formData.student_id}
      />
    </div>
  );
});

const Metric = ({ icon: Icon, label, value, hint, tone }: { icon: typeof Users; label: string; value: number | string; hint?: string; tone: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"><div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value.toLocaleString()}</p>{hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}</div>
);

Dashboard.displayName = 'Dashboard';

export default Dashboard;
