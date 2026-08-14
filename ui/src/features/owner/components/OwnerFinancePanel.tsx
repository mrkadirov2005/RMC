// Finance panel for owner-level payment review.

import { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import {
  buildOwnerDailyIncomeRows,
  buildOwnerPaymentMonthStats,
  buildOwnerTeacherEarnings,
  getOwnerPaymentAmount,
  getOwnerPaymentMonthKey,
} from '../utils';
import type { OwnerManagerStatisticsCollections } from '../types';
import { FinanceDailyView } from './finance/FinanceDailyView';
import type { DailyIncomeRow } from './finance/FinanceDailyView';
import { FinanceStatsView } from './finance/FinanceStatsView';
import { FinanceTeachersView } from './finance/FinanceTeachersView';
import { PaymentDateDetailsModal } from './finance/PaymentDateDetailsModal';

interface Props {
  collections: OwnerManagerStatisticsCollections;
  loading: boolean;
}

const salaryPercent = 20;
const getId = (item: any, key: string) => Number(item?.[key] || item?.id || 0);
const getName = (item: any, fallback: string) =>
  [item?.first_name, item?.last_name].filter(Boolean).join(' ').trim() || item?.class_name || fallback;
const isPaidPayment = (payment: any) => {
  const status = String(payment?.status || payment?.payment_status || '').toLowerCase();
  return status === 'paid' || status === 'completed';
};
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'T';

const buildTeacherGroups = (
  collections: OwnerManagerStatisticsCollections,
  monthPayments: any[],
  teacherId: number | null
) => {
  if (!teacherId) return [];
  const teacherClasses = collections.classes.filter((cls) => Number(cls?.teacher_id || 0) === teacherId);

  return teacherClasses.map((cls) => {
    const classId = getId(cls, 'class_id');
    const classStudents = collections.students.filter((student) => Number(student?.class_id || 0) === classId);
    const students = classStudents.map((student) => {
      const studentId = getId(student, 'student_id');
      const studentPayments = monthPayments.filter((payment) => Number(payment?.student_id || 0) === studentId);
      const paidAmount = studentPayments.reduce((sum, payment) => sum + getOwnerPaymentAmount(payment), 0);
      return {
        id: studentId,
        name: getName(student, `Student ${studentId}`),
        paid: studentPayments.length > 0,
        paidAmount,
        expectedAmount: Number(student?.payment_amount || cls?.payment_amount || 0),
      };
    });
    const paidCount = students.filter((student) => student.paid).length;
    const groupCollected = students.reduce((sum, student) => sum + student.paidAmount, 0);
    const expectedAmount = students.reduce((sum, student) => sum + student.expectedAmount, 0);
    const unpaidCount = Math.max(students.length - paidCount, 0);
    const paidPercent = students.length > 0 ? Math.round((paidCount / students.length) * 100) : 0;

    return {
      id: classId,
      name: cls?.class_name || `Group ${classId}`,
      paidCount,
      unpaidCount,
      totalStudents: students.length,
      groupCollected,
      expectedAmount,
      paidPercent,
      salaryAmount: Math.round((groupCollected * salaryPercent) / 100),
      students,
    };
  });
};

export const OwnerFinancePanel = ({ collections, loading }: Props) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [financeView, setFinanceView] = useState<'statistics' | 'teachers' | 'daily'>('statistics');
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedStatsTeacherId, setSelectedStatsTeacherId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'pie' | 'bar' | 'line'>('pie');
  const [searchTerm, setSearchTerm] = useState('');
  const [paidDateModalOpen, setPaidDateModalOpen] = useState(false);

  const paymentStats = useMemo(
    () => buildOwnerPaymentMonthStats(collections.students, collections.payments, selectedMonth),
    [collections.payments, collections.students, selectedMonth]
  );

  const teacherRows = useMemo(
    () => buildOwnerTeacherEarnings(
      collections.students,
      collections.teachers,
      collections.classes,
      collections.payments,
      selectedMonth
    ),
    [collections.classes, collections.payments, collections.students, collections.teachers, selectedMonth]
  );

  const monthPayments = useMemo(
    () =>
      collections.payments.filter(
        (payment) => isPaidPayment(payment) && getOwnerPaymentMonthKey(payment) === selectedMonth
      ),
    [collections.payments, selectedMonth]
  );

  const dailyRows = useMemo<DailyIncomeRow[]>(
    () => buildOwnerDailyIncomeRows(collections.payments, selectedMonth),
    [collections.payments, selectedMonth]
  );

  const dailyTotalIncome = dailyRows.reduce((sum, row) => sum + row.total, 0);
  const dailyPaymentCount = dailyRows.reduce((sum, row) => sum + row.paymentCount, 0);

  const totalCollected = monthPayments.reduce((sum, payment) => sum + getOwnerPaymentAmount(payment), 0);
  const totalSalary = Math.round((totalCollected * salaryPercent) / 100);
  const expectedMonthlyTotal = collections.students.reduce((sum, student) => sum + Number(student?.payment_amount || 0), 0);
  const unpaidEstimate = Math.max(expectedMonthlyTotal - totalCollected, 0);
  const filteredTeachers = teacherRows.filter((row) =>
    row.teacherName.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  const selectedTeacherRow = teacherRows.find((teacher) => teacher.teacherId === selectedTeacherId) || null;
  const selectedTeacher = collections.teachers.find((teacher) => getId(teacher, 'teacher_id') === selectedTeacherId);
  const selectedTeacherName = selectedTeacherRow?.teacherName || (selectedTeacher ? getName(selectedTeacher, 'Teacher') : '');

  const teacherGroups = useMemo(
    () => buildTeacherGroups(collections, monthPayments, selectedTeacherId),
    [collections, monthPayments, selectedTeacherId]
  );

  const selectedGroup = teacherGroups.find((group) => group.id === selectedGroupId) || null;
  const statsTeacherId = selectedStatsTeacherId ?? teacherRows[0]?.teacherId ?? null;
  const selectedStatsTeacher = teacherRows.find((teacher) => teacher.teacherId === statsTeacherId) || null;
  const statsTeacherGroups = useMemo(
    () => buildTeacherGroups(collections, monthPayments, statsTeacherId),
    [collections, monthPayments, statsTeacherId]
  );
  const statsPaidStudents = statsTeacherGroups.reduce((sum, group) => sum + group.paidCount, 0);
  const statsUnpaidStudents = statsTeacherGroups.reduce((sum, group) => sum + group.unpaidCount, 0);
  const statsCollected = statsTeacherGroups.reduce((sum, group) => sum + group.groupCollected, 0);
  const statsExpected = statsTeacherGroups.reduce((sum, group) => sum + group.expectedAmount, 0);
  const statsPaidPercent = statsPaidStudents + statsUnpaidStudents > 0
    ? Math.round((statsPaidStudents / (statsPaidStudents + statsUnpaidStudents)) * 100)
    : 0;
  const mostPaidGroups = [...statsTeacherGroups].sort((a, b) => b.paidPercent - a.paidPercent || b.groupCollected - a.groupCollected);
  const mostUnpaidGroups = [...statsTeacherGroups].sort((a, b) => b.unpaidCount - a.unpaidCount || a.paidPercent - b.paidPercent);

  const monthKeys = useMemo(() => {
    const keys = new Set<string>();
    collections.payments.forEach((payment) => {
      const key = getOwnerPaymentMonthKey(payment);
      if (key) keys.add(key);
    });
    keys.add(selectedMonth);
    return Array.from(keys).sort().slice(-8);
  }, [collections.payments, selectedMonth]);

  const monthlyTrend = useMemo(
    () => {
      const teacherClassIds = new Set(
        collections.classes
          .filter((cls) => Number(cls?.teacher_id || 0) === Number(statsTeacherId || 0))
          .map((cls) => Number(cls?.class_id || cls?.id || 0))
          .filter(Boolean)
      );
      const teacherStudentIds = new Set(
        collections.students
          .filter((student) => teacherClassIds.has(Number(student?.class_id || 0)))
          .map((student) => Number(student?.student_id || student?.id || 0))
          .filter(Boolean)
      );

      return monthKeys.map((month) => {
        const payments = collections.payments.filter(
          (payment) =>
            isPaidPayment(payment) &&
            getOwnerPaymentMonthKey(payment) === month &&
            (!statsTeacherId || teacherStudentIds.has(Number(payment?.student_id || 0)))
        );
        const collected = payments.reduce((sum, payment) => sum + getOwnerPaymentAmount(payment), 0);
        const paidStudents = new Set(payments.map((payment) => Number(payment?.student_id || 0)).filter(Boolean)).size;
        const totalStudents = statsTeacherId ? teacherStudentIds.size : collections.students.length;
        const paidPercent = totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0;
        return { month, collected, paidStudents, paidPercent };
      });
    },
    [collections.classes, collections.payments, collections.students, monthKeys, statsTeacherId]
  );
  const maxTrendCollected = Math.max(...monthlyTrend.map((item) => item.collected), 1);
  const linePoints = monthlyTrend.length > 1
    ? monthlyTrend
        .map((item, index) => {
          const x = (index / (monthlyTrend.length - 1)) * 100;
          const y = 92 - (item.collected / maxTrendCollected) * 84;
          return `${x},${y}`;
        })
        .join(' ')
    : '';

  if (loading) {
    return (
      <div className="rounded-md border bg-white p-6 text-center text-sm font-black text-slate-500">
        Loading finance...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-blue-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-wrap items-center gap-2 border-b bg-gradient-to-r from-blue-50 via-white to-emerald-50 p-3 dark:border-white/10 dark:from-white/[0.04] dark:via-white/[0.03] dark:to-white/[0.04]">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(event) => {
              setSelectedMonth(event.target.value);
              setSelectedTeacherId(null);
              setSelectedGroupId(null);
            }}
            className="h-8 w-40 bg-slate-100 text-xs font-bold"
          />
          {financeView === 'teachers' && <div className="ml-auto flex flex-wrap gap-1.5">
            <span className="rounded bg-blue-100 px-2 py-1 text-[11px] font-black text-blue-700">
              <Users className="mr-1 inline h-3 w-3" />
              {teacherRows.length} o'qituvchi
            </span>
            <span className="rounded bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">
              <DollarSign className="mr-1 inline h-3 w-3" />
              {formatMoney(totalCollected)}
            </span>
            <span className="rounded bg-lime-100 px-2 py-1 text-[11px] font-black text-lime-700">
              <TrendingUp className="mr-1 inline h-3 w-3" />
              {formatMoney(totalSalary)}
            </span>
          </div>}
        </div>

        {financeView === 'teachers' && <div className="grid grid-cols-2 gap-1.5 p-2 md:grid-cols-5">
          {[
            ['Jami tolov', formatMoney(totalCollected), 'bg-blue-600'],
            ['Maosh 20%', formatMoney(totalSalary), 'bg-emerald-600'],
            ["To'lagan", paymentStats.paidStudents, 'bg-cyan-600'],
            ['Qarzdor', paymentStats.unpaidStudents, 'bg-amber-500'],
            ['Ulash', `${paymentStats.paidPercent}%`, 'bg-violet-600'],
          ].map(([label, value, tone]) => (
            <div key={label} className={cn('rounded px-2 py-1.5 text-white', tone as string)}>
              <p className="text-[10px] font-black uppercase text-white/75">{label}</p>
              <p className="text-sm font-black leading-tight">{value}</p>
            </div>
          ))}
        </div>}

        <div className="border-t p-2 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFinanceView('statistics');
                setSelectedTeacherId(null);
                setSelectedGroupId(null);
              }}
              className={cn(
                'inline-flex h-8 items-center rounded-md border px-3 text-xs font-black transition',
                financeView === 'statistics'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
              )}
            >
              <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
              Statistika
            </button>
            <button
              type="button"
              onClick={() => {
                setFinanceView('teachers');
                setSelectedGroupId(null);
              }}
              className={cn(
                'inline-flex h-8 items-center rounded-md border px-3 text-xs font-black transition',
                financeView === 'teachers'
                  ? 'border-cyan-500 bg-cyan-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50'
              )}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              O'qituvchilar
            </button>
            <button
              type="button"
              onClick={() => {
                setFinanceView('daily');
                setSelectedTeacherId(null);
                setSelectedGroupId(null);
              }}
              className={cn(
                'inline-flex h-8 items-center rounded-md border px-3 text-xs font-black transition',
                financeView === 'daily'
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
              )}
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Kunlik
            </button>
          </div>
        </div>
      </div>

      {financeView === 'statistics' && (
        <FinanceStatsView
          selectedMonth={selectedMonth}
          expectedMonthlyTotal={expectedMonthlyTotal}
          totalCollected={totalCollected}
          unpaidEstimate={unpaidEstimate}
          paymentStats={paymentStats}
          teacherRows={teacherRows}
          statsTeacherId={statsTeacherId}
          selectedStatsTeacher={selectedStatsTeacher}
          statsTeacherGroups={statsTeacherGroups}
          statsPaidPercent={statsPaidPercent}
          statsPaidStudents={statsPaidStudents}
          statsUnpaidStudents={statsUnpaidStudents}
          statsCollected={statsCollected}
          statsExpected={statsExpected}
          chartMode={chartMode}
          mostPaidGroups={mostPaidGroups}
          mostUnpaidGroups={mostUnpaidGroups}
          monthlyTrend={monthlyTrend}
          maxTrendCollected={maxTrendCollected}
          linePoints={linePoints}
          initials={initials}
          onTeacherSelect={(teacherId) => {
            setSelectedStatsTeacherId(teacherId);
            setChartMode('pie');
          }}
          onChartModeChange={setChartMode}
          onPaidCardClick={() => setPaidDateModalOpen(true)}
        />
      )}

      <PaymentDateDetailsModal
        open={paidDateModalOpen}
        onOpenChange={setPaidDateModalOpen}
        collections={collections}
      />

      {financeView === 'teachers' && (
        <FinanceTeachersView
          searchTerm={searchTerm}
          selectedTeacherId={selectedTeacherId}
          selectedGroupId={selectedGroupId}
          selectedTeacherRow={selectedTeacherRow}
          selectedTeacherName={selectedTeacherName}
          filteredTeachers={filteredTeachers}
          teacherGroups={teacherGroups}
          selectedGroup={selectedGroup}
          salaryPercent={salaryPercent}
          initials={initials}
          onSearchChange={setSearchTerm}
          onTeacherSelect={(teacherId) => {
            setSelectedTeacherId(teacherId);
            setSelectedGroupId(null);
          }}
          onGroupToggle={(groupId) => setSelectedGroupId(selectedGroupId === groupId ? null : groupId)}
        />
      )}

      {financeView === 'daily' && (
        <FinanceDailyView
          selectedMonth={selectedMonth}
          rows={dailyRows}
          monthTotal={dailyTotalIncome}
          totalPaymentCount={dailyPaymentCount}
          daysWithIncome={dailyRows.length}
        />
      )}
    </div>
  );
};
