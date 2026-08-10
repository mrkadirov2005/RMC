// Page component for the subjects screen in the crm feature.

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Download,
  GraduationCap,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { useSubjectsPage } from './hooks/useSubjectsPage';
import { useLanguage } from '@/i18n/LanguageContext';
import { PaginationBar, defaultPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';

const infoPillClass = 'rounded px-1.5 py-0.5 text-[10px] font-black leading-none whitespace-nowrap';
const statTileClass = 'rounded-md bg-gradient-to-br p-2 text-white shadow-sm';

// Renders the subjects page screen.
const SubjectsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { t } = useLanguage();
  const {
    state,
    classes,
    teachers,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleImportSubjects,
    handleExportSubjects,
    isImporting,
  } = useSubjectsPage();

  const filteredSubjects = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return state.items;

    return state.items.filter((subject) =>
      [
        subject.subject_code,
        subject.subject_name,
        subject.class_id,
        subject.teacher_id,
        subject.total_marks,
        subject.passing_marks,
      ]
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [searchTerm, state.items]);

  const paginatedSubjects = useMemo(
    () => paginateItems(filteredSubjects, page, pageSize),
    [filteredSubjects, page, pageSize]
  );

  const classLabelMap = useMemo(
    () =>
      new Map(
        classes.map((cls) => [
          Number(cls.class_id || cls.id || 0),
          cls.class_name,
        ])
      ),
    [classes]
  );

  const teacherLabelMap = useMemo(
    () =>
      new Map(
        teachers.map((teacher) => [
          Number(teacher.teacher_id || teacher.id || 0),
          `${teacher.first_name} ${teacher.last_name}`.trim(),
        ])
      ),
    [teachers]
  );

  const assignedClassIds = useMemo(
    () => new Set(state.items.map((subject) => Number(subject.class_id || 0)).filter(Boolean)),
    [state.items]
  );

  const totalClasses = classes.length;
  const assignedClasses = assignedClassIds.size;
  const unassignedClasses = Math.max(totalClasses - assignedClasses, 0);
  const subjectsWithoutTeacher = state.items.filter((subject) => !subject.teacher_id).length;
  const duplicateAssignments = Math.max(state.items.length - assignedClasses, 0);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-4 p-6">
      <div className="overflow-hidden rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 via-cyan-50 to-emerald-50 p-4 shadow-sm dark:border-border dark:from-card dark:via-card dark:to-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/25">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">{t('Subjects Management')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('Keep one subject per class, monitor assignment coverage, and quickly spot classes that still need a subject.')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              id="subjects-csv-import"
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                handleImportSubjects(event.target.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('subjects-csv-import')?.click()}
              disabled={isImporting}
              className="h-9 bg-white/90 shadow-sm"
            >
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isImporting ? t('Importing...') : t('Import CSV')}
            </Button>
            <Button type="button" variant="outline" onClick={handleExportSubjects} className="h-9 bg-white/90 shadow-sm">
              <Download className="mr-2 h-4 w-4" />
              {t('Export CSV')}
            </Button>
            <Button onClick={() => handleOpenModal()} className="h-9 border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/25 hover:from-violet-700 hover:to-cyan-700">
              <Plus className="mr-2 h-4 w-4" /> {t('Add Subject')}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
          <div className={`${statTileClass} from-blue-500 to-indigo-600`}>
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-white/75" />
              <p className="text-[10px] font-black uppercase text-white/75">{t('Total Subjects')}</p>
            </div>
            <p className="text-lg font-black leading-tight">{state.items.length.toLocaleString()}</p>
          </div>
          <div className={`${statTileClass} from-emerald-500 to-teal-600`}>
            <div className="flex items-center gap-1.5">
              <Layers3 className="h-3.5 w-3.5 text-white/75" />
              <p className="text-[10px] font-black uppercase text-white/75">{t('Assigned Classes')}</p>
            </div>
            <p className="text-lg font-black leading-tight">{assignedClasses.toLocaleString()}</p>
          </div>
          <div className={`${statTileClass} from-amber-500 to-orange-600`}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-white/75" />
              <p className="text-[10px] font-black uppercase text-white/75">{t('Unassigned Classes')}</p>
            </div>
            <p className="text-lg font-black leading-tight">{unassignedClasses.toLocaleString()}</p>
          </div>
          <div className={`${statTileClass} ${duplicateAssignments > 0 ? 'from-rose-500 to-pink-600' : 'from-fuchsia-500 to-violet-600'}`}>
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-white/75" />
              <p className="text-[10px] font-black uppercase text-white/75">{t('Without Teacher')}</p>
            </div>
            <p className="text-lg font-black leading-tight">{subjectsWithoutTeacher.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {duplicateAssignments > 0 && (
        <Alert variant="destructive">
          <AlertDescription>{t('Some classes currently have more than one subject assignment. Clean these duplicates so each class keeps a single subject.')}</AlertDescription>
        </Alert>
      )}

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-cyan-100 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="p-2">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('Search subjects by name, code, class, teacher...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 border-cyan-100 bg-cyan-50/40 pl-10 pr-10 text-sm shadow-none"
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
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="p-0">
          <div className="border-t-4 border-t-violet-500">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="h-9 text-xs">{t('Name')}</TableHead>
                  <TableHead className="h-9 text-xs">{t('Class')}</TableHead>
                  <TableHead className="h-9 text-xs">{t('Teacher')}</TableHead>
                  <TableHead className="h-9 text-xs">{t('Marks')}</TableHead>
                  <TableHead className="h-9 text-right text-xs">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filteredSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {searchTerm ? t('No subjects match your search') : t('No subjects found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSubjects.items.map((subject) => (
                    <TableRow key={subject.subject_id || subject.id} className="text-xs hover:bg-violet-50/50">
                      <TableCell className="py-1.5 font-black">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-violet-600 text-white">
                            <BookOpen className="h-3.5 w-3.5" />
                          </span>
                          <span className="truncate">{subject.subject_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className={`${infoPillClass} inline-block bg-cyan-600 text-white`}>
                          {classLabelMap.get(Number(subject.class_id || 0)) || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className={`${infoPillClass} inline-block ${subject.teacher_id ? 'bg-fuchsia-600 text-white' : 'bg-rose-600 text-white'}`}>
                          {teacherLabelMap.get(Number(subject.teacher_id || 0)) || t('Unassigned')}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className={`${infoPillClass} inline-flex items-center bg-emerald-600 text-white`}>
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {subject.passing_marks}/{subject.total_marks}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(subject)} className="h-7 w-7 rounded bg-sky-100 text-sky-700 hover:bg-sky-600 hover:text-white">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.subject_id || subject.id || 0)} className="h-7 w-7 rounded bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white">
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
          <div className="border-t p-2">
            <PaginationBar
              total={filteredSubjects.length}
              currentPage={paginatedSubjects.currentPage}
              totalPages={paginatedSubjects.totalPages}
              start={paginatedSubjects.start}
              end={paginatedSubjects.end}
              pageSize={pageSize}
              pageSizeOptions={defaultPageSizeOptions}
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t('Edit Subject') : t('Add New Subject')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>{t('Subject Name')} *</Label>
                <Input type="text" required value={formData.subject_name || ''} onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Total Marks')} *</Label>
                <Input type="number" required value={formData.total_marks || 100} onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Passing Marks')} *</Label>
                <Input type="number" required value={formData.passing_marks || 40} onChange={(e) => setFormData({ ...formData, passing_marks: Number(e.target.value) })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('Create the subject here. Choose both the subject and teacher from the Group create or edit form.')}</p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>{t('Cancel')}</Button>
              <Button type="submit" disabled={state.loading}>{state.loading ? t('Saving...') : t('Save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubjectsPage;
