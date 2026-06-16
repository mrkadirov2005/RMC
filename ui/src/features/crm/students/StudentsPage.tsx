// Page component for the students screen in the crm feature.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Coins, Download, FileSpreadsheet, GraduationCap, Plus, School, Upload, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { dataAPI, studentAPI } from '@/shared/api/api';
import { exportCsvEntity } from '@/shared/dataCsv';
import { useLanguage } from '@/i18n/LanguageContext';
import { StudentsFilterPanel } from './components/StudentsFilterPanel';
import { StudentsFiltersBar } from './components/StudentsFiltersBar';
import { StudentsFormDialog } from './components/StudentsFormDialog';
import { StudentsStatisticsTab } from './components/StudentsStatisticsTab';
import { StudentsTableView } from './components/StudentsTableView';
import { useStudentsPage } from './hooks/useStudentsPage';
import type { Student } from './types';
import { showToast } from '@/utils/toast';

// Renders the students page screen.
const StudentsPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState('students');
  const [statisticsStudents, setStatisticsStudents] = useState<Student[]>([]);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSheetsPushing, setIsSheetsPushing] = useState(false);
  const [isSheetsPulling, setIsSheetsPulling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLanguage();
  const s = useStudentsPage();
  const title = t('Students');
  const canImportStudents = s.user?.userType === 'superuser';
// Handles active count.
  const activeCount = [
    s.searchTerm,
    s.filterSchool,
    s.filterClassId,
    s.filterSubjectId,
    s.filterLevel,
    s.filterAddress,
    s.filterAge,
    s.filterGender,
    s.filterStatus,
  ].filter(Boolean).length;
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
  const start = total === 0 ? 0 : (s.page - 1) * s.limit + 1;
  const end = Math.min(total, s.page * s.limit);
  const pageStudents = s.displayedStudents;
  const activeStudents = pageStudents.filter((student) => String(student.status || '').toLowerCase() === 'active').length;
  const schoolsOnPage = new Set(pageStudents.map((student) => String(student.school_name || '').trim()).filter(Boolean)).size;
  const classesOnPage = new Set(pageStudents.map((student) => String(student.class_name || student.school_class || '').trim()).filter(Boolean)).size;
  const coinsOnPage = pageStudents.reduce((sum, student) => sum + (Number(student.coins) || 0), 0);
  const summaryCards = [
    {
      label: t('Students shown'),
      value: pageStudents.length.toLocaleString(),
      detail: `${activeStudents.toLocaleString()} ${t('active')}`,
      icon: Users,
      tone: 'blue' as const,
    },
    {
      label: t('Schools'),
      value: schoolsOnPage.toLocaleString(),
      detail: t('In current view'),
      icon: School,
      tone: 'green' as const,
    },
    {
      label: t('Classes'),
      value: classesOnPage.toLocaleString(),
      detail: t('Assigned groups'),
      icon: GraduationCap,
      tone: 'amber' as const,
    },
    {
      label: t('Coins'),
      value: coinsOnPage.toLocaleString(),
      detail: t('Visible students'),
      icon: Coins,
      tone: 'neutral' as const,
    },
  ];

  useEffect(() => {
    if (activeTab !== 'statistics') return;
    let cancelled = false;
    setStatisticsLoading(true);
    studentAPI.getAll()
      .then((response) => {
        const data = (response as any).data ?? response;
        if (!cancelled) setStatisticsStudents(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (!cancelled) setStatisticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

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
      if (activeTab === 'statistics') {
        const response = await studentAPI.getAll();
        const data = (response as any).data ?? response;
        setStatisticsStudents(Array.isArray(data) ? data : []);
      }
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
    if (activeTab === 'statistics') {
      const response = await studentAPI.getAll();
      const data = (response as any).data ?? response;
      setStatisticsStudents(Array.isArray(data) ? data : []);
    }
  };

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
  const handleExportStudents = () => exportCsvEntity('students', 'Students');

  return (
    <div className="space-y-6">
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
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <Upload className="w-5 h-5 mr-2" /> {isImporting ? t('Importing...') : t('Import CSV')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportStudents}
                >
                  <Download className="w-5 h-5 mr-2" /> {t('Export CSV')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePushStudentsToSheets}
                  disabled={isSheetsPushing || isSheetsPulling}
                >
                  <FileSpreadsheet className="w-5 h-5 mr-2" /> {isSheetsPushing ? t('Updating...') : t('Update Sheets')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePullStudentsFromSheets}
                  disabled={isSheetsPushing || isSheetsPulling}
                >
                  <Download className="w-5 h-5 mr-2" /> {isSheetsPulling ? t('Importing...') : t('Import Sheets')}
                </Button>
              </>
            )}
            <Button onClick={() => s.handleOpenModal()}>
              <Plus className="w-5 h-5 mr-2" /> {t('Add Student')}
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
      {s.state.error && <Alert variant="destructive" className="mb-6"><AlertDescription>{s.state.error}</AlertDescription></Alert>}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="rounded-lg border bg-card p-4 shadow-sm">
        <TabsList className="mb-5 gap-2 bg-slate-100/80 dark:bg-muted">
          <TabsTrigger value="students" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md">{t('Students')}</TabsTrigger>
          <TabsTrigger value="statistics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md">{t('Statistics')}</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-0">
          <StudentsFiltersBar searchTerm={s.searchTerm} onSearchChange={s.setSearchTerm} onClearSearch={() => s.setSearchTerm('')} showFilters={s.showFilters} onToggleFilters={() => s.setShowFilters(!s.showFilters)} hasActiveFilters={s.hasActiveFilters} activeCount={activeCount} onClearAll={s.clearFilters} />
          <StudentsFilterPanel
            open={s.showFilters}
            gender={s.filterGender}
            status={s.filterStatus}
            school={s.filterSchool}
            classId={s.filterClassId}
            subjectId={s.filterSubjectId}
            level={s.filterLevel}
            address={s.filterAddress}
            age={s.filterAge}
            onGender={s.setFilterGender}
            onStatus={s.setFilterStatus}
            onSchool={s.setFilterSchool}
            onClassId={s.setFilterClassId}
            onSubjectId={s.setFilterSubjectId}
            onLevel={s.setFilterLevel}
            onAddress={s.setFilterAddress}
            onAge={s.setFilterAge}
            genderOptions={s.genderOptions}
            statusOptions={s.statusOptions}
            schoolOptions={schoolOptions}
            classOptions={s.classOptions}
            subjectOptions={s.subjectOptions}
            levelOptions={levelOptions}
            addressOptions={addressOptions}
          />
          <StudentsTableView
            students={s.displayedStudents}
            loading={s.state.loading}
            hasActiveFilters={s.hasActiveFilters}
            onView={(id) => navigate(`/students/${id}/profile`)}
            onEdit={s.handleOpenModal}
            onDelete={s.handleDelete}
            onTransfer={handleTransferStudent}
            onBulkDelete={handleBulkDeleteStudents}
            onPasswordUpdate={handlePasswordUpdate}
            onCoinsUpdated={s.actions.fetchAll}
            classOptions={s.classes}
            viewMode={viewMode}
          />
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-border dark:bg-transparent">
            <p className="text-sm text-muted-foreground">
              {t('Showing')} {start}-{end} {t('of')} {total} {t('students')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </TabsContent>
        <TabsContent value="statistics" className="mt-0">
          <StudentsStatisticsTab students={statisticsStudents} teacherOptions={s.teacherOptions} loading={statisticsLoading} />
        </TabsContent>
      </Tabs>
      <StudentsFormDialog open={s.isModalOpen} editing={Boolean(s.editingId)} formData={s.formData} setFormData={s.setFormData} centerOptions={s.centerOptions} classOptions={s.classOptions} teacherOptions={s.teacherOptions} genderOptions={s.genderOptions} statusOptions={s.statusOptions} onClose={s.handleCloseModal} onSubmit={s.handleSubmit} loading={s.state.loading} showCenterField={s.isOwner} error={s.state.error} />
    </div>
  );
};

export default StudentsPage;
