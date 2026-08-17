import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import { PaginationBar, paginateItems, defaultPageSizeOptions } from '@/components/common/PaginationBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PieChart } from '@/shared/components/PieChart';
import { BarChart } from '@/shared/components/BarChart';
import { fetchTeachers } from '../../../slices/teachersSlice';
import { selectTeacherOptions } from '../../../store/selectors';
import {
  createTeacherTask,
  deleteTeacherTask,
  fetchTeacherTasksForce,
  selectTeacherTasks,
  selectTeacherTasksLoading,
  updateTeacherTask,
  type TeacherTask,
} from '../../../slices/teacherTasksSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import { useLanguage } from '../../../i18n/LanguageContext';

const palette = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899'];

const emptyForm = { teacher_id: '', task_title: '', task_definition: '', deadline: '' };

const dayKey = (value?: string) => (value ? String(value).slice(0, 10) : '');
const todayKey = () => new Date().toISOString().slice(0, 10);

const TeacherTasksPage = () => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectTeacherTasks);
  const loading = useAppSelector(selectTeacherTasksLoading);
  const teacherOptions = useAppSelector(selectTeacherOptions);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSizeOptions[0]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchTeachers());
    dispatch(fetchTeacherTasksForce());
  }, [dispatch]);

  const teacherNameById = useMemo(() => {
    const map = new Map<number, string>();
    teacherOptions.forEach((opt) => map.set(Number(opt.value), opt.label));
    return map;
  }, [teacherOptions]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (!query) return true;
      const teacherName = teacherNameById.get(Number(task.teacher_id)) || '';
      return (
        task.task_title.toLowerCase().includes(query) ||
        (task.task_definition || '').toLowerCase().includes(query) ||
        teacherName.toLowerCase().includes(query)
      );
    });
  }, [tasks, search, teacherNameById]);

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

  const barData = useMemo(() => {
    const counts = new Map<number, number>();
    tasks.forEach((task) => counts.set(Number(task.teacher_id), (counts.get(Number(task.teacher_id)) || 0) + 1));
    return Array.from(counts.entries())
      .map(([teacherId, count], index) => ({
        label: teacherNameById.get(teacherId) || `#${teacherId}`,
        value: count,
        color: palette[index % palette.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [tasks, teacherNameById]);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (task: TeacherTask) => {
    setEditingId(Number(task.task_id || task.id));
    setForm({
      teacher_id: String(task.teacher_id || ''),
      task_title: task.task_title || '',
      task_definition: task.task_definition || '',
      deadline: dayKey(task.deadline),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.teacher_id || !form.task_title.trim()) return;
    setSubmitting(true);
    const payload = {
      teacher_id: Number(form.teacher_id),
      task_title: form.task_title.trim(),
      task_definition: form.task_definition.trim() || undefined,
      deadline: form.deadline || undefined,
    };
    if (editingId) {
      await dispatch(updateTeacherTask({ id: editingId, data: payload }));
    } else {
      await dispatch(createTeacherTask(payload));
    }
    setSubmitting(false);
    closeDialog();
  };

  const handleDelete = async (task: TeacherTask) => {
    const id = Number(task.task_id || task.id);
    if (!id || !window.confirm(t('Delete this task?'))) return;
    await dispatch(deleteTeacherTask(id));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('Teacher Tasks')}
        description={t('Assign tasks to teachers and track their deadlines.')}
        icon={ClipboardCheck}
        primaryAction={
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('New Task')}
          </Button>
        }
      />

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
            <h3 className="mb-3 text-sm font-bold">{t('Tasks per teacher')}</h3>
            <BarChart data={barData} height={150} />
          </div>
        </div>
      </SectionPanel>

      <SectionPanel contentClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h3 className="text-sm font-bold">{t('All tasks')} ({filteredTasks.length})</h3>
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
          <div className="py-10 text-center text-sm text-muted-foreground">{t('No tasks yet.')}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Teacher')}</TableHead>
                  <TableHead>{t('Title')}</TableHead>
                  <TableHead>{t('Deadline')}</TableHead>
                  <TableHead>{t('Created')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTasks.map((task) => {
                  const id = Number(task.task_id || task.id);
                  const overdue = dayKey(task.deadline) && dayKey(task.deadline) < todayKey();
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{teacherNameById.get(Number(task.teacher_id)) || `#${task.teacher_id}`}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{task.task_title}</div>
                        {task.task_definition && (
                          <div className="max-w-md truncate text-xs text-muted-foreground">{task.task_definition}</div>
                        )}
                      </TableCell>
                      <TableCell className={overdue ? 'font-bold text-rose-600' : ''}>
                        {dayKey(task.deadline) || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {task.created_at ? new Date(task.created_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(task)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDelete(task)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? t('Edit Task') : t('New Task')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('Teacher')}</Label>
              <Select value={form.teacher_id} onValueChange={(val) => setForm((f) => ({ ...f, teacher_id: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Select Teacher')} />
                </SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((opt) => (
                    <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('Task Title')}</Label>
              <Input
                value={form.task_title}
                onChange={(e) => setForm((f) => ({ ...f, task_title: e.target.value }))}
                placeholder={t('e.g. Submit monthly progress report')}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('Task Definition')}</Label>
              <Textarea
                value={form.task_definition}
                onChange={(e) => setForm((f) => ({ ...f, task_definition: e.target.value }))}
                placeholder={t('Describe what the teacher needs to do')}
                rows={4}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('Deadline')}</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>{t('Cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.teacher_id || !form.task_title.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? t('Save') : t('Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherTasksPage;
