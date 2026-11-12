// Qarzlar -> by month: every student who has not fully paid for the chosen month (or months),
// with their contacts, group, teacher and how much is still owed. Uses the same payment rules as
// To'lovlar (each month at that month's group price, prorated for transfers and late starts).

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Phone, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { paymentAPI } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatMoney } from '@/utils/helpers';
import { debtShortcuts, monthKeyOf, monthRange } from './debtMonths';

type DebtRow = {
  student_id: number;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  parent_phone: string | null;
  class_name: string | null;
  teacher_name: string | null;
  expected: number;
  paid_amount: number;
  remaining: number;
  last_payment_date: string | null;
  state: 'paid' | 'partial' | 'unpaid';
};

type Summary = { total: number; rows: DebtRow[]; totals: { partial_students: number; unpaid_students: number; remaining: number } };

const DebtsByMonth = () => {
  const { t } = useLanguage();
  const thisMonth = monthKeyOf(new Date());
  const [from, setFrom] = useState(thisMonth);
  const [to, setTo] = useState(thisMonth);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const shortcuts = useMemo(() => debtShortcuts(new Date()), []);

  useEffect(() => {
    const timer = window.setTimeout(() => { setQuery(draft.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    paymentAPI.getStudentsSummary({ ...monthRange(from, to), status: 'debt', q: query || undefined, page })
      .then((res) => { if (!cancelled) setData(getApiPayload<Summary>(res)); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, query, page]);

  const pages = Math.max(1, Math.ceil(Number(data?.total || 0) / 100));
  const debtors = Number(data?.totals?.partial_students || 0) + Number(data?.totals?.unpaid_students || 0);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle>{t('Unpaid by month')}</CardTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {shortcuts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setFrom(item.from); setTo(item.to); setPage(1); }}
                className={cn('rounded-full border px-3 py-1 text-xs font-semibold',
                  from === item.from && to === item.to ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="debt-from" className="text-xs">{t('From month')}</Label>
            <Input id="debt-from" type="month" value={from} onChange={(event) => { if (event.target.value) { setFrom(event.target.value); setPage(1); } }} className="h-8 w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="debt-to" className="text-xs">{t('To month')}</Label>
            <Input id="debt-to" type="month" value={to} onChange={(event) => { if (event.target.value) { setTo(event.target.value); setPage(1); } }} className="h-8 w-40" />
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label={t('Search')} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t('Name, phone or group')} className="h-8 pl-8 text-xs" />
          </div>
        </div>
        {data && (
          <div className="flex flex-wrap gap-4 text-sm">
            <span><b className="tabular-nums">{debtors}</b> {t('students still owe')}</span>
            <span className="text-muted-foreground">{t('Not paid at all')}: <b className="tabular-nums text-rose-600">{Number(data.totals.unpaid_students || 0)}</b></span>
            <span className="text-muted-foreground">{t('Part paid')}: <b className="tabular-nums text-amber-600">{Number(data.totals.partial_students || 0)}</b></span>
            <span className="text-muted-foreground">{t('Owed in total')}: <b className="tabular-nums text-foreground">{formatMoney(Number(data.totals.remaining || 0))}</b></span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading && !data ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !data || data.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('Everyone has paid for these months.')}</p>
        ) : (
          <div className={cn('overflow-x-auto rounded-lg border', loading && 'opacity-60')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Student')}</TableHead>
                  <TableHead>{t('Phone')}</TableHead>
                  <TableHead>{t('Group')}</TableHead>
                  <TableHead>{t('Teacher')}</TableHead>
                  <TableHead className="text-right">{t('Expected')}</TableHead>
                  <TableHead className="text-right">{t('Paid')}</TableHead>
                  <TableHead className="text-right">{t('Owed')}</TableHead>
                  <TableHead>{t('Last payment')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={`${row.student_id}-${row.class_name}`}>
                    <TableCell className="font-semibold">
                      {[row.first_name, row.last_name].filter(Boolean).join(' ') || `#${row.student_id}`}
                      <span className={cn('ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold',
                        row.state === 'unpaid' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300')}>
                        {t(row.state === 'unpaid' ? 'Not paid' : 'Part paid')}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {row.phone && <div className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{row.phone}</div>}
                      {row.parent_phone && <div className="text-muted-foreground">{t('Parent')}: {row.parent_phone}</div>}
                    </TableCell>
                    <TableCell>{row.class_name || '—'}</TableCell>
                    <TableCell>{row.teacher_name || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(Number(row.expected || 0))}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(Number(row.paid_amount || 0))}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-rose-600">{formatMoney(Number(row.remaining || 0))}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{row.last_payment_date ? String(row.last_payment_date).slice(0, 10) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {pages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('Previous')}</button>
            <span className="tabular-nums">{page} / {pages}</span>
            <button type="button" className="rounded border px-2 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t('Next')}</button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DebtsByMonth;
