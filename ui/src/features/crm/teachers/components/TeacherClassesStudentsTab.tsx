import { BookOpen, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeacherClassesStudentsTabProps {
  studentClassGroups: Array<{
    classId: number;
    classItem: any;
    students: any[];
    isTeacherOwned: boolean;
  }>;
  expandedClassIds: Set<number>;
  detailStudentsLoading: boolean;
  onToggleClassExpanded: (classId: number) => void;
}

export default function TeacherClassesStudentsTab({
  studentClassGroups,
  expandedClassIds,
  detailStudentsLoading,
  onToggleClassExpanded,
}: TeacherClassesStudentsTabProps) {
  if (studentClassGroups.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="h-16 w-16 mx-auto opacity-30 mb-4" />
        <h3 className="text-lg font-semibold">No classes or students assigned to this teacher</h3>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {studentClassGroups.map(({ classId, classItem, students: classStudents, isTeacherOwned }, index) => {
        const isExpanded = expandedClassIds.has(classId);
        return (
          <div key={classId} className="overflow-hidden rounded-lg border border-slate-200 shadow-sm dark:border-border" style={{ backgroundColor: `var(${index % 2 === 0 ? '--list-row-primary' : '--list-row-alternate'})` }}>
            <button
              type="button"
              onClick={() => onToggleClassExpanded(classId)}
              className="flex w-full items-center gap-2 bg-transparent px-2.5 py-1.5 text-left"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-xs font-bold tabular-nums text-slate-500">{index + 1}</span>
              <div className="flex-grow">
                <h3 className="text-xs font-semibold">{classItem.class_name}</h3>
                <p className="text-[10px] text-muted-foreground">
                  {isTeacherOwned ? 'Teacher group' : 'Group'} / Level: {classItem.level || 'N/A'}
                </p>
              </div>
              <Badge variant="outline" className="bg-transparent text-xs font-semibold">
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
    </div>
  );
}

const StudentList = ({ students }: { students: any[] }) => (
  <div className="flex flex-col gap-1.5">
    {students.map((student, index) => (
      <div
        key={student.student_id || student.id}
        className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 shadow-sm dark:border-border"
        style={{ backgroundColor: `var(${index % 2 === 0 ? '--list-row-primary' : '--list-row-alternate'})` }}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold tabular-nums text-slate-500">{index + 1}</span>
        <span className="truncate text-xs font-semibold">
          {[student.first_name, student.last_name].filter(Boolean).join(' ') || 'Unnamed student'}
        </span>
      </div>
    ))}
  </div>
);
