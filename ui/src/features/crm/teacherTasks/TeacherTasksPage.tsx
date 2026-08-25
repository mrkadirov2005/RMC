import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCheck, ClipboardCheck, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionPanel } from '@/components/common/SectionPanel';
import { PaginationBar, paginateItems, defaultPageSizeOptions } from '@/components/common/PaginationBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { superuserAPI } from '../../../shared/api/api';
import { fetchTeachers } from '../../../slices/teachersSlice';
import { selectTeacherOptions } from '../../../store/selectors';
import {
  createTeacherTask,
  deleteTeacherTask,
  fetchTeacherTasksForce,
  fetchTeacherTaskStats,
  selectTeacherTasks,
  selectTeacherTasksLoading,
  selectTeacherTaskStats,
  updateTeacherTask,
  updateTeacherTaskStatus,
  type TeacherTask,
} from '../../../slices/teacherTasksSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import { useLanguage } from '../../../i18n/LanguageContext';

interface AdminOption {
  id: number;
  value: number;
  label: string;
}

const emptyForm = {
  assignee_type: 'teacher' as 'teacher' | 'admin',
  teacher_id: '',
  admin_id: '',
  task_title: '',
  task_definition: '',
  deadline: '',
};

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

const TeacherTasksPage = () => {
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectTeacherTasks);
  const loading = useAppSelector(selectTeacherTasksLoading);
  const teacherOptions = useAppSelector(selectTeacherOptions);
  const stats = useAppSelector(selectTeacherTaskStats);
  const currentUser = useAppSelector((state: any) => state.auth?.user);

  const isOwner = currentUser?.userType === 'superuser' && String(currentUser?.role || '').toLowerCase() === 'owner';
  const isAdminOnly = currentUser?.userType === 'superuser' && !isOwner;

  const [adminOptions, setAdminOptions] = useState<AdminOption[]>([]);
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
    dispatch(fetchTeacherTaskStats());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await superuserAPI.getAll();
        const rows = Array.isArray(response) ? response : (response as any).data || [];
        if (cancelled) return;
        const options: AdminOption[] = rows
          .filter((row: any) => String(row.role || '').toLowerCase() !== 'owner')
          .map((row: any) => {
            const id = Number(row.superuser_id ?? row.id);
            const firstName = String(row.first_name || '').trim();
            const lastName = String(row.last_name || '').trim();
            const label = [firstName, lastName].filter(Boolean).join(' ').trim() || row.username || `Admin #${id}`;
            return { id, value: id, label };
          })
          .filter((opt: AdminOption) => Number.isFinite(opt.id));
        setAdminOptions(options);
      } catch {
        if (!cancelled) setAdminOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const teacherNameById = useMemo(() => {
    const map = new Map<number, string>();
    teacherOptions.forEach((opt) => map.set(Number(opt.value), opt.label));
    return map;
  }, [teacherOptions]);

  const adminNameById = useMemo(() => {
    const map = new Map<number, string>();
    adminOptions.forEach((opt) => map.set(Number(opt.value), opt.label));
    return map;
  }, [adminOptions]);

  const assigneeName = (task: TeacherTask) => {
    if (task.assignee_type === 'admin') {
      return adminNameById.get(Number(task.admin_id)) || `#${task.admin_id}`;
    }
    return teacherNameById.get(Number(task.teacher_id)) || `#${task.teacher_id}`;
  };

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (!query) return true;
      const name = assigneeName(task) || '';
      return (
        task.task_title.toLowerCase().includes(query) ||
        (task.task_definition || '').toLowerCase().includes(query) ||
        name.toLowerCase().includes(query)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, search, teacherNameById, adminNameById]);

  const { items: pagedTasks, currentPage, totalPages, start, end } = paginateItems(filteredTasks, page, pageSize);

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (task: TeacherTask) => {
    setEditingId(Number(task.task_id || task.id));
    setForm({
      assignee_type: task.assignee_type,
      teacher_id: task.teacher_id ? String(task.teacher_id) : '',
      admin_id: task.admin_id ? String(task.admin_id) : '',
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

  const isFormValid = form.task_title.trim() && (form.assignee_type === 'teacher' ? form.teacher_id : form.admin_id);

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setSubmitting(true);
    const payload: Record<string, any> = {
      assignee_type: form.assignee_type,
      task_title: form.task_title.trim(),
      task_definition: form.task_definition.trim() || undefined,
      deadline: form.deadline || undefined,
    };
    if (form.assignee_type === 'teacher') {
      payload.teacher_id = Number(form.teacher_id);
    } else {
      payload.admin_id = Number(form.admin_id);
    }
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
      <PageHeader
        title={t('Teacher Tasks')}
        description={t('Assign tasks to teachers and admins and track their progress.')}
        icon={ClipboardCheck}
        primaryAction={
          isOwner ? (
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('Add Assignment')}
            </Button>
          ) : undefined
        }
      />

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
                  <TableHead>{t('Assignee')}</TableHead>
                  <TableHead>{t('Title')}</TableHead>
                  <TableHead>{t('Deadline')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Created')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedTasks.map((task) => {
                  const id = Number(task.task_id || task.id);
                  const overdue = dayKey(task.deadline) && dayKey(task.deadline) < todayKey() && task.status !== 'done';
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{assigneeName(task)}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{task.task_title}</div>
                        {task.task_definition && (
                          <div className="max-w-md truncate text-xs text-muted-foreground">{task.task_definition}</div>
                        )}
                      </TableCell>
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
                        {isOwner ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(task)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => handleDelete(task)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : isAdminOnly ? (
                          <>
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
                          </>
                        ) : null}
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

      {isOwner && (
        <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? t('Edit Assignment') : t('Add Assignment')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{t('Assignee Type')}</Label>
                <Select
                  value={form.assignee_type}
                  onValueChange={(val) => setForm((f) => ({ ...f, assignee_type: val as 'teacher' | 'admin', teacher_id: '', admin_id: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select Assignee Type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">{t('Teacher')}</SelectItem>
                    <SelectItem value="admin">{t('Admin')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.assignee_type === 'teacher' ? (
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
              ) : (
                <div className="space-y-1">
                  <Label>{t('Admin')}</Label>
                  <Select value={form.admin_id} onValueChange={(val) => setForm((f) => ({ ...f, admin_id: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select Admin')} />
                    </SelectTrigger>
                    <SelectContent>
                      {adminOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  placeholder={t('Describe what needs to be done')}
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
              <Button onClick={handleSubmit} disabled={submitting || !isFormValid}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? t('Save') : t('Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TeacherTasksPage;
