// Page component for the assignments screen in the crm feature.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  Folder,
  Loader2,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { SelectField } from '../students/components/SelectField';
import { useAssignmentsPage } from './hooks/useAssignmentsPage';
import { getStatusColor } from './queries';
import { useLanguage } from '@/i18n/LanguageContext';
import { PaginationBar, defaultCardPageSizeOptions, defaultPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';

const folderListClass = 'overflow-hidden rounded-md border border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card';
const folderCardClass =
  'cursor-pointer overflow-hidden rounded-none border-0 border-b border-slate-200/80 bg-white shadow-none transition-colors last:border-b-0 hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted/30 [&_.folder-card-content]:p-0';
const infoPillClass = 'rounded px-1.5 py-0.5 text-[10px] font-black leading-none whitespace-nowrap';
const rowClass = 'flex flex-nowrap items-center gap-1.5 border-l-4 px-2 py-1 text-xs';
const rowIconClass = 'flex h-6 w-6 shrink-0 items-center justify-center rounded';
const rowNameClass = 'w-56 shrink-0 truncate text-xs font-semibold';
const rowMetaClass = 'flex min-w-0 shrink-0 items-center gap-1.5 overflow-hidden';
const rowStatsClass = 'flex shrink-0 items-center justify-start gap-1.5 text-left';

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

// Renders the assignments page screen.
const AssignmentsPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [folderPage, setFolderPage] = useState(1);
  const [folderPageSize, setFolderPageSize] = useState(12);
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentPageSize, setAssignmentPageSize] = useState(25);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLanguage();
  const {
    state,
    classes,
    activeTab,
    setActiveTab,
    selectedFolder,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    classOptions,
    isLoadingOptions,
    loadingData,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    showFilters,
    setShowFilters,
    displayedAssignments,
    hasActiveFilters,
    personalAssignments,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleImportAssignments,
    handleExportAssignments,
    isImporting,
    handleFolderClick,
    handleBackToFolders,
    clearFilters,
    getAssignmentCountForClass,
    getCompletedCountForClass,
    assignmentStatusOptions,
  } = useAssignmentsPage();
  const folderGridClass = folderListClass;
  const rootSearch = !selectedFolder ? searchTerm.trim().toLowerCase() : '';
  const filteredClasses = useMemo(() => {
    if (!rootSearch) return classes;
    return classes.filter((cls) =>
      [cls.class_name, cls.class_code, cls.level, (cls as any).section]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(rootSearch))
    );
  }, [classes, rootSearch]);
  const paginatedClasses = useMemo(
    () => paginateItems(filteredClasses, folderPage, folderPageSize),
    [filteredClasses, folderPage, folderPageSize]
  );
  const filteredPersonalAssignments = useMemo(() => {
    if (!rootSearch) return personalAssignments;
    return personalAssignments.filter((assignment) =>
      [assignment.assignment_title, assignment.description, assignment.status, assignment.grade]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(rootSearch))
    );
  }, [personalAssignments, rootSearch]);
  const paginatedAssignments = useMemo(
    () => paginateItems(displayedAssignments, assignmentPage, assignmentPageSize),
    [displayedAssignments, assignmentPage, assignmentPageSize]
  );
  const assignmentStats = useMemo(() => {
    const total = state.items.length;
    const completed = state.items.filter((item) => item.status === 'Completed').length;
    const pending = state.items.filter((item) => item.status === 'Pending').length;
    const submitted = state.items.filter((item) => item.status === 'Submitted').length;
    const graded = state.items.filter((item) => item.status === 'Graded').length;
    return {
      total,
      completed,
      pending,
      submitted,
      graded,
      completeRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [state.items]);

  useEffect(() => {
    setFolderPage(1);
  }, [rootSearch, activeTab, viewMode]);

  useEffect(() => {
    setAssignmentPage(1);
  }, [searchTerm, filterStatus, selectedFolder?.type, selectedFolder?.id]);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50 p-4 shadow-sm dark:border-border dark:from-card dark:via-card dark:to-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {selectedFolder && (
            <Button variant="secondary" size="sm" onClick={handleBackToFolders} className="h-9 bg-slate-900 text-white hover:bg-slate-800">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25">
            <Target className="h-5 w-5" />
          </div>
          <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedFolder
              ? `${selectedFolder.name} - Vazifalar`
              : 'Vazifalarni boshqarish'}
          </h1>
            <p className="text-sm text-muted-foreground">Sinf vazifalari, shaxsiy topshiriqlar va bajarilish holatini boshqaring.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              handleImportAssignments(event.target.files?.[0]);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="h-9 bg-white/90 shadow-sm"
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isImporting ? t('Importing...') : t('Import CSV')}
          </Button>
          <Button type="button" variant="outline" onClick={handleExportAssignments} className="h-9 bg-white/90 shadow-sm">
            <Download className="mr-2 h-4 w-4" />
            {t('Export CSV')}
          </Button>
          <Button onClick={() => handleOpenModal()} className="h-9 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:from-fuchsia-700 hover:to-indigo-700">
            <Plus className="mr-2 h-4 w-4" /> Add Assignment
          </Button>
        </div>
      </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          {[
            ['Jami', assignmentStats.total, 'from-indigo-500 to-blue-600'],
            ['Bajarildi', assignmentStats.completed, 'from-emerald-500 to-teal-600'],
            ['Kutilmoqda', assignmentStats.pending, 'from-amber-500 to-orange-600'],
            ['Topshirildi', assignmentStats.submitted, 'from-sky-500 to-cyan-600'],
            ['Baholandi', assignmentStats.graded || `${assignmentStats.completeRate}%`, 'from-fuchsia-500 to-pink-600'],
          ].map(([label, value, color]) => (
            <div key={label} className={cn('rounded-md bg-gradient-to-br p-2 text-white shadow-sm', color as string)}>
              <p className="text-[10px] font-black uppercase text-white/75">{label}</p>
              <p className="text-lg font-black leading-tight">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {!selectedFolder ? (
        <>
          <div className="flex items-center gap-3 flex-wrap rounded-md border border-cyan-100 bg-white p-2 shadow-sm dark:border-border dark:bg-card">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={activeTab === 'classes' ? 'Search classes by name or code...' : 'Search personal tasks...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 border-cyan-100 bg-cyan-50/40 pl-9 pr-8 text-sm shadow-none"
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="rounded-md border border-slate-200 bg-white p-1 shadow-sm dark:border-border dark:bg-card">
            <div className="flex gap-1">
              <button
                className={cn(
                  'flex items-center gap-2 rounded px-3 py-2 text-sm font-black transition-colors',
                  activeTab === 'classes'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                onClick={() => setActiveTab('classes')}
              >
                <Users className="h-4 w-4" />
                By Classes
              </button>
              <button
                className={cn(
                  'flex items-center gap-2 rounded px-3 py-2 text-sm font-black transition-colors',
                  activeTab === 'personal'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                onClick={() => setActiveTab('personal')}
              >
                <FileText className="h-4 w-4" />
                Personal Tasks
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {/* By Classes Tab */}
            {activeTab === 'classes' && (
              <div className={folderGridClass}>
                {loadingData ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading classes...
                  </div>
                ) : filteredClasses.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No classes match your search' : 'No classes found'}
                  </div>
                ) : (
                  paginatedClasses.items.map((cls) => {
                    const classId = cls.class_id || cls.id || 0;
                    const assignmentCount = getAssignmentCountForClass(classId);
                    const completedCount = getCompletedCountForClass(classId);
                    const completionPercentage = assignmentCount > 0 ? (completedCount / assignmentCount) * 100 : 0;

                    return assignmentCount > 0 ? (
                      <Card
                        key={classId}
                        className={cn(folderCardClass, 'border-indigo-100 dark:border-border')}
                        onClick={() => handleFolderClick('class', classId, cls.class_name)}
                      >
                        <CardContent className="folder-card-content">
                          <div className={cn(rowClass, 'border-indigo-600 bg-gradient-to-r from-indigo-50/80 via-white to-white dark:from-card dark:via-card dark:to-card')}>
                            <div className={cn(rowIconClass, 'bg-indigo-600 text-white')}>
                              <Folder className="h-3.5 w-3.5" />
                            </div>
                            <h3 className={rowNameClass}>{cls.class_name}</h3>
                            <div className={rowMetaClass}>
                              <span className={cn(infoPillClass, 'bg-violet-600 text-white')}>Level {cls.level || '-'}</span>
                              <span className={cn(infoPillClass, 'bg-sky-600 text-white')}>{assignmentCount} vazifa</span>
                            </div>
                            <div className={rowStatsClass}>
                              <span className={cn(infoPillClass, 'bg-emerald-600 text-white')}>
                                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                                {completedCount}
                              </span>
                              <span className={cn(infoPillClass, 'bg-fuchsia-600 text-white')}>
                                {completionPercentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null;
                  })
                )}
              </div>
            )}
            {activeTab === 'classes' && filteredClasses.length > 0 && (
              <div className="mt-4">
                <PaginationBar
                  total={filteredClasses.length}
                  currentPage={paginatedClasses.currentPage}
                  totalPages={paginatedClasses.totalPages}
                  start={paginatedClasses.start}
                  end={paginatedClasses.end}
                  pageSize={folderPageSize}
                  pageSizeOptions={defaultCardPageSizeOptions}
                  onPageChange={setFolderPage}
                  onPageSizeChange={(nextPageSize) => {
                    setFolderPageSize(nextPageSize);
                    setFolderPage(1);
                  }}
                />
              </div>
            )}

            {/* Personal Tasks Tab */}
            {activeTab === 'personal' && (
              <div className={folderGridClass}>
                {loadingData ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading personal tasks...
                  </div>
                ) : (
                  (() => {
                    const personalCount = filteredPersonalAssignments.length;
                    const personalCompleted = filteredPersonalAssignments.filter((a) => a.status === 'Completed').length;
                    const completionPercentage = personalCount > 0 ? (personalCompleted / personalCount) * 100 : 0;

                    return personalCount > 0 ? (
                      <Card
                        className={cn(folderCardClass, 'border-amber-100 dark:border-border')}
                        onClick={() => handleFolderClick('personal', undefined, 'Personal Tasks')}
                      >
                        <CardContent className="folder-card-content">
                          <div className={cn(rowClass, 'border-amber-500 bg-gradient-to-r from-amber-50/90 via-white to-white')}>
                            <div className={cn(rowIconClass, 'bg-amber-500 text-white')}>
                              <Folder className="h-3.5 w-3.5" />
                            </div>
                            <h3 className={rowNameClass}>Personal Tasks</h3>
                            <div className={rowMetaClass}>
                              <span className={cn(infoPillClass, 'bg-orange-600 text-white')}>Independent</span>
                              <span className={cn(infoPillClass, 'bg-sky-600 text-white')}>{personalCount} task</span>
                            </div>
                            <div className={rowStatsClass}>
                              <span className={cn(infoPillClass, 'bg-emerald-600 text-white')}>{personalCompleted} done</span>
                              <span className={cn(infoPillClass, 'bg-fuchsia-600 text-white')}>{completionPercentage.toFixed(0)}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No personal tasks match your search' : 'No personal tasks found'}
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ASSIGNMENTS LIST VIEW */
        <>
          {/* Search and Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap rounded-md border border-fuchsia-100 bg-white p-2 shadow-sm dark:border-border dark:bg-card">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 border-fuchsia-100 bg-fuchsia-50/40 pl-9 pr-8 text-sm shadow-none"
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white')}
            >
              <Filter className="mr-1 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {filterStatus ? 1 : 0}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                <X className="mr-1 h-4 w-4" /> Clear All
              </Button>
            )}

            <span className="text-sm text-muted-foreground ml-auto">
              {displayedAssignments.length} assignment{displayedAssignments.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <Card className="border-fuchsia-100 bg-gradient-to-r from-fuchsia-50 to-indigo-50 shadow-sm dark:border-border dark:bg-card dark:bg-none">
              <CardContent className="py-2">
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex h-8 w-[180px] rounded-md border border-fuchsia-100 bg-white px-3 py-1 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">All Status</option>
                      {assignmentStatusOptions.map((opt) => (
                        <option key={opt.id} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignments Table */}
          <Card className="overflow-hidden border-slate-200/80 shadow-sm">
            <CardContent className="p-0">
              <div className="border-t-4 border-t-fuchsia-500">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="h-9 text-xs">Title</TableHead>
                      <TableHead className="h-9 text-xs">Description</TableHead>
                      <TableHead className="h-9 text-xs">Due</TableHead>
                      <TableHead className="h-9 text-xs">Submit</TableHead>
                      <TableHead className="h-9 text-xs">Status</TableHead>
                      <TableHead className="h-9 text-xs">Grade</TableHead>
                      <TableHead className="h-9 text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : displayedAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {hasActiveFilters ? 'No assignments match your criteria' : 'No assignments found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAssignments.items.map((assignment) => (
                        <TableRow key={assignment.assignment_id || assignment.id} className="text-xs hover:bg-fuchsia-50/40">
                          <TableCell className="py-1.5 font-black">
                            <div className="flex items-center gap-1.5">
                              <span className="h-5 w-1 rounded bg-gradient-to-b from-fuchsia-500 to-indigo-600" />
                              <span className="truncate">{assignment.assignment_title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate py-1.5 text-xs text-muted-foreground">
                            {assignment.description?.substring(0, 50)}...
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-700">
                              <CalendarDays className="mr-1 h-3 w-3" />
                              {formatDate(assignment.due_date)}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">{formatDate(assignment.submission_date)}</TableCell>
                          <TableCell className="py-1.5">
                            <span
                              className={cn(
                                'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm',
                                getStatusColor(assignment.status)
                              )}
                            >
                              {assignment.status}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-black text-indigo-700">
                              {assignment.grade || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenModal(assignment)}
                                className="h-7 w-7 rounded bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(assignment.assignment_id || assignment.id || 0)}
                                className="h-7 w-7 rounded bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4">
                <PaginationBar
                  total={displayedAssignments.length}
                  currentPage={paginatedAssignments.currentPage}
                  totalPages={paginatedAssignments.totalPages}
                  start={paginatedAssignments.start}
                  end={paginatedAssignments.end}
                  pageSize={assignmentPageSize}
                  pageSizeOptions={defaultPageSizeOptions}
                  onPageChange={setAssignmentPage}
                  onPageSizeChange={(nextPageSize) => {
                    setAssignmentPageSize(nextPageSize);
                    setAssignmentPage(1);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add/Edit Assignment Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Assignment' : 'Add New Assignment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                type="text"
                required
                value={formData.assignment_title || ''}
                onChange={(e) => setFormData({ ...formData, assignment_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <textarea
                required
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Class (Optional - leave empty for personal task)"
                name="class_id"
                value={formData.class_id || ''}
                onChange={(value) =>
                  setFormData({ ...formData, class_id: value ? Number(value) : undefined })
                }
                options={classOptions}
                isLoading={isLoadingOptions}
                placeholder="Select a class or leave empty"
              />
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Submission Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.submission_date || ''}
                  onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <select
                  required
                  value={formData.status || 'Pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {assignmentStatusOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.grade || ''}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading}>
                {state.loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssignmentsPage;
