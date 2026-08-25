// Tab component for the teacher feature.

import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PaginationBar, paginateItems, defaultPageSizeOptions } from '@/components/common/PaginationBar';
import { SectionPanel } from '@/components/common/SectionPanel';
import {
  fetchTeacherTasks,
  fetchTeacherTaskStats,
  selectTeacherTasks,
  selectTeacherTasksLoading,
  selectTeacherTaskStats,
  updateTeacherTaskStatus,
  type TeacherTask,
} from '../../../slices/teacherTasksSlice';
import { useAppDispatch, useAppSelector } from '../../crm/hooks';
import { useLanguage } from '../../../i18n/LanguageContext';

interface TeacherTasksTabProps {
  teacherId?: number;
}

const dayKey = (value?: string) => (value ? String(value).slice(0, 10) : '');
const todayKey = () => new Date().toISOString().slice(0, 10);

const statusVariant = (status?: string): 'success' | 'warning' | 'info' | 'destructive' | 'default' => {
  switch (status) {
    case 'done':
      return 'success';
    case 'accepted':
      return 'info';
    case 'rejected':
      return 'destructive';
    case 'pending':
    default:
      return 'warning';
  }
};

const TeacherTasksTab = ({ teacherId }: TeacherTasksTabProps) => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectTeacherTasks);
  const loading = useAppSelector(selectTeacherTasksLoading);
  const stats = useAppSelector(selectTeacherTaskStats);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSizeOptions[0]);

  useEffect(() => {
    if (teacherId) {
      dispatch(fetchTeacherTasks({ teacher_id: Number(teacherId) }));
      dispatch(fetchTeacherTaskStats({ teacher_id: Number(teacherId) }));
    }
  }, [dispatch, teacherId]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tasks;
    return tasks.filter((task) =>
      task.task_title.toLowerCase().includes(query) ||
      (task.task_definition || '').toLowerCase().includes(query)
    );
  }, [tasks, search]);

  const { items: pagedTasks, currentPage, totalPages, start, end } = paginateItems(filteredTasks, page, pageSize);

  const handleAccept = async (task: TeacherTask) => {
    const id = Number(task.task_id || task.id);
    if (!id) return;
    await dispatch(updateTeacherTaskStatus({ id, action: 'accept' }));
  };

  const handleReject = async (task: TeacherTask) => {
    const id = Number(task.task_id || task.id);
    if (!id) return;
    const reason = window.prompt(t('Reason for rejecting this task'));
    if (!reason || !reason.trim()) return;
    await dispatch(updateTeacherTaskStatus({ id, action: 'reject', reason: reason.trim() }));
  };

  const handleMarkDone = async (task: TeacherTask) => {
    const id = Number(task.task_id || task.id);
    if (!id) return;
    await dispatch(updateTeacherTaskStatus({ id, action: 'done' }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('Done')}</p>
          <p className="text-base font-black text-emerald-600">{stats?.done ?? 0}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('Rejected')}</p>
          <p className="text-base font-black text-rose-600">{stats?.rejected ?? 0}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('Accepted')}</p>
          <p className="text-base font-black text-cyan-600">{stats?.accepted ?? 0}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('Pending')}</p>
          <p className="text-base font-black text-amber-600">{stats?.pending ?? 0}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('Efficiency')}</p>
          <p className="text-base font-black text-primary">{(stats?.efficiency ?? 0).toFixed(1)}%</p>
        </div>
      </div>

      <SectionPanel contentClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h3 className="text-sm font-bold">{t('Tasks from owner')} ({filteredTasks.length})</h3>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('Search tasks...')}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{t('No tasks assigned yet.')}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Title')}</TableHead>
                  <TableHead>{t('Definition')}</TableHead>
                  <TableHead>{t('Deadline')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Assigned on')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTasks.map((task) => {
                  const id = Number(task.task_id || task.id);
                  const overdue = dayKey(task.deadline) && dayKey(task.deadline) < todayKey() && task.status !== 'done';
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-semibold">{task.task_title}</TableCell>
                      <TableCell className="max-w-md text-xs text-muted-foreground">{task.task_definition || '-'}</TableCell>
                      <TableCell className={overdue ? 'font-bold text-rose-600' : ''}>
                        {dayKey(task.deadline) || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(task.status)}>{t(task.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.created_at ? new Date(task.created_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {task.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleAccept(task)} title={t('Accept')}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleReject(task)} title={t('Reject')}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {task.status === 'accepted' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleMarkDone(task)} title={t('Mark Done')}>
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="p-4">
          <PaginationBar
            total={filteredTasks.length}
            currentPage={currentPage}
            totalPages={totalPages}
            start={start}
            end={end}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          />
        </div>
      </SectionPanel>
    </div>
  );
};

export default TeacherTasksTab;
