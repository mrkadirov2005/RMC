// Page component for the students screen in the crm feature.

import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, Plus, Upload, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { classAPI, dataAPI, studentAPI } from '@/shared/api/api';
import { exportCsvEntity } from '@/shared/dataCsv';
import { useLanguage } from '@/i18n/LanguageContext';
import { StudentsFilterPanel } from './components/StudentsFilterPanel';
import { StudentsFiltersBar } from './components/StudentsFiltersBar';
import { StudentFormDialog } from './components/StudentFormDialog';
import { StudentsStatisticsTab } from './components/StudentsStatisticsTab';
import { StudentsTableView } from './components/StudentsTableView';
import { StudentsTeacherGroupsTab } from './components/StudentsTeacherGroupsTab';
import { useStudentsPage } from './hooks/useStudentsPage';
import { useStudentsModal } from './hooks/useStudentsModal';
import type { Student } from './types';
import { showToast } from '@/utils/toast';
import { studentGenderOptions, studentStatusOptions } from './utils/studentFormOptions';

const headerActionClass = 'h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white shadow-sm';
const headerActionIconClass = 'h-3.5 w-3.5';

// Renders the students page screen.
const StudentsPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState('students');
  const [isImporting, setIsImporting] = useState(false);
  const [isSheetsPushing, setIsSheetsPushing] = useState(false);
  const [isSheetsPulling, setIsSheetsPulling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLanguage();
  const s = useStudentsPage();
  const title = t('Students');
  const canImportStudents = s.user?.userType === 'superuser';
  const schoolOptions = useMemo(() => {
    const values = new Set<string>();
    for (const student of s.state.items) {
      const school = String(student.school_name || '').trim();
      if (school) values.add(school);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [s.state.items]);
  const levelOptions = useMemo(() => {
    const values = new Set<number>();
    for (const cls of s.classes) {
      const level = Number(cls.level);
      if (Number.isFinite(level)) values.add(level);
    }
    return Array.from(values).sort((a, b) => a - b);
  }, [s.classes]);
  const addressOptions = useMemo(() => {
    const values = new Set<string>();
    for (const center of s.centerItems || []) {
      const address = String((center as any).address || '').trim();
      if (address) values.add(address);
    }
    for (const student of s.state.items) {
      const address = String(student.center_address || '').trim();
      if (address) values.add(address);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [s.centerItems, s.state.items]);
  const total = Number(s.state.meta?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / s.limit));
  const pageStudents = s.displayedStudents;

  const handleImportStudents = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast.error('Please choose a CSV file.');
      return;
    }

    try {
      setIsImporting(true);
      const csv = await file.text();
      await dataAPI.importEntity('students', csv);
      s.actions.fetchAll();
      s.actions.fetchClasses();
    } catch (error: any) {
      showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to import students.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const refreshStudents = async () => {
    s.actions.fetchAll();
    s.actions.fetchClasses();
  };
  const studentModal = useStudentsModal(null, refreshStudents);

  const handlePushStudentsToSheets = async () => {
    try {
      setIsSheetsPushing(true);
      await dataAPI.pushEntityToSheets('students');
    } catch (error: any) {
      showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to update Google Sheets.');
    } finally {
      setIsSheetsPushing(false);
    }
  };

  const handlePullStudentsFromSheets = async () => {
    try {
      setIsSheetsPulling(true);
      await dataAPI.pullEntityFromSheets('students');
      await refreshStudents();
    } catch (error: any) {
      showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to import from Google Sheets.');
    } finally {
      setIsSheetsPulling(false);
    }
  };

  const handlePasswordUpdate = async (student: Student, password: string) => {
    const id = student.student_id || student.id;
    if (!id) {
      showToast.error('Student ID is missing.');
      throw new Error('Student ID is missing.');
    }
    const username = String(student.username || '').trim();
    if (!username) {
      showToast.error('Student username is required before setting a password.');
      throw new Error('Student username is missing.');
    }

    try {
      await studentAPI.setPassword(id, { username, password });
    } catch (error: any) {
      showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to update password.');
      throw error;
    }
  };
  const handleBulkDeleteStudents = async (ids: number[]) => {
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected student${ids.length === 1 ? '' : 's'}?`)) return;

    let failed = 0;
    for (const id of ids) {
      try {
        await studentAPI.delete(id);
      } catch {
        failed += 1;
      }
    }
    await refreshStudents();
    if (failed > 0) {
      showToast.error(`Deleted ${ids.length - failed}; ${failed} failed.`);
    } else {
      showToast.success(`Deleted ${ids.length} student${ids.length === 1 ? '' : 's'}.`);
    }
  };
  const handleTransferStudent = async (student: Student, targetClassId: number) => {
    const id = student.student_id || student.id;
    if (!id) {
      showToast.error('Student ID is missing.');
      throw new Error('Student ID is missing.');
    }

    try {
      await studentAPI.transfer(id, targetClassId);
      showToast.success('Student transferred successfully.');
      await refreshStudents();
    } catch (error: any) {
      showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to transfer student.');
      throw error;
    }
  };
  const handleTransferGroupOwner = async (classId: number, teacherId: number) => {
    try {
      await classAPI.update(classId, { teacher_id: teacherId });
      showToast.success('Group teacher updated successfully.');
      await refreshStudents();
    } catch (error: any) {
      showToast.error(error?.response?.data?.error || error?.response?.data?.details || 'Failed to update group teacher.');
      throw error;
    }
  };
  const handleBulkDeleteGroups = async (classIds: number[]) => {
    const ids = classIds.filter((id) => id > 0);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected group${ids.length === 1 ? '' : 's'}?`)) return;

    let failed = 0;
    for (const id of ids) {
      try {
        await classAPI.delete(id);
      } catch {
        failed += 1;
      }
    }
    await refreshStudents();
    if (failed > 0) {
      showToast.error(`Deleted ${ids.length - failed}; ${failed} failed.`);
    } else {
      showToast.success(`Deleted ${ids.length} group${ids.length === 1 ? '' : 's'}.`);
    }
  };
  const handleExportStudents = () => exportCsvEntity('students', 'Students');

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={t('Browse, filter, and manage student profiles with quick access to classes, schools, status, and coin balances.')}
        icon={Users}
        actions={
          <>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            {canImportStudents && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => handleImportStudents(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className={`${headerActionClass} bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:text-white`}
                >
                  <Upload className={headerActionIconClass} /> {isImporting ? t('Importing...') : t('Import CSV')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExportStudents}
                  className={`${headerActionClass} bg-emerald-600 hover:bg-emerald-700`}
                >
                  <Download className={headerActionIconClass} /> {t('Export CSV')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePushStudentsToSheets}
                  disabled={isSheetsPushing || isSheetsPulling}
                  className={`${headerActionClass} bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-fuchsia-400 disabled:text-white`}
                >
                  <FileSpreadsheet className={headerActionIconClass} /> {isSheetsPushing ? t('Updating...') : t('Update Sheets')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handlePullStudentsFromSheets}
                  disabled={isSheetsPushing || isSheetsPulling}
                  className={`${headerActionClass} bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 disabled:text-white`}
                >
                  <Download className={headerActionIconClass} /> {isSheetsPulling ? t('Importing...') : t('Import Sheets')}
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => studentModal.handleOpenModal()} className={`${headerActionClass} bg-rose-600 hover:bg-rose-700`}>
              <Plus className={headerActionIconClass} /> {t('Add Student')}
            </Button>
          </>
        }
      />

      {s.state.error && <Alert variant="destructive" className="mb-6"><AlertDescription>{s.state.error}</AlertDescription></Alert>}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="rounded-lg border bg-card p-4 shadow-sm">
        <TabsList className="mb-5 bg-slate-100/80 dark:bg-muted">
          <TabsTrigger value="students">{t('Students')}</TabsTrigger>
          <TabsTrigger value="statistics">{t('Statistics')}</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-0">
          <StudentsFiltersBar searchTerm={s.searchTerm} onSearchChange={s.setSearchTerm} onClearSearch={() => s.setSearchTerm('')} showFilters={s.showFilters} onToggleFilters={() => s.setShowFilters(!s.showFilters)} hasActiveFilters={s.hasActiveFilters} onClearAll={s.clearFilters} />
          <StudentsFilterPanel
            open={s.showFilters}
            gender={s.filterGender}
            status={s.filterStatus}
            school={s.filterSchool}
            classId={s.filterClassId}
            teacherId={s.filterTeacherId}
            subjectId={s.filterSubjectId}
            level={s.filterLevel}
            address={s.filterAddress}
            age={s.filterAge}
            onGender={s.setFilterGender}
            onStatus={s.setFilterStatus}
            onSchool={s.setFilterSchool}
            onClassId={s.setFilterClassId}
            onTeacherId={s.setFilterTeacherId}
            onSubjectId={s.setFilterSubjectId}
            onLevel={s.setFilterLevel}
            onAddress={s.setFilterAddress}
            onAge={s.setFilterAge}
            genderOptions={s.genderOptions}
            statusOptions={s.statusOptions}
            schoolOptions={schoolOptions}
            classOptions={s.classOptions}
            teacherOptions={s.teacherOptions}
            subjectOptions={s.subjectOptions}
            levelOptions={levelOptions}
            addressOptions={addressOptions}
          />
          <StudentsTableView
            students={s.displayedStudents}
            loading={s.state.loading}
            hasActiveFilters={s.hasActiveFilters}
            onView={(id) => navigate(`/students/${id}/profile`)}
            onEdit={(student) => navigate(`/students/${student.student_id || student.id}/edit`)}
            onDelete={s.handleDelete}
            onTransfer={handleTransferStudent}
            onBulkDelete={handleBulkDeleteStudents}
            onPasswordUpdate={handlePasswordUpdate}
            onCoinsUpdated={s.actions.fetchAll}
            classOptions={s.classes}
            teacherOptions={s.teacherOptions}
            viewMode={viewMode}
            startIndex={(s.page - 1) * s.limit}
          />
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-border dark:bg-transparent">
              <Select value={String(s.limit)} onValueChange={(value) => s.setLimit(Number(value))}>
                <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((value) => <SelectItem key={value} value={String(value)}>{value} / {t('page')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => s.setPage(Math.max(1, s.page - 1))} disabled={s.page <= 1 || s.state.loading}>
                <ChevronLeft className="mr-1 h-4 w-4" /> {t('Prev')}
              </Button>
              <span className="min-w-[90px] text-center text-sm font-medium">{t('Page')} {s.page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => s.setPage(Math.min(totalPages, s.page + 1))} disabled={s.page >= totalPages || s.state.loading}>
                {t('Next')} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
          </div>
        </TabsContent>
        <TabsContent value="statistics" className="mt-0">
          <StudentsStatisticsTab students={pageStudents} teacherOptions={s.teacherOptions} loading={s.state.loading} />
        </TabsContent>
        <TabsContent value="teachers" className="mt-0">
          <StudentsTeacherGroupsTab
            students={pageStudents}
            classes={s.classes}
            teachers={s.teachers}
            teacherOptions={s.teacherOptions}
            loading={s.state.loading || s.loadingClasses || s.isLoadingOptions}
            viewMode={viewMode}
            onView={(id) => navigate(`/students/${id}/profile`)}
            onEdit={(student) => navigate(`/students/${student.student_id || student.id}/edit`)}
            onDelete={s.handleDelete}
            onTransfer={handleTransferStudent}
            onBulkDelete={handleBulkDeleteStudents}
            onPasswordUpdate={handlePasswordUpdate}
            onCoinsUpdated={s.actions.fetchAll}
            onTransferGroup={handleTransferGroupOwner}
            onDeleteGroups={handleBulkDeleteGroups}
          />
        </TabsContent>
      </Tabs>

      <StudentFormDialog
        open={studentModal.isModalOpen}
        onOpenChange={(open) => {
          if (!open) studentModal.handleCloseModal();
        }}
        formData={studentModal.formData}
        setFormData={studentModal.setFormData}
        onSubmit={studentModal.handleSubmit}
        saving={studentModal.saving}
        showCenterField={s.isOwner}
        centerOptions={s.centerOptions}
        classOptions={s.classOptions}
        teacherOptions={s.teacherOptions}
        genderOptions={studentGenderOptions}
        statusOptions={studentStatusOptions}
        classes={s.classes}
      />
    </div>
  );
};

export default StudentsPage;
