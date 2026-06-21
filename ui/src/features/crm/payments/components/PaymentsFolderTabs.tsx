import {
  Folder,
  Search,
  X,
  Users,
  BookOpen,
  User,
  CreditCard,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageToolbar } from '@/components/common/PageToolbar';
import { SimplePaginationBar } from '@/components/common/SimplePaginationBar';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/utils/helpers';
import { useLanguage } from '@/i18n/LanguageContext';
import type { UsePaymentsPageReturn } from '../hooks/usePaymentsPage';

const paymentSurfaceClass =
  'overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_50px_-38px_rgba(15,23,42,0.6)] dark:border-border dark:bg-card dark:shadow-sm';

const folderCardClass =
  'cursor-pointer overflow-hidden rounded-none border-0 border-b border-slate-200/80 bg-white shadow-none transition-colors last:border-b-0 hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted/30 [&_.folder-card-content]:p-0';

const folderListClass = 'overflow-hidden rounded-md border border-slate-200/80 bg-white dark:border-border dark:bg-card';
const infoPillClass = 'rounded px-1.5 py-0.5 text-[10px] font-black leading-none whitespace-nowrap';
const rowClass = 'flex flex-nowrap items-center gap-1.5 border-l-4 px-2 py-1 text-xs';
const rowIconClass = 'folder-icon flex h-6 w-6 shrink-0 items-center justify-center rounded bg-opacity-80';
const rowNameClass = 'w-44 shrink-0 truncate text-xs font-semibold';
const rowMetaClass = 'flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden';
const rowStatsClass = 'ml-auto flex shrink-0 items-center gap-1.5 text-right';

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
    // classes tab
    filteredRootClasses,
    paginatedRootClasses,
    getPaymentCountForClass,
    getTotalAmountForClass,
    // teachers tab
    filteredRootTeachers,
    paginatedRootTeachers,
    getPaymentCountForTeacher,
    getTeacherPaymentStats,
    // statistics tab
    overallPaymentStats,
    filteredTeacherOverallStats,
    // pagination
    setFolderPage,
    folderPageSize,
    setFolderPageSize,
    // handlers
    handleFolderClick,
  } = hook;

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
                activeTab === 'classes'
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
              variant={activeTab === 'students' ? 'default' : 'ghost'}
              onClick={() => dispatch(setPaymentsActiveTab('students'))}
              className={cn(activeTab === 'students' && 'bg-emerald-600 text-white hover:bg-emerald-700')}
            >
              <Users className="h-4 w-4 mr-2" />
              {t('By Students')}
            </Button>
            <Button
              variant={activeTab === 'classes' ? 'default' : 'ghost'}
              onClick={() => dispatch(setPaymentsActiveTab('classes'))}
              className={cn(activeTab === 'classes' && 'bg-cyan-600 text-white hover:bg-cyan-700')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {t('By Classes')}
            </Button>
            <Button
              variant={activeTab === 'teachers' ? 'default' : 'ghost'}
              onClick={() => dispatch(setPaymentsActiveTab('teachers'))}
              className={cn(activeTab === 'teachers' && 'bg-indigo-600 text-white hover:bg-indigo-700')}
            >
              <User className="h-4 w-4 mr-2" />
              {t('By Teachers')}
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

        {/* By Classes Tab */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            <div className={folderListClass}>
              {loadingData ? (
                <div className="col-span-full text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">{t('Loading classes...')}</p>
                </div>
              ) : filteredRootClasses.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">{searchTerm ? t('No classes match your search') : t('No classes found')}</p>
                </div>
              ) : (
                paginatedRootClasses.items.map((cls) => {
                  const classId = cls.class_id || cls.id || 0;
                  const paymentCount = getPaymentCountForClass(classId);
                  const totalAmount = getTotalAmountForClass(classId);
                  const teacherName = getTeacherName(cls.teacher_id);
                  return (
                    <Card
                      key={classId}
                      className={cn(folderCardClass, 'border-cyan-100 dark:border-border')}
                      onClick={() => handleFolderClick('class', classId, cls.class_name)}
                    >
                      <CardContent className="folder-card-content">
                        <div className={cn(rowClass, 'border-cyan-500')}>
                          <div className={cn(rowIconClass, 'bg-cyan-100 text-cyan-700 dark:bg-muted dark:text-muted-foreground')}>
                              <Folder className="h-3.5 w-3.5" />
                            </div>
                          <h3 className={rowNameClass}>{cls.class_name}</h3>
                          <div className={rowMetaClass}>
                            <span className={cn(infoPillClass, 'bg-violet-100 text-violet-700')}>{teacherName}</span>
                            <span className={cn(infoPillClass, 'bg-sky-100 text-sky-700')}>Level {cls.level}</span>
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
              total={filteredRootClasses.length}
              currentPage={paginatedRootClasses.currentPage}
              totalPages={paginatedRootClasses.totalPages}
              start={paginatedRootClasses.start}
              end={paginatedRootClasses.end}
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
        {activeTab === 'statistics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">{t('Payments')}</p>
                  <p className="text-lg font-bold text-white">{overallPaymentStats.totalPayments}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">{t('Total Amount')}</p>
                  <p className="text-lg font-bold text-white">{formatMoney(overallPaymentStats.totalAmount)}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">{t('Paid Amount')}</p>
                  <p className="text-lg font-bold text-white">{formatMoney(overallPaymentStats.paidAmount)}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">{t('Unpaid Amount')}</p>
                  <p className="text-lg font-bold text-white">{formatMoney(overallPaymentStats.unpaidAmount)}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-400 via-orange-500 to-orange-600">
                <CardContent className="p-3">
                  <p className="text-xs text-white/70">{t('Paid Share')}</p>
                  <p className="text-lg font-bold text-white">{overallPaymentStats.paidPercent}%</p>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm dark:border-border dark:bg-card dark:bg-none">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-medium">{t('Paid vs Unpaid')}</p>
                  <p className="text-xs text-muted-foreground">{t('Relative payment amount across all records')}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{overallPaymentStats.paidPercent}% {t('paid')}</p>
                  <p>{overallPaymentStats.unpaidPercent}% {t('unpaid')}</p>
                </div>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                <div className="flex h-full w-full">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${overallPaymentStats.paidPercent}%` }}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all duration-300"
                    style={{ width: `${overallPaymentStats.unpaidPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {!isTeacher && (
              <div className={cn(paymentSurfaceClass, 'rounded-lg [&_table]:text-xs [&_th]:text-xs [&_td]:py-2')}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Worked</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Unpaid</TableHead>
                      <TableHead>Paid Students</TableHead>
                      <TableHead>Unpaid Students</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingData ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-muted-foreground">Loading statistics...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredTeacherOverallStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No teachers match your search' : 'No teachers found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTeacherOverallStats.map(({ teacher, teacherId, stats }) => (
                        <TableRow
                          key={teacherId}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() =>
                            handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)
                          }
                        >
                          <TableCell>
                            <div>
                              <p className="font-semibold">{teacher.first_name} {teacher.last_name}</p>
                            </div>
                          </TableCell>
                          <TableCell>{stats.totalStudents}</TableCell>
                          <TableCell className="font-semibold">{formatMoney(stats.totalWorked)}</TableCell>
                          <TableCell className="font-medium text-emerald-700">{formatMoney(stats.paidAmount)}</TableCell>
                          <TableCell className="font-medium text-rose-700">{formatMoney(stats.unpaidAmount)}</TableCell>
                          <TableCell>{stats.paidStudents}</TableCell>
                          <TableCell>{stats.unpaidStudents}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
