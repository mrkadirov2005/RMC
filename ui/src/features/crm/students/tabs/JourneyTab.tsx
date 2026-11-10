// The student's journey through the center: every group and teacher, how long, how it went and
// how it ended. Owners and admins only.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowRightLeft, CalendarRange, CheckCircle2, CircleDot, Coins, GraduationCap, Layers3, Loader2, LogOut, Route, UserRound, Users, Wallet } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { journeyAPI } from '../api';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  attendanceRate,
  describeOutcome,
  formatDay,
  formatDuration,
  type JourneyStint,
  type StudentJourney,
} from './journeyModel';

interface Props {
  studentId: number;
  onOpenStudent?: (studentId: number) => void;
}

const outcomeStyle: Record<string, { tone: string; icon: ReactNode }> = {
  active: { tone: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  transferred: { tone: 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300', icon: <ArrowRightLeft className="h-3.5 w-3.5" /> },
  left: { tone: 'border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300', icon: <LogOut className="h-3.5 w-3.5" /> },
  ended: { tone: 'border-slate-300 bg-slate-50 text-slate-700 dark:bg-muted dark:text-muted-foreground', icon: <CircleDot className="h-3.5 w-3.5" /> },
};

export const JourneyTab = ({ studentId, onOpenStudent }: Props) => {
  const { t } = useLanguage();
  const [journey, setJourney] = useState<StudentJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await journeyAPI.get<StudentJourney>(studentId);
      setJourney(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || t("Could not load the student's journey."));
    } finally {
      setLoading(false);
    }
  }, [studentId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !journey) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('Loading...')}
      </div>
    );
  }
  if (error) return <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>;
  if (!journey) return null;

  const { summary } = journey;
  const rate = attendanceRate(summary.attended, summary.missed);
  const tiles = [
    {
      label: t('At the center'),
      value: formatDuration(summary.days, t),
      hint: `${summary.first_day_approx ? '≈ ' : ''}${formatDay(summary.first_day)} — ${summary.last_day ? formatDay(summary.last_day) : t('now')}`,
      icon: <CalendarRange className="h-4 w-4" />,
      tone: 'from-sky-500 to-indigo-600',
    },
    { label: t('Teachers'), value: String(summary.teachers), hint: t('{count} groups', { count: summary.groups }), icon: <UserRound className="h-4 w-4" />, tone: 'from-violet-500 to-fuchsia-600' },
    {
      label: t('Attendance'),
      value: rate == null ? '—' : `${rate}%`,
      hint: t('{attended} attended · {missed} missed', { attended: summary.attended, missed: summary.missed }),
      icon: <GraduationCap className="h-4 w-4" />,
      tone: 'from-emerald-500 to-teal-600',
    },
    {
      label: t('Paid'),
      value: formatMoney(summary.paid),
      hint: t('of {amount} expected', { amount: formatMoney(summary.expected) }),
      icon: <Wallet className="h-4 w-4" />,
      tone: summary.paid + 0.01 >= summary.expected ? 'from-emerald-500 to-green-600' : 'from-amber-500 to-orange-600',
    },
    { label: t('Coins'), value: String(summary.coins), hint: describeOutcome(summary.status, t), icon: <Coins className="h-4 w-4" />, tone: 'from-yellow-500 to-amber-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className={`rounded-md bg-gradient-to-br p-2.5 text-white shadow-sm ${tile.tone}`}>
            <div className="flex items-center gap-1.5 text-[0.625rem] font-black uppercase text-white/80">
              {tile.icon}
              {tile.label}
            </div>
            <div className="mt-0.5 text-lg font-black leading-tight">{tile.value}</div>
            <div className="truncate text-[0.6875rem] text-white/85" title={tile.hint}>{tile.hint}</div>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-foreground">
          <Users className="h-4 w-4" />
          {t('Time with each teacher')}
        </h3>
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('Teacher')}</TableHead>
                <TableHead className="text-xs">{t('Time')}</TableHead>
                <TableHead className="text-xs">{t('Groups')}</TableHead>
                <TableHead className="text-xs">{t('Attendance')}</TableHead>
                <TableHead className="text-xs">{t('Paid')}</TableHead>
                <TableHead className="text-xs">{t('How it ended')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journey.teachers.map((teacher) => {
                const teacherRate = attendanceRate(teacher.attended, teacher.missed);
                return (
                  <TableRow key={`${teacher.teacher_id}-${teacher.name}`}>
                    <TableCell className="text-xs font-semibold">
                      {teacher.name || t('Unassigned')}
                      {teacher.current && (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[0.625rem] font-bold text-emerald-700">{t('now')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-semibold">{formatDuration(teacher.days, t)}</div>
                      <div className="text-muted-foreground">{formatDay(teacher.from)} — {teacher.current ? t('now') : formatDay(teacher.to)}</div>
                    </TableCell>
                    <TableCell className="text-xs">{teacher.groups.join(', ') || '—'}</TableCell>
                    <TableCell className="text-xs">{teacherRate == null ? '—' : `${teacherRate}%`}</TableCell>
                    <TableCell className="text-xs">
                      {formatMoney(teacher.paid)}
                      <div className="text-muted-foreground">{t('of {amount}', { amount: formatMoney(teacher.expected) })}</div>
                    </TableCell>
                    <TableCell className="text-xs">{teacher.outcomes.map((outcome) => describeOutcome(outcome, t)).join('; ')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-foreground">
          <Route className="h-4 w-4" />
          {t('Journey')}
        </h3>
        <ol className="relative space-y-3 border-l-2 border-sky-200 pl-4 dark:border-border">
          {journey.stints.map((stint) => (
            <StintCard key={stint.student_id} stint={stint} current={stint.student_id === studentId} onOpenStudent={onOpenStudent} />
          ))}
        </ol>
        <p className="text-[0.6875rem] text-muted-foreground">
          {t('Records are joined by transfers, added groups, the enrollment number, and the same phone with the same first name. ≈ marks a start date taken from when the record was created.')}
        </p>
      </section>
    </div>
  );
};

const StintCard = ({ stint, current, onOpenStudent }: { stint: JourneyStint; current: boolean; onOpenStudent?: (id: number) => void }) => {
  const { t } = useLanguage();
  const style = outcomeStyle[stint.outcome] || outcomeStyle.ended;
  const rate = attendanceRate(stint.attended, stint.missed);
  const ending =
    stint.outcome === 'transferred'
      ? `${t('Transferred')}${stint.transferred_to?.class_name ? ` → ${stint.transferred_to.class_name}` : ''}${stint.transfer_reason ? ` · ${stint.transfer_reason}` : ''}`
      : stint.outcome === 'left'
        ? `${t('Left the center')}${stint.leave_reason ? ` · ${stint.leave_reason}` : ''}${stint.leave_note ? ` (${stint.leave_note})` : ''}`
        : stint.outcome === 'active'
          ? t('Still studying')
          : t('Group ended');
  const matched: Record<string, string> = {
    enrollment: t('same enrollment number'),
    phone: t('same phone and name'),
  };
  return (
    <li className="relative">
      <span className={`absolute -left-[1.4rem] top-3 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white dark:bg-card ${style.tone}`} />
      <div className={`rounded-md border p-3 ${current ? 'border-sky-400 ring-1 ring-sky-200' : 'border-slate-200 dark:border-border'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-black text-slate-900 dark:text-foreground">{stint.class_name || t('No group')}</span>
              {stint.parallel && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[0.625rem] font-bold text-sky-700">{t('Extra group')}</span>}
              {matched[stint.matched_by] && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-slate-600" title={t('How this record was matched')}>
                  {matched[stint.matched_by]}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {[stint.subject_name, stint.level_name].filter(Boolean).length > 0 && (
                <span className="flex items-center gap-1">
                  <Layers3 className="h-3 w-3" />
                  {[stint.subject_name, stint.level_name].filter(Boolean).join(' · ')}
                </span>
              )}
              <span>
                {stint.from_approx ? '≈ ' : ''}
                {formatDay(stint.from)} — {stint.to ? formatDay(stint.to) : t('now')} · {formatDuration(stint.days, t)}
              </span>
            </div>
          </div>
          <span className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[0.6875rem] font-bold ${style.tone}`}>
            {style.icon}
            {ending}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {stint.teachers.map((teacher) => (
            <span key={`${teacher.teacher_id}-${teacher.from}`} className="rounded bg-violet-50 px-2 py-0.5 text-violet-800 dark:bg-muted dark:text-foreground">
              <UserRound className="mr-1 inline h-3 w-3" />
              <span className="font-semibold">{teacher.name || t('Unassigned')}</span> · {formatDuration(teacher.days, t)}
            </span>
          ))}
        </div>

        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
          <div><dt className="text-muted-foreground">{t('Attendance')}</dt><dd className="font-semibold">{rate == null ? '—' : `${rate}%`} <span className="font-normal text-muted-foreground">({stint.attended}/{stint.attended + stint.missed})</span></dd></div>
          <div><dt className="text-muted-foreground">{t('Average grade')}</dt><dd className="font-semibold">{stint.avg_grade == null ? '—' : `${stint.avg_grade}%`}</dd></div>
          <div><dt className="text-muted-foreground">{t('Coins')}</dt><dd className="font-semibold">{stint.coins}</dd></div>
          <div>
            <dt className="text-muted-foreground">{t('Paid')}</dt>
            <dd className={`font-semibold ${stint.paid + 0.01 >= stint.expected ? 'text-emerald-700' : 'text-amber-700'}`}>
              {formatMoney(stint.paid)} <span className="font-normal text-muted-foreground">/ {formatMoney(stint.expected)}</span>
            </dd>
          </div>
        </dl>

        {!current && onOpenStudent && (
          <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => onOpenStudent(stint.student_id)}>
            {t('Open this record')}
          </Button>
        )}
      </div>
    </li>
  );
};
