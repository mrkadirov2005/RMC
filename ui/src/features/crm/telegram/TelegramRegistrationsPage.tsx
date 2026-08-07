import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Loader2, MessageCircle, RefreshCcw, Search, UserPlus, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { PaginationBar, defaultPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';
import { telegramRegistrationAPI, classAPI, teacherAPI } from './api';
import { useLanguage } from '@/i18n/LanguageContext';
import { showToast } from '@/utils/toast';
import { formatGroupLabel } from '@/shared/groupLabel';

type TelegramRegistration = {
  registration_id: number;
  telegram_user_id: string;
  telegram_chat_id: string;
  telegram_username?: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_phone?: string;
  gender?: string;
  username?: string;
  school_name?: string;
  school_class?: string;
  center_id?: number;
  class_label?: string;
  status: string;
  converted_student_id?: number;
  converted_enrollment_number?: string;
  created_at?: string;
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const statusTone = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'imported') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
};

const TelegramRegistrationsPage = () => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<TelegramRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [actionId, setActionId] = useState<number | null>(null);
  const [assignDialogId, setAssignDialogId] = useState<number | null>(null);
  const [assignClassId, setAssignClassId] = useState('');
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    const toRows = (res: any) => {
      const data = res?.data ?? res;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    };
    classAPI.getAll({ page: 1, limit: 100 }).then((res: any) => setClasses(toRows(res))).catch(() => {});
    teacherAPI.getAll({ page: 1, limit: 100 }).then((res: any) => setTeachers(toRows(res))).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await telegramRegistrationAPI.getAll(status === 'All' ? undefined : { status });
      const data = response?.data ?? response;
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.details || t('Failed to load Telegram registrations.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [
        row.first_name,
        row.last_name,
        row.phone,
        row.parent_name,
        row.parent_phone,
        row.username,
        row.telegram_username,
        row.school_name,
        row.school_class,
        row.converted_enrollment_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, search]);
  const paginatedRows = useMemo(
    () => paginateItems(filteredRows, page, pageSize),
    [filteredRows, page, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const key = String(row.status || 'Pending').toLowerCase();
        if (key === 'imported') acc.imported += 1;
        else if (key === 'rejected') acc.rejected += 1;
        else acc.pending += 1;
        return acc;
      },
      { pending: 0, imported: 0, rejected: 0 }
    );
  }, [rows]);

  const openAssignDialog = (id: number) => {
    setAssignDialogId(id);
    setAssignClassId('');
    setAssignTeacherId('');
  };

  const handleConvert = async () => {
    if (!assignDialogId) return;
    setActionId(assignDialogId);
    setAssignDialogId(null);
    try {
      await telegramRegistrationAPI.convert(assignDialogId, {
        class_id: assignClassId ? Number(assignClassId) : undefined,
        teacher_id: assignTeacherId ? Number(assignTeacherId) : undefined,
      });
      showToast.success(t('Telegram registration moved into students.'));
      await load();
    } catch {
      // API interceptor shows the backend message.
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm(t('Reject this Telegram registration?'))) return;
    setActionId(id);
    try {
      await telegramRegistrationAPI.reject(id);
      showToast.success(t('Telegram registration rejected.'));
      await load();
    } catch {
      // API interceptor shows the backend message.
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Telegram Registrations')}
        description={t('Review student registrations sent from the Telegram bot and move approved records into Students.')}
        icon={MessageCircle}
        actions={
          <Button type="button" variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('Refresh')}
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('Visible')} value={rows.length.toLocaleString()} detail={t('Current status filter')} icon={MessageCircle} tone="neutral" />
        <MetricCard label={t('Pending')} value={counts.pending.toLocaleString()} detail={t('Waiting for action')} icon={UserPlus} tone="amber" />
        <MetricCard label={t('Imported')} value={counts.imported.toLocaleString()} detail={t('Moved into students')} icon={CheckCircle} tone="green" />
        <MetricCard label={t('Rejected')} value={counts.rejected.toLocaleString()} detail={t('Declined requests')} icon={XCircle} tone="neutral" />
      </div>

      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('Search by name, phone, username, school...')}
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Imported">Imported</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="All">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Student')}</TableHead>
              <TableHead>{t('Contact')}</TableHead>
              <TableHead>{t('Parent')}</TableHead>
              <TableHead>{t('School')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead>{t('Created')}</TableHead>
              <TableHead className="text-right">{t('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
                  {t('Loading registrations...')}
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {t('No Telegram registrations found.')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.items.map((row) => {
                const imported = String(row.status || '').toLowerCase() === 'imported';
                const rejected = String(row.status || '').toLowerCase() === 'rejected';
                return (
                  <TableRow key={row.registration_id}>
                    <TableCell>
                      <div className="font-semibold">{row.first_name} {row.last_name}</div>
                      <div className="text-xs text-muted-foreground">@{row.telegram_username || row.username || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div>{row.phone || '-'}</div>
                      <div className="text-xs text-muted-foreground">{row.gender || '-'} {row.date_of_birth ? `• ${formatDate(row.date_of_birth)}` : ''}</div>
                    </TableCell>
                    <TableCell>
                      <div>{row.parent_name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{row.parent_phone || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <div>{row.school_name || '-'}</div>
                      <div className="text-xs text-muted-foreground">{row.school_class || '-'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusTone(row.status || 'Pending')}>
                        {row.status || 'Pending'}
                      </Badge>
                      {row.converted_enrollment_number && (
                        <div className="mt-1 text-xs text-muted-foreground">{row.converted_enrollment_number}</div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:from-blue-600 hover:to-indigo-700 border-0"
                          onClick={() => openAssignDialog(row.registration_id)}
                          disabled={imported || rejected || actionId === row.registration_id}
                        >
                          {actionId === row.registration_id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                          {t('Move to Students')}
                        </Button>
                        {!imported && !rejected && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(row.registration_id)}
                            disabled={actionId === row.registration_id}
                          >
                            {t('Reject')}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <PaginationBar
        total={filteredRows.length}
        currentPage={paginatedRows.currentPage}
        totalPages={paginatedRows.totalPages}
        start={paginatedRows.start}
        end={paginatedRows.end}
        pageSize={pageSize}
        pageSizeOptions={defaultPageSizeOptions}
        onPageChange={setPage}
        onPageSizeChange={(nextPageSize) => {
          setPageSize(nextPageSize);
          setPage(1);
        }}
      />

      <Dialog open={assignDialogId !== null} onOpenChange={(open) => { if (!open) setAssignDialogId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Assign to Group & Teacher')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Group (Class)')}</Label>
              <Select value={assignClassId} onValueChange={setAssignClassId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select a group (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls: any) => (
                    <SelectItem key={cls.class_id} value={String(cls.class_id)}>
                      {formatGroupLabel(cls)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('Teacher')}</Label>
              <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select a teacher (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.teacher_id} value={String(t.teacher_id)}>
                      {[t.first_name, t.last_name].filter(Boolean).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogId(null)}>{t('Cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0" onClick={handleConvert}>
              <UserPlus className="mr-2 h-4 w-4" /> {t('Confirm & Move')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TelegramRegistrationsPage;
