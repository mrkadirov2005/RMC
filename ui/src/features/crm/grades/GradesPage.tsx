// Page component for the grades screen in the crm feature.

import { lazy, Suspense, useEffect } from 'react';
import { ArrowLeft, Plus, BookOpen, BookMarked, BarChart3, Award, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ViewModeToggle } from '@/components/common/ViewModeToggle';
import { useGradesPage } from './hooks/useGradesPage';

const GradeFormDialog = lazy(() => import('./components/GradeFormDialog'));
const GradesStatisticsSection = lazy(() => import('./components/GradesStatisticsSection'));
const GradesFolderTabs = lazy(() => import('./components/GradesFolderTabs'));
const GradeListView = lazy(() => import('./components/GradeListView'));

// Renders the grades page screen.
const GradesPage = () => {
  const g = useGradesPage();

  useEffect(() => {
    if (g.activeTab === 'students' || g.activeTab === 'teachers') {
      g.dispatch(g.setGradesActiveTab('classes'));
    }
  }, [g.activeTab, g.dispatch, g.setGradesActiveTab]);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {g.selectedFolder && (
            <Button variant="outline" size="sm" onClick={g.handleBackToFolders}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {g.selectedFolder
              ? `Grades - ${g.selectedFolder.name}`
              : 'Grades Management'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ViewModeToggle value={g.viewMode} onChange={g.setViewMode} />
          <Button onClick={() => g.handleOpenModal()} className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700 border-0">
            <Plus className="h-4 w-4 mr-2" /> Add Grade
          </Button>
        </div>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-white/70" />
              <p className="text-[10px] font-bold uppercase text-white/70">Total Grades</p>
            </div>
            <p className="text-lg font-black text-white">{g.gradeStatistics.totalGrades}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-white/70" />
              <p className="text-[10px] font-bold uppercase text-white/70">Average</p>
            </div>
            <p className="text-lg font-black text-white">{g.gradeStatistics.averagePercentage.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-white/70" />
              <p className="text-[10px] font-bold uppercase text-white/70">Passing</p>
            </div>
            <p className="text-lg font-black text-white">{g.gradeStatistics.passingGrades}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-white/70" />
              <p className="text-[10px] font-bold uppercase text-white/70">Failing</p>
            </div>
            <p className="text-lg font-black text-white">{g.gradeStatistics.failingGrades}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-white/70" />
              <p className="text-[10px] font-bold uppercase text-white/70">Pass Rate</p>
            </div>
            <p className="text-lg font-black text-white">{g.gradeStatistics.passRate}%</p>
          </CardContent>
        </Card>
      </div>

      {!g.selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <div className="flex space-x-1 overflow-x-auto">
              <Button
                variant={g.activeTab === 'classes' ? 'default' : 'ghost'}
                onClick={() => g.dispatch(g.setGradesActiveTab('classes'))}
                className={`rounded-b-none ${g.activeTab === 'classes' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/30' : ''}`}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                By Classes
              </Button>
              <Button
                variant={g.activeTab === 'subjects' ? 'default' : 'ghost'}
                onClick={() => g.dispatch(g.setGradesActiveTab('subjects'))}
                className={`rounded-b-none ${g.activeTab === 'subjects' ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white border-0 shadow-lg shadow-cyan-500/30' : ''}`}
              >
                <BookMarked className="h-4 w-4 mr-2" />
                By Subjects
              </Button>
              <Button
                variant={g.activeTab === 'statistics' ? 'default' : 'ghost'}
                onClick={() => g.dispatch(g.setGradesActiveTab('statistics'))}
                className={`rounded-b-none ${g.activeTab === 'statistics' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg shadow-amber-500/30' : ''}`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistics
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {g.activeTab === 'statistics' && (
              <Suspense fallback={<div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">Loading statistics...</div>}>
                <GradesStatisticsSection
                  gradeStatistics={g.gradeStatistics}
                  studentsCount={g.students.length}
                  classesCount={g.classes.length}
                  teachersCount={g.teachers.length}
                  subjectsCount={g.subjects.length}
                />
              </Suspense>
            )}

            {(g.activeTab === 'students' || g.activeTab === 'classes' || g.activeTab === 'teachers' || g.activeTab === 'subjects') && (
              <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading...</div>}>
                <GradesFolderTabs
                  activeTab={g.activeTab}
                  loadingData={g.loadingData}
                  students={g.students}
                  classes={g.classes}
                  teachers={g.teachers}
                  subjects={g.subjects}
                  gradeItems={g.state.items}
                  paginatedStudents={g.paginatedStudents}
                  paginatedClasses={g.paginatedClasses}
                  paginatedTeachers={g.paginatedTeachers}
                  paginatedSubjects={g.paginatedSubjects}
                  folderGridClass={g.folderGridClass}
                  folderPage={g.folderPage}
                  folderPageSize={g.folderPageSize}
                  folderPageSizeOptions={g.folderPageSizeOptions}
                  setFolderPage={g.setFolderPage}
                  setFolderPageSize={g.setFolderPageSize}
                  handleFolderClick={g.handleFolderClick}
                  getGradeCountForStudent={g.getGradeCountForStudent}
                  getAveragePercentageForStudent={g.getAveragePercentageForStudent}
                  getGradeCountForClass={g.getGradeCountForClass}
                  getAveragePercentageForClass={g.getAveragePercentageForClass}
                  getGradeCountForTeacher={g.getGradeCountForTeacher}
                  getStudentIdsForTeacher={g.getStudentIdsForTeacher}
                  getGradeColor={g.getGradeColor}
                />
              </Suspense>
            )}
          </div>
        </>
      ) : (
        <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading...</div>}>
          <GradeListView
            loading={g.state.loading}
            searchTerm={g.searchTerm}
            filterTerm={g.filterTerm}
            filterGrade={g.filterGrade}
            filterAgeRange={g.filterAgeRange}
            showFilters={g.showFilters}
            hasActiveFilters={g.hasActiveFilters}
            displayedGrades={g.displayedGrades}
            paginatedGrades={g.paginatedGrades}
            gradesPageSize={g.gradesPageSize}
            gradePageSizeOptions={g.gradePageSizeOptions}
            onSearchChange={(v) => g.dispatch(g.setGradesSearchTerm(v))}
            onFilterTermChange={(v) => g.dispatch(g.setGradesFilterTerm(v))}
            onFilterGradeChange={(v) => g.dispatch(g.setGradesFilterGrade(v))}
            onFilterAgeRangeChange={g.setFilterAgeRange}
            onToggleFilters={() => g.dispatch(g.setGradesShowFilters(!g.showFilters))}
            onClearFilters={g.clearFilters}
            onPageChange={g.setGradesPage}
            onPageSizeChange={g.setGradesPageSize}
            onEdit={g.handleOpenModal}
            onDelete={g.handleDelete}
            getStudentName={g.getStudentName}
            getGradeBadgeClasses={g.getGradeBadgeClasses}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <GradeFormDialog
          open={g.isModalOpen}
          editingId={g.editingId}
          loading={g.state.loading}
          formData={g.formData}
          setFormData={g.setFormData}
          studentOptions={g.studentOptions}
          teacherOptions={g.teacherOptions}
          subjectOptions={g.subjectOptions}
          classOptions={g.classOptions}
          isLoadingOptions={g.isLoadingOptions}
          onClose={g.handleCloseModal}
          onSubmit={g.handleSubmit}
          onMarksChange={g.handleMarksChange}
        />
      </Suspense>
    </div>
  );
};

export default GradesPage;
