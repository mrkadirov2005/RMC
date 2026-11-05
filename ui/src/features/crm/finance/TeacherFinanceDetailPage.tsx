// Hisobotlar → Moliya → one teacher: a month of their groups' money with the teacher's own pay rate.
// What the students should pay and paid, the teacher's earnings at their rate (each teacher's differs),
// and what stays with the center. The figures come from the same calculation as the salary page.

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Calendar, DollarSign, Loader2, Percent, PiggyBank, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { salaryAPI } from '@/shared/api/api';
import { getCenterMonthKey } from '@/shared/billingPeriod';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAppDispatch, useAppSelector } from '../hooks';
import { fetchTeachers } from '@/slices/teachersSlice';
import { GroupCard } from '@/features/teacher/payments/TeacherPaymentsOverview';
import { LatePaymentsSection } from '@/features/teacher/payments/LatePaymentsSection';
import type { TeacherGroupPayments } from '@/features/teacher/payments/types';

const Tile = ({ icon: Icon, label, value, hint, tone }: { icon: typeof DollarSign; label: string; value: string; hint?: string; tone: string }) => (
  <div className="rounded-xl border bg-card p-3 shadow-sm">
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
      <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', tone)}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </div>
    <div className="mt-2 text-lg font-black tabular-nums">{value}</div>
    {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
  </div>
);

const TeacherFinanceDetailPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const teacherId = Number(useParams().teacherId);
  const [month, setMonth] = useState(() => getCenterMonthKey());
  const [state, setState] = useState<{ key: string; data: TeacherGroupPayments | null; failed: boolean } | null>(null);
  const teachers = useAppSelector((root) => root.teachers.items) as Array<{ teacher_id?: number; id?: number; first_name?: string; last_name?: string }>;
  const teacher = teachers.find((item) => Number(item.teacher_id || item.id) === teacherId);

  useEffect(() => {
    if (!teachers.length) dispatch(fetchTeachers());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  const key = `${teacherId}:${month}`;
  useEffect(() => {
    if (!teacherId) return;
    let cancelled = false;
    salaryAPI
      .getTeacherPayments(teacherId, { month })
      .then((response) => {
        if (!cancelled) setState({ key, data: response?.data ?? null, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ key, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId, month, key]);

  const current = state?.key === key ? state : null;
  const data = current?.data ?? null;
  const totals = data?.totals;
  const earnings = data?.earnings;
  const rate = earnings?.rate ?? data?.salary_percentage ?? 0;
  const teacherEarns = earnings?.due ?? totals?.current_salary ?? 0;
  const centerKeeps = Math.max(0, (earnings?.base_amount ?? totals?.collected ?? 0) - teacherEarns);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/finance')} aria-label={t('Back')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <DollarSign className="h-7 w-7 text-green-600" />
              {teacher ? `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() : t('Teacher')} {t('- Finance')}
            </h1>
            {data && (
              <p className="text-sm text-muted-foreground">{rate > 0 ? t('{rate}% rate', { rate }) : t('No pay rate set')}</p>
            )}
          </div>
        </div>
        <div className="relative">
          <Input type="month" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} className="w-[180px] pl-9" aria-label={t('Month')} />
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {!current ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : current.failed || !data || !totals ? (
        <div className="py-12 text-center text-sm text-muted-foreground">{t('Could not load payment statistics.')}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile
              icon={TrendingUp}
              label={t('Collected')}
              value={formatMoney(totals.collected)}
              hint={`${totals.collected_percent}% · ${formatMoney(totals.collected)} / ${formatMoney(totals.expected)}`}
              tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
            />
            <Tile
              icon={Percent}
              label={t('Teacher earns')}
              value={formatMoney(teacherEarns)}
              hint={rate > 0 ? t('{rate}% of {amount}', { rate, amount: formatMoney(earnings?.base_amount ?? totals.collected) }) : t('No pay rate set')}
              tone="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            />
            <Tile
              icon={Building2}
              label={t('Center keeps')}
              value={formatMoney(centerKeeps)}
              hint={t('{rate}% of {amount}', { rate: Math.max(0, 100 - rate), amount: formatMoney(earnings?.base_amount ?? totals.collected) })}
              tone="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
            />
            <Tile
              icon={PiggyBank}
              label={t('Outstanding')}
              value={formatMoney(totals.remaining)}
              hint={t('{count} students have not paid in full', { count: String(totals.partial_students + totals.unpaid_students) })}
              tone="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            />
          </div>

          {earnings && earnings.late_payments.length > 0 && <LatePaymentsSection earnings={earnings} />}

          {data.groups.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('No classes assigned yet')}</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {data.groups.map((group) => (
                <GroupCard key={group.class_id} group={group} sharePercent={rate} ownView={false} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherFinanceDetailPage;
