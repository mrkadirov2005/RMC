import {
  BookOpen,
  Building2,
  CheckCircle2,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import type { Center } from '../types';

export interface CenterMetrics {
  students: any[];
  teachers: any[];
  classes: any[];
  payments: any[];
}

export const emptyMetrics: CenterMetrics = {
  students: [],
  teachers: [],
  classes: [],
  payments: [],
};

export const getCenterId = (center: Center) => Number(center.center_id || center.id || 0);

export const isPaidPayment = (payment: any) =>
  ['completed', 'paid'].includes(String(payment?.payment_status || payment?.status || '').toLowerCase());

export const buildCenterSummaries = (centers: Center[], metrics: CenterMetrics) => {
  const map = new Map<number, ReturnType<typeof buildCenterSummary>>();
  centers.forEach((center) => {
    const summary = buildCenterSummary(center, metrics);
    map.set(getCenterId(center), summary);
  });
  return map;
};

export const buildCenterSummary = (center: Center, metrics: CenterMetrics) => {
  const centerId = getCenterId(center);
  const students = metrics.students.filter((student) => Number(student?.center_id) === centerId);
  const teachers = metrics.teachers.filter((teacher) => Number(teacher?.center_id || teacher?.branch_id) === centerId);
  const classes = metrics.classes.filter((group) => Number(group?.center_id) === centerId);
  const payments = metrics.payments.filter((payment) => Number(payment?.center_id) === centerId);
  const collected = payments.filter(isPaidPayment).reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);
  return { center, students: students.length, teachers: teachers.length, classes: classes.length, payments: payments.length, collected };
};

export const HeroSignal = ({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) => (
  <div className="rounded-md border border-white/10 bg-white/10 p-3">
    <Icon className="mb-2 h-4 w-4 text-cyan-200" />
    <p className="text-[10px] font-black uppercase text-white/55">{label}</p>
    <p className="text-lg font-black">{value}</p>
  </div>
);

export const InsightCard = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
    <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">{value}</p>
    <p className="text-xs font-semibold text-slate-500">{detail}</p>
  </div>
);

export const MetricTile = ({ Icon, label, value, tone }: { Icon: LucideIcon; label: string; value: string; tone: string }) => (
  <div className={cn('rounded-lg bg-gradient-to-br p-4 text-white shadow-lg', tone)}>
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-white/20">
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-[10px] font-black uppercase text-white/75">{label}</p>
    <p className="text-xl font-black">{value}</p>
  </div>
);

export const CenterRow = ({
  center,
  summary,
  active,
  onActivate,
  onEdit,
  onDelete,
}: {
  center: Center;
  summary?: ReturnType<typeof buildCenterSummary>;
  active: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className={cn('rounded-lg border bg-white p-4 shadow-sm transition dark:bg-white/[0.04]', active ? 'border-emerald-300 ring-2 ring-emerald-100 dark:border-emerald-400/40 dark:ring-emerald-400/10' : 'border-slate-200 dark:border-white/10')}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-lg font-black text-slate-950 dark:text-white">{center.center_name}</h3>
          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">{center.center_code}</span>
          {active && <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Active</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {center.city || center.address}</span>
          <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {center.phone}</span>
          <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {center.email}</span>
        </div>
      </div>

      <div className="grid min-w-full gap-2 sm:grid-cols-5 lg:min-w-[560px]">
        <SmallStat label="Students" value={summary?.students || 0} />
        <SmallStat label="Teachers" value={summary?.teachers || 0} />
        <SmallStat label="Groups" value={summary?.classes || 0} />
        <SmallStat label="Payments" value={summary?.payments || 0} />
        <SmallStat label="Collected" value={formatMoney(summary?.collected || 0)} />
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
      <Button variant={active ? 'secondary' : 'outline'} size="sm" onClick={onActivate} className={active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
        {active ? 'Active branch' : 'Use Branch'}
      </Button>
      <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
      <Button variant="outline" size="sm" onClick={onDelete} className="text-rose-600 hover:text-rose-700">Delete</Button>
    </div>
  </div>
);

const SmallStat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
    <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
    <p className="truncate text-sm font-black text-slate-950 dark:text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
  </div>
);

export const centerMetricIcons = {
  students: GraduationCap,
  teachers: Users,
  groups: BookOpen,
  revenue: Wallet,
  centers: Building2,
};
