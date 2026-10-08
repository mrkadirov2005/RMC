// Dashboard → "To'lovlar": every active student with what they paid over a date range, 100 per
// page, filtered by status, dates, teacher, subject and group.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Plus, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { classAPI, paymentAPI, subjectAPI, teacherAPI } from './api';
import { usePaymentsPage } from '../payments/hooks/usePaymentsPage';
import { PaymentFormDialog } from '../payments/components/PaymentFormDialog';

type PaymentState = 'paid' | 'partial' | 'unpaid';
const ALL = 'all';

interface SummaryRow {
  student_id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  parent_phone: string | null;
  class_id: number | null;
  class_name: string | null;
  teacher_name: string | null;
  subject: string | null;
  monthly_fee: number;
  paid_amount: number;
  expected: number;
  remaining: number;
  payments_count: number;
  last_payment_date: string | null;
  state: PaymentState;
}

interface SummaryResponse {
  period: { from: string; to: string; months: number };
  page: number;
  limit: number;
  total: number;
  totals: { students: number; paid_students: number; partial_students: number; unpaid_students: number; collected: number; remaining: number };
  rows: SummaryRow[];
}

const STATE_STYLE: Record<PaymentState, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
  partial: { label: 'Partly paid', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200' },
  unpaid: { label: 'Unpaid', className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' },
};

const centerToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const lastDayOf = (month: string) => `${month}-${String(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate()).padStart(2, '0')}`;
const shiftMonth = (month: string, by: number) => {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + by, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};
const formatDay = (value: string | null) => (value ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}` : '—');

const DashboardPaymentsPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const thisMonth = centerToday().slice(0, 7);
  const [from, setFrom] = useState(`${thisMonth}-01`);
  const [to, setTo] = useState(lastDayOf(thisMonth));
  const [status, setStatus] = useState<string>(ALL);
  const [teacherId, setTeacherId] = useState<string>(ALL);
  const [subject, setSubject] = useState<string>(ALL);
  const [classId, setClassId] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  // The response and which filters it was for: while they differ from the current filters, the
  // table shows a spinner.
  const [result, setResult] = useState<{ key: string; data: SummaryResponse | null } | null>(null);
  const [teachers, setTeachers] = useState<Array<{ id: number; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: number; name: string; teacherId: number }>>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  // Bumped after a payment is saved here, so the list shows the new status.
  const [refresh, setRefresh] = useState(0);
  const paymentHook = usePaymentsPage();
  // The student a payment is being recorded for: their card, group fee and payment history.
  const selectedStudent = paymentHook.students.find(
    (student) => Number(student.student_id || student.id || 0) === Number(paymentHook.formData.student_id || 0)
  );
  const selectedClass = paymentHook.classes.find(
    (classItem) => Number(classItem.class_id || classItem.id || 0) === Number(selectedStudent?.class_id || 0)
  );
  const selectedStudentHistory = paymentHook.state.items.filter(
    (payment) => Number(payment.student_id || 0) === Number(paymentHook.formData.student_id || 0)
  );

  // Filter choices: teachers, groups and subject names of the branch.
  useEffect(() => {
    teacherAPI.getAll().then((response) => setTeachers(unwrapApiRows<any>(response)
      .map((row) => ({ id: Number(row.teacher_id || row.id), name: [row.first_name, row.last_name].filter(Boolean).join(' ') }))
      .filter((row) => row.id > 0)
      .sort((a, b) => a.name.localeCompare(b.name)))).catch(() => null);
    classAPI.getAll().then((response) => setClasses(unwrapApiRows<any>(response)
      .map((row) => ({ id: Number(row.class_id || row.id), name: String(row.class_name || ''), teacherId: Number(row.teacher_id || 0) }))
      .filter((row) => row.id > 0)
      .sort((a, b) => a.name.localeCompare(b.name)))).catch(() => null);
    subjectAPI.getAll().then((response) => setSubjects(Array.from(new Set(unwrapApiRows<any>(response)
      .map((row) => String(row.subject_name || '').trim())
      .filter(Boolean))).sort((a, b) => a.localeCompare(b)))).catch(() => null);
  }, []);

  // Typing waits a moment before searching.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = {
    from,
    to,
    page,
    status: status === ALL ? undefined : status,
    teacher_id: teacherId === ALL ? undefined : teacherId,
    subject: subject === ALL ? undefined : subject,
    class_id: classId === ALL ? undefined : classId,
    q: query || undefined,
  };
  const requestKey = JSON.stringify({ ...params, refresh });

  useEffect(() => {
    let cancelled = false;
    paymentAPI
      .getStudentsSummary((({ refresh: _refresh, ...filters }) => filters)(JSON.parse(requestKey)))
      .then((response) => {
        if (!cancelled) setResult({ key: requestKey, data: getApiPayload<SummaryResponse>(response) });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const loading = result?.key !== requestKey;
  const data = result?.data ?? null;
  const visibleClasses = teacherId === ALL ? classes : classes.filter((cls) => String(cls.teacherId) === teacherId);
  const change = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
  const setRange = (start: string, end: string) => {
    setFrom(start);
    setTo(end);
    setPage(1);
  };
  const reset = () => {
    setRange(`${thisMonth}-01`, lastDayOf(thisMonth));
    setStatus(ALL);
    setTeacherId(ALL);
    setSubject(ALL);
    setClassId(ALL);
    setSearch('');
  };

  const totals = data?.totals;
  const paidShare = totals && totals.students ? Math.round((totals.paid_students / totals.students) * 100) : 0;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const firstRow = data && data.total ? (data.page - 1) * data.limit + 1 : 0;
  const lastRow = data ? Math.min(data.total, data.page * data.limit) : 0;
  const lastMonth = shiftMonth(thisMonth, -1);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {t('Back')}
          </Button>
          <h1 className="text-2xl font-black">{t('Payments')}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> {t('Reset filters')}
        </Button>
      </div>

      {/* Totals for everything the filters match (all pages). */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: t('Students'), value: totals ? String(totals.students) : '—', tone: 'text-slate-900 dark:text-white' },
          { label: t('Paid'), value: totals ? `${totals.paid_students} · ${paidShare}%` : '—', tone: 'text-emerald-600' },
          { label: t('Unpaid'), value: totals ? `${totals.unpaid_students + totals.partial_students}` : '—', tone: 'text-rose-600' },
          { label: t('Collected'), value: totals ? formatMoney(totals.collected) : '—', tone: 'text-emerald-700' },
          { label: t('Remaining'), value: totals ? formatMoney(totals.remaining) : '—', tone: 'text-rose-700' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground">{card.label}</div>
            <div className={cn('mt-1 text-lg font-black tabular-nums', card.tone)}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search by name or phone')} className="pl-9" aria-label={t('Search by name or phone')} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t('Status')}</Label>
            <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="radiogroup" aria-label={t('Status')}>
              {[ALL, 'paid', 'partial', 'unpaid'].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={status === value}
                  onClick={() => change(setStatus)(value)}
                  className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition', status === value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                >
                  {value === ALL ? t('All') : t(STATE_STYLE[value as PaymentState].label)}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="payments-from" className="text-xs">{t('From')}</Label>
            <Input id="payments-from" type="date" value={from} max={to} onChange={(event) => event.target.value && setRange(event.target.value, to)} className="h-9 w-[150px]" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payments-to" className="text-xs">{t('To')}</Label>
            <Input id="payments-to" type="date" value={to} min={from} onChange={(event) => event.target.value && setRange(from, event.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="flex gap-1.5">
            <Button type="button" size="sm" variant="outline" onClick={() => setRange(`${thisMonth}-01`, lastDayOf(thisMonth))}>{t('This month')}</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setRange(`${lastMonth}-01`, lastDayOf(lastMonth))}>{t('Last month')}</Button>
          </div>
          <div className="min-w-[180px] space-y-1">
            <Label className="text-xs">{t('Teacher')}</Label>
            <Select value={teacherId} onValueChange={(value) => { change(setTeacherId)(value); setClassId(ALL); }}>
              <SelectTrigger className="h-9" aria-label={t('Teacher')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('All teachers')}</SelectItem>
                {teachers.map((teacher) => <SelectItem key={teacher.id} value={String(teacher.id)}>{teacher.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px] space-y-1">
            <Label className="text-xs">{t('Subject')}</Label>
            <Select value={subject} onValueChange={change(setSubject)}>
              <SelectTrigger className="h-9" aria-label={t('Subject')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('All subjects')}</SelectItem>
                {subjects.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px] space-y-1">
            <Label className="text-xs">{t('Group')}</Label>
            <Select value={classId} onValueChange={change(setClassId)}>
              <SelectTrigger className="h-9" aria-label={t('Group')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('All groups')}</SelectItem>
                {visibleClasses.map((cls) => <SelectItem key={cls.id} value={String(cls.id)}>{cls.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>{t('Student')}</TableHead>
              <TableHead>{t('Group')}</TableHead>
              <TableHead>{t('Teacher')}</TableHead>
              <TableHead>{t('Subject')}</TableHead>
              <TableHead className="text-right">{t('Paid')}</TableHead>
              <TableHead className="text-right">{t('Remaining')}</TableHead>
              <TableHead>{t('Last payment')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : !data || data.rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">{t('No students match these filters.')}</TableCell></TableRow>
            ) : data.rows.map((row, index) => {
              const style = STATE_STYLE[row.state];
              return (
                <TableRow key={row.student_id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate(`/students/${row.student_id}/profile`)}>
                  <TableCell className="text-xs text-muted-foreground">{firstRow + index}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{[row.last_name, row.first_name].filter(Boolean).join(' ')}</div>
                    <div className="text-xs text-muted-foreground">{row.parent_phone || row.phone || ''}</div>
                  </TableCell>
                  <TableCell className="text-sm">{row.class_name || '—'}</TableCell>
                  <TableCell className="text-sm">{row.teacher_name || '—'}</TableCell>
                  <TableCell className="text-sm">{row.subject || '—'}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-emerald-700">{formatMoney(row.paid_amount)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-rose-600">{row.remaining > 0 ? formatMoney(row.remaining) : '—'}</TableCell>
                  <TableCell className="text-sm tabular-nums">{formatDay(row.last_payment_date)}</TableCell>
                  <TableCell><span className={cn('rounded-md px-2 py-0.5 text-xs font-bold', style.className)}>{t(style.label)}</span></TableCell>
                  <TableCell className="text-right">
                    {/* Not paid in full: record a payment with the student and what they owe filled in. */}
                    {row.state !== 'paid' && (
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          paymentHook.handleOpenModalForStudent(row.student_id, { amount: row.remaining > 0 ? row.remaining : row.monthly_fee || undefined });
                        }}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> {t("To'lov")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{t('{first}–{last} of {total}', { first: firstRow, last: lastRow, total: data?.total ?? 0 })}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} aria-label={t('Previous page')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular-nums">{t('Page {page} of {pages}', { page, pages })}</span>
          <Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage((current) => current + 1)} aria-label={t('Next page')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <PaymentFormDialog
        open={paymentHook.isModalOpen}
        onOpenChange={(open) => { if (!open) paymentHook.handleCloseModal(); }}
        title={t('Add Payment')}
        description={t('Record a payment without leaving the dashboard.')}
        formData={paymentHook.formData}
        setFormData={paymentHook.setFormData}
        onSubmit={async (event) => {
          await paymentHook.handleSubmit(event);
          setRefresh((value) => value + 1);
        }}
        isSubmitting={paymentHook.state.loading}
        submitLabel="Save payment"
        studentOptions={paymentHook.studentOptions}
        centerOptions={paymentHook.centerOptions}
        isLoadingOptions={paymentHook.isLoadingOptions}
        showStudentSelect
        showCenterSelect={Boolean(paymentHook.centerOptions.length)}
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
        submitDisabled={!paymentHook.formData.student_id}
      />
    </div>
  );
};

export default DashboardPaymentsPage;
