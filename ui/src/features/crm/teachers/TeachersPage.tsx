// Page component for the teachers screen in the crm feature.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, GraduationCap, User, X, Loader2, Search, Users, Award, ShieldCheck, MoreVertical, Upload, KeyRound } from 'lucide-react';
import { useTeachersPage } from './hooks/useTeachersPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { PageToolbar } from '@/components/common/PageToolbar';
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
import { dataAPI, teacherAPI } from '@/shared/api/api';
import { showToast } from '@/utils/toast';

const buildTeacherUsername = (value: string) => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  if (!cleaned) return '';
  return cleaned.length >= 3 ? cleaned : cleaned.padEnd(3, '0');
};

const PasswordField = ({
  teacher,
  onSave,
}: {
  teacher: Teacher;
  onSave: (teacher: Teacher, password: string) => Promise<void> | void;
}) => {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue('');
  }, [teacher.teacher_id, teacher.id]);

  const save = async () => {
    const next = value.trim();
    if (!next || saving) return;

    setSaving(true);
    try {
      await onSave(teacher, next);
      setValue('');
    } catch {
      setValue('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[240px]">
      <div className="relative">
        <KeyRound className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') {
              setValue('');
              event.currentTarget.blur();
            }
          }}
          disabled={saving}
          placeholder="New password"
          className="h-8 bg-white/80 pl-8 text-sm dark:bg-background"
        />
      </div>
      {saving && <p className="mt-1 text-xs text-muted-foreground">Saving...</p>}
    </div>
  );
};

// Renders the teachers page screen.
const TeachersPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<number>>(new Set());
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
    refresh,
    getInitials,
    genderOptions,
    teacherStatusOptions,
    isOwner,
    user,
  } = useTeachersPage();
  const canImportTeachers = isOwner || user?.userType === 'superuser';
  const getTeacherId = (teacher: Teacher) => Number(teacher.teacher_id || teacher.id || 0);
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
  const visibleTeacherIds = filteredTeachers.map(getTeacherId).filter((id) => id > 0);
  const selectedVisibleTeacherCount = visibleTeacherIds.filter((id) => selectedTeacherIds.has(id)).length;
  const allVisibleTeachersSelected = visibleTeacherIds.length > 0 && selectedVisibleTeacherCount === visibleTeacherIds.length;
  const toggleTeacher = (id: number, checked: boolean) => {
    setSelectedTeacherIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleAllVisibleTeachers = (checked: boolean) => {
    setSelectedTeacherIds((current) => {
      const next = new Set(current);
      for (const id of visibleTeacherIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };
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
      tone: 'blue' as const,
    },
    {
      label: 'Specializations',
      value: specializations.toLocaleString(),
      detail: 'Across current view',
      icon: GraduationCap,
      tone: 'green' as const,
    },
    {
      label: 'Qualified',
      value: qualifiedTeachers.toLocaleString(),
      detail: 'With qualification',
      icon: Award,
      tone: 'amber' as const,
    },
    {
      label: 'Status health',
      value: filteredTeachers.length > 0 ? `${Math.round((activeTeachers / filteredTeachers.length) * 100)}%` : '0%',
      detail: 'Active ratio',
      icon: ShieldCheck,
      tone: 'neutral' as const,
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
  const handlePasswordUpdate = async (teacher: Teacher, password: string) => {
    const id = teacher.teacher_id || teacher.id;
    if (!id) throw new Error('Teacher ID is missing.');
    const username = String(teacher.username || '').trim();
    if (!username) {
      showToast.error('Teacher username is required before setting a password.');
      throw new Error('Teacher username is missing.');
    }

    try {
      await teacherAPI.setPassword(id, { username, password });
    } catch (error: any) {
      showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to update password.');
      throw error;
    }
  };
  const handleImportTeachers = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast.error('Please choose a CSV file.');
      return;
    }

    try {
      setIsImporting(true);
      const csv = await file.text();
      await dataAPI.importEntity('teachers', csv);
      await refresh();
    } catch (error: any) {
      showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to import teachers.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const handleBulkDeleteTeachers = async () => {
    const ids = Array.from(selectedTeacherIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected teacher${ids.length === 1 ? '' : 's'}?`)) return;

    let failed = 0;
    for (const id of ids) {
      try {
        await teacherAPI.delete(id);
      } catch {
        failed += 1;
      }
    }
    await refresh();
    setSelectedTeacherIds(new Set());
    if (failed > 0) {
      showToast.error(`Deleted ${ids.length - failed}; ${failed} failed.`);
    } else {
      showToast.success(`Deleted ${ids.length} teacher${ids.length === 1 ? '' : 's'}.`);
    }
  };
  const handleFirstNameChange = (value: string) => {
    setFormData((current) => {
      if (editingId) return { ...current, first_name: value };

      const previousAutoUsername = buildTeacherUsername(String(current.first_name || ''));
      const currentUsername = String(current.username || '').trim();
      const shouldUpdateUsername = !currentUsername || currentUsername === previousAutoUsername;
      return {
        ...current,
        first_name: value,
        username: shouldUpdateUsername ? buildTeacherUsername(value) : current.username,
      };
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description="Manage instructors, specializations, access, and profile details in one place."
        icon={GraduationCap}
        actions={
          <>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            {canImportTeachers && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => handleImportTeachers(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  {isImporting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
                  {isImporting ? 'Importing...' : 'Import CSV'}
                </Button>
              </>
            )}
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-5 h-5 mr-2" />
              Add Teacher
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <PageToolbar>
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
      </PageToolbar>

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
          {selectedTeacherIds.size > 0 && (
            <div className="flex items-center justify-between border-b bg-sky-50/70 px-4 py-2 text-sm dark:bg-muted/50">
              <span className="font-medium">{selectedTeacherIds.size} selected</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleBulkDeleteTeachers}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedTeacherIds(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          <Table>
            <TableHeader className="bg-slate-50/90 dark:bg-transparent">
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleTeachersSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = selectedVisibleTeacherCount > 0 && !allVisibleTeachersSelected;
                    }}
                    onChange={(event) => toggleAllVisibleTeachers(event.target.checked)}
                    aria-label="Select all visible teachers"
                    className="h-4 w-4"
                  />
                </TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Password</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.teacher_id || teacher.id} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedTeacherIds.has(getTeacherId(teacher))}
                      onChange={(event) => toggleTeacher(getTeacherId(teacher), event.target.checked)}
                      aria-label={`Select ${teacher.first_name} ${teacher.last_name}`}
                      className="h-4 w-4"
                    />
                  </TableCell>
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
                    <PasswordField teacher={teacher} onSave={handlePasswordUpdate} />
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
        <>
          {selectedTeacherIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm shadow-sm dark:border-border dark:bg-card">
              <span className="font-medium">{selectedTeacherIds.size} selected</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleBulkDeleteTeachers}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedTeacherIds(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredTeachers.map((teacher) => (
              <Card
                key={teacher.teacher_id || teacher.id}
                className="relative cursor-pointer overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:bg-card dark:hover:translate-y-0"
                onClick={() => navigate(`/teacher/${teacher.teacher_id || teacher.id}`)}
              >
                <div className="absolute right-3 top-3 z-10" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedTeacherIds.has(getTeacherId(teacher))}
                    onChange={(event) => toggleTeacher(getTeacherId(teacher), event.target.checked)}
                    aria-label={`Select ${teacher.first_name} ${teacher.last_name}`}
                    className="h-4 w-4"
                  />
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-sky-100 text-sm font-bold text-indigo-700 dark:bg-primary/10 dark:bg-none dark:text-primary">
                      {getInitials(teacher.first_name, teacher.last_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{teacher.first_name} {teacher.last_name}</p>
                      <div className="mt-2">
                        <PasswordField teacher={teacher} onSave={handlePasswordUpdate} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {selectedTeacherIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm shadow-sm dark:border-border dark:bg-card">
              <span className="font-medium">{selectedTeacherIds.size} selected</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleBulkDeleteTeachers}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedTeacherIds(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredTeachers.map((teacher, index) => (
              <Card
                key={teacher.teacher_id || teacher.id}
                className="relative h-full flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/15 dark:border-border/60 dark:bg-card"
              >
                <div className="absolute right-3 top-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedTeacherIds.has(getTeacherId(teacher))}
                    onChange={(event) => toggleTeacher(getTeacherId(teacher), event.target.checked)}
                    aria-label={`Select ${teacher.first_name} ${teacher.last_name}`}
                    className="h-4 w-4"
                  />
                </div>
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
                    <PasswordField teacher={teacher} onSave={handlePasswordUpdate} />
                  </div>
                </CardContent>

                <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 p-4 dark:border-border/10 dark:bg-muted/50">
                  {renderTeacherActions(teacher)}
                </div>
              </Card>
            ))}
          </div>
        </>
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
                  <Input id="first_name" required value={formData.first_name || ''} onChange={(e) => handleFirstNameChange(e.target.value)} />
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
