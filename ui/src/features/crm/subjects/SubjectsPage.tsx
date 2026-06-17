// Page component for the subjects screen in the crm feature.

import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, X, Upload, Download, BookOpen, GraduationCap, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
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
import { SelectField } from '../students/components/SelectField';
import { useSubjectsPage } from './hooks/useSubjectsPage';
import { useLanguage } from '@/i18n/LanguageContext';
import { PaginationBar, defaultPageSizeOptions, paginateItems } from '@/components/common/PaginationBar';

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
    classOptions,
    teacherOptions,
    isLoadingOptions,
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
          `${cls.class_name}${cls.class_code ? ` (${cls.class_code})` : ''}`,
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
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('Subjects Management')}
        description={t('Keep one subject per class, monitor assignment coverage, and quickly spot classes that still need a subject.')}
        icon={BookOpen}
        actions={
          <div className="flex items-center gap-2">
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
            >
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isImporting ? t('Importing...') : t('Import CSV')}
            </Button>
            <Button type="button" variant="outline" onClick={handleExportSubjects}>
              <Download className="mr-2 h-4 w-4" />
              {t('Export CSV')}
            </Button>
            <Button onClick={() => handleOpenModal()} className="border-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-indigo-700">
              <Plus className="mr-2 h-4 w-4" /> {t('Add Subject')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t('Total Subjects')} value={state.items.length.toLocaleString()} detail={t('Subject rows currently assigned')} icon={BookOpen} tone="blue" />
        <MetricCard label={t('Assigned Classes')} value={assignedClasses.toLocaleString()} detail={t('Classes that already have a subject')} icon={Layers3} tone="green" />
        <MetricCard label={t('Unassigned Classes')} value={unassignedClasses.toLocaleString()} detail={t('Classes still waiting for a subject')} icon={BookOpen} tone="amber" />
        <MetricCard
          label={t('Subjects Without Teacher')}
          value={subjectsWithoutTeacher.toLocaleString()}
          detail={duplicateAssignments > 0 ? `${duplicateAssignments} ${t('duplicate class assignments')}` : t('Class assignments are currently unique')}
          icon={GraduationCap}
          tone={duplicateAssignments > 0 ? 'red' : 'purple'}
        />
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

      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardContent className="space-y-4 p-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('Search subjects by name, code, class, teacher...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
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

      <Card className="border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
        <CardHeader>
          <CardTitle>{t('All Subjects')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead>{t('Class')}</TableHead>
                  <TableHead>{t('Teacher')}</TableHead>
                  <TableHead>{t('Marks')}</TableHead>
                  <TableHead className="text-right">{t('Actions')}</TableHead>
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
                    <TableRow key={subject.subject_id || subject.id}>
                      <TableCell className="font-medium">{subject.subject_name}</TableCell>
                      <TableCell>{classLabelMap.get(Number(subject.class_id || 0)) || '-'}</TableCell>
                      <TableCell>{teacherLabelMap.get(Number(subject.teacher_id || 0)) || t('Unassigned')}</TableCell>
                      <TableCell>{subject.passing_marks}/{subject.total_marks}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenModal(subject)} className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.subject_id || subject.id || 0)} className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Subject Name')} *</Label>
                <Input type="text" required value={formData.subject_name || ''} onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Subject Code')} *</Label>
                <Input type="text" required value={formData.subject_code || ''} onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label={t('Class')}
                name="class_id"
                value={formData.class_id || ''}
                onChange={(value) => setFormData({ ...formData, class_id: Number(value) })}
                options={classOptions}
                isLoading={isLoadingOptions}
                required
                placeholder={t('Select a class')}
              />
              <SelectField
                label={t('Teacher')}
                name="teacher_id"
                value={formData.teacher_id || ''}
                onChange={(value) => setFormData({ ...formData, teacher_id: value ? Number(value) : undefined })}
                options={teacherOptions}
                isLoading={isLoadingOptions}
                placeholder={t('Select a teacher (optional)')}
              />
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
            <p className="text-xs text-muted-foreground">{t('Each class can keep only one assigned subject.')}</p>
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
