// Page component for the classes screen in the crm feature.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Info, Loader2, CalendarDays, Search, X, BookOpen, MapPin, DollarSign, Upload, Download, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useClassesPage } from './hooks/useClassesPage';
import { formatSchedule } from './queries';
import { exportCsvEntity } from '@/shared/dataCsv';
import { useLanguage } from '@/i18n/LanguageContext';
import { PaginationBar, defaultCardPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';
import { cn } from '@/lib/utils';

// Renders the classes page screen.
const ClassesPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupView, setGroupView] = useState<'groups' | 'teachers'>('teachers');
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<number>>(new Set());
  const { t } = useLanguage();
  const {
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    centerOptions,
    teacherOptions,
    selectedDays,
    scheduleTime,
    scheduleEndTime,
    setScheduleTime,
    setScheduleEndTime,
    handleDayChange,
    weekDays,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    deleteModalOpen,
    deleteTarget,
    deleteAttendance,
    deleteLoading,
    handleCloseDeleteModal,
    handleForceDelete,
    handleGenerateSessions,
    handleImportClasses,
    handleBulkDelete,
    isImporting,
    frequencyOptions,
    isOwner,
  } = useClassesPage();
  const filteredClasses = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const teacherId = teacherFilter === 'all' ? null : Number(teacherFilter);

    return state.items.filter((cls) => {
      if (teacherId != null && Number(cls.teacher_id) !== teacherId) return false;
      if (!search) return true;

      const schedule = formatSchedule(cls);
      return [
        cls.class_name,
        cls.class_code,
        cls.level,
        cls.capacity,
        cls.room_number,
        cls.payment_amount,
        cls.payment_frequency,
        schedule,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [searchTerm, state.items, teacherFilter]);
  const getClassId = (cls: any) => Number(cls.class_id || cls.id || 0);
  const teacherById = useMemo(() => {
    const map = new Map<number, string>();
    teacherOptions.forEach((teacher) => map.set(Number(teacher.value), teacher.label));
    return map;
  }, [teacherOptions]);
  const getTeacherName = (teacherId?: number | string | null) => {
    const id = Number(teacherId);
    return id > 0 ? teacherById.get(id) || t('Unknown teacher') : t('No teacher');
  };
  const toDateInputValue = (value?: string | null) => {
    if (!value) return '';
    return String(value).split('T')[0];
  };
  const teacherRows = useMemo(() => {
    const rows = new Map<number, { id: number; name: string; classes: any[] }>();
    teacherOptions.forEach((teacher) => {
      rows.set(Number(teacher.value), { id: Number(teacher.value), name: teacher.label, classes: [] });
    });
    filteredClasses.forEach((cls) => {
      const teacherId = Number(cls.teacher_id || 0);
      const key = teacherId > 0 ? teacherId : 0;
      if (!rows.has(key)) rows.set(key, { id: key, name: key === 0 ? t('No teacher') : getTeacherName(key), classes: [] });
      rows.get(key)?.classes.push(cls);
    });
    return Array.from(rows.values())
      .filter((row) => row.classes.length > 0)
      .map((row) => ({
        ...row,
        classes: [...row.classes].sort((a, b) => String(a.class_name || '').localeCompare(String(b.class_name || ''))),
      }))
      .sort((a, b) => b.classes.length - a.classes.length || a.name.localeCompare(b.name));
  }, [filteredClasses, getTeacherName, t, teacherOptions]);
  const paginatedClasses = useMemo(
    () => paginateItems(filteredClasses, page, pageSize),
    [filteredClasses, page, pageSize]
  );
  const visibleClassIds = paginatedClasses.items.map(getClassId).filter((id) => id > 0);
  const selectedVisibleClassCount = visibleClassIds.filter((id) => selectedClassIds.has(id)).length;
  const allVisibleClassesSelected = visibleClassIds.length > 0 && selectedVisibleClassCount === visibleClassIds.length;
  useEffect(() => {
    setPage(1);
  }, [searchTerm, teacherFilter, viewMode, groupView]);
  const toggleClass = (id: number, checked: boolean) => {
    setSelectedClassIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const toggleAllVisibleClasses = (checked: boolean) => {
    setSelectedClassIds((current) => {
      const next = new Set(current);
      for (const id of visibleClassIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };
  const deleteSelectedClasses = async () => {
    await handleBulkDelete(Array.from(selectedClassIds));
    setSelectedClassIds(new Set());
  };
  const handleExportClasses = () => exportCsvEntity('classes', 'Classes');
  const roomsInView = new Set(filteredClasses.map((cls) => String(cls.room_number || '').trim()).filter(Boolean)).size;
  const scheduledClasses = filteredClasses.filter((cls) => formatSchedule(cls) !== 'No schedule').length;
  const summaryCards = [
    {
      label: t('Classes shown'),
      value: filteredClasses.length.toLocaleString(),
      detail: `${scheduledClasses.toLocaleString()} ${t('scheduled')}`,
      icon: BookOpen,
      shell: 'from-indigo-50 via-white to-sky-50 border-indigo-100',
      iconShell: 'from-indigo-500 to-sky-500',
      text: 'text-indigo-950',
    },
    {
      label: t('Rooms'),
      value: roomsInView.toLocaleString(),
      detail: t('In current view'),
      icon: MapPin,
      shell: 'from-amber-50 via-white to-orange-50 border-amber-100',
      iconShell: 'from-amber-500 to-orange-500',
      text: 'text-amber-950',
    },
  ];
  const renderClassActions = (cls: any) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button
        type="button"
        size="sm"
        onClick={() => navigate(`/classes/${getClassId(cls)}`)}
        className="h-7 rounded-md bg-cyan-600 px-2 text-[11px] font-semibold text-white shadow-sm hover:bg-cyan-700"
      >
        <Info className="mr-1 h-3.5 w-3.5" />
        {t('View')}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => handleGenerateSessions(cls)}
        className="h-7 rounded-md bg-indigo-600 px-2 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700"
      >
        <CalendarDays className="mr-1 h-3.5 w-3.5" />
        {t('Sessions')}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => handleOpenModal(cls)}
        className="h-7 rounded-md bg-amber-500 px-2 text-[11px] font-semibold text-white shadow-sm hover:bg-amber-600"
      >
        <Pencil className="mr-1 h-3.5 w-3.5" />
        {t('Edit')}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => handleDelete(cls.class_id || cls.id || 0, cls.class_name)}
        className="h-7 rounded-md bg-rose-600 px-2 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-700"
      >
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        {t('Delete')}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/70 to-emerald-50/55 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.65)] dark:border-border dark:bg-card dark:bg-none dark:shadow-sm">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-72 bg-gradient-to-l from-fuchsia-100/45 via-amber-100/35 to-transparent dark:hidden" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-900/10 dark:shadow-none">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950 dark:text-foreground">{t('Classes Management')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('Organize class groups, schedules, rooms, tuition, and session generation.')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ViewModeToggle value={viewMode} onChange={setViewMode} className="border-white/80 bg-white/80 shadow-sm dark:border-border dark:bg-background dark:shadow-none" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => handleImportClasses(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="border-white/80 bg-white/80 shadow-sm dark:border-border dark:bg-background dark:shadow-none"
            >
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isImporting ? t('Importing...') : t('Import CSV')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportClasses}
              className="border-white/80 bg-white/80 shadow-sm dark:border-border dark:bg-background dark:shadow-none"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('Export CSV')}
            </Button>
            <Button onClick={() => handleOpenModal()} className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-5 font-semibold shadow-lg shadow-indigo-900/10 dark:shadow-none">
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Class')}
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
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-sky-100 bg-gradient-to-r from-white via-sky-50/60 to-emerald-50/40 p-3 shadow-sm lg:flex-row lg:items-center dark:border-border dark:bg-card dark:bg-none dark:shadow-none">
        <div className="flex w-full rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200 lg:w-auto dark:bg-background dark:ring-border">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setGroupView('groups')}
            className={`h-8 rounded-md px-3 text-xs font-semibold ${groupView === 'groups' ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            {t('Groups')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setGroupView('teachers')}
            className={`h-8 rounded-md px-3 text-xs font-semibold ${groupView === 'teachers' ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <UserRound className="mr-1.5 h-3.5 w-3.5" />
            {t('By teachers')}
          </Button>
        </div>
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('Search classes by name, code, schedule, room...')}
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
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger className="w-full border-white/80 bg-white/90 shadow-sm lg:w-[260px] dark:border-input dark:bg-background dark:shadow-none">
            <SelectValue placeholder={t('Filter by teacher')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All teachers')}</SelectItem>
            {teacherOptions.map((teacher) => (
              <SelectItem key={teacher.id || teacher.value} value={String(teacher.value)}>
                {teacher.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : state.items.length === 0 ? (
        <Alert className="mb-4">
          <AlertDescription>{t('No classes found. Create your first class to get started!')}</AlertDescription>
        </Alert>
      ) : filteredClasses.length === 0 ? (
        <Alert className="mb-4">
          <AlertDescription>{t('No classes match your search.')}</AlertDescription>
        </Alert>
      ) : groupView === 'teachers' ? (
        <div className="space-y-3">
          {teacherRows.map((row, index) => {
            const scheduled = row.classes.filter((cls) => formatSchedule(cls) !== 'No schedule').length;
            const accent = index % 4 === 0 ? 'bg-blue-600' : index % 4 === 1 ? 'bg-emerald-600' : index % 4 === 2 ? 'bg-amber-500' : 'bg-fuchsia-600';
            return (
              <section
                key={row.id || row.name}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm"
              >
                <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 dark:hidden" />
                <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-muted/30">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${accent} text-white shadow-sm`}>
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-950 dark:text-card-foreground">{row.name}</h3>
                      <p className="text-xs text-muted-foreground">{row.classes.length} {t('groups')} / {scheduled} {t('scheduled')}</p>
                    </div>
                  </div>
                  <span className="w-fit rounded-md bg-blue-600 px-2 py-1 text-xs font-bold text-white shadow-sm">
                    {row.classes.length} {t('Groups')}
                  </span>
                </div>
                <div className="grid gap-2 p-2">
                  {row.classes.map((cls, classIndex) => (
                    <div
                      key={cls.class_id || cls.id}
                      className="grid gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 shadow-sm md:grid-cols-[minmax(220px,1fr)_120px_minmax(260px,auto)] md:items-center dark:border-border dark:bg-background"
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/classes/${getClassId(cls)}`)}
                        className="min-w-0 text-left"
                      >
                        <span className={`mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded ${classIndex % 4 === 0 ? 'bg-cyan-600' : classIndex % 4 === 1 ? 'bg-violet-600' : classIndex % 4 === 2 ? 'bg-orange-500' : 'bg-rose-600'} px-1.5 text-[10px] font-bold text-white`}>
                          {classIndex + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-950 hover:text-blue-700 dark:text-card-foreground">{cls.class_name}</span>
                      </button>
                      <span className="rounded-md bg-amber-500 px-2 py-1 text-center text-[11px] font-semibold text-white">{cls.room_number || t('No room')}</span>
                      {renderClassActions(cls)}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 dark:hidden" />
          {selectedClassIds.size > 0 && (
            <div className="flex items-center justify-between border-b bg-sky-50/70 px-4 py-2 text-sm dark:bg-muted/50">
              <span className="font-medium">{selectedClassIds.size} {t('selected')}</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={deleteSelectedClasses}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('Delete')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedClassIds(new Set())}>
                  {t('Clear')}
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
                    checked={allVisibleClassesSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = selectedVisibleClassCount > 0 && !allVisibleClassesSelected;
                    }}
                    onChange={(event) => toggleAllVisibleClasses(event.target.checked)}
                    aria-label={t('Select all visible classes')}
                    className="h-4 w-4"
                  />
                </TableHead>
                <TableHead>{t('Class')}</TableHead>
                <TableHead>{t('Teacher')}</TableHead>
                <TableHead>{t('Schedule')}</TableHead>
                <TableHead>{t('Room')}</TableHead>
                <TableHead className="text-right">{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedClasses.items.map((cls) => (
                <TableRow key={cls.class_id || cls.id} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedClassIds.has(getClassId(cls))}
                      onChange={(event) => toggleClass(getClassId(cls), event.target.checked)}
                      aria-label={`Select ${cls.class_name}`}
                      className="h-4 w-4"
                    />
                  </TableCell>
                  <TableCell className="py-2 font-medium">
                    <button
                      type="button"
                      className="text-left font-semibold text-slate-950 hover:text-sky-700 dark:text-card-foreground dark:hover:text-primary"
                      onClick={() => navigate(`/classes/${getClassId(cls)}`)}
                    >
                      {cls.class_name}
                    </button>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="rounded-md bg-violet-600 px-2 py-1 text-[11px] font-semibold text-white">{getTeacherName(cls.teacher_id)}</span>
                  </TableCell>
                  <TableCell className="max-w-[180px] py-2 text-xs text-muted-foreground">{formatSchedule(cls)}</TableCell>
                  <TableCell className="py-2">
                    <span className="rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white">{cls.room_number || '-'}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {renderClassActions(cls)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : viewMode === 'compact' ? (
        <>
          {selectedClassIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm shadow-sm dark:border-border dark:bg-card">
              <span className="font-medium">{selectedClassIds.size} {t('selected')}</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={deleteSelectedClasses}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('Delete')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedClassIds(new Set())}>
                  {t('Clear')}
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedClasses.items.map((cls) => (
              <Card
                key={cls.class_id || cls.id}
                className="relative cursor-pointer overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:bg-card dark:hover:translate-y-0"
                onClick={() => navigate(`/classes/${getClassId(cls)}`)}
              >
                <div className="absolute right-3 top-3 z-10" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedClassIds.has(getClassId(cls))}
                    onChange={(event) => toggleClass(getClassId(cls), event.target.checked)}
                    aria-label={`Select ${cls.class_name}`}
                    className="h-4 w-4"
                  />
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-sky-100 text-indigo-700 dark:bg-primary/10 dark:bg-none dark:text-primary">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{cls.class_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          {selectedClassIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm shadow-sm dark:border-border dark:bg-card">
              <span className="font-medium">{selectedClassIds.size} {t('selected')}</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={deleteSelectedClasses}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('Delete')}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedClassIds(new Set())}>
                  {t('Clear')}
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedClasses.items.map((cls, index) => (
              <Card
                key={cls.class_id || cls.id}
                className="relative flex h-full flex-col overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/15 dark:border-border/60 dark:bg-card"
              >
                <div className="absolute right-3 top-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedClassIds.has(getClassId(cls))}
                    onChange={(event) => toggleClass(getClassId(cls), event.target.checked)}
                    aria-label={`Select ${cls.class_name}`}
                    className="h-4 w-4"
                  />
                </div>
                <CardHeader className={
                  index % 4 === 0 ? 'bg-gradient-to-br from-indigo-500 to-sky-500 text-white' :
                  index % 4 === 1 ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' :
                  index % 4 === 2 ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' :
                  'bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white'
                }>
                  <CardTitle className="text-lg">{cls.class_name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pt-4">
                  <p className="font-semibold text-slate-950 dark:text-card-foreground">{cls.class_name}</p>
                </CardContent>
                <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-border/10 dark:bg-muted/50">
                  {renderClassActions(cls)}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {!state.loading && groupView === 'groups' && filteredClasses.length > 0 && (
        <PaginationBar
          total={filteredClasses.length}
          currentPage={paginatedClasses.currentPage}
          totalPages={paginatedClasses.totalPages}
          start={paginatedClasses.start}
          end={paginatedClasses.end}
          pageSize={pageSize}
          pageSizeOptions={defaultCardPageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      )}

      {/* Add/Edit Class Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden border-0 bg-white p-0 shadow-2xl shadow-slate-900/25 dark:bg-card">
          <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 px-4 py-3 text-white">
            <div className="absolute right-0 top-0 h-full w-24 skew-x-[-18deg] bg-white/15" />
            <div className="absolute bottom-0 left-24 h-1.5 w-52 bg-cyan-200/70" />
            <div className="relative flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/20 shadow-lg ring-1 ring-white/30">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold text-white">
                  {editingId ? t('Edit Class') : t('Add New Class')}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="max-h-[calc(92vh-112px)] overflow-y-auto">
            <div className="space-y-3 bg-gradient-to-b from-slate-50 to-white p-3 dark:from-background dark:to-card">
              <section className="rounded-lg border border-sky-100 bg-white p-2.5 shadow-sm dark:border-border dark:bg-background">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-600 text-white shadow-sm">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-950 dark:text-card-foreground">{t('Group Details')}</h4>
                </div>
                <div className="grid gap-2.5 md:grid-cols-2">
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="class_name" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Class Name')} *</Label>
                    <Input
                      id="class_name"
                      required
                      value={formData.class_name || ''}
                      onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                      className="h-8 border-sky-100 bg-sky-50/60 text-xs font-semibold shadow-sm focus-visible:ring-sky-500 dark:border-input dark:bg-background"
                    />
                  </div>
                  {editingId && (
                    <div className="space-y-1">
                      <Label htmlFor="class_code" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Class Code')}</Label>
                      <Input
                        id="class_code"
                        value={formData.class_code || ''}
                        onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
                        className="h-8 border-indigo-100 bg-indigo-50/60 text-xs font-semibold shadow-sm focus-visible:ring-indigo-500 dark:border-input dark:bg-background"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="level" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Level')} *</Label>
                    <Input
                      id="level"
                      type="number"
                      required
                      value={formData.level || ''}
                      onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                      className="h-8 border-violet-100 bg-violet-50/60 text-xs font-semibold shadow-sm focus-visible:ring-violet-500 dark:border-input dark:bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="capacity" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Capacity')} *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      required
                      value={formData.capacity || ''}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      className="h-8 border-emerald-100 bg-emerald-50/60 text-xs font-semibold shadow-sm focus-visible:ring-emerald-500 dark:border-input dark:bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="room_number" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Room Number')} *</Label>
                    <Input
                      id="room_number"
                      required
                      value={formData.room_number || ''}
                      onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                      className="h-8 border-amber-100 bg-amber-50/60 text-xs font-semibold shadow-sm focus-visible:ring-amber-500 dark:border-input dark:bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="start_date" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Start Date')}</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={toDateInputValue(formData.start_date)}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
                      className="h-8 border-cyan-100 bg-cyan-50/60 text-xs font-semibold shadow-sm focus-visible:ring-cyan-500 dark:border-input dark:bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end_date" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('End Date')}</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={toDateInputValue(formData.end_date)}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                      className="h-8 border-rose-100 bg-rose-50/60 text-xs font-semibold shadow-sm focus-visible:ring-rose-500 dark:border-input dark:bg-background"
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-lg border border-cyan-100 bg-white p-2.5 shadow-sm dark:border-border dark:bg-background">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-600 text-white shadow-sm">
                      <CalendarDays className="h-3.5 w-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-950 dark:text-card-foreground">{t('Class Schedule')}</h4>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Select Class Days')}</p>
                      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
                        {weekDays.map((day, index) => (
                          <label
                            key={day}
                            className={cn(
                              'flex min-h-7 cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold shadow-sm transition-colors',
                              selectedDays.includes(day)
                                ? 'border-cyan-300 bg-cyan-50 text-cyan-950 dark:border-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-100'
                                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white dark:border-border dark:bg-card dark:text-card-foreground'
                            )}
                          >
                            <Switch
                              className="scale-[0.65]"
                              checked={selectedDays.includes(day)}
                              onCheckedChange={(checked) => handleDayChange(day, checked)}
                            />
                            <span className="truncate">{day}</span>
                            <span className={cn('ml-auto h-2 w-2 rounded-full', index % 3 === 0 ? 'bg-sky-500' : index % 3 === 1 ? 'bg-emerald-500' : 'bg-fuchsia-500')} />
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="schedule_time" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Start Time')}</Label>
                        <Input
                          id="schedule_time"
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="h-8 border-cyan-100 bg-cyan-50/60 text-xs font-semibold shadow-sm focus-visible:ring-cyan-500 dark:border-input dark:bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="schedule_end_time" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('End Time')}</Label>
                        <Input
                          id="schedule_end_time"
                          type="time"
                          value={scheduleEndTime}
                          onChange={(e) => setScheduleEndTime(e.target.value)}
                          className="h-8 border-cyan-100 bg-cyan-50/60 text-xs font-semibold shadow-sm focus-visible:ring-cyan-500 dark:border-input dark:bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-100 bg-white p-2.5 shadow-sm dark:border-border dark:bg-background">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
                        <DollarSign className="h-3.5 w-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-950 dark:text-card-foreground">{t('Payment')}</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="payment_amount" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Payment Amount')} *</Label>
                        <Input
                          id="payment_amount"
                          type="number"
                          required
                          step="0.01"
                          value={formData.payment_amount || ''}
                          onChange={(e) => setFormData({ ...formData, payment_amount: Number(e.target.value) })}
                          className="h-8 border-emerald-100 bg-emerald-50/60 text-xs font-semibold shadow-sm focus-visible:ring-emerald-500 dark:border-input dark:bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="payment_frequency" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Payment Frequency')}</Label>
                        <Select
                          value={formData.payment_frequency || 'Monthly'}
                          onValueChange={(val) => setFormData({ ...formData, payment_frequency: val })}
                        >
                          <SelectTrigger className="h-8 border-emerald-100 bg-emerald-50/60 text-xs font-semibold shadow-sm dark:border-input dark:bg-background">
                            <SelectValue placeholder={t('Select Frequency')} />
                          </SelectTrigger>
                          <SelectContent>
                            {frequencyOptions.map((opt) => (
                              <SelectItem key={opt.id} value={String(opt.value)}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-fuchsia-100 bg-white p-2.5 shadow-sm dark:border-border dark:bg-background">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-fuchsia-600 text-white shadow-sm">
                        <UserRound className="h-3.5 w-3.5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-950 dark:text-card-foreground">{t('Assignment')}</h4>
                    </div>
                    <div className="space-y-2">
                      {isOwner && (
                        <div className="space-y-1">
                          <Label htmlFor="center_id" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Center')}</Label>
                          <Select
                            value={String(formData.center_id || '')}
                            onValueChange={(val) => setFormData({ ...formData, center_id: Number(val) })}
                          >
                            <SelectTrigger className="h-8 border-fuchsia-100 bg-fuchsia-50/60 text-xs font-semibold shadow-sm dark:border-input dark:bg-background">
                              <SelectValue placeholder={t('Select Center')} />
                            </SelectTrigger>
                            <SelectContent>
                              {centerOptions.map((opt) => (
                                <SelectItem key={opt.id || opt.value} value={String(opt.value)}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-1">
                        <Label htmlFor="teacher_id" className="text-[10px] font-bold uppercase text-slate-600 dark:text-muted-foreground">{t('Teacher (Optional)')}</Label>
                        <Select
                          value={String(formData.teacher_id || 'none')}
                          onValueChange={(val) =>
                            setFormData({
                              ...formData,
                              teacher_id: val === 'none' ? undefined : Number(val),
                            })
                          }
                        >
                          <SelectTrigger className="h-8 border-fuchsia-100 bg-fuchsia-50/60 text-xs font-semibold shadow-sm dark:border-input dark:bg-background">
                            <SelectValue placeholder={t('Select Teacher')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t('None')}</SelectItem>
                            {teacherOptions.map((opt) => (
                              <SelectItem key={opt.id || opt.value} value={String(opt.value)}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <DialogFooter className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-border dark:bg-card/95">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="h-8 rounded-md px-3 text-xs">
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={state.loading} className="h-8 rounded-md bg-gradient-to-r from-sky-600 via-indigo-600 to-fuchsia-600 px-4 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-sky-700 hover:via-indigo-700 hover:to-fuchsia-700">
                {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Attendance Conflict Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => !open && handleCloseDeleteModal()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Attendance records found')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The class{deleteTarget?.name ? ` "${deleteTarget.name}"` : ''} has
              {` ${deleteAttendance.length} `}
              attendance record(s). Deleting anyway will remove those records and the class.
            </p>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Student ID')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Session')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deleteAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t('No attendance records found.')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    deleteAttendance.map((record) => (
                      <TableRow key={record.attendance_id || `${record.student_id}-${record.attendance_date}`}>
                        <TableCell>
                          {record.attendance_date?.split('T')[0] || record.attendance_date}
                        </TableCell>
                        <TableCell>{record.student_id}</TableCell>
                        <TableCell>{record.status}</TableCell>
                        <TableCell>{record.session_id ?? '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseDeleteModal} disabled={deleteLoading}>
              {t('Cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={handleForceDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Delete anyway')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default ClassesPage;
