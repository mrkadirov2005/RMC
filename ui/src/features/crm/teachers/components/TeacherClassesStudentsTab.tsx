import { BookOpen, ChevronDown, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeacherClassesStudentsTabProps {
  studentClassGroups: Array<{
    classId: number;
    classItem: any;
    students: any[];
    isTeacherOwned: boolean;
  }>;
  directAssignedStudents: any[];
  expandedClassIds: Set<number>;
  detailStudentsLoading: boolean;
  onToggleClassExpanded: (classId: number) => void;
}

export default function TeacherClassesStudentsTab({
  studentClassGroups,
  directAssignedStudents,
  expandedClassIds,
  detailStudentsLoading,
  onToggleClassExpanded,
}: TeacherClassesStudentsTabProps) {
  if (studentClassGroups.length === 0 && directAssignedStudents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="h-16 w-16 mx-auto opacity-30 mb-4" />
        <h3 className="text-lg font-semibold">No classes or students assigned to this teacher</h3>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {studentClassGroups.map(({ classId, classItem, students: classStudents, isTeacherOwned }) => {
        const isExpanded = expandedClassIds.has(classId);
        return (
          <div key={classId} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <button
              type="button"
              onClick={() => onToggleClassExpanded(classId)}
              className="flex w-full items-center gap-2 bg-white p-2.5 text-left transition-colors hover:bg-sky-50 dark:bg-muted/40 dark:hover:bg-muted/60"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="flex-grow">
                <h3 className="text-sm font-semibold">{classItem.class_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {isTeacherOwned ? 'Teacher group' : 'Student group'} / Level: {classItem.level || 'N/A'}
                </p>
              </div>
              <Badge className="bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-600">
                {classStudents.length} Students
              </Badge>
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
            </button>
            {isExpanded && (
              <div className="border-t border-slate-200 bg-white p-2.5 dark:border-border dark:bg-card">
                {detailStudentsLoading && classStudents.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Loading students...</div>
                ) : classStudents.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">No students in this class</div>
                ) : (
                  <StudentList students={classStudents} />
                )}
              </div>
            )}
          </div>
        );
      })}
      {directAssignedStudents.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
          <div className="flex w-full items-center gap-2 bg-white p-2.5 text-left dark:bg-muted/40">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-grow">
              <p className="text-xs text-muted-foreground">Students connected to this teacher without a group</p>
            </div>
            <Badge className="bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-600">
              {directAssignedStudents.length} Students
            </Badge>
          </div>
          <div className="border-t border-slate-200 bg-white p-2.5 dark:border-border dark:bg-card">
            <StudentList students={directAssignedStudents} />
          </div>
        </div>
      )}
    </div>
  );
}

const StudentList = ({ students }: { students: any[] }) => (
  <div className="flex flex-col gap-1.5">
    {students.map((student, index) => (
      <div
        key={student.student_id || student.id}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-border dark:bg-background/70"
      >
        <div className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white shadow-sm',
          index % 4 === 0 && 'bg-sky-600',
          index % 4 === 1 && 'bg-emerald-600',
          index % 4 === 2 && 'bg-amber-500',
          index % 4 === 3 && 'bg-fuchsia-600'
        )}>
          {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
        </div>
        <span className="truncate text-xs font-semibold">
          {[student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unnamed student'}
        </span>
      </div>
    ))}
  </div>
);
