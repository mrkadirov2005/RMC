// Owner → SMS: every message sent to parents (payment notices from admins, missed lessons from
// teachers), whether the phone is connected, and a test message. 50 per page, with filters.
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, MessageSquareText, RotateCcw, Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { getErrorMessage } from '@/utils/errorMessage';
import { showToast } from '@/utils/toast';
import { useLanguage } from '@/i18n/LanguageContext';
import { ownerManagerApi, smsAPI } from './api';

const ALL = 'all';

interface SmsStatus {
  configured: boolean;
  daily_limit: number;
  sent_today: number;
  queued: number;
  send_from_hour: number;
  send_to_hour: number;
}

interface SmsRow {
  sms_id: number;
  kind: string;
  phone: string;
  text: string;
  status: string;
  error: string | null;
  created_at: string;
  sent_at: string | null;
  center_name: string | null;
  class_name: string | null;
  student_name: string | null;
  created_by_type: string | null;
  sender_name: string | null;
}

interface SmsList {
  page: number;
  limit: number;
  total: number;
  by_status: Record<string, number>;
  rows: SmsRow[];
}

const KIND_LABELS: Record<string, string> = {
  payment_success: 'Payment received',
  payment_waiting: 'Payment waiting',
  attendance: 'Missed lessons',
  test: 'Test',
};

const KIND_STYLES: Record<string, string> = {
  payment_success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  payment_waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  attendance: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  test: 'bg-muted text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  delivered: 'Delivered',
  sent: 'Sent',
  queued: 'Waiting',
  sending: 'Sending',
  failed: 'Failed',
  expired: 'Expired',
};

const STATUS_STYLES: Record<string, string> = {
  delivered: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  sent: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  queued: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  sending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  failed: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  expired: 'bg-muted text-muted-foreground',
};

const formatTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const OwnerSmsPage = () => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<SmsStatus | null>(null);
  const [centers, setCenters] = useState<Array<{ id: number; name: string }>>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [kind, setKind] = useState(ALL);
  const [state, setState] = useState(ALL);
  const [sender, setSender] = useState(ALL);
  const [centerId, setCenterId] = useState(ALL);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; data: SmsList | null } | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    smsAPI.getStatus().then((response) => setStatus(getApiPayload<SmsStatus>(response))).catch(() => setStatus(null));
    ownerManagerApi.centers.getAll().then((response) => setCenters(unwrapApiRows<any>(response)
      .map((row) => ({ id: Number(row.center_id || row.id), name: String(row.center_name || row.name || '') }))
      .filter((row) => row.id > 0))).catch(() => null);
  }, [refresh]);

  // Typing waits a moment before searching.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const params = {
    page,
    from: from || undefined,
    to: to || undefined,
    kind: kind === ALL ? undefined : kind,
    status: state === ALL ? undefined : state,
    sender_type: sender === ALL ? undefined : sender,
    center_id: centerId === ALL ? undefined : centerId,
    q: query || undefined,
  };
  const requestKey = JSON.stringify({ ...params, refresh });

  useEffect(() => {
    let cancelled = false;
    smsAPI
      .getMessages((({ refresh: _refresh, ...filters }) => filters)(JSON.parse(requestKey)))
      .then((response) => { if (!cancelled) setResult({ key: requestKey, data: getApiPayload<SmsList>(response) }); })
      .catch(() => { if (!cancelled) setResult({ key: requestKey, data: null }); });
    return () => { cancelled = true; };
  }, [requestKey]);

  const loading = result?.key !== requestKey;
  const data = result?.data ?? null;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const change = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };
  const reset = () => {
    setFrom('');
    setTo('');
    setKind(ALL);
    setState(ALL);
    setSender(ALL);
    setCenterId(ALL);
    setSearch('');
    setPage(1);
  };

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const out = getApiPayload<{ sending_now?: boolean }>(await smsAPI.sendTest(testPhone.trim()));
      showToast.success(out?.sending_now === false
        ? t('Test SMS queued; it goes out at {hour}:00.', { hour: status?.send_from_hour ?? 8 })
        : t('Test SMS queued; it should arrive within a minute.'));
      setRefresh((value) => value + 1);
    } catch (error) {
      showToast.error(getErrorMessage(error) || t("Couldn't send the test SMS"));
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm"><MessageSquareText className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-black">{t('SMS')}</h1>
            <p className="text-sm text-muted-foreground">{t('Every SMS sent to parents: payment notices from admins and missed lessons from teachers.')}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="mr-1.5 h-4 w-4" /> {t('Reset filters')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: t('SMS phone'),
            value: status ? (status.configured ? t('Connected') : t('Not connected')) : '—',
            tone: status?.configured ? 'text-emerald-600' : 'text-rose-600',
          },
          { label: t('Sent today'), value: status ? `${status.sent_today} / ${status.daily_limit}` : '—', tone: 'text-slate-900 dark:text-white' },
          { label: t('Waiting to send'), value: status ? String(status.queued) : '—', tone: 'text-amber-600' },
          { label: t('Sending hours'), value: status ? `${status.send_from_hour}:00–${status.send_to_hour}:00` : '—', tone: 'text-slate-900 dark:text-white' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-3 shadow-sm">
            <div className="text-xs font-semibold text-muted-foreground">{card.label}</div>
            <div className={cn('mt-1 text-lg font-black tabular-nums', card.tone)}>{card.value}</div>
          </div>
        ))}
      </div>

      {status && !status.configured && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {t('The SMS phone is not connected yet, so no SMS are sent.')}
        </p>
      )}

      {status?.configured && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3 shadow-sm">
          <div className="min-w-[220px] flex-1 space-y-1">
            <Label htmlFor="sms-test-phone" className="text-xs">{t('Send a test SMS')}</Label>
            <Input id="sms-test-phone" type="tel" inputMode="tel" placeholder="+998 90 123 45 67" value={testPhone} onChange={(event) => setTestPhone(event.target.value)} className="h-9" />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={sendingTest || !testPhone.trim()}>
            {sendingTest ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            {t('Send')}
          </Button>
        </div>
      )}

      <div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search by student, phone or sender')} className="pl-9" aria-label={t('Search by student, phone or sender')} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="sms-from" className="text-xs">{t('From')}</Label>
            <Input id="sms-from" type="date" value={from} max={to || undefined} onChange={(event) => change(setFrom)(event.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sms-to" className="text-xs">{t('To')}</Label>
            <Input id="sms-to" type="date" value={to} min={from || undefined} onChange={(event) => change(setTo)(event.target.value)} className="h-9 w-[150px]" />
          </div>
          <div className="min-w-[170px] space-y-1">
            <Label className="text-xs">{t('Type')}</Label>
            <Select value={kind} onValueChange={change(setKind)}>
              <SelectTrigger className="h-9" aria-label={t('Type')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('All types')}</SelectItem>
                <SelectItem value="payment">{t('All payment SMS')}</SelectItem>
                {Object.entries(KIND_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{t(label)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px] space-y-1">
            <Label className="text-xs">{t('Status')}</Label>
            <Select value={state} onValueChange={change(setState)}>
              <SelectTrigger className="h-9" aria-label={t('Status')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('All')}</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{t(label)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px] space-y-1">
            <Label className="text-xs">{t('Sent by')}</Label>
            <Select value={sender} onValueChange={change(setSender)}>
              <SelectTrigger className="h-9" aria-label={t('Sent by')}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('Everyone')}</SelectItem>
                <SelectItem value="superuser">{t('Admins')}</SelectItem>
                <SelectItem value="teacher">{t('Teachers')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {centers.length > 1 && (
            <div className="min-w-[170px] space-y-1">
              <Label className="text-xs">{t('Branch')}</Label>
              <Select value={centerId} onValueChange={change(setCenterId)}>
                <SelectTrigger className="h-9" aria-label={t('Branch')}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('All branches')}</SelectItem>
                  {centers.map((center) => <SelectItem key={center.id} value={String(center.id)}>{center.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {data && Object.keys(data.by_status).length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(data.by_status).map(([value, count]) => (
              <span key={value} data-keep-bg className={cn('rounded-md px-2 py-0.5 font-semibold', STATUS_STYLES[value])}>
                {t(STATUS_LABELS[value] || value)}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Time')}</TableHead>
              <TableHead>{t('Student')}</TableHead>
              <TableHead>{t('Type')}</TableHead>
              <TableHead className="min-w-[280px]">{t('Message')}</TableHead>
              <TableHead>{t('Sent by')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : !data || data.rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">{t('No SMS match these filters.')}</TableCell></TableRow>
            ) : data.rows.map((row) => (
              <TableRow key={row.sms_id} className="align-top">
                <TableCell className="whitespace-nowrap text-xs tabular-nums">{formatTime(row.created_at)}</TableCell>
                <TableCell>
                  <div className="font-semibold">{row.student_name || '—'}</div>
                  <div className="text-xs text-muted-foreground">{[row.class_name, row.center_name].filter(Boolean).join(' · ')}</div>
                  <div className="text-xs tabular-nums text-muted-foreground">{row.phone}</div>
                </TableCell>
                <TableCell>
                  <span data-keep-bg className={cn('whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold', KIND_STYLES[row.kind])}>{t(KIND_LABELS[row.kind] || row.kind)}</span>
                </TableCell>
                <TableCell className="whitespace-pre-line break-words text-sm text-muted-foreground">{row.text}</TableCell>
                <TableCell className="text-sm">
                  <div>{row.sender_name || '—'}</div>
                  <div className="text-xs text-muted-foreground">{row.created_by_type === 'teacher' ? t('Teacher') : row.created_by_type === 'superuser' ? t('Admin') : ''}</div>
                </TableCell>
                <TableCell>
                  <span data-keep-bg className={cn('whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold', STATUS_STYLES[row.status])}>{t(STATUS_LABELS[row.status] || row.status)}</span>
                  {row.status === 'failed' && row.error && <div className="mt-1 max-w-[220px] break-words text-xs text-rose-600 dark:text-rose-300">{row.error}</div>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{t('{count} SMS', { count: data?.total ?? 0 })}</span>
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
    </div>
  );
};

export default OwnerSmsPage;
