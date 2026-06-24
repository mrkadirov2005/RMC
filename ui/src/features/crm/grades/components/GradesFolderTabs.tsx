// Folder card grids for the "By Students / By Classes / By Teachers / By Subjects" tabs.

import { Folder, BookOpen, BookMarked, Users, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SimplePaginationBar } from '@/components/common/SimplePaginationBar';
import type { paginateItems } from '@/components/common/pagination';
import type { Teacher, Class, Student, Subject, FolderType } from '../types';

type PaginatedResult<T> = ReturnType<typeof paginateItems<T>>;

interface GradesFolderTabsProps {
  activeTab: string;
  loadingData: boolean;
  students: Student[];
  classes: Class[];
  teachers: Teacher[];
  subjects: Subject[];
  gradeItems: { student_id: number; percentage: number }[];
  paginatedStudents: PaginatedResult<Student>;
  paginatedClasses: PaginatedResult<Class>;
  paginatedTeachers: PaginatedResult<Teacher>;
  paginatedSubjects: PaginatedResult<Subject>;
  folderGridClass: string;
  folderPage: number;
  folderPageSize: number;
  folderPageSizeOptions: number[];
  setFolderPage: (page: number) => void;
  setFolderPageSize: (size: number) => void;
  handleFolderClick: (type: FolderType, id: number, name: string) => void;
  getGradeCountForStudent: (studentId: number) => number;
  getAveragePercentageForStudent: (studentId: number) => number;
  getGradeCountForClass: (classId: number) => number;
  getAveragePercentageForClass: (classId: number) => number;
  getGradeCountForTeacher: (teacherId: number) => number;
  getStudentIdsForTeacher: (teacherId: number) => number[];
  getGradeColor: (grade: string) => string;
}

const folderRowCardClass =
  'cursor-pointer overflow-hidden rounded-none border-0 border-b border-slate-200/80 bg-white shadow-none transition-colors last:border-b-0 hover:bg-slate-50 dark:border-border dark:bg-card dark:hover:bg-muted/30 [&>div:first-child]:hidden';
const rowIconClass = 'flex h-6 w-6 shrink-0 items-center justify-center rounded';
const rowBodyClass = 'flex min-w-0 shrink-0 items-center gap-1.5 overflow-hidden';
const rowTitleClass = 'w-44 shrink-0 truncate text-xs font-semibold';
const rowStatsClass = 'flex shrink-0 items-center justify-start gap-1.5 text-[10px] font-bold';

const GradesFolderTabs = ({
  activeTab,
  loadingData,
  students,
  classes,
  teachers,
  subjects,
  gradeItems,
  paginatedStudents,
  paginatedClasses,
  paginatedTeachers,
  paginatedSubjects,
  folderGridClass,
  folderPageSize,
  folderPageSizeOptions,
  setFolderPage,
  setFolderPageSize,
  handleFolderClick,
  getGradeCountForStudent,
  getAveragePercentageForStudent,
  getGradeCountForClass,
  getAveragePercentageForClass,
  getGradeCountForTeacher,
  getStudentIdsForTeacher,
  getGradeColor,
}: GradesFolderTabsProps) => {
  const handlePageSizeChange = (pageSize: number) => {
    setFolderPageSize(pageSize);
    setFolderPage(1);
  };

  return (
    <div>
      {/* By Students Tab */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className={folderGridClass}>
            {loadingData ? (
              <div className="col-span-full text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">No students found</p>
              </div>
            ) : (
              paginatedStudents.items.map((student) => {
                const studentId = student.student_id || student.id || 0;
                const gradeCount = getGradeCountForStudent(studentId);
                const avgPercentage = getAveragePercentageForStudent(studentId);
                return (
                  <Card
                    key={studentId}
                    className={folderRowCardClass}
                    onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                  >
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500 dark:hidden" />
                    <CardContent className="flex items-center gap-1.5 px-2 py-1 text-xs">
                      <div className="flex shrink-0 items-center">
                        <div className={`${rowIconClass} bg-blue-100 dark:bg-blue-900/30`}>
                          <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className={rowBodyClass}>
                        <h3 className={rowTitleClass}>{student.first_name} {student.last_name}</h3>
                      </div>
                      <div className={rowStatsClass}>
                        <div className="flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                          <BookOpen className="h-3 w-3" />
                          <span>{gradeCount} grades</span>
                        </div>
                        <div className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700" style={{ color: getGradeColor('A') }}>
                          <span>{avgPercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          <SimplePaginationBar
            total={students.length}
            currentPage={paginatedStudents.currentPage}
            totalPages={paginatedStudents.totalPages}
            start={paginatedStudents.start}
            end={paginatedStudents.end}
            pageSize={folderPageSize}
            pageSizeOptions={folderPageSizeOptions}
            onPageChange={setFolderPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* By Classes Tab */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className={folderGridClass}>
            {loadingData ? (
              <div className="col-span-full text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading classes...</p>
              </div>
            ) : classes.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">No classes found</p>
              </div>
            ) : (
              paginatedClasses.items.map((cls) => {
                const classId = cls.class_id || cls.id || 0;
                const gradeCount = getGradeCountForClass(classId);
                const avgPercentage = getAveragePercentageForClass(classId);
                return (
                  <Card
                    key={classId}
                    className={folderRowCardClass}
                    onClick={() => handleFolderClick('class', classId, cls.class_name)}
                  >
                    <div className="h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 dark:hidden" />
                    <CardContent className="flex items-center gap-1.5 px-2 py-1 text-xs">
                      <div className="flex shrink-0 items-center">
                        <div className={`${rowIconClass} bg-emerald-100 dark:bg-emerald-900/30`}>
                          <Folder className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      </div>
                      <div className={rowBodyClass}>
                        <h3 className={rowTitleClass}>{cls.class_name}</h3>
                      </div>
                      <div className={rowStatsClass}>
                        <div className="flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                          <BookOpen className="h-3 w-3" />
                          <span>{gradeCount} grades</span>
                        </div>
                        <div className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700" style={{ color: getGradeColor('A') }}>
                          <span>{avgPercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          <SimplePaginationBar
            total={classes.length}
            currentPage={paginatedClasses.currentPage}
            totalPages={paginatedClasses.totalPages}
            start={paginatedClasses.start}
            end={paginatedClasses.end}
            pageSize={folderPageSize}
            pageSizeOptions={folderPageSizeOptions}
            onPageChange={setFolderPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* By Teachers Tab */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className={folderGridClass}>
            {loadingData ? (
              <div className="col-span-full text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading teachers...</p>
              </div>
            ) : teachers.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">No teachers found</p>
              </div>
            ) : (
              paginatedTeachers.items.map((teacher) => {
                const teacherId = teacher.teacher_id || teacher.id || 0;
                const gradeCount = getGradeCountForTeacher(teacherId);
                return (
                  <Card
                    key={teacherId}
                    className={folderRowCardClass}
                    onClick={() => handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)}
                  >
                    <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500 dark:hidden" />
                    <CardContent className="flex items-center gap-1.5 px-2 py-1 text-xs">
                      <div className="flex shrink-0 items-center">
                        <div className={`${rowIconClass} bg-violet-100 dark:bg-violet-900/30`}>
                          <Folder className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                      </div>
                      <div className={rowBodyClass}>
                        <h3 className={rowTitleClass}>{teacher.first_name} {teacher.last_name}</h3>
                      </div>
                      <div className={rowStatsClass}>
                        <div className="flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-sky-700">
                          <Users className="h-3 w-3" />
                          <span>{getStudentIdsForTeacher(teacherId).length} students</span>
                        </div>
                        <div className="flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                          <BookOpen className="h-3 w-3" />
                          <span>{gradeCount} grades</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          <SimplePaginationBar
            total={teachers.length}
            currentPage={paginatedTeachers.currentPage}
            totalPages={paginatedTeachers.totalPages}
            start={paginatedTeachers.start}
            end={paginatedTeachers.end}
            pageSize={folderPageSize}
            pageSizeOptions={folderPageSizeOptions}
            onPageChange={setFolderPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      {/* By Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className={folderGridClass}>
            {loadingData ? (
              <div className="col-span-full text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading subjects...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground">No subjects found</p>
              </div>
            ) : (
              paginatedSubjects.items.map((subject) => {
                const subjectId = subject.subject_id || subject.id || 0;
                const classStudents = students.filter((s) => s.class_id === subject.class_id);
                const studentIds = classStudents.map((s) => s.student_id || s.id || 0);
                const subjectGrades = gradeItems.filter((g) => studentIds.includes(g.student_id));
                const avgPercent = subjectGrades.length > 0
                  ? subjectGrades.reduce((acc, g) => acc + (g.percentage || 0), 0) / subjectGrades.length
                  : 0;
                const cls = classes.find((c) => (c.class_id || c.id) === subject.class_id);
                return (
                  <Card
                    key={subjectId}
                    className={folderRowCardClass}
                    onClick={() => handleFolderClick('subject', subject.class_id, subject.subject_name)}
                  >
                    <div className="h-1 bg-gradient-to-r from-cyan-500 to-teal-500 dark:hidden" />
                    <CardContent className="flex items-center gap-1.5 px-2 py-1 text-xs">
                      <div className="flex shrink-0 items-center">
                        <div className={`${rowIconClass} bg-cyan-100 dark:bg-cyan-900/30`}>
                          <BookMarked className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                      </div>
                      <div className={rowBodyClass}>
                        <h3 className={rowTitleClass}>{subject.subject_name}</h3>
                        <p className="truncate rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-700">
                          {cls?.class_name || 'Class'}
                        </p>
                      </div>
                      <div className={rowStatsClass}>
                        <div className="flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-sky-700">
                          <Users className="h-3 w-3" />
                          <span>{classStudents.length} students</span>
                        </div>
                        <div className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700" style={{ color: getGradeColor('A') }}>
                          <span>{avgPercent.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          <SimplePaginationBar
            total={subjects.length}
            currentPage={paginatedSubjects.currentPage}
            totalPages={paginatedSubjects.totalPages}
            start={paginatedSubjects.start}
            end={paginatedSubjects.end}
            pageSize={folderPageSize}
            pageSizeOptions={folderPageSizeOptions}
            onPageChange={setFolderPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default GradesFolderTabs;
