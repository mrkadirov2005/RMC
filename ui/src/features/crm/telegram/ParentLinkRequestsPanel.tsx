import { useEffect, useState } from 'react';
import { Check, Loader2, Users, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/i18n/LanguageContext';
import { showToast } from '@/utils/toast';
import { parentLinkRequestAPI } from './api';

type ParentLinkRequest = {
  request_id: number;
  student_id: number;
  telegram_username?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  child_query?: string | null;
  status: string;
  created_at?: string;
  decided_at?: string | null;
  student_first_name?: string;
  student_last_name?: string;
  student_phone?: string | null;
  saved_parent_name?: string | null;
  saved_parent_phone?: string | null;
  class_name?: string | null;
};

const statusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

/**
 * Parents who asked in the Telegram bot to follow a child whose saved parent phone isn't theirs.
 * The admin checks the request against the child's saved parent details and approves or rejects;
 * the parent gets the answer in the bot.
 */
export const ParentLinkRequestsPanel = () => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<ParentLinkRequest[]>([]);
  const [status, setStatus] = useState('Pending');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await parentLinkRequestAPI.getAll(status === 'All' ? undefined : { status });
      const data = response?.data ?? response;
      setRows(Array.isArray(data) ? data : []);
    } catch {
      // API interceptor shows the backend message.
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const decide = async (row: ParentLinkRequest, action: 'approve' | 'reject') => {
    const childName = [row.student_first_name, row.student_last_name].filter(Boolean).join(' ');
    const question = action === 'approve'
      ? t('Link {parent} as a parent of {child}?', { parent: row.parent_name || row.parent_phone || t('this parent'), child: childName })
      : t('Reject this parent request?');
    if (!window.confirm(question)) return;
    setActionId(row.request_id);
    try {
      if (action === 'approve') {
        await parentLinkRequestAPI.approve(row.request_id);
        showToast.success(t('Parent linked. They were notified in the bot.'));
      } else {
        await parentLinkRequestAPI.reject(row.request_id);
        showToast.success(t('Request rejected. The parent was notified in the bot.'));
      }
      await load();
    } catch {
      // API interceptor shows the backend message.
    } finally {
      setActionId(null);
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            {t('Parent requests')}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Parents whose phone isn't saved on the child asked in the bot to follow them. Compare with the saved parent details before approving.")}
          </p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">{t('Pending')}</SelectItem>
            <SelectItem value="Approved">{t('Approved')}</SelectItem>
            <SelectItem value="Rejected">{t('Rejected')}</SelectItem>
            <SelectItem value="All">{t('All')}</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Requested by')}</TableHead>
              <TableHead>{t('Entered')}</TableHead>
              <TableHead>{t('Child')}</TableHead>
              <TableHead>{t('Saved parent')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead>{t('Created')}</TableHead>
              <TableHead className="text-right">{t('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  {t('No parent requests.')}
                </TableCell>
              </TableRow>
            ) : rows.map((row) => {
              const pending = row.status === 'Pending';
              return (
                <TableRow key={row.request_id}>
                  <TableCell>
                    <div className="font-semibold">{row.parent_name || '-'}</div>
                    <div className="text-xs text-muted-foreground">
                      {[row.parent_phone, row.telegram_username ? `@${row.telegram_username}` : null].filter(Boolean).join(' · ') || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.child_query || '-'}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{[row.student_first_name, row.student_last_name].filter(Boolean).join(' ') || `#${row.student_id}`}</div>
                    <div className="text-xs text-muted-foreground">{[row.class_name, row.student_phone].filter(Boolean).join(' · ') || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <div>{row.saved_parent_name || '-'}</div>
                    <div className="text-xs text-muted-foreground">{row.saved_parent_phone || t('No parent phone saved')}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusTone(row.status)}>{t(row.status)}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{formatDateTime(row.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {pending ? (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" disabled={actionId === row.request_id} onClick={() => decide(row, 'approve')}>
                          {actionId === row.request_id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                          {t('Approve')}
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionId === row.request_id} onClick={() => decide(row, 'reject')}>
                          <X className="mr-1 h-4 w-4" />
                          {t('Reject')}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{formatDateTime(row.decided_at)}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
