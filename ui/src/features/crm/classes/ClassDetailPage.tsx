import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, CheckCircle2, Coins, FileQuestion, Loader2, Pencil, PencilLine, PlayCircle, Star, Trash2, UserCog } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { classAPI } from './api';
import { getResolvedCenterId } from '@/shared/auth/centerScope';
import { showToast } from '@/utils/toast';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAppSelector } from '../hooks';
import { ClassMonthlyPointsView } from './components/ClassMonthlyPointsView';
import { ClassDialogs } from './components/ClassDialogs';
import { CLASS_DETAIL_TAB_THEME_CLASS, CLASS_OVERVIEW_FIELDS, DEFAULT_CLASS_DETAIL_TAB } from './classDetailOverview';
import { getListRowBackground } from '../settings/listAppearance';
import { useClassDetailData } from './hooks/useClassDetailData';
import { useClassesPage } from './hooks/useClassesPage';
import { useMonthlyClassPoints } from './hooks/useMonthlyClassPoints';
import { toDateKey } from './utils/date';
import { getScheduleDurationMinutes, parseSchedule } from './utils/schedule';
import { mergeRoomInventories } from './classFormOptions';
import { isIncomingTransfer, isTransferredStudentStatus, INCOMING_TRANSFER_VARIANT } from '../students/status';
import { studentsApi } from '../students/api/studentsApi';
import { DeleteStudentDialog } from '../students/components/DeleteStudentDialog';
import { getClassStudentId, removeClassStudentById } from './classStudentActions';

type LessonAction = 'attendance' | 'homework' | 'activity' | 'coins' | 'points';

const defaultLessonActions: LessonAction[] = ['attendance', 'homework', 'activity', 'coins'];

// Overview rows that get an inline "Edit"/"Assign" button opening the full class editor.
// "Students" and "Capacity" are computed from actual enrollment, not raw editable fields.
const EDITABLE_OVERVIEW_FIELDS = new Set([
  'Teacher',
  'Lesson days',
  'Lesson time',
  'Room',
  'Subjects',
  'Tuition',
  'Level',
  'Group code',
]);

const lessonActionOptions: Array<{ id: LessonAction; label: string; detail: string; icon: typeof CalendarCheck }> = [
  { id: 'attendance', label: 'Attendance', detail: 'Mark present, late, excused, or absent.', icon: CalendarCheck },
  { id: 'homework', label: 'Homework', detail: 'Score homework completion.', icon: CheckCircle2 },
  { id: 'activity', label: 'Activity', detail: 'Score class activity.', icon: Star },
  { id: 'coins', label: 'Coins', detail: 'Apply coins from the final score.', icon: Coins },
  { id: 'points', label: 'Points', detail: 'Enter manual points for each student.', icon: PencilLine },
];

const ClassDetailPage = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const authUser = useAppSelector((state) => state.auth.user);
  const { classData, students, setStudents, subjects, sessions, setSessions, assignedTests, loading, error, refetch } = useClassDetailData(classId, authUser);
  const { t } = useLanguage();
  const classesPage = useClassesPage(refetch);
  const roomOptions = useMemo(
    () => mergeRoomInventories(classesPage.physicalRooms, classesPage.rooms, classesPage.formData.room_number),
    [classesPage.physicalRooms, classesPage.rooms, classesPage.formData.room_number]
  );
  const [startingLesson, setStartingLesson] = useState(false);
  const [lessonPickerOpen, setLessonPickerOpen] = useState(false);
  const [selectedLessonActions, setSelectedLessonActions] = useState<LessonAction[]>(defaultLessonActions);
  const [deletingStudentId, setDeletingStudentId] = useState<number | null>(null);
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<(typeof students)[number] | null>(null);

  const schedule = useMemo(() => parseSchedule(classData?.section), [classData?.section]);
  const className = classData?.class_name || 'Class';
  const activeStudents = students.filter((student) => String(student.status || '').toLowerCase() === 'active').length;
  const transferredStudents = students.filter((student) => String(student.status || '').toLowerCase() === 'transferred').length;
  const capacity = Number(classData?.capacity || 0);
  const fillRate = capacity > 0 ? Math.min(100, Math.round((activeStudents / capacity) * 100)) : 0;
  const todayKey = toDateKey(new Date());
  const scheduleRange = schedule.time ? `${schedule.time}${schedule.endTime ? ` - ${schedule.endTime}` : ''}` : '';
  const scheduleText = [schedule.days.join(', '), scheduleRange].filter(Boolean).join(' / ') || 'No schedule';
  const scheduleDurationMinutes = useMemo(() => getScheduleDurationMinutes(schedule), [schedule]);
  const studentRows = students.filter((student) => !student.deleted_at);
  const teacherName = classData?.teacher_name || 'No teacher assigned';
  const overviewItems = [
    { label: CLASS_OVERVIEW_FIELDS[0], value: teacherName },
    { label: CLASS_OVERVIEW_FIELDS[1], value: schedule.days.join(', ') || 'Not scheduled' },
    { label: CLASS_OVERVIEW_FIELDS[2], value: scheduleRange || 'Not scheduled' },
    { label: CLASS_OVERVIEW_FIELDS[3], value: `${activeStudents} active · ${studentRows.length} total · ${transferredStudents} transferred` },
    { label: CLASS_OVERVIEW_FIELDS[4], value: capacity ? `${activeStudents} of ${capacity} (${fillRate}% occupied)` : 'Not specified' },
    { label: CLASS_OVERVIEW_FIELDS[5], value: classData?.room_number || 'Not specified' },
    { label: CLASS_OVERVIEW_FIELDS[6], value: subjects.length === 1 ? '1 subject' : `${subjects.length} subjects` },
    { label: CLASS_OVERVIEW_FIELDS[7], value: `${formatMoney(classData?.payment_amount)} · ${classData?.payment_frequency || 'Monthly'}` },
    { label: CLASS_OVERVIEW_FIELDS[8], value: classData?.level ? `Level ${classData.level}` : 'Not specified' },
    { label: CLASS_OVERVIEW_FIELDS[9], value: classData?.class_code || 'Not specified' },
  ];
  const {
    pointsMonth,
    setPointsMonth,
    pointsLoading,
    monthlyLessonDays,
    monthlyPointsBySessionStudent,
    monthlyPointStats,
  } = useMonthlyClassPoints({
    authUser,
    centerId: Number(classData?.center_id || 0) || undefined,
    schedule,
    sessions,
    students: studentRows,
    todayKey,
  });
  // const recentSessions = sessions.slice(0, 80);

  const openSessionWorkflow = (session: any, actions: LessonAction[] = defaultLessonActions, tab?: LessonAction) => {
    const nextSessionId = Number(session.session_id || session.id);
    if (!nextSessionId) return;
    const params = new URLSearchParams({ actions: actions.join(',') });
    if (tab) params.set('tab', tab);
    navigate(`/classes/${classId}/sessions/${nextSessionId}/workflow?${params.toString()}`);
  };

  const toggleLessonAction = (action: LessonAction, checked: boolean) => {
    setSelectedLessonActions((current) => {
      if (checked) return Array.from(new Set([...current, action]));
      return current.filter((item) => item !== action);
    });
  };

  const handleEditStudent = (student: (typeof students)[number]) => {
    const studentId = getClassStudentId(student);
    if (!studentId) {
      showToast.error('Student ID is missing.');
      return;
    }
    navigate(`/students/${studentId}/edit`);
  };

  const handleDeleteStudent = async (reasonId: number) => {
    const studentId = deleteStudentTarget ? getClassStudentId(deleteStudentTarget) : 0;
    if (!studentId) {
      showToast.error('Student ID is missing.');
      return;
    }

    setDeletingStudentId(studentId);
    try {
      await studentsApi.deleteStudent(studentId, reasonId);
      setStudents((current) => removeClassStudentById(current, studentId));
      showToast.success('Student deleted successfully.');
    } catch (deleteError: any) {
      showToast.error(deleteError?.response?.data?.error || deleteError?.response?.data?.details || 'Failed to delete student.');
    } finally {
      setDeletingStudentId(null);
    }
  };

  const handleStartLesson = async () => {
    if (!classData || !classId) return;
    const scoringActions = selectedLessonActions.filter((action) => action !== 'coins');
    if (scoringActions.length === 0) {
      showToast.error('Pick attendance, homework, activity, or points before starting.');
      return;
    }
    const targetClassId = Number(classData.class_id || classData.id || classId);
    const existingTodaySession = sessions.find((session) => {
      if (!session.session_date) return false;
      return new Date(session.session_date).toISOString().split('T')[0] === todayKey;
    });

    if (existingTodaySession) {
      setLessonPickerOpen(false);
      openSessionWorkflow(existingTodaySession, selectedLessonActions);
      return;
    }

    setStartingLesson(true);
    try {
      const targetCenterId = Number(classData.center_id || 0) || getResolvedCenterId(authUser) || undefined;
      if (!targetCenterId) {
        showToast.error('Please select an active center before starting a lesson.');
        return;
      }
      const response = await classAPI.createSession(targetClassId, {
        center_id: targetCenterId,
        session_date: todayKey,
        start_time: schedule.time || new Date().toTimeString().slice(0, 5),
        duration_minutes: scheduleDurationMinutes,
        teacher_id: authUser?.userType === 'teacher' && authUser?.id ? Number(authUser.id) : Number(classData.teacher_id || 0) || undefined,
      });
      const nextSession = response?.data ?? response;
      setSessions((current) => [...current, nextSession]);
      setLessonPickerOpen(false);
      openSessionWorkflow(nextSession, selectedLessonActions);
    } catch (err) {
      console.error('Failed to start lesson:', err);
      showToast.error('Failed to start lesson.');
    } finally {
      setStartingLesson(false);
    }
  };

  const handleOpenClassEditor = () => {
    if (classData) classesPage.handleOpenModal(classData as any);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="outline" onClick={() => navigate('/classes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Class not found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="owner-palette-scope min-h-full space-y-4 bg-slate-50 p-4 dark:bg-background">
      <div data-class-detail-header="true" className="owner-tertiary-card rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 bg-slate-800 px-2.5 text-xs font-semibold text-white hover:bg-slate-900"
              onClick={() => navigate('/classes')}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back
            </Button>
              <h1 className="truncate text-xl font-bold text-slate-950 dark:text-card-foreground">{className}</h1>
                <span data-class-detail-schedule="true" className="owner-secondary-tag rounded-md bg-emerald-600 px-2 py-1 text-white">{scheduleText}</span>
          </div>
          <Button
            onClick={() => setLessonPickerOpen(true)}
            disabled={startingLesson}
            className="h-9 bg-rose-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-rose-700"
          >
            {startingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            Start Lesson
          </Button>
        </div>
      </div>

      <Dialog open={lessonPickerOpen} onOpenChange={(open) => !startingLesson && setLessonPickerOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pick lesson actions</DialogTitle>
            <DialogDescription>Select what you want to do in this lesson session.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {lessonActionOptions.map((option) => {
              const Icon = option.icon;
              const checked = selectedLessonActions.includes(option.id);
              return (
                <Label
                  key={option.id}
                  htmlFor={`lesson-action-${option.id}`}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition hover:bg-slate-50 dark:hover:bg-muted/40"
                >
                  <Checkbox
                    id={`lesson-action-${option.id}`}
                    checked={checked}
                    onCheckedChange={(value) => toggleLessonAction(option.id, value === true)}
                    className="mt-1"
                  />
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.detail}</span>
                  </span>
                </Label>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonPickerOpen(false)} disabled={startingLesson}>Cancel</Button>
            <Button onClick={handleStartLesson} disabled={startingLesson} className="bg-rose-600 text-white hover:bg-rose-700">
              {startingLesson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteStudentDialog
        open={deleteStudentTarget != null}
        title="Delete student"
        description={`Pick why ${[deleteStudentTarget?.first_name, deleteStudentTarget?.last_name].filter(Boolean).join(' ') || 'this student'} is being removed.`}
        onOpenChange={(open) => (!open ? setDeleteStudentTarget(null) : undefined)}
        onConfirm={handleDeleteStudent}
      />

      <ClassDialogs
        t={t}
        isModalOpen={classesPage.isModalOpen}
        editingId={classesPage.editingId}
        formData={classesPage.formData}
        setFormData={classesPage.setFormData}
        centerOptions={classesPage.centerOptions}
        teacherOptions={classesPage.teacherOptions}
        subjectOptions={classesPage.subjectOptions}
        roomOptions={roomOptions}
        roomConflict={classesPage.roomConflict}
        selectedDays={classesPage.selectedDays}
        scheduleTime={classesPage.scheduleTime}
        scheduleEndTime={classesPage.scheduleEndTime}
        setScheduleTime={classesPage.setScheduleTime}
        setScheduleEndTime={classesPage.setScheduleEndTime}
        handleDayChange={classesPage.handleDayChange}
        weekDays={classesPage.weekDays}
        handleCloseModal={classesPage.handleCloseModal}
        handleSubmit={classesPage.handleSubmit}
        frequencyOptions={classesPage.frequencyOptions}
        isOwner={classesPage.isOwner}
        loading={classesPage.state.loading}
        deleteModalOpen={false}
        deleteTarget={null}
        deleteAttendance={[]}
        deleteLoading={false}
        handleCloseDeleteModal={() => {}}
        handleForceDelete={() => {}}
      />

      <Tabs defaultValue={DEFAULT_CLASS_DETAIL_TAB} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-slate-50 p-2 dark:bg-muted/40">
          <TabsTrigger value="overview" className={`h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-emerald-600 data-[state=active]:text-white ${CLASS_DETAIL_TAB_THEME_CLASS}`}>Overview</TabsTrigger>
          <TabsTrigger value="students" className={`h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white ${CLASS_DETAIL_TAB_THEME_CLASS}`}>Students</TabsTrigger>
          <TabsTrigger value="subjects" className={`h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-amber-500 data-[state=active]:text-white ${CLASS_DETAIL_TAB_THEME_CLASS}`}>Subjects</TabsTrigger>
          <TabsTrigger value="points" className={`h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-violet-600 data-[state=active]:text-white ${CLASS_DETAIL_TAB_THEME_CLASS}`}>Points</TabsTrigger>
          <TabsTrigger value="tests" className={`h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-fuchsia-600 data-[state=active]:text-white ${CLASS_DETAIL_TAB_THEME_CLASS}`}>Tests</TabsTrigger>
          <TabsTrigger value="sessions" className={`h-8 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-rose-600 data-[state=active]:text-white ${CLASS_DETAIL_TAB_THEME_CLASS}`}>Sessions</TabsTrigger>
        </TabsList>

        <div className="p-3">
          <TabsContent value="overview" className="mt-0">
            <div className="overflow-hidden rounded-md border border-slate-200 dark:border-border">
              <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2 dark:bg-muted/40">
                <h2 className="text-sm font-bold text-slate-950 dark:text-card-foreground">General information</h2>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-xs font-semibold"
                  onClick={handleOpenClassEditor}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit details
                </Button>
              </div>
              <dl data-alternating-list="true" className="divide-y divide-slate-200 text-sm dark:divide-border">
                {overviewItems.map((item, index) => (
                  <div
                    key={item.label}
                    data-list-row="true"
                    className="grid min-h-9 grid-cols-[120px_minmax(0,1fr)] items-center gap-3 px-3 py-2 sm:grid-cols-[170px_minmax(0,1fr)]"
                    style={{ backgroundColor: getListRowBackground(index) }}
                  >
                    <dt className="font-medium text-muted-foreground">{item.label}</dt>
                    <dd className="flex min-w-0 flex-wrap items-center gap-2 break-words font-semibold text-slate-950 dark:text-card-foreground">
                      <span className="min-w-0 break-words">{item.value}</span>
                      {EDITABLE_OVERVIEW_FIELDS.has(item.label) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-xs font-semibold"
                          onClick={handleOpenClassEditor}
                        >
                          {item.label === 'Teacher' ? <UserCog className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                          {item.label === 'Teacher' ? (classData?.teacher_id ? 'Change' : 'Assign') : 'Edit'}
                        </Button>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="students" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentRows.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No students enrolled.</TableCell></TableRow>
                ) : studentRows.map((student, index) => {
                  const isTransferred = isTransferredStudentStatus(student.status);
                  const isIncoming = !isTransferred && isIncomingTransfer(student);
                  return (
                  <TableRow
                    key={student.student_id || student.id}
                    className={
                      isTransferred
                        ? 'bg-rose-50/70 text-muted-foreground dark:bg-rose-950/20 dark:text-slate-300'
                        : isIncoming
                          ? 'bg-emerald-50/70 text-slate-950 dark:bg-emerald-950/20 dark:text-slate-100'
                          : 'text-slate-950 hover:bg-sky-50/60 dark:text-slate-100 dark:hover:bg-slate-700'
                    }
                  >
                    <TableCell className="py-2 font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="text-slate-950 dark:text-slate-100">
                          {index+1}
                        </div>
                        <span>{student.first_name} {student.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        isTransferred
                          ? 'bg-rose-500 text-black hover:bg-rose-500 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-600'
                          : isIncoming
                            ? `${INCOMING_TRANSFER_VARIANT} hover:bg-emerald-100 dark:hover:bg-emerald-950/60`
                            : 'bg-emerald-600 text-black hover:bg-emerald-600 dark:bg-emerald-700 dark:text-white dark:hover:bg-emerald-700'
                      }>
                        {isTransferred ? 'Transferred' : isIncoming ? 'New (Transferred)' : student.status || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>{student.phone || '-'}</TableCell>
                    <TableCell className="py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => handleEditStudent(student)}
                          aria-label={`Edit ${student.first_name || ''} ${student.last_name || ''}`.trim()}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                          onClick={() => setDeleteStudentTarget(student)}
                          disabled={deletingStudentId === getClassStudentId(student)}
                          aria-label={`Delete ${student.first_name || ''} ${student.last_name || ''}`.trim()}
                        >
                          {deletingStudentId === getClassStudentId(student) ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="subjects" className="mt-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">No subjects assigned.</div>
            ) : subjects.map((subject) => (
              <Card key={subject.subject_id || subject.id}>
                <CardContent className="p-4">
                  <p className="font-semibold">{subject.subject_name || subject.name || 'Subject'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{subject.description || subject.subject_code || 'No description'}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="points" className="mt-0">
            <ClassMonthlyPointsView
              scheduleDays={schedule.days}
              pointsMonth={pointsMonth}
              setPointsMonth={setPointsMonth}
              monthlyLessonDays={monthlyLessonDays}
              monthlyPointStats={monthlyPointStats}
              pointsLoading={pointsLoading}
              studentRows={studentRows}
              monthlyPointsBySessionStudent={monthlyPointsBySessionStudent}
            />
          </TabsContent>

          <TabsContent value="tests" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedTests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileQuestion className="h-8 w-8 text-muted-foreground/60" />
                        <span>No tests assigned to this class.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : assignedTests.map((test) => {
                  const testId = Number(test.test_id || test.id || 0);
                  return (
                    <TableRow key={`${testId}-${test.assigned_at || ''}`}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">{test.test_name || 'Untitled test'}</p>
                          {test.description && <p className="line-clamp-2 text-xs text-muted-foreground">{test.description}</p>}
                          <div className="flex flex-wrap gap-1">
                            {test.duration_minutes ? <Badge variant="outline">{test.duration_minutes} min</Badge> : null}
                            {test.is_mandatory ? <Badge variant="secondary">Mandatory</Badge> : <Badge variant="outline">Optional</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{test.test_type || '-'}</TableCell>
                      <TableCell>
                        {test.total_marks ?? '-'}
                        {test.passing_marks ? <span className="text-xs text-muted-foreground"> / pass {test.passing_marks}</span> : null}
                      </TableCell>
                      <TableCell>{test.due_date ? new Date(test.due_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <Badge variant={test.is_active === false ? 'outline' : 'secondary'}>
                          {test.is_active === false ? 'Inactive' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => testId && navigate(`/tests/${testId}`)} disabled={!testId}>
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No sessions generated.</TableCell></TableRow>
                ) : sessions.slice(0, 80).map((session) => (
                  <TableRow key={session.session_id || session.id}>
                    <TableCell>{session.session_date ? new Date(session.session_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{session.start_time || '-'}</TableCell>
                    <TableCell>{session.duration_minutes ? `${session.duration_minutes} min` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between gap-3">
                        <span>{session.status || '-'}</span>
                        <Button variant="outline" size="sm" onClick={() => openSessionWorkflow(session)}>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Open
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ClassDetailPage;
