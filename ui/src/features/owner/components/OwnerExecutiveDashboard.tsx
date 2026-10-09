import { useMemo } from 'react';
import { Award, Banknote, GraduationCap, TrendingDown, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney } from '@/utils/helpers';
import { getExpectedAmountForMonth } from '@/shared/billingPeriod';
import type { OwnerOverviewCollections, OwnerOverviewKpiRow } from '../types';

interface Props {
  collections: OwnerOverviewCollections;
  kpis: OwnerOverviewKpiRow[];
  loading: boolean;
}

const idOf = (item: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = Number(item?.[key] || 0);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
};

const nameOf = (item: any, fallback: string) =>
  [item?.first_name, item?.last_name].filter(Boolean).join(' ').trim() || item?.full_name || fallback;

const amountOf = (payment: any) => Number(payment?.amount || payment?.paid_amount || payment?.payment_amount || 0);
const paymentDateOf = (payment: any) => String(payment?.payment_date || payment?.created_at || '').slice(0, 10);
const paidPayment = (payment: any) => ['paid', 'completed', 'success'].includes(String(payment?.status || payment?.payment_status || 'paid').toLowerCase());

const StatCard = ({ label, value, detail, icon: Icon, className }: { label: string; value: string; detail: string; icon: typeof Users; className: string }) => (
  <Card className={`border shadow-sm ${className}`}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
          <p className="mt-1 text-xs font-medium opacity-75">{detail}</p>
        </div>
        <Icon className="h-5 w-5 opacity-75" />
      </div>
    </CardContent>
  </Card>
);

export const OwnerExecutiveDashboard = ({ collections, kpis, loading }: Props) => {
  const month = new Date().toISOString().slice(0, 7);
  const metrics = useMemo(() => {
    const classFees = new Map<number, number>();
    collections.classes.forEach((item) => classFees.set(idOf(item, 'class_id', 'id'), Number(item?.payment_amount || 0)));
    const monthPayments = collections.payments.filter((payment) => paidPayment(payment) && paymentDateOf(payment).startsWith(month));
    const collected = monthPayments.reduce((sum, payment) => sum + amountOf(payment), 0);
    const expected = collections.students.reduce(
      (sum, student) => sum + getExpectedAmountForMonth(student, student?.payment_amount || classFees.get(idOf(student, 'class_id')), month),
      0
    );
    const paidSalaries = collections.salaries.reduce(
      (sum, row) => sum + (row?.salary?.is_paid ? Number(row.salary.amount || 0) : 0),
      0
    );
    const classTeacher = new Map<number, number>();
    collections.classes.forEach((item) => classTeacher.set(idOf(item, 'class_id', 'id'), idOf(item, 'teacher_id')));
    const lossMap = new Map<number, number>();
    collections.deletedStudents.forEach((student) => {
      const teacherId = idOf(student, 'teacher_id') || classTeacher.get(idOf(student, 'class_id')) || 0;
      if (teacherId) lossMap.set(teacherId, (lossMap.get(teacherId) || 0) + 1);
    });
    const teacherNames = new Map<number, string>();
    collections.teachers.forEach((teacher) => teacherNames.set(idOf(teacher, 'teacher_id', 'id'), nameOf(teacher, 'Nomaʼlum ustoz')));
    return {
      students: collections.students.length,
      employees: collections.teachers.length + collections.superusers.length,
      collected,
      expected,
      collectionRate: expected > 0 ? Math.round((collected / expected) * 100) : 0,
      expenses: paidSalaries,
      cash: collected - paidSalaries,
      topTeachers: [...kpis].sort((a, b) => Number(b.kpi?.final_score || 0) - Number(a.kpi?.final_score || 0)).slice(0, 3),
      topStudents: [...collections.students].sort((a, b) => Number(b.coins || b.points || 0) - Number(a.coins || a.points || 0)).slice(0, 3),
      lostTeachers: [...lossMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([teacherId, count]) => ({ teacherId, count, name: teacherNames.get(teacherId) || `Ustoz #${teacherId}` })),
    };
  }, [collections, kpis]);

  if (loading) return <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Dashboard maʼlumotlari yuklanmoqda...</CardContent></Card>;

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Umumiy o‘quvchilar" value={metrics.students.toLocaleString()} detail="Barcha markazlar bo‘yicha" icon={GraduationCap} className="border-blue-200 bg-blue-50 text-blue-950 dark:bg-blue-950/30 dark:text-blue-100" />
        <StatCard label="Jami xodimlar" value={metrics.employees.toLocaleString()} detail="Ustozlar va administratorlar" icon={Users} className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100" />
        <StatCard label="Tushum" value={formatMoney(metrics.collected)} detail="Joriy oyda yig‘ilgan summa" icon={Banknote} className="border-violet-200 bg-violet-50 text-violet-950 dark:bg-violet-950/30 dark:text-violet-100" />
        <StatCard label="To‘lov yig‘ilish foizi" value={`${metrics.collectionRate}%`} detail={`${formatMoney(metrics.collected)} / ${formatMoney(metrics.expected)}`} icon={Award} className="border-amber-200 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100" />
        <StatCard label="Jami xarajatlar" value={formatMoney(metrics.expenses)} detail="Hisoblangan ish haqi ulushi" icon={TrendingDown} className="border-rose-200 bg-rose-50 text-rose-950 dark:bg-rose-950/30 dark:text-rose-100" />
        <StatCard label="Kassada qolgan pul" value={formatMoney(metrics.cash)} detail="Tushumdan xarajatlar ayrilgach" icon={Wallet} className="border-cyan-200 bg-cyan-50 text-cyan-950 dark:bg-cyan-950/30 dark:text-cyan-100" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RankingCard title="KPI bo‘yicha top 3 ustoz" rows={metrics.topTeachers.map((row) => ({ name: nameOf(row, `Ustoz #${row.teacher_id}`), value: Number(row.kpi?.final_score || 0), suffix: 'ball' }))} empty="KPI maʼlumotlari topilmadi" />
        <RankingCard title="Ball bo‘yicha top 3 o‘quvchi" rows={metrics.topStudents.map((row) => ({ name: nameOf(row, 'Nomaʼlum o‘quvchi'), value: Number(row.coins || row.points || 0), suffix: 'ball' }))} empty="O‘quvchi ballari topilmadi" />
        <RankingCard title="Eng ko‘p o‘quvchi yo‘qotgan ustozlar" rows={metrics.lostTeachers.map((row) => ({ name: row.name, value: row.count, suffix: 'o‘quvchi' }))} empty="Yo‘qotilgan o‘quvchilar topilmadi" />
      </div>
    </section>
  );
};

const RankingCard = ({ title, rows, empty }: { title: string; rows: Array<{ name: string; value: number; suffix: string }>; empty: string }) => (
  <Card>
    <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      {rows.length ? rows.map((row, index) => (
        <div key={`${row.name}-${index}`} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
          <span className="min-w-0 truncate text-sm font-semibold"><span className="mr-2 text-muted-foreground">{index + 1}.</span>{row.name}</span>
          <span className="shrink-0 text-sm font-black">{row.value.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">{row.suffix}</span></span>
        </div>
      )) : <p className="text-sm text-muted-foreground">{empty}</p>}
    </CardContent>
  </Card>
);
