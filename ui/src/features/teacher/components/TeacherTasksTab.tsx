// Tab component for the teacher feature.

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import { PieChart } from '@/shared/components/PieChart';
import { BarChart } from '@/shared/components/BarChart';
import { fetchTeacherTasks, selectTeacherTasks, selectTeacherTasksLoading } from '../../../slices/teacherTasksSlice';
import { useAppDispatch, useAppSelector } from '../../crm/hooks';
import { useLanguage } from '../../../i18n/LanguageContext';

interface TeacherTasksTabProps {
  teacherId?: number;
}

const dayKey = (value?: string) => (value ? String(value).slice(0, 10) : '');
const todayKey = () => new Date().toISOString().slice(0, 10);

const TeacherTasksTab = ({ teacherId }: TeacherTasksTabProps) => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectTeacherTasks);
  const loading = useAppSelector(selectTeacherTasksLoading);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSizeOptions[0]);

  useEffect(() => {
    if (teacherId) dispatch(fetchTeacherTasks({ teacher_id: Number(teacherId) }));
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

  const stats = useMemo(() => {
    const today = todayKey();
    let overdue = 0;
    let dueSoon = 0;
    let upcoming = 0;
    const soonCutoff = new Date();
    soonCutoff.setDate(soonCutoff.getDate() + 3);
    const soonKey = soonCutoff.toISOString().slice(0, 10);

    tasks.forEach((task) => {
      const deadline = dayKey(task.deadline);
      if (!deadline) { upcoming += 1; return; }
      if (deadline < today) overdue += 1;
      else if (deadline <= soonKey) dueSoon += 1;
      else upcoming += 1;
    });

    return { total: tasks.length, overdue, dueSoon, upcoming };
  }, [tasks]);

  const pieData = useMemo(() => [
    { label: t('Overdue'), value: stats.overdue, color: '#ef4444' },
    { label: t('Due soon'), value: stats.dueSoon, color: '#f59e0b' },
    { label: t('Upcoming'), value: stats.upcoming, color: '#10b981' },
  ], [stats, t]);

  const weeklyBarData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: 4 }, (_, index) => {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() + index * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return { start: weekStart, end: weekEnd, count: 0 };
    });
    tasks.forEach((task) => {
      const deadline = task.deadline ? new Date(task.deadline) : null;
      if (!deadline || Number.isNaN(deadline.getTime())) return;
      const bucket = buckets.find((b) => deadline >= b.start && deadline <= b.end);
      if (bucket) bucket.count += 1;
    });
    return buckets.map((bucket, index) => ({
      label: `${t('Week')} ${index + 1}`,
      value: bucket.count,
      color: '#6366f1',
    }));
  }, [tasks, t]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('Total')}</p>
          <p className="text-base font-black">{stats.total}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('Overdue')}</p>
          <p className="text-base font-black text-rose-600">{stats.overdue}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('Due soon')}</p>
          <p className="text-base font-black text-amber-600">{stats.dueSoon}</p>
        </div>
        <div className="flex items-center justify-between rounded-md border bg-card px-2.5 py-2 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground">{t('Upcoming')}</p>
          <p className="text-base font-black text-emerald-600">{stats.upcoming}</p>
        </div>
      </div>

      <SectionPanel>
        <div className="grid gap-6 xl:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-bold">{t('Tasks by status')}</h3>
            <div className="flex items-center gap-6">
              <PieChart data={pieData} size={160} strokeWidth={22} />
              <div className="flex flex-col gap-2">
                {pieData.map((slice) => (
                  <div key={slice.label} className="flex items-center gap-2 text-xs font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
                    {slice.label} · {slice.value}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold">{t('Upcoming deadlines (next 4 weeks)')}</h3>
            <BarChart data={weeklyBarData} height={150} />
          </div>
        </div>
      </SectionPanel>

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
                  <TableHead>{t('Assigned on')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTasks.map((task) => {
                  const id = Number(task.task_id || task.id);
                  const overdue = dayKey(task.deadline) && dayKey(task.deadline) < todayKey();
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-semibold">{task.task_title}</TableCell>
                      <TableCell className="max-w-md text-xs text-muted-foreground">{task.task_definition || '-'}</TableCell>
                      <TableCell className={overdue ? 'font-bold text-rose-600' : ''}>
                        {dayKey(task.deadline) || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.created_at ? new Date(task.created_at).toLocaleDateString() : '-'}
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
