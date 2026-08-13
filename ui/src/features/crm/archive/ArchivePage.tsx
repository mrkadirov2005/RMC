import { useEffect, useMemo, useState } from 'react';
import { Archive,  CalendarDays, Loader2, RefreshCcw, RotateCcw, Trash2} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { PaginationBar, defaultPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';
import { archiveAPI } from './api';
import { useLanguage } from '@/i18n/LanguageContext';
import { formatMoney } from '@/utils/helpers';
import { useAppSelector } from '../hooks';
import { formatGroupLabel } from '@/shared/groupLabel';

type ArchivePayload = {
  students: any[];
  teachers: any[];
  classes: any[];
  payments: any[];
  sessions: any[];
  counts: Record<string, number>;
};

const emptyArchive: ArchivePayload = {
  students: [],
  teachers: [],
  classes: [],
  payments: [],
  sessions: [],
  counts: { students: 0, teachers: 0, classes: 0, payments: 0, sessions: 0 },
};

const fullName = (row: any, firstKey = 'first_name', lastKey = 'last_name') =>
  [row?.[firstKey], row?.[lastKey]].filter(Boolean).join(' ').trim() || '-';

const teacherName = (row: any) =>
  [row?.teacher_first_name, row?.teacher_last_name].filter(Boolean).join(' ').trim() || '-';

const formatDate = (value: any) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
};

const EmptyRow = ({ colSpan, label }: { colSpan: number; label: string }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
      {label}
    </TableCell>
  </TableRow>
);

type ArchiveEntity = 'students' | 'teachers' | 'classes' | 'payments' | 'sessions';

const ArchivePage = () => {
  const { t } = useLanguage();
  const { user } = useAppSelector((state) => state.auth);
  const [archive, setArchive] = useState<ArchivePayload>(emptyArchive);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionKey, setActionKey] = useState('');
  const [pages, setPages] = useState<Record<ArchiveEntity, number>>({
    students: 1,
    teachers: 1,
    classes: 1,
    payments: 1,
    sessions: 1,
  });
  const [pageSizes, setPageSizes] = useState<Record<ArchiveEntity, number>>({
    students: 25,
    teachers: 25,
    classes: 25,
    payments: 25,
    sessions: 25,
  });
  const isOwner = (user?.role || '').toLowerCase() === 'owner' || (user?.username || '').toLowerCase() === 'muzaffar';

  const loadArchive = () => {
    let cancelled = false;
    setLoading(true);
    setError('');
    archiveAPI.getAll()
      .then((response) => {
        if (cancelled) return;
        setArchive(response?.data || emptyArchive);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.error || err?.response?.data?.details || t('Failed to load archive.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    return loadArchive();
  }, []);

  const refreshArchive = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await archiveAPI.getAll();
      setArchive(response?.data || emptyArchive);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.details || t('Failed to load archive.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (entity: ArchiveEntity, id: number) => {
    const key = `${entity}:${id}:restore`;
    setActionKey(key);
    setError('');
    try {
      await archiveAPI.restore(entity, id);
      await refreshArchive();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.details || t('Failed to restore record.'));
    } finally {
      setActionKey('');
    }
  };

  const handlePurge = async (entity: ArchiveEntity, id: number) => {
    if (!window.confirm(t('Permanently delete this archived record? This cannot be undone.'))) return;
    const key = `${entity}:${id}:purge`;
    setActionKey(key);
    setError('');
    try {
      await archiveAPI.purge(entity, id);
      await refreshArchive();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.details || t('Failed to permanently delete record.'));
    } finally {
      setActionKey('');
    }
  };

  const rowActions = (entity: ArchiveEntity, id: number) => (
    <div className="flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleRestore(entity, id)}
        disabled={Boolean(actionKey)}
      >
        {actionKey === `${entity}:${id}:restore` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
        {t('Restore')}
      </Button>
      {isOwner && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => handlePurge(entity, id)}
          disabled={Boolean(actionKey)}
        >
          {actionKey === `${entity}:${id}:purge` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          {t('Delete')}
        </Button>
      )}
    </div>
  );
  const paginatedArchive = useMemo(
    () => ({
      students: paginateItems(archive.students, pages.students, pageSizes.students),
      teachers: paginateItems(archive.teachers, pages.teachers, pageSizes.teachers),
      classes: paginateItems(archive.classes, pages.classes, pageSizes.classes),
      payments: paginateItems(archive.payments, pages.payments, pageSizes.payments),
      sessions: paginateItems(archive.sessions, pages.sessions, pageSizes.sessions),
    }),
    [archive, pages, pageSizes]
  );
  const setEntityPage = (entity: ArchiveEntity, page: number) => {
    setPages((current) => ({ ...current, [entity]: page }));
  };
  const setEntityPageSize = (entity: ArchiveEntity, pageSize: number) => {
    setPageSizes((current) => ({ ...current, [entity]: pageSize }));
    setEntityPage(entity, 1);
  };
  const archivePagination = (entity: ArchiveEntity, total: number) => (
    <div className="border-t p-4">
      <PaginationBar
        total={total}
        currentPage={paginatedArchive[entity].currentPage}
        totalPages={paginatedArchive[entity].totalPages}
        start={paginatedArchive[entity].start}
        end={paginatedArchive[entity].end}
        pageSize={pageSizes[entity]}
        pageSizeOptions={defaultPageSizeOptions}
        onPageChange={(page) => setEntityPage(entity, page)}
        onPageSizeChange={(pageSize) => setEntityPageSize(entity, pageSize)}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Archive')}
        description={t('Soft-deleted records across students, teachers, classes, payments, and calendar sessions.')}
        icon={Archive}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={refreshArchive} disabled={loading || Boolean(actionKey)}>
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

     

      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card [&_table]:text-xs [&_th]:text-xs [&_td]:py-2">
        <CardContent className="p-0">
          <Tabs defaultValue="students">
            <TabsList className="h-auto w-full justify-start rounded-none border-b bg-slate-50 p-2 gap-2 dark:bg-muted/40">
              <TabsTrigger value="students" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">{t('Students')}</TabsTrigger>
              <TabsTrigger value="teachers" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md">{t('Teachers')}</TabsTrigger>
              <TabsTrigger value="classes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md">{t('Classes')}</TabsTrigger>
              <TabsTrigger value="payments" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md">{t('Payments')}</TabsTrigger>
              <TabsTrigger value="sessions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md">{t('Calendar Sessions')}</TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Student')}</TableHead>
                    <TableHead>{t('Enrollment')}</TableHead>
                    <TableHead>{t('Group')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Archived At')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archive.students.length === 0 ? <EmptyRow colSpan={6} label={t('No archived students.')} /> : paginatedArchive.students.items.map((student) => (
                    <TableRow key={student.student_id}>
                      <TableCell className="font-medium">{fullName(student)}</TableCell>
                      <TableCell>{student.enrollment_number || '-'}</TableCell>
                      <TableCell>{student.class_name || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{student.status || t('Archived')}</Badge></TableCell>
                      <TableCell>{formatDate(student.deleted_at)}</TableCell>
                      <TableCell>{rowActions('students', Number(student.student_id))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {archivePagination('students', archive.students.length)}
            </TabsContent>

            <TabsContent value="teachers" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Teacher')}</TableHead>
                    <TableHead>{t('Employee ID')}</TableHead>
                    <TableHead>{t('Email')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Archived At')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archive.teachers.length === 0 ? <EmptyRow colSpan={6} label={t('No archived teachers.')} /> : paginatedArchive.teachers.items.map((teacher) => (
                    <TableRow key={teacher.teacher_id}>
                      <TableCell className="font-medium">{fullName(teacher)}</TableCell>
                      <TableCell>{teacher.employee_id || '-'}</TableCell>
                      <TableCell>{teacher.email || '-'}</TableCell>
                      <TableCell><Badge variant="outline">{teacher.status || t('Archived')}</Badge></TableCell>
                      <TableCell>{formatDate(teacher.deleted_at)}</TableCell>
                      <TableCell>{rowActions('teachers', Number(teacher.teacher_id))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {archivePagination('teachers', archive.teachers.length)}
            </TabsContent>

            <TabsContent value="classes" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Group')}</TableHead>
                    <TableHead>{t('Teacher')}</TableHead>
                    <TableHead>{t('Room')}</TableHead>
                    <TableHead>{t('Payment')}</TableHead>
                    <TableHead>{t('Archived At')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archive.classes.length === 0 ? <EmptyRow colSpan={6} label={t('No archived classes.')} /> : paginatedArchive.classes.items.map((cls) => (
                    <TableRow key={cls.class_id}>
                      <TableCell className="font-medium">{formatGroupLabel(cls)}</TableCell>
                      <TableCell>{teacherName(cls)}</TableCell>
                      <TableCell>{cls.room_number || '-'}</TableCell>
                      <TableCell>{formatMoney(Number(cls.payment_amount || 0))}</TableCell>
                      <TableCell>{formatDate(cls.deleted_at)}</TableCell>
                      <TableCell>{rowActions('classes', Number(cls.class_id))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {archivePagination('classes', archive.classes.length)}
            </TabsContent>

            <TabsContent value="payments" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Receipt')}</TableHead>
                    <TableHead>{t('Student')}</TableHead>
                    <TableHead>{t('Amount')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Archived At')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archive.payments.length === 0 ? <EmptyRow colSpan={6} label={t('No archived payments.')} /> : paginatedArchive.payments.items.map((payment) => (
                    <TableRow key={payment.payment_id}>
                      <TableCell className="font-medium">{payment.receipt_number || `#${payment.payment_id}`}</TableCell>
                      <TableCell>{[payment.student_first_name, payment.student_last_name].filter(Boolean).join(' ').trim() || payment.enrollment_number || '-'}</TableCell>
                      <TableCell>{formatMoney(Number(payment.amount || 0))}</TableCell>
                      <TableCell><Badge variant="outline">{payment.payment_status || '-'}</Badge></TableCell>
                      <TableCell>{formatDate(payment.deleted_at)}</TableCell>
                      <TableCell>{rowActions('payments', Number(payment.payment_id))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {archivePagination('payments', archive.payments.length)}
            </TabsContent>

            <TabsContent value="sessions" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Group')}</TableHead>
                    <TableHead>{t('Teacher')}</TableHead>
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Archived At')}</TableHead>
                    <TableHead className="text-right">{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archive.sessions.length === 0 ? <EmptyRow colSpan={6} label={t('No archived calendar sessions.')} /> : paginatedArchive.sessions.items.map((session) => (
                    <TableRow key={session.session_id}>
                      <TableCell className="font-medium">{formatDate(session.session_date)}</TableCell>
                      <TableCell>{session.class_name || '-'}</TableCell>
                      <TableCell>{teacherName(session)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {session.start_time || '-'}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(session.deleted_at)}</TableCell>
                      <TableCell>{rowActions('sessions', Number(session.session_id))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {archivePagination('sessions', archive.sessions.length)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchivePage;
