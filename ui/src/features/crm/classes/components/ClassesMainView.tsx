import { Fragment, type ReactNode } from 'react';
import { Plus, Trash2, Loader2, CalendarDays, Search, X, BookOpen, Upload, Download, UserRound, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { PaginationBar, defaultCardPageSizeOptions } from '@/components/common/PaginationBar';
import { cn } from '@/lib/utils';
import { formatSchedule } from '../queries';

type ClassesMainViewProps = {
  t: (key: string) => string;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
  groupView: 'groups' | 'teachers';
  setGroupView: (value: 'groups' | 'teachers') => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  teacherFilter: string;
  setTeacherFilter: (value: string) => void;
  teacherOptions: any[];
  state: any;
  summaryCards: any[];
  fileInputRef: any;
  handleImportClasses: (file?: File) => void;
  isImporting: boolean;
  handleExportClasses: () => void;
  handleOpenModal: (classItem?: any) => void;
  filteredClasses: any[];
  teacherRows: any[];
  expandedTeacherIds: Set<number>;
  expandedClassIds: Set<number>;
  toggleTeacherExpanded: (id: number) => void;
  toggleClassExpanded: (id: number) => void;
  classStudentsLoading: boolean;
  studentsByClassId: Map<number, any[]>;
  getClassId: (classItem: any) => number;
  getTeacherName: (teacherId?: number | string | null) => string;
  getClassRoomLabel: (classItem: any) => string;
  navigate: (path: string) => void;
  selectedClassIds: Set<number>;
  setSelectedClassIds: (ids: Set<number>) => void;
  toggleClass: (id: number, checked: boolean) => void;
  allVisibleClassesSelected: boolean;
  selectedVisibleClassCount: number;
  toggleAllVisibleClasses: (checked: boolean) => void;
  deleteSelectedClasses: () => void;
  paginatedClasses: any;
  pageSize: number;
  setPageSize: (size: number) => void;
  setPage: (page: number) => void;
  renderClassActions: (classItem: any) => ReactNode;
};

export const ClassesMainView = ({
  t,
  viewMode,
  setViewMode,
  groupView,
  setGroupView,
  searchTerm,
  setSearchTerm,
  teacherFilter,
  setTeacherFilter,
  teacherOptions,
  state,
  summaryCards,
  fileInputRef,
  handleImportClasses,
  isImporting,
  handleExportClasses,
  handleOpenModal,
  filteredClasses,
  teacherRows,
  expandedTeacherIds,
  expandedClassIds,
  toggleTeacherExpanded,
  toggleClassExpanded,
  classStudentsLoading,
  studentsByClassId,
  getClassId,
  getTeacherName,
  getClassRoomLabel,
  navigate,
  selectedClassIds,
  setSelectedClassIds,
  toggleClass,
  allVisibleClassesSelected,
  selectedVisibleClassCount,
  toggleAllVisibleClasses,
  deleteSelectedClasses,
  paginatedClasses,
  pageSize,
  setPageSize,
  setPage,
  renderClassActions,
}: ClassesMainViewProps) => (
  <>
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
        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm">
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 dark:hidden" />
          <Table>
            <TableHeader className="bg-slate-50/90 dark:bg-transparent">
              <TableRow>
                <TableHead className="min-w-[180px]">{t('Teacher')}</TableHead>
                <TableHead className="w-[90px] text-center">{t('Groups')}</TableHead>
                <TableHead className="w-[120px] text-center">{t('Scheduled')}</TableHead>
                <TableHead className="w-[90px] text-right">{t('Open')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teacherRows.map((row, index) => {
                const scheduled = row.classes.filter((cls: any) => formatSchedule(cls) !== 'No schedule').length;
                const accent = index % 4 === 0 ? 'bg-blue-600' : index % 4 === 1 ? 'bg-emerald-600' : index % 4 === 2 ? 'bg-amber-500' : 'bg-fuchsia-600';
                const isTeacherExpanded = expandedTeacherIds.has(row.id);
                return (
                  <Fragment key={row.id || row.name}>
                    <TableRow className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                      <TableCell className="py-2">
                        <button
                          type="button"
                          onClick={() => toggleTeacherExpanded(row.id)}
                          className="flex min-w-0 items-center gap-2 text-left"
                        >
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${accent} text-white shadow-sm`}>
                            <UserRound className="h-3.5 w-3.5" />
                          </div>
                          <span className="truncate text-sm font-bold text-slate-950 hover:text-blue-700 dark:text-card-foreground">{row.name}</span>
                        </button>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span className="inline-flex min-w-14 justify-center rounded-md bg-blue-600 px-2 py-1 text-xs font-bold text-white shadow-sm">
                          {row.classes.length}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span className="inline-flex min-w-14 justify-center rounded-md bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow-sm">
                          {scheduled}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => toggleTeacherExpanded(row.id)}
                          className={`h-7 rounded-md px-2 text-[11px] font-semibold text-white ${isTeacherExpanded ? 'bg-rose-600 hover:bg-rose-700' : 'bg-cyan-600 hover:bg-cyan-700'}`}
                        >
                          <ChevronDown className={cn('mr-1 h-3.5 w-3.5 transition-transform', isTeacherExpanded && 'rotate-180')} />
                          {isTeacherExpanded ? t('Close') : t('Open')}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isTeacherExpanded && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-slate-50/70 p-2 dark:bg-muted/30">
                          <div className="grid gap-2">
                            {row.classes.map((cls: any, classIndex: number) => {
                              const classId = getClassId(cls);
                              const isClassExpanded = expandedClassIds.has(classId);
                              const students = studentsByClassId.get(classId) || [];
                              const studentCount = students.length || Number(cls.student_count || 0);
                              return (
                                <div
                                  key={classId || cls.class_name}
                                  className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-background"
                                >
                                  <div className="grid gap-2 px-2 py-2 md:grid-cols-[minmax(220px,1fr)_120px_minmax(260px,auto)_90px] md:items-center">
                                    <button
                                      type="button"
                                      onClick={() => toggleClassExpanded(classId)}
                                      className="min-w-0 text-left"
                                    >
                                      <span className={`mr-2 inline-flex h-5 min-w-5 items-center justify-center rounded ${classIndex % 4 === 0 ? 'bg-cyan-600' : classIndex % 4 === 1 ? 'bg-violet-600' : classIndex % 4 === 2 ? 'bg-orange-500' : 'bg-rose-600'} px-1.5 text-[10px] font-bold text-white`}>
                                        {classIndex + 1}
                                      </span>
                                      <span className="text-xs font-bold text-slate-950 hover:text-blue-700 dark:text-card-foreground">{cls.class_name}</span>
                                    </button>
                                    <span className="rounded-md bg-amber-500 px-2 py-1 text-center text-[11px] font-semibold text-white">{getClassRoomLabel(cls) || t('No room')}</span>
                                    {renderClassActions(cls)}
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => toggleClassExpanded(classId)}
                                      className={`h-7 rounded-md px-2 text-[11px] font-semibold text-white ${isClassExpanded ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                    >
                                      <ChevronDown className={cn('mr-1 h-3.5 w-3.5 transition-transform', isClassExpanded && 'rotate-180')} />
                                      {studentCount}
                                    </Button>
                                  </div>
                                  {isClassExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/80 p-2 dark:border-border dark:bg-muted/20">
                                      {classStudentsLoading && students.length === 0 ? (
                                        <div className="py-3 text-center text-xs text-muted-foreground">{t('Loading students...')}</div>
                                      ) : students.length === 0 ? (
                                        <div className="py-3 text-center text-xs text-muted-foreground">{t('No students in this group')}</div>
                                      ) : (
                                        <div className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-border dark:bg-background">
                                          <Table className="text-xs">
                                            <TableHeader className="bg-slate-50/90 dark:bg-muted/30">
                                              <TableRow>
                                                <TableHead className="h-8 px-2">{t('Name')}</TableHead>
                                                <TableHead className="h-8 px-2">{t('School')}</TableHead>
                                                <TableHead className="h-8 px-2">{t('School class')}</TableHead>
                                                <TableHead className="h-8 px-2">{t('Phone')}</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {students.map((student, studentIndex) => (
                                                <TableRow key={student.student_id || student.id} className="hover:bg-sky-50/60 dark:hover:bg-muted/50">
                                                  <TableCell className="px-2 py-2">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white ${studentIndex % 4 === 0 ? 'bg-sky-600' : studentIndex % 4 === 1 ? 'bg-emerald-600' : studentIndex % 4 === 2 ? 'bg-amber-500' : 'bg-fuchsia-600'}`}>
                                                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                                      </span>
                                                      <span className="truncate font-semibold text-slate-950 dark:text-card-foreground">
                                                        {[student.first_name, student.last_name].filter(Boolean).join(' ') || t('Unnamed student')}
                                                      </span>
                                                    </div>
                                                  </TableCell>
                                                  <TableCell className="px-2 py-2 text-muted-foreground">{student.school_name || '-'}</TableCell>
                                                  <TableCell className="px-2 py-2 text-muted-foreground">{student.school_class || '-'}</TableCell>
                                                  <TableCell className="px-2 py-2 text-muted-foreground">{student.phone || student.parent_phone || '-'}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
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
              {paginatedClasses.items.map((cls: any) => (
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
                    <span className="rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white">{getClassRoomLabel(cls) || '-'}</span>
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
            {paginatedClasses.items.map((cls: any) => (
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
            {paginatedClasses.items.map((cls: any, index: number) => (
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
  </>
);
