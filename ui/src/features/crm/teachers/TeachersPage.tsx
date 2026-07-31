// Page component for the teachers screen in the crm feature.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, GraduationCap, User, X, Loader2, Search, Users, Award, ShieldCheck, Upload, Download } from 'lucide-react';
import { useTeachersPage } from './hooks/useTeachersPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { PageToolbar } from '@/components/common/PageToolbar';
import { Input } from '@/components/ui/input';
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
import { showToast } from '@/utils/toast';
import { exportCsvEntity } from '@/shared/dataCsv';
import { useLanguage } from '@/i18n/LanguageContext';
import { PaginationBar, defaultCardPageSizeOptions } from '@/components/common/PaginationBar';
import { getPaginatedRowNumber } from '@/components/common/pagination';
import { useListSelection } from '@/components/common/useListSelection';
import { teachersApi } from './api/teachersApi';

const buildTeacherUsername = (value: string) => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  if (!cleaned) return '';
  return cleaned.length >= 3 ? cleaned : cleaned.padEnd(3, '0');
};

const headerActionClass = 'h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white shadow-sm';
const headerActionIconClass = 'h-3.5 w-3.5';
const teacherToneClasses = [
  'bg-sky-600 hover:bg-sky-700',
  'bg-emerald-600 hover:bg-emerald-700',
  'bg-amber-500 hover:bg-amber-600',
  'bg-fuchsia-600 hover:bg-fuchsia-700',
  'bg-rose-600 hover:bg-rose-700',
  'bg-cyan-600 hover:bg-cyan-700',
];
const getTeacherTone = (index: number) => teacherToneClasses[index % teacherToneClasses.length];
const getTeacherSubtitle = (teacher: Teacher) => {
  const specialization = String(teacher.specialization || '').trim();
  if (specialization) return specialization;
  const qualification = String(teacher.qualification || '').trim();
  if (qualification) return qualification;
  const username = String(teacher.username || '').trim();
  return username ? `@${username}` : 'Teacher';
};

// Renders the teachers page screen.
const TeachersPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLanguage();
  const teacherParams = useMemo(() => ({
    q: debouncedSearchTerm.trim() || undefined,
    page,
    limit: pageSize,
  }), [debouncedSearchTerm, page, pageSize]);
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
  } = useTeachersPage(teacherParams);
  const canImportTeachers = isOwner || user?.userType === 'superuser';
  const getTeacherId = (teacher: Teacher) => Number(teacher.teacher_id || teacher.id || 0);
  const getTeacherProfilePath = (teacher: Teacher) => `/teachers/${getTeacherId(teacher)}/profile`;
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => window.clearTimeout(timeout);
  }, [searchTerm]);
  const visibleTeachers = state.items;
  const totalTeachers = Number(state.meta?.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalTeachers / pageSize));
  const pageStart = totalTeachers === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(totalTeachers, page * pageSize);
  const {
    selectedIds: selectedTeacherIds,
    selectedVisibleCount: selectedVisibleTeacherCount,
    allVisibleSelected: allVisibleTeachersSelected,
    toggle: toggleTeacher,
    toggleAllVisible: toggleAllVisibleTeachers,
    clear: clearTeacherSelection,
  } = useListSelection(visibleTeachers, getTeacherId);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, viewMode]);
  const activeTeachers = visibleTeachers.filter((teacher) => String(teacher.status || '').toLowerCase() === 'active').length;
  const specializations = new Set(
    visibleTeachers.map((teacher) => String(teacher.specialization || '').trim()).filter(Boolean)
  ).size;
  const qualifiedTeachers = visibleTeachers.filter((teacher) => String(teacher.qualification || '').trim()).length;
  const summaryCards = [
    {
      label: 'Teachers shown',
      value: totalTeachers.toLocaleString(),
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
      value: visibleTeachers.length > 0 ? `${Math.round((activeTeachers / visibleTeachers.length) * 100)}%` : '0%',
      detail: 'Current page active ratio',
      icon: ShieldCheck,
      tone: 'neutral' as const,
    },
  ];
  const renderTeacherActions = (teacher: Teacher) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button type="button" size="sm" className="h-7 gap-1 bg-cyan-600 px-2 text-xs text-white hover:bg-cyan-700" onClick={() => navigate(getTeacherProfilePath(teacher))}>
        <Eye className="h-3.5 w-3.5" />
        Profile
      </Button>
      <Button type="button" size="sm" className="h-7 gap-1 bg-blue-600 px-2 text-xs text-white hover:bg-blue-700" onClick={() => handleOpenModal(teacher)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-7 gap-1 bg-rose-600 px-2 text-xs text-white hover:bg-rose-700"
        onClick={() => handleDelete(teacher.teacher_id || teacher.id || 0)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );
  const handleImportTeachers = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast.error('Please choose a CSV file.');
      return;
    }

    try {
      setIsImporting(true);
      const csv = await file.text();
      await teachersApi.importCsv(csv);
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
        await teachersApi.deleteTeacher(id);
      } catch {
        failed += 1;
      }
    }
    await refresh();
    clearTeacherSelection();
    if (failed > 0) {
      showToast.error(`Deleted ${ids.length - failed}; ${failed} failed.`);
    } else {
      showToast.success(`Deleted ${ids.length} teacher${ids.length === 1 ? '' : 's'}.`);
    }
  };
  const handleExportTeachers = () => exportCsvEntity('teachers', 'Teachers');
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
    <div className="space-y-4">
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
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className={`${headerActionClass} bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:text-white`}
                >
                  {isImporting ? <Loader2 className={`${headerActionIconClass} animate-spin`} /> : <Upload className={headerActionIconClass} />}
                  {isImporting ? t('Importing...') : t('Import CSV')}
                </Button>
                <Button type="button" size="sm" className={`${headerActionClass} bg-emerald-600 hover:bg-emerald-700`} onClick={handleExportTeachers}>
                  <Download className={headerActionIconClass} />
                  {t('Export CSV')}
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => handleOpenModal()} className={`${headerActionClass} bg-rose-600 hover:bg-rose-700`}>
              <Plus className={headerActionIconClass} />
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
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search teachers by name, ID, subject, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 border-white/80 bg-white/90 pl-8 pr-8 text-xs shadow-sm dark:border-input dark:bg-background dark:shadow-none"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-3.5 w-3.5" />
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
      ) : visibleTeachers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-16 h-16 mx-auto opacity-30 mb-4" />
          <h3 className="text-lg font-semibold">No teachers match your search</h3>
          <p className="text-sm">Try a different name, ID, email, or specialization</p>
        </div>
      ) : viewMode === 'list' ? (
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
          {selectedTeacherIds.size > 0 && (
            <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2 text-xs dark:bg-muted/50">
              <span className="font-semibold">{selectedTeacherIds.size} selected</span>
              <div className="flex items-center gap-1.5">
                <Button type="button" size="sm" className="h-7 gap-1 bg-rose-600 px-2 text-xs text-white hover:bg-rose-700" onClick={handleBulkDeleteTeachers}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                <Button type="button" size="sm" className="h-7 bg-slate-700 px-2 text-xs text-white hover:bg-slate-800" onClick={clearTeacherSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          <Table className="text-xs">
            <TableHeader className="bg-slate-50/90 dark:bg-transparent">
              <TableRow>
                <TableHead className="h-8 w-10 px-2">
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
                <TableHead className="h-8 w-12 px-2">#</TableHead>
                <TableHead className="h-8 px-2">Teacher</TableHead>
                <TableHead className="h-8 px-2 text-right">Students</TableHead>
                <TableHead className="h-8 px-2 text-right">Share</TableHead>
                <TableHead className="h-8 px-2 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTeachers.map((teacher, index) => {
                return (
                  <TableRow key={teacher.teacher_id || teacher.id} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                    <TableCell className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedTeacherIds.has(getTeacherId(teacher))}
                        onChange={(event) => toggleTeacher(getTeacherId(teacher), event.target.checked)}
                        aria-label={`Select ${teacher.first_name} ${teacher.last_name}`}
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell className="px-2 py-2 font-semibold tabular-nums text-muted-foreground">
                      {getPaginatedRowNumber(index, page, pageSize)}
                    </TableCell>
                    <TableCell className="px-2 py-2 font-medium">
                      <div className="flex min-w-0 items-center gap-2">
                        <button type="button" className={`${getTeacherTone(index)} flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm`} onClick={() => navigate(getTeacherProfilePath(teacher))}>
                          {getInitials(teacher.first_name, teacher.last_name)}
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            className="truncate text-left text-sm font-semibold text-slate-950 hover:text-sky-700 dark:text-card-foreground dark:hover:text-primary"
                            onClick={() => navigate(getTeacherProfilePath(teacher))}
                          >
                            {teacher.first_name} {teacher.last_name}
                          </button>
                          {teacher.username && <p className="truncate text-[11px] text-muted-foreground">@{teacher.username}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right">
                      <span className="inline-flex rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm">{Number(teacher.student_count || 0)}</span>
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right">
                      <span className="inline-flex rounded-md bg-fuchsia-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
                        {Number(teacher.salary_percentage ?? 50)}%
                      </span>
                    </TableCell>
                    <TableCell className="px-2 py-2 text-right">
                      {renderTeacherActions(teacher)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : viewMode === 'compact' ? (
        <>
          {selectedTeacherIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-border dark:bg-card">
              <span className="font-semibold">{selectedTeacherIds.size} selected</span>
              <div className="flex items-center gap-1.5">
                <Button type="button" size="sm" className="h-7 gap-1 bg-rose-600 px-2 text-xs text-white hover:bg-rose-700" onClick={handleBulkDeleteTeachers}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                <Button type="button" size="sm" className="h-7 bg-slate-700 px-2 text-xs text-white hover:bg-slate-800" onClick={clearTeacherSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleTeachers.map((teacher, index) => (
              <Card
                key={teacher.teacher_id || teacher.id}
                className="relative cursor-pointer overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-border dark:bg-card"
                onClick={() => navigate(getTeacherProfilePath(teacher))}
              >
                <span className="absolute left-3 top-3 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-900/80 px-1.5 text-[10px] font-bold text-white">
                  {getPaginatedRowNumber(index, page, pageSize)}
                </span>
                <div className="absolute right-3 top-3 z-10" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedTeacherIds.has(getTeacherId(teacher))}
                    onChange={(event) => toggleTeacher(getTeacherId(teacher), event.target.checked)}
                    aria-label={`Select ${teacher.first_name} ${teacher.last_name}`}
                    className="h-4 w-4"
                  />
                </div>
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`${getTeacherTone(index)} flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white shadow-sm`}>
                      {getInitials(teacher.first_name, teacher.last_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{teacher.first_name} {teacher.last_name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {getTeacherSubtitle(teacher)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                    <span className="rounded-md bg-emerald-600 px-2 py-1 font-semibold text-white">{Number(teacher.student_count || 0)} students</span>
                    <span className="rounded-md bg-fuchsia-600 px-2 py-1 font-semibold text-white">{Number(teacher.salary_percentage ?? 50)}%</span>
                  </div>
                  <div className="mt-2 border-t pt-2" onClick={(event) => event.stopPropagation()}>
                    {renderTeacherActions(teacher)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {selectedTeacherIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-border dark:bg-card">
              <span className="font-semibold">{selectedTeacherIds.size} selected</span>
              <div className="flex items-center gap-1.5">
                <Button type="button" size="sm" className="h-7 gap-1 bg-rose-600 px-2 text-xs text-white hover:bg-rose-700" onClick={handleBulkDeleteTeachers}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
                <Button type="button" size="sm" className="h-7 bg-slate-700 px-2 text-xs text-white hover:bg-slate-800" onClick={clearTeacherSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visibleTeachers.map((teacher, index) => (
              <Card
                key={teacher.teacher_id || teacher.id}
                className="relative flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-border dark:bg-card"
              >
                <span className="absolute left-3 top-3 z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-slate-900/80 px-1.5 text-[10px] font-bold text-white">
                  {getPaginatedRowNumber(index, page, pageSize)}
                </span>
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
                  'relative flex flex-col items-center p-3 text-white',
                  index % 4 === 0 && 'bg-sky-600',
                  index % 4 === 1 && 'bg-emerald-600',
                  index % 4 === 2 && 'bg-amber-500',
                  index % 4 === 3 && 'bg-fuchsia-600'
                )}>
                  <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-lg border border-white/30 bg-white/20 text-sm font-bold text-white">
                    {getInitials(teacher.first_name, teacher.last_name)}
                  </div>
                  <h3 className="text-center text-sm font-semibold text-white">
                    {teacher.first_name} {teacher.last_name}
                  </h3>
                </div>

                <CardContent className="flex-grow p-3">
                  <p className="text-center text-sm font-semibold text-slate-950 dark:text-card-foreground">
                    {getTeacherSubtitle(teacher)}
                  </p>
                  <div className="mt-2 rounded-lg bg-emerald-600 p-2 text-center text-xs text-white shadow-sm">
                    <p className="font-bold">{Number(teacher.student_count || 0)}</p>
                    <p className="text-[11px] text-white/80">Students</p>
                  </div>
                  <div className="mt-2 rounded-lg bg-fuchsia-600 p-2 text-center text-xs text-white shadow-sm">
                    <p className="font-bold">{Number(teacher.salary_percentage ?? 50)}%</p>
                    <p className="text-[11px] text-white/80">Teacher share</p>
                  </div>
                </CardContent>

                <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 p-2.5 dark:border-border/10 dark:bg-muted/50">
                  {renderTeacherActions(teacher)}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {!state.loading && totalTeachers > 0 && (
        <PaginationBar
          total={totalTeachers}
          currentPage={page}
          totalPages={totalPages}
          start={pageStart}
          end={pageEnd}
          pageSize={pageSize}
          pageSizeOptions={defaultCardPageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      )}

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-lg p-0 gap-0">
          <DialogHeader className="bg-fuchsia-600 px-4 py-3">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-base font-semibold text-white">
                {editingId ? 'Edit Teacher' : 'Add New Teacher'}
              </DialogTitle>
              <button onClick={handleCloseModal} className="text-white hover:text-white/80 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="first_name" className="text-xs">First Name</Label>
                  <Input id="first_name" className="h-8 text-xs" required value={formData.first_name || ''} onChange={(e) => handleFirstNameChange(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="last_name" className="text-xs">Last Name</Label>
                  <Input id="last_name" className="h-8 text-xs" required value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
                </div>
                {editingId && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="employee_id" className="text-xs">Employee ID</Label>
                      <Input id="employee_id" className="h-8 text-xs" value={formData.employee_id || ''} readOnly />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-xs">Email</Label>
                      <Input id="email" className="h-8 text-xs" type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">Phone</Label>
                  <Input id="phone" className="h-8 text-xs" required value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="date_of_birth" className="text-xs">Date of Birth</Label>
                  <Input id="date_of_birth" className="h-8 text-xs" type="date" required value={formData.date_of_birth || ''} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qualification" className="text-xs">Qualification</Label>
                  <Input id="qualification" className="h-8 text-xs" required value={formData.qualification || ''} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="specialization" className="text-xs">Specialization</Label>
                  <Input id="specialization" className="h-8 text-xs" required value={formData.specialization || ''} onChange={(e) => setFormData({ ...formData, specialization: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="salary_percentage" className="text-xs">Teacher Share (%)</Label>
                  <Input
                    id="salary_percentage"
                    className="h-8 text-xs"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    required
                    value={formData.salary_percentage ?? 50}
                    onChange={(e) => setFormData({ ...formData, salary_percentage: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gender" className="text-xs">Gender</Label>
                  <Select value={formData.gender || 'Male'} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{genderOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {editingId && (
                  <div className="space-y-1">
                    <Label htmlFor="status" className="text-xs">Status</Label>
                    <Select value={formData.status || 'Active'} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{teacherStatusOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                {isOwner && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="center" className="text-xs">Center</Label>
                    <Select value={String(formData.center_id || '')} onValueChange={(val) => setFormData({ ...formData, center_id: Number(val) })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{centerOptions.map((opt) => <SelectItem key={opt.id} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-xs">Username</Label>
                  <Input id="username" className="h-8 text-xs" required value={formData.username || ''} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                </div>
                {!editingId && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="password" className="text-xs">Password</Label>
                      <Input id="password" className="h-8 text-xs" type="password" required value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter className="px-4 py-3">
              <Button type="button" size="sm" className="h-8 rounded-lg bg-slate-700 px-3 text-xs text-white hover:bg-slate-800" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={state.loading} className="h-8 rounded-lg bg-fuchsia-600 px-5 text-xs text-white hover:bg-fuchsia-700">
                {state.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersPage;
