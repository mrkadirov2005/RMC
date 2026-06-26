// Page component for the teachers screen in the crm feature.

import { lazy, Suspense } from 'react';
import { AssignmentSectionTeacher } from './components/AssignmentSectionTeacher';
import {
  ArrowLeft,
  Plus,
  User,
  BookOpen,
  ClipboardList,
  FileQuestion,
  Loader2,
  KeyRound,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/utils/errorMessage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { generateTempPassword } from '@/utils/password';
import { TeacherProfileSummary } from './components/TeacherProfileSummary';
import {
  TeacherAccountPasswordCard,
  TeacherPaymentPasswordDialog,
  TeacherTemporaryPasswordDialog,
} from './components/TeacherPasswordControls';
import { useTeacherDetailPage } from './hooks/useTeacherDetailPage';

const TeacherInfoTab = lazy(() => import('./components/TeacherInfoTab'));
const TeacherClassesStudentsTab = lazy(() => import('./components/TeacherClassesStudentsTab'));
const TeacherPaymentsTab = lazy(() => import('./components/TeacherPaymentsTab'));
const TeacherTestsTabLink = lazy(() => import('./components/TeacherTestsTabLink'));
const TeacherGradeDialog = lazy(() => import('./components/TeacherGradeDialog'));

const TabLoadingState = () => (
  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Loading...
  </div>
);

// Renders the teacher detail page screen.
const TeacherDetailPage = () => {
  const {
    navigate,
    teacher,
    classes,
    subjects,
    assignments,
    payments,
    loading,
    error,
    isGradeModalOpen,
    setIsGradeModalOpen,
    selectedClassId,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTerm,
    setSelectedTerm,
    gradeEntries,
    isSavingGrades,
    tabValue,
    setTabValue,
    expandedClassIds,
    resetPasswordOpen,
    setResetPasswordOpen,
    resetTempPassword,
    resettingPassword,
    newPassword,
    setNewPassword,
    settingPassword,
    paymentPasswordOpen,
    setPaymentPasswordOpen,
    paymentTempPassword,
    setPaymentTempPassword,
    settingPaymentPassword,
    selectedPaymentMonth,
    setSelectedPaymentMonth,
    detailStudentsLoading,
    teacherStudents,
    directAssignedStudents,
    studentClassGroups,
    handleRefreshAll,
    handleOpenGradeModal,
    handleCloseGradeModal,
    handleClassSelect,
    handlePercentageChange,
    handleSaveGrades,
    handleResetPassword,
    handleSetPassword,
    handleCopyTempPassword,
    handleSetPaymentPassword,
    handleCopyPaymentPassword,
    toggleClassExpanded,
    getInitials,
    getStatusClasses,
    getGradeBadgeClasses,
  } = useTeacherDetailPage();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-6 text-center">
        <Alert variant="destructive">
          <AlertDescription>Teacher not found</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/teachers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teachers
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-3 bg-slate-50 p-3 dark:bg-background md:p-4">
      {/* Header */}
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
        <Button
          size="sm"
          className="h-8 w-fit rounded-lg bg-sky-600 text-xs text-white shadow-sm hover:bg-sky-700"
          onClick={() => navigate('/teachers')}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to Teachers
        </Button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 rounded-lg bg-cyan-600 px-2.5 text-xs text-white shadow-sm hover:bg-cyan-700"
            onClick={handleResetPassword}
            disabled={resettingPassword}
          >
            {resettingPassword ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            )}
            Reset Password
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-lg bg-emerald-600 px-2.5 text-xs text-white shadow-sm hover:bg-emerald-700"
            onClick={() => {
              setPaymentTempPassword(generateTempPassword());
              setPaymentPasswordOpen(true);
            }}
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" />
            Set Payment Password
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-lg bg-fuchsia-600 px-2.5 text-xs text-white shadow-sm hover:bg-fuchsia-700"
            onClick={handleOpenGradeModal}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Grades
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{getErrorMessage(error)}</AlertDescription>
        </Alert>
      )}

      <TeacherProfileSummary
        teacher={teacher}
        classesCount={classes.length}
        studentsCount={teacherStudents.length}
        getInitials={getInitials}
        getStatusClasses={getStatusClasses}
      />

      <TeacherAccountPasswordCard
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        settingPassword={settingPassword}
        onSetPassword={handleSetPassword}
      />

      <TeacherPaymentPasswordDialog
        open={paymentPasswordOpen}
        onOpenChange={setPaymentPasswordOpen}
        paymentTempPassword={paymentTempPassword}
        setPaymentTempPassword={setPaymentTempPassword}
        settingPaymentPassword={settingPaymentPassword}
        onGeneratePassword={() => setPaymentTempPassword(generateTempPassword())}
        onCopyPassword={handleCopyPaymentPassword}
        onSavePassword={handleSetPaymentPassword}
      />

      {/* Tabs */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-slate-200 bg-white px-2 py-2 dark:border-border dark:bg-muted/40">
            <TabsTrigger value="info" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <User className="h-3.5 w-3.5" />
              Information
            </TabsTrigger>
            <TabsTrigger value="classes" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              Classes & Students
            </TabsTrigger>
            <TabsTrigger value="assignments" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="tests" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <FileQuestion className="h-3.5 w-3.5" />
              Tests
            </TabsTrigger>
            <TabsTrigger value="payments" className="min-h-8 shrink-0 gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-700 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-sm dark:text-muted-foreground dark:data-[state=active]:bg-background dark:data-[state=active]:text-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Payments
            </TabsTrigger>
          </TabsList>

          <div className="p-3">
            <Suspense fallback={<TabLoadingState />}>
              <TabsContent value="info">
                <TeacherInfoTab teacher={teacher} />
              </TabsContent>

              <TabsContent value="classes">
                <TeacherClassesStudentsTab
                  studentClassGroups={studentClassGroups}
                  directAssignedStudents={directAssignedStudents}
                  expandedClassIds={expandedClassIds}
                  detailStudentsLoading={detailStudentsLoading}
                  onToggleClassExpanded={toggleClassExpanded}
                />
              </TabsContent>

              <TabsContent value="assignments">
                <AssignmentSectionTeacher
                  assignments={assignments}
                  teacherId={teacher?.teacher_id || teacher?.id}
                  onRefresh={handleRefreshAll}
                />
              </TabsContent>

              <TabsContent value="tests">
                <TeacherTestsTabLink navigate={navigate} />
              </TabsContent>

              <TabsContent value="payments">
                <TeacherPaymentsTab
                  studentClassGroups={studentClassGroups}
                  directAssignedStudents={directAssignedStudents}
                  payments={payments}
                  selectedPaymentMonth={selectedPaymentMonth}
                  setSelectedPaymentMonth={setSelectedPaymentMonth}
                />
              </TabsContent>
            </Suspense>
          </div>
        </Tabs>
      </div>

      <TeacherTemporaryPasswordDialog
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
        tempPassword={resetTempPassword}
        onCopyPassword={handleCopyTempPassword}
      />

      <Suspense fallback={null}>
        <TeacherGradeDialog
          open={isGradeModalOpen}
          onOpenChange={setIsGradeModalOpen}
          classes={classes}
          subjects={subjects}
          teacherStudents={teacherStudents}
          selectedClassId={selectedClassId}
          selectedSubjectId={selectedSubjectId}
          selectedTerm={selectedTerm}
          gradeEntries={gradeEntries}
          isSavingGrades={isSavingGrades}
          setSelectedSubjectId={setSelectedSubjectId}
          setSelectedTerm={setSelectedTerm}
          onClose={handleCloseGradeModal}
          onClassSelect={handleClassSelect}
          onPercentageChange={handlePercentageChange}
          onSaveGrades={handleSaveGrades}
          getGradeBadgeClasses={getGradeBadgeClasses}
        />
      </Suspense>
    </div>
  );
};

export default TeacherDetailPage;
