import {
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  Layers3,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart } from '@/shared/components/PieChart';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import type {
  DashboardFinancialMonth,
  DashboardStatCard,
  DashboardStats,
  DashboardStudentGrowthPoint,
} from '../types';

interface Props {
  stats: DashboardStats;
  finance: DashboardFinancialMonth;
  growth: DashboardStudentGrowthPoint[];
  selectedMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onOpenDetails: (card: DashboardStatCard) => void;
}

export const DashboardCommandCenter = ({
  stats,
  finance,
  growth,
  selectedMonth,
  onPreviousMonth,
  onNextMonth,
  onOpenDetails,
}: Props) => {
  const { t } = useLanguage();
  const monthLabel = selectedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const previousGrowth = growth.at(-2)?.newStudents || 0;
  const currentGrowth = growth.at(-1)?.newStudents || stats.newStudentsThisMonth;
  const growthDelta = currentGrowth - previousGrowth;
  const studentsPerClass = stats.totalClasses > 0 ? stats.totalStudents / stats.totalClasses : 0;
  const studentsPerTeacher = stats.totalTeachers > 0 ? stats.totalStudents / stats.totalTeachers : 0;
  const paymentTotal = finance.paidStudents + finance.unpaidStudents;

  const pieData = paymentTotal > 0
    ? [
        { label: t('Paid'), value: finance.paidStudents, color: '#10b981' },
        { label: t('Needs follow-up'), value: finance.unpaidStudents, color: '#f43f5e' },
      ]
    : [];

  const attentionItems = [
    {
      label: t('Students needing payment follow-up'),
      value: finance.unpaidStudents.toLocaleString(),
      detail: t('Below their expected amount for this month'),
      icon: UserRoundCheck,
      tone: 'bg-rose-50 text-rose-600',
      card: { label: t('Students needing payment follow-up'), value: finance.unpaidStudents, icon: UserRoundCheck, accent: '', detailsType: 'remainingPayments' as const },
    },
    {
      label: t('Amount still to collect'),
      value: formatMoney(finance.remainingPayments),
      detail: t('Gap between expected and collected tuition'),
      icon: CircleDollarSign,
      tone: 'bg-amber-50 text-amber-600',
      card: { label: t('Amount still to collect'), value: formatMoney(finance.remainingPayments), icon: CircleDollarSign, accent: '', detailsType: 'remainingPayments' as const },
    },
    {
      label: t('Older outstanding debt'),
      value: formatMoney(finance.outstandingDebt),
      detail: t('Balance requiring separate debt follow-up'),
      icon: AlertTriangle,
      tone: 'bg-violet-50 text-violet-600',
      card: { label: t('Older outstanding debt'), value: formatMoney(finance.outstandingDebt), icon: AlertTriangle, accent: '', detailsType: 'outstandingDebts' as const },
    },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">{t('At a glance')}</p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                {finance.unpaidStudents > 0
                  ? `${finance.unpaidStudents.toLocaleString()} ${t('students need follow-up')}`
                  : t('Monthly payments are fully covered')}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {finance.collectionRate}% {t('collected')} · {finance.paidStudents.toLocaleString()} {t('students fully paid')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/[0.04]">
            <Button type="button" size="icon" variant="ghost" onClick={onPreviousMonth} aria-label={t('Previous month')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-36 text-center text-sm font-bold">{monthLabel}</span>
            <Button type="button" size="icon" variant="ghost" onClick={onNextMonth} aria-label={t('Next month')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{t('Payment health')}</p>
              <p className="mt-2 text-4xl font-black text-slate-950 dark:text-white">{finance.collectionRate}%</p>
              <p className="mt-1 text-sm text-slate-500">{formatMoney(finance.paidPayments)} {t('of')} {formatMoney(finance.expectedPayments)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <PieChart data={pieData} size={220} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
            <div><p className="text-xs text-slate-500">{t('Fully paid')}</p><p className="mt-1 text-lg font-black text-emerald-600">{finance.paidStudents}</p></div>
            <div><p className="text-xs text-slate-500">{t('Needs follow-up')}</p><p className="mt-1 text-lg font-black text-rose-600">{finance.unpaidStudents}</p></div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">{t('Needs attention')}</p>
              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">{t('Prioritized follow-up')}</h3>
            </div>
            <AlertTriangle className="h-5 w-5 text-rose-500" />
          </div>
          <div className="space-y-2">
            {attentionItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.label} type="button" onClick={() => onOpenDetails(item.card)} className="group flex w-full items-center gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.04]">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.tone}`}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 dark:text-white">{item.label}</span><span className="block truncate text-xs text-slate-500">{item.detail}</span></span>
                  <span className="text-right"><span className="block text-base font-black text-slate-950 dark:text-white">{item.value}</span><ArrowRight className="ml-auto mt-1 h-3.5 w-3.5 text-slate-400 transition group-hover:translate-x-0.5" /></span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-cyan-600" /><h3 className="text-base font-black">{t('Operational pulse')}</h3></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Pulse icon={GraduationCap} tone="bg-cyan-50 text-cyan-600" label={t('New this month')} value={`+${currentGrowth}`} detail={`${growthDelta >= 0 ? '+' : ''}${growthDelta} ${t('vs previous month')}`} />
          <Pulse icon={Users} tone="bg-emerald-50 text-emerald-600" label={t('Students per group')} value={studentsPerClass.toFixed(1)} detail={t('Average group load')} />
          <Pulse icon={UserRoundCheck} tone="bg-violet-50 text-violet-600" label={t('Students per teacher')} value={studentsPerTeacher.toFixed(1)} detail={t('Average teacher load')} />
          <Pulse icon={Layers3} tone="bg-amber-50 text-amber-600" label={t('Multi-group students')} value={stats.multiClassStudents.toLocaleString()} detail={t('Students studying in multiple groups')} />
        </div>
      </section>
    </div>
  );
};

const Pulse = ({ icon: Icon, tone, label, value, detail }: { icon: typeof Users; tone: string; label: string; value: string; detail: string }) => (
  <div className="rounded-lg border border-slate-100 p-3 dark:border-white/10">
    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></div>
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </div>
);
