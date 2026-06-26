import { useMemo } from 'react';
import {
  AlertTriangle,
  BadgePercent,
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { OwnerOverviewCollections } from '../types';

interface Props {
  collections: OwnerOverviewCollections;
  activeCenterLabel: string;
  loading: boolean;
}

const isActive = (item: any) => String(item?.status || '').toLowerCase() === 'active';
const isPaid = (payment: any) => ['completed', 'paid'].includes(String(payment?.payment_status || payment?.status || '').toLowerCase());

export const OwnerOverviewPanel = ({ collections, activeCenterLabel, loading }: Props) => {
  const { t } = useLanguage();
  const stats = useMemo(() => {
    const activeStudents = collections.students.filter(isActive).length;
    const activeTeachers = collections.teachers.filter(isActive).length;
    const paidPayments = collections.payments.filter(isPaid);
    const collected = paidPayments.reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);
    const discounted = collections.payments.filter((payment) => Number(payment?.discount_amount || 0) > 0);
    const discountTotal = discounted.reduce((sum, payment) => sum + Number(payment?.discount_amount || 0), 0);
    const incompleteDiscounts = discounted.filter((payment) => payment?.is_complete === false).length;
    const assignedStudents = collections.students.filter((student) => student?.class_id).length;
    const unassignedStudents = Math.max(collections.students.length - assignedStudents, 0);
    const groupsWithoutTeacher = collections.classes.filter((group) => !group?.teacher_id).length;
    const studentsPerTeacher = collections.teachers.length > 0 ? Math.round(collections.students.length / collections.teachers.length) : 0;
    const paidStudentIds = new Set(paidPayments.map((payment) => Number(payment?.student_id || 0)).filter(Boolean));
    const paymentCoverage = collections.students.length > 0 ? Math.round((paidStudentIds.size / collections.students.length) * 100) : 0;

    return {
      activeStudents,
      activeTeachers,
      collected,
      discountTotal,
      incompleteDiscounts,
      unassignedStudents,
      groupsWithoutTeacher,
      studentsPerTeacher,
      paymentCoverage,
    };
  }, [collections]);

  const highlights = [
    {
      label: 'Active students',
      value: stats.activeStudents.toLocaleString(),
      detail: `${collections.students.length.toLocaleString()} total`,
      Icon: GraduationCap,
      tone: 'from-blue-600 to-cyan-600',
    },
    {
      label: 'Active teachers',
      value: stats.activeTeachers.toLocaleString(),
      detail: `${stats.studentsPerTeacher} students / teacher`,
      Icon: Users,
      tone: 'from-emerald-600 to-teal-600',
    },
    {
      label: 'Collected payments',
      value: formatMoney(stats.collected),
      detail: `${stats.paymentCoverage}% student coverage`,
      Icon: Wallet,
      tone: 'from-violet-600 to-fuchsia-600',
    },
    {
      label: 'Discount impact',
      value: formatMoney(stats.discountTotal),
      detail: `${stats.incompleteDiscounts} incomplete discounted payments`,
      Icon: BadgePercent,
      tone: 'from-amber-500 to-orange-600',
    },
  ];

  const risks = [
    { label: 'Unassigned students', value: stats.unassignedStudents, Icon: AlertTriangle, tone: 'text-amber-700 bg-amber-100 border-amber-200' },
    { label: 'Groups without teacher', value: stats.groupsWithoutTeacher, Icon: BookOpen, tone: 'text-rose-700 bg-rose-100 border-rose-200' },
    { label: 'Deleted students', value: collections.deletedStudents.length, Icon: AlertTriangle, tone: 'text-slate-700 bg-slate-100 border-slate-200' },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded bg-white/10 px-2.5 py-1 text-xs font-black text-white/80">
                {t('Owner overview')}
              </span>
              <span className="inline-flex items-center rounded bg-cyan-400/15 px-2.5 py-1 text-xs font-black text-cyan-100">
                {activeCenterLabel}
              </span>
            </div>
            <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight">
              {t('Important signals across the whole school system.')}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-white/65">
              {t('Students, teachers, payments, discounts, and operational issues in one place.')}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniSignal Icon={Building2} label="Centers" value={collections.centers.length} />
              <MiniSignal Icon={ShieldCheck} label="Admins" value={collections.superusers.length} />
              <MiniSignal Icon={CheckCircle2} label="Owners" value={collections.owners.length} />
            </div>
          </div>
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-28 left-20 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">{t('Needs attention')}</h3>
              <p className="text-xs font-semibold text-slate-500">{loading ? t('Refreshing data...') : t('Fast operational checks.')}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-2">
            {risks.map((risk) => (
              <div key={risk.label} className={cn('flex items-center justify-between gap-3 rounded-md border px-3 py-2', risk.tone)}>
                <span className="flex items-center gap-2 text-sm font-black">
                  <risk.Icon className="h-4 w-4" />
                  {t(risk.label)}
                </span>
                <span className="text-lg font-black">{risk.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {highlights.map((item) => (
          <div key={item.label} className={cn('rounded-md bg-gradient-to-br p-4 text-white shadow-lg', item.tone)}>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-white/20">
              <item.Icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-black uppercase text-white/70">{t(item.label)}</p>
            <p className="mt-1 text-xl font-black leading-tight">{item.value}</p>
            <p className="mt-1 text-xs font-bold text-white/70">{t(item.detail)}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const MiniSignal = ({ Icon, label, value }: { Icon: typeof Building2; label: string; value: number }) => {
  const { t } = useLanguage();
  return (
    <div className="rounded-md border border-white/10 bg-white/10 p-3">
      <Icon className="mb-2 h-4 w-4 text-cyan-200" />
      <p className="text-[10px] font-black uppercase text-white/55">{t(label)}</p>
      <p className="text-xl font-black">{value.toLocaleString()}</p>
    </div>
  );
};
