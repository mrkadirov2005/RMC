// Page component for the teachers screen in the crm feature.

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, GraduationCap, User, X, Loader2, Search, Users, Award, ShieldCheck, MoreVertical } from 'lucide-react';
import { useTeachersPage } from './hooks/useTeachersPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Teacher } from './types';
import { teacherAPI } from '@/shared/api/api';
import { useAppDispatch } from '../hooks';
import { patchTeacher } from '@/slices/teachersSlice';

const UsernameField = ({
  teacher,
  onSave,
}: {
  teacher: Teacher;
  onSave: (teacher: Teacher, username: string) => Promise<void> | void;
}) => {
  const [value, setValue] = useState(teacher.username || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(teacher.username || '');
  }, [teacher.username]);

  const save = async () => {
    const next = value.trim();
    const current = String(teacher.username || '').trim();
    if (next === current || saving) return;

    setSaving(true);
    try {
      await onSave(teacher, next);
    } catch {
      setValue(current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[220px]">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            setValue(teacher.username || '');
            event.currentTarget.blur();
          }
        }}
        disabled={saving}
        placeholder="username"
        className="h-8 bg-white/80 text-sm dark:bg-background"
      />
      {saving && <p className="mt-1 text-xs text-muted-foreground">Saving...</p>}
    </div>
  );
};

// Renders the teachers page screen.
const TeachersPage = () => {
  const dispatch = useAppDispatch();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const {
    navigate,
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    centerOptions,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    getInitials,
    genderOptions,
    teacherStatusOptions,
    isOwner,
  } = useTeachersPage();
  const filteredTeachers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return state.items;

    return state.items.filter((teacher) =>
      [
        `${teacher.first_name || ''} ${teacher.last_name || ''}`,
        teacher.first_name,
        teacher.last_name,
        teacher.employee_id,
        teacher.specialization,
        teacher.qualification,
        teacher.email,
        teacher.phone,
        teacher.username,
        teacher.status,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [searchTerm, state.items]);
  const activeTeachers = filteredTeachers.filter((teacher) => String(teacher.status || '').toLowerCase() === 'active').length;
  const specializations = new Set(
    filteredTeachers.map((teacher) => String(teacher.specialization || '').trim()).filter(Boolean)
  ).size;
  const qualifiedTeachers = filteredTeachers.filter((teacher) => String(teacher.qualification || '').trim()).length;
  const summaryCards = [
    {
      label: 'Teachers shown',
      value: filteredTeachers.length.toLocaleString(),
      detail: `${activeTeachers.toLocaleString()} active`,
      icon: Users,
      shell: 'from-indigo-50 via-white to-sky-50 border-indigo-100',
      iconShell: 'from-indigo-500 to-sky-500',
      text: 'text-indigo-950',
    },
    {
      label: 'Specializations',
      value: specializations.toLocaleString(),
      detail: 'Across current view',
      icon: GraduationCap,
      shell: 'from-emerald-50 via-white to-teal-50 border-emerald-100',
      iconShell: 'from-emerald-500 to-teal-500',
      text: 'text-emerald-950',
    },
    {
      label: 'Qualified',
      value: qualifiedTeachers.toLocaleString(),
      detail: 'With qualification',
      icon: Award,
      shell: 'from-amber-50 via-white to-orange-50 border-amber-100',
      iconShell: 'from-amber-500 to-orange-500',
      text: 'text-amber-950',
    },
    {
      label: 'Status health',
      value: filteredTeachers.length > 0 ? `${Math.round((activeTeachers / filteredTeachers.length) * 100)}%` : '0%',
      detail: 'Active ratio',
      icon: ShieldCheck,
      shell: 'from-cyan-50 via-white to-fuchsia-50 border-cyan-100',
      iconShell: 'from-cyan-500 to-fuchsia-500',
      text: 'text-slate-950',
    },
  ];
  const renderTeacherActions = (teacher: Teacher) => (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-muted"
            aria-label="Open teacher actions"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => navigate(`/teacher/${teacher.teacher_id || teacher.id}`)} className="gap-2">
            <Eye className="h-4 w-4 text-cyan-600" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenModal(teacher)} className="gap-2">
            <Pencil className="h-4 w-4 text-blue-500" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDelete(teacher.teacher_id || teacher.id || 0)}
            className="gap-2 text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
  const handleUsernameUpdate = async (teacher: Teacher, username: string) => {
    const id = teacher.teacher_id || teacher.id;
    if (!id) throw new Error('Teacher ID is missing.');
    dispatch(patchTeacher({ id, changes: { username } }));
    try {
      const response = await teacherAPI.update(id, { username });
      const updated = (response as any).data ?? response;
      dispatch(patchTeacher({ id, changes: { username: updated?.username ?? username } }));
    } catch (error) {
      dispatch(patchTeacher({ id, changes: { username: teacher.username } }));
      throw error;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-emerald-50/55 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-72 bg-gradient-to-l from-fuchsia-100/45 via-amber-100/35 to-transparent dark:hidden" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-900/10 dark:shadow-none">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-foreground">
                Teachers Management
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage instructors, specializations, access, and profile details in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} className="border-white/80 bg-white/80 shadow-sm dark:border-border dark:bg-background dark:shadow-none" />
            <Button
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-6 py-3 rounded-lg font-semibold shadow-lg shadow-indigo-900/10 dark:shadow-none"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Teacher
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-lg border bg-gradient-to-br ${card.shell} p-4 shadow-sm dark:border-border dark:bg-card dark:bg-none dark:shadow-none`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{card.label}</p>
                    <p className={`mt-1 text-2xl font-bold ${card.text} dark:text-card-foreground`}>{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.iconShell} text-white shadow-md shadow-slate-900/10 dark:shadow-none`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-sky-100 bg-gradient-to-r from-white via-sky-50/60 to-emerald-50/40 p-3 shadow-sm dark:border-border dark:bg-card dark:bg-none dark:shadow-none">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search teachers by name, ID, subject, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-white/80 bg-white/90 pl-10 pr-10 shadow-sm dark:border-input dark:bg-background dark:shadow-none"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {state.loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : state.items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-16 h-16 mx-auto opacity-30 mb-4" />
          <h3 className="text-lg font-semibold">No teachers found</h3>
          <p className="text-sm">Click &quot;Add Teacher&quot; to get started</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-16 h-16 mx-auto opacity-30 mb-4" />
          <h3 className="text-lg font-semibold">No teachers match your search</h3>
          <p className="text-sm">Try a different name, ID, email, or specialization</p>
        </div>
      ) : viewMode === 'list' ? (
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
          <Table>
            <TableHeader className="bg-slate-50/90 dark:bg-transparent">
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Username</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.teacher_id || teacher.id} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      className="text-left font-semibold text-slate-950 hover:text-sky-700 dark:text-card-foreground dark:hover:text-primary"
                      onClick={() => navigate(`/teacher/${teacher.teacher_id || teacher.id}`)}
                    >
                      {teacher.first_name} {teacher.last_name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <UsernameField teacher={teacher} onSave={handleUsernameUpdate} />
                  </TableCell>
                  <TableCell className="text-right">
                    {renderTeacherActions(teacher)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : viewMode === 'compact' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTeachers.map((teacher) => (
            <Card
              key={teacher.teacher_id || teacher.id}
              className="cursor-pointer overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:bg-card dark:hover:translate-y-0"
              onClick={() => navigate(`/teacher/${teacher.teacher_id || teacher.id}`)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-sky-100 text-sm font-bold text-indigo-700 dark:bg-primary/10 dark:bg-none dark:text-primary">
                    {getInitials(teacher.first_name, teacher.last_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{teacher.first_name} {teacher.last_name}</p>
                    <div className="mt-2">
                      <UsernameField teacher={teacher} onSave={handleUsernameUpdate} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredTeachers.map((teacher, index) => (
            <Card
              key={teacher.teacher_id || teacher.id}
              className="h-full flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/15 dark:border-border/60 dark:bg-card"
            >
              <div className={cn(
                'p-6 flex flex-col items-center relative text-white',
                index % 4 === 0 && 'bg-gradient-to-br from-indigo-500 to-sky-500',
                index % 4 === 1 && 'bg-gradient-to-br from-emerald-500 to-teal-500',
                index % 4 === 2 && 'bg-gradient-to-br from-amber-500 to-orange-500',
                index % 4 === 3 && 'bg-gradient-to-br from-cyan-500 to-fuchsia-500'
              )}>
                <div className="w-20 h-20 rounded-full bg-white/20 border-[3px] border-white/40 flex items-center justify-center text-white text-xl font-bold mb-2">
                  {getInitials(teacher.first_name, teacher.last_name)}
                </div>
                <h3 className="text-white font-semibold text-lg text-center">
                  {teacher.first_name} {teacher.last_name}
                </h3>
              </div>

              <CardContent className="flex-grow p-5">
                <p className="text-center font-semibold text-slate-950 dark:text-card-foreground">
                  {teacher.first_name} {teacher.last_name}
                </p>
                <div className="mx-auto mt-3 flex justify-center">
                  <UsernameField teacher={teacher} onSave={handleUsernameUpdate} />
                </div>
              </CardContent>

              <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 p-4 dark:border-border/10 dark:bg-muted/50">
                {renderTeacherActions(teacher)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-br from-indigo-500 to-violet-500 px-6 py-4">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-white font-semibold text-lg">
                {editingId ? 'Edit Teacher' : 'Add New Teacher'}
              </DialogTitle>
              <button onClick={handleCloseModal} className="text-white hover:text-white/80 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" required value={formData.first_name || ''} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" required value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input id="employee_id" required value={formData.employee_id || ''} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" required value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" type="date" required value={formData.date_of_birth || ''} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input id="qualification" required value={formData.qualification || ''} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input id="specialization" required value={formData.specialization || ''} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender || 'Male'} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{genderOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status || 'Active'} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{teacherStatusOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {isOwner && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="center">Center</Label>
                    <Select value={String(formData.center_id || '')} onValueChange={(val) => setFormData({ ...formData, center_id: Number(val) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{centerOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" required value={formData.username || ''} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                </div>
                {!editingId && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" required value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter className="px-6 py-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="rounded-lg">
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading} className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-lg px-8">
                {state.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersPage;
