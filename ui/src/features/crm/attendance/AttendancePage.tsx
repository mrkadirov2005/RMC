// Page component for the attendance screen in the crm feature.

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import {
  ArrowLeft,
  Plus,
  BookOpen,
  BookMarked,
  Users,
  User,
  BarChart3,
  Clock,
  UserCheck,
  UserX,
  TrendingUp,
} from 'lucide-react';
import { useAttendancePage } from './hooks/useAttendancePage';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

const AttendanceFormDialog = lazy(() => import('./components/AttendanceFormDialog'));
const AttendanceStatisticsSection = lazy(() => import('./components/AttendanceStatisticsSection'));
const AttendanceFolderTabs = lazy(() => import('./components/AttendanceFolderTabs'));
const AttendanceListView = lazy(() => import('./components/AttendanceListView'));

const folderPageSizeOptions = [12, 24, 48];
const attendancePageSizeOptions = [10, 25, 50, 100];

// Renders the attendance page screen.
const AttendancePage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [folderPage, setFolderPage] = useState(1);
  const [folderPageSize, setFolderPageSize] = useState(12);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendancePageSize, setAttendancePageSize] = useState(25);
  const attendanceHelpers = useAttendancePage();
  const {
    state,
    teachers,
    classes,
    students,
    subjects,
    activeTab,
    setActiveTab,
    selectedFolder,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    studentOptions,
    teacherOptions,
    classOptions,
    isLoadingOptions,
    loadingData,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterDate,
    setFilterDate,
    filterAgeRange,
    setFilterAgeRange,
    showFilters,
    setShowFilters,
    displayedAttendance,
    hasActiveFilters,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleFolderClick,
    handleBackToFolders,
    clearFilters,
    getStudentName,
    getStatusBadgeClasses,
    getAttendanceCountForTeacher,
    getAttendanceCountForClass,
    getPresentCountForClass,
    getAttendanceCountForStudent,
    getPresentCountForStudent,
    attendanceStatusOptions,
  } = attendanceHelpers;

  // Runs side effects for this component.
  useEffect(() => {
    setFolderPage(1);
  }, [activeTab, viewMode]);

  // Runs side effects for this component.
  useEffect(() => {
    setAttendancePage(1);
  }, [searchTerm, filterStatus, filterDate, filterAgeRange, selectedFolder?.type, selectedFolder?.id]);

  // Memoizes the attendance statistics derived value.
  const attendanceStatistics = useMemo(() => {
    const totalRecords = state.items.length;
    const uniqueStudents = new Set(state.items.map((record) => Number(record.student_id))).size;
    const counts = {
      present: 0,
      late: 0,
      absent: 0,
      other: 0,
    };

    state.items.forEach((record) => {
      const status = String(record.status || '').trim().toLowerCase();
      if (status === 'present') {
        counts.present += 1;
      } else if (status === 'late') {
        counts.late += 1;
      } else if (status.includes('absent')) {
        counts.absent += 1;
      } else {
        counts.other += 1;
      }
    });

    const attended = counts.present + counts.late;
    const attendanceRate = totalRecords > 0 ? Math.round((attended / totalRecords) * 100) : 0;

    return {
      totalRecords,
      uniqueStudents,
      attendanceRate,
      counts,
      segments: [
        { label: 'Present', count: counts.present, percent: totalRecords > 0 ? (counts.present / totalRecords) * 100 : 0, className: 'bg-emerald-500' },
        { label: 'Late', count: counts.late, percent: totalRecords > 0 ? (counts.late / totalRecords) * 100 : 0, className: 'bg-amber-500' },
        { label: 'Absent', count: counts.absent, percent: totalRecords > 0 ? (counts.absent / totalRecords) * 100 : 0, className: 'bg-rose-500' },
        { label: 'Other', count: counts.other, percent: totalRecords > 0 ? (counts.other / totalRecords) * 100 : 0, className: 'bg-slate-400' },
      ],
    };
  }, [state.items]);

  const folderGridClass = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3';

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {selectedFolder && (
            <Button variant="outline" size="sm" onClick={handleBackToFolders}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {selectedFolder
              ? `Attendance - ${selectedFolder.name}`
              : 'Attendance Management'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={() => handleOpenModal()} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-700 border-0">
            <Plus className="h-4 w-4 mr-2" /> Add Attendance
          </Button>
        </div>
      </div>

      {/* Overall Summary Cards - Always Visible */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Total Records</p>
            </div>
            <p className="text-2xl font-bold text-white">{attendanceStatistics.totalRecords}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Attendance Rate</p>
            </div>
            <p className="text-2xl font-bold text-white">{attendanceStatistics.attendanceRate}%</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Present</p>
            </div>
            <p className="text-2xl font-bold text-white">{attendanceStatistics.counts.present}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Late</p>
            </div>
            <p className="text-2xl font-bold text-white">{attendanceStatistics.counts.late}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <UserX className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Absent</p>
            </div>
            <p className="text-2xl font-bold text-white">{attendanceStatistics.counts.absent}</p>
          </CardContent>
        </Card>
      </div>

      {!selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <div className="flex space-x-1 overflow-x-auto">
              <Button
                variant={activeTab === 'students' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('students')}
                className={`rounded-b-none ${activeTab === 'students' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg shadow-blue-500/30' : ''}`}
              >
                <Users className="h-4 w-4 mr-2" />
                By Students
              </Button>
              <Button
                variant={activeTab === 'classes' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('classes')}
                className={`rounded-b-none ${activeTab === 'classes' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/30' : ''}`}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                By Classes
              </Button>
              <Button
                variant={activeTab === 'teachers' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('teachers')}
                className={`rounded-b-none ${activeTab === 'teachers' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/30' : ''}`}
              >
                <User className="h-4 w-4 mr-2" />
                By Teachers
              </Button>
              <Button
                variant={activeTab === 'subjects' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('subjects')}
                className={`rounded-b-none ${activeTab === 'subjects' ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white border-0 shadow-lg shadow-cyan-500/30' : ''}`}
              >
                <BookMarked className="h-4 w-4 mr-2" />
                By Subjects
              </Button>
              <Button
                variant={activeTab === 'statistics' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('statistics')}
                className={`rounded-b-none ${activeTab === 'statistics' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg shadow-amber-500/30' : ''}`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistics
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'statistics' && (
              <Suspense fallback={<div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading statistics...</div>}>
                <AttendanceStatisticsSection
                  attendanceStatistics={attendanceStatistics}
                  classesCount={classes.length}
                  teachersCount={teachers.length}
                  subjectsCount={subjects.length}
                />
              </Suspense>
            )}

            {activeTab !== 'statistics' && (
              <Suspense fallback={<div className="text-sm text-muted-foreground p-6">Loading...</div>}>
                <AttendanceFolderTabs
                  activeTab={activeTab}
                  students={students}
                  classes={classes}
                  teachers={teachers}
                  subjects={subjects}
                  loadingData={loadingData}
                  folderPage={folderPage}
                  folderPageSize={folderPageSize}
                  folderPageSizeOptions={folderPageSizeOptions}
                  folderGridClass={folderGridClass}
                  stateItems={state.items}
                  onFolderPageChange={setFolderPage}
                  onFolderPageSizeChange={setFolderPageSize}
                  handleFolderClick={handleFolderClick}
                  getAttendanceCountForStudent={getAttendanceCountForStudent}
                  getPresentCountForStudent={getPresentCountForStudent}
                  getAttendanceCountForClass={getAttendanceCountForClass}
                  getPresentCountForClass={getPresentCountForClass}
                  getAttendanceCountForTeacher={getAttendanceCountForTeacher}
                  getStudentIdsForTeacher={attendanceHelpers.getStudentIdsForTeacher}
                />
              </Suspense>
            )}
          </div>
        </>
      ) : (
        <Suspense fallback={<div className="text-sm text-muted-foreground p-6">Loading...</div>}>
          <AttendanceListView
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            filterAgeRange={filterAgeRange}
            setFilterAgeRange={setFilterAgeRange}
            displayedAttendance={displayedAttendance}
            attendancePage={attendancePage}
            attendancePageSize={attendancePageSize}
            attendancePageSizeOptions={attendancePageSizeOptions}
            onAttendancePageChange={setAttendancePage}
            onAttendancePageSizeChange={setAttendancePageSize}
            stateLoading={state.loading}
            getStudentName={getStudentName}
            getStatusBadgeClasses={getStatusBadgeClasses}
            handleOpenModal={handleOpenModal}
            handleDelete={handleDelete}
            attendanceStatusOptions={attendanceStatusOptions}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <AttendanceFormDialog
          open={isModalOpen}
          editingId={editingId}
          loading={state.loading}
          formData={formData}
          setFormData={setFormData}
          studentOptions={studentOptions}
          teacherOptions={teacherOptions}
          classOptions={classOptions}
          isLoadingOptions={isLoadingOptions}
          attendanceStatusOptions={attendanceStatusOptions}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
        />
      </Suspense>
    </div>
  );
};

export default AttendancePage;
