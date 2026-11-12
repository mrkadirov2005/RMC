import { useEffect, useMemo, useState } from 'react';
import {
  Folder,
  Search,
  X,
  Users,
  BookOpen,
  CreditCard,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageToolbar } from '@/components/common/PageToolbar';
import { SimplePaginationBar } from '@/components/common/SimplePaginationBar';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import type { UsePaymentsPageReturn } from '../hooks/usePaymentsPage';
import { PaymentGroupsMatrixTab } from './PaymentGroupsMatrixTab';
import { PaymentListView } from './PaymentListView';
import { PaymentsMonthStats } from './PaymentsMonthStats';

const paymentSurfaceClass =
  'overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm';

const folderCardClass =
  'cursor-pointer overflow-hidden rounded-none border-0 border-b border-slate-200/80 bg-white shadow-none transition-colors last:border-b-0 hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted/30 [&_.folder-card-content]:p-0';

const folderListClass = 'overflow-hidden rounded-md border border-slate-200/80 bg-white dark:border-border dark:bg-card';
const infoPillClass = 'rounded px-1.5 py-0.5 text-[0.625rem] font-black leading-none whitespace-nowrap';
const rowClass = 'flex flex-nowrap items-center gap-1.5 border-l-4 px-2 py-1 text-xs';
const rowIconClass = 'folder-icon flex h-6 w-6 shrink-0 items-center justify-center rounded bg-opacity-80';
const rowNameClass = 'w-44 shrink-0 truncate text-xs font-semibold';
const rowMetaClass = 'flex min-w-0 shrink-0 items-center gap-1.5 overflow-hidden';
const rowStatsClass = 'flex shrink-0 items-center justify-start gap-1.5 text-left';

interface PaymentsFolderTabsProps {
  hook: UsePaymentsPageReturn;
}

export const PaymentsFolderTabs = ({ hook }: PaymentsFolderTabsProps) => {
  const { t } = useLanguage();
  const {
    dispatch,
    setPaymentsSearchTerm,
    setPaymentsActiveTab,
    activeTab,
    searchTerm,
    isTeacher,
    loadingData,
    folderPageSizeOptions,
    teachers,
    classes,
    // students tab
    filteredRootStudents,
    paginatedRootStudents,
    getPaymentCountForStudent,
    getTotalAmountForStudent,
    // teachers tab
    filteredRootTeachers,
    paginatedRootTeachers,
    getPaymentCountForTeacher,
    getTeacherPaymentStats,
    // pagination
    setFolderPage,
    folderPageSize,
    setFolderPageSize,
    // handlers
    handleFolderClick,
  } = hook;

  useEffect(() => {
    if (activeTab === 'students' || activeTab === 'teachers') {
      dispatch(setPaymentsActiveTab('classes'));
    }
  }, [activeTab, dispatch, setPaymentsActiveTab]);

  const getTeacherName = (teacherId?: number | null) => {
    const teacher = teachers.find((item) => Number(item.teacher_id || item.id) === Number(teacherId));
    return [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ') || t('No teacher');
  };

  const getClassName = (classId?: number | null) => {
    const cls = classes.find((item) => Number(item.class_id || item.id) === Number(classId));
    return cls?.class_name || t('No group');
  };

  const getTeacherNameForStudent = (student: any) => {
    const cls = classes.find((item) => Number(item.class_id || item.id) === Number(student?.class_id));
    return getTeacherName(student?.teacher_id || cls?.teacher_id);
  };

  const getClassCountForTeacher = (teacherId: number) =>
    classes.filter((cls) => Number(cls.teacher_id) === Number(teacherId)).length;

  return (
    <>
      <PageToolbar>
        <div className="space-y-4">
          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={
                activeTab === 'groupPayments'
                  ? t('Search groups in the matrix...')
                  : activeTab === 'classes'
                  ? t('Search classes by name, code, level...')
                  : activeTab === 'teachers' || activeTab === 'statistics'
                    ? t('Search teachers by name or employee ID...')
                    : t('Search students by name or ID...')
              }
              value={searchTerm}
              onChange={(e) => dispatch(setPaymentsSearchTerm(e.target.value))}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => dispatch(setPaymentsSearchTerm(''))}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === 'classes' ? 'default' : 'ghost'}
              onClick={() => dispatch(setPaymentsActiveTab('classes'))}
              className={cn(activeTab === 'classes' && 'bg-cyan-600 text-white hover:bg-cyan-700')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {t('By Classes')}
            </Button>
            <Button
              variant={activeTab === 'groupPayments' ? 'default' : 'ghost'}
              onClick={() => dispatch(setPaymentsActiveTab('groupPayments'))}
              className={cn(activeTab === 'groupPayments' && 'bg-blue-600 text-white hover:bg-blue-700')}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {t('Group payments')}
            </Button>
            {!isTeacher && (
              <Button
                variant={activeTab === 'statistics' ? 'default' : 'ghost'}
                onClick={() => dispatch(setPaymentsActiveTab('statistics'))}
                className={cn(activeTab === 'statistics' && 'bg-slate-800 text-white hover:bg-slate-900')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('Statistics')}
              </Button>
            )}
          </div>
        </div>
      </PageToolbar>

      {/* Tab Content */}
      <div>
        {/* By Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className={folderListClass}>
              {loadingData ? (
                <div className="col-span-full text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">{t('Loading students...')}</p>
                </div>
              ) : filteredRootStudents.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">{searchTerm ? t('No students match your search') : t('No students found')}</p>
                </div>
              ) : (
                paginatedRootStudents.items.map((student) => {
                  const studentId = student.student_id || student.id || 0;
                  const paymentCount = getPaymentCountForStudent(studentId);
                  const totalAmount = getTotalAmountForStudent(studentId);
                  const className = getClassName(student.class_id);
                  const teacherName = getTeacherNameForStudent(student);
                  return (
                    <Card
                      key={studentId}
                      className={cn(folderCardClass, 'border-emerald-100 dark:border-border')}
                      onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                    >
                      <CardContent className="folder-card-content">
                        <div className={cn(rowClass, 'border-emerald-500')}>
                          <div className={cn(rowIconClass, 'bg-emerald-100 text-emerald-700 dark:bg-muted dark:text-muted-foreground')}>
                            <Folder className="h-3.5 w-3.5" />
                            </div>
                          <h3 className={rowNameClass}>{student.first_name} {student.last_name}</h3>
                          <div className={rowMetaClass}>
                            <span className={cn(infoPillClass, 'bg-cyan-100 text-cyan-700')}>{className}</span>
                            <span className={cn(infoPillClass, 'bg-violet-100 text-violet-700')}>{teacherName}</span>
                          </div>
                          <div className={rowStatsClass}>
                            <span className={cn(infoPillClass, 'bg-amber-100 text-amber-700')}>
                              <CreditCard className="mr-1 inline h-3 w-3" />
                              {paymentCount}
                            </span>
                            <span className={cn(infoPillClass, 'bg-emerald-100 text-emerald-700')}>
                              {formatMoney(totalAmount)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
            <SimplePaginationBar
              total={filteredRootStudents.length}
              currentPage={paginatedRootStudents.currentPage}
              totalPages={paginatedRootStudents.totalPages}
              start={paginatedRootStudents.start}
              end={paginatedRootStudents.end}
              pageSize={folderPageSize}
              pageSizeOptions={folderPageSizeOptions}
              onPageChange={setFolderPage}
              onPageSizeChange={(value) => {
                setFolderPageSize(value);
                setFolderPage(1);
              }}
            />
          </div>
        )}

        {activeTab === 'classes' && <GroupPaymentsOverview hook={hook} />}

        {/* Legacy class folders were removed from the UI; see git history for the old markup. */}

        {activeTab === 'groupPayments' && <PaymentGroupsMatrixTab />}

        {/* By Teachers Tab */}
        {activeTab === 'teachers' && (
          <div className="space-y-4">
            <div className={folderListClass}>
              {loadingData ? (
                <div className="col-span-full text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">{t('Loading teachers...')}</p>
                </div>
              ) : filteredRootTeachers.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">{searchTerm ? t('No teachers match your search') : t('No teachers found')}</p>
                </div>
              ) : (
                paginatedRootTeachers.items.map((teacher) => {
                  const teacherId = teacher.teacher_id || teacher.id || 0;
                  const paymentCount = getPaymentCountForTeacher(teacherId);
                  const teacherStats = getTeacherPaymentStats(teacherId);
                  const classCount = getClassCountForTeacher(teacherId);
                  return (
                    <Card
                      key={teacherId}
                      className={cn(folderCardClass, 'border-indigo-100 dark:border-border')}
                      onClick={() => handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)}
                    >
                      <CardContent className="folder-card-content">
                        <div className={cn(rowClass, 'border-indigo-500')}>
                          <div className={cn(rowIconClass, 'bg-indigo-100 text-indigo-700 dark:bg-muted dark:text-muted-foreground')}>
                              <Folder className="h-3.5 w-3.5" />
                            </div>
                          <h3 className={rowNameClass}>{teacher.first_name} {teacher.last_name}</h3>
                          <div className={rowMetaClass}>
                            <span className={cn(infoPillClass, 'bg-indigo-100 text-indigo-700')}>{classCount} {t('classes')}</span>
                            <span className={cn(infoPillClass, 'bg-sky-100 text-sky-700')}>{teacherStats.totalStudents} {t('students')}</span>
                          </div>
                          {isTeacher ? (
                            <div className={rowStatsClass}>
                              <span className={cn(infoPillClass, 'bg-sky-100 text-sky-700')}>
                                <Users className="mr-1 inline h-3 w-3" />
                                {teacherStats.totalStudents}
                              </span>
                              <span className={cn(infoPillClass, 'bg-amber-100 text-amber-700')}>
                                <CreditCard className="mr-1 inline h-3 w-3" />
                                {paymentCount}
                              </span>
                            </div>
                          ) : (
                            <div className={rowStatsClass}>
                              <span className={cn(infoPillClass, 'bg-emerald-100 text-emerald-700')}>{teacherStats.paidStudents} {t('paid')}</span>
                              <span className={cn(infoPillClass, 'bg-rose-100 text-rose-700')}>{teacherStats.unpaidStudents} {t('unpaid')}</span>
                              <span className={cn(infoPillClass, 'bg-amber-100 text-amber-700')}>{paymentCount} {t('payments')}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
            <SimplePaginationBar
              total={filteredRootTeachers.length}
              currentPage={paginatedRootTeachers.currentPage}
              totalPages={paginatedRootTeachers.totalPages}
              start={paginatedRootTeachers.start}
              end={paginatedRootTeachers.end}
              pageSize={folderPageSize}
              pageSizeOptions={folderPageSizeOptions}
              onPageChange={setFolderPage}
              onPageSizeChange={(value) => {
                setFolderPageSize(value);
                setFolderPage(1);
              }}
            />
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && <PaymentsMonthStats />}
      </div>
    </>
  );
};

const GroupPaymentsOverview = ({ hook }: PaymentsFolderTabsProps) => {
  const { t } = useLanguage();
  const [teacherId, setTeacherId] = useState('all');
  const [groupId, setGroupId] = useState('');
  const availableGroups = useMemo(
    () => hook.classes.filter((group) => teacherId === 'all' || Number(group.teacher_id || 0) === Number(teacherId)),
    [hook.classes, teacherId]
  );
  const selectedGroup = hook.classes.find((group) => Number(group.class_id || group.id || 0) === Number(groupId));
  const selectedFolder = selectedGroup
    ? { type: 'class' as const, id: Number(selectedGroup.class_id || selectedGroup.id || 0), name: selectedGroup.class_name }
    : null;

  return (
    <div className="space-y-4">
      <Card className={paymentSurfaceClass}>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">{t('Teacher')}</p>
              <Select
                value={teacherId}
                onValueChange={(value) => {
                  setTeacherId(value);
                  setGroupId('');
                }}
              >
                <SelectTrigger><SelectValue placeholder={t('Choose teacher')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All teachers')}</SelectItem>
                  {hook.teachers.map((teacher) => {
                    const id = Number(teacher.teacher_id || teacher.id || 0);
                    return id ? (
                      <SelectItem key={id} value={String(id)}>
                        {[teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || `Teacher ${id}`}
                      </SelectItem>
                    ) : null;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">{t('Group')}</p>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue placeholder={t('Choose group')} /></SelectTrigger>
                <SelectContent>
                  {availableGroups.map((group) => {
                    const id = Number(group.class_id || group.id || 0);
                    return id ? <SelectItem key={id} value={String(id)}>{group.class_name}</SelectItem> : null;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedFolder ? (
        <PaymentListView hook={{ ...hook, selectedFolder }} />
      ) : (
        <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {t("Choose a teacher and group to see every student's payment status.")}
        </div>
      )}
    </div>
  );
};
