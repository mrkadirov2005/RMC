import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ClassItem, AttendanceItem, GradeItem, StudentItem } from './types';

interface DetailModalProps {
  open: boolean;
  loading: boolean;
  selectedClass: ClassItem | null;
  selectedDate: string;
  lessonAttendance: AttendanceItem[];
  lessonGrades: GradeItem[];
  lessonStudents: StudentItem[];
  isStudent: boolean;
  user: any;
  onOpenChange: (open: boolean) => void;
}

export const DetailsModal = ({
  open,
  loading,
  selectedClass,
  selectedDate,
  lessonAttendance,
  lessonGrades,
  lessonStudents,
  isStudent,
  user,
  onOpenChange,
}: DetailModalProps) => {
  const attendanceSummary = (() => {
    const presentIds = new Set<number>();
    const absentIds = new Set<number>();
    lessonAttendance.forEach((record) => {
      const status = String(record.status || '').toLowerCase();
      if (status === 'present') presentIds.add(record.student_id);
      if (status === 'absent') absentIds.add(record.student_id);
    });
    const totalStudents = lessonStudents.length;
    const markedCount = presentIds.size + absentIds.size;
    return {
      presentIds,
      absentIds,
      totalStudents,
      unmarkedCount: Math.max(totalStudents - markedCount, 0),
    };
  })();

  const gradeSummary = (() => {
    const gradeRows = lessonGrades
      .map((grade) => {
        const total = Number(grade.total_marks || 0) || 0;
        const marks = Number(grade.marks_obtained || 0) || 0;
        const percentage =
          typeof grade.percentage === 'number'
            ? grade.percentage
            : total > 0
            ? (marks / total) * 100
            : 0;
        return {
          studentId: grade.student_id,
          percentage,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    const filteredRows = isStudent
      ? gradeRows.filter((row) => row.studentId === Number(user?.id))
      : gradeRows;

    const topTwo = filteredRows.slice(0, 2);
    const bottomThree = [...filteredRows].reverse().slice(0, 3);
    return { gradeRows: filteredRows, topTwo, bottomThree };
  })();

  const studentById = (() => {
    const map = new Map<number, StudentItem>();
    lessonStudents.forEach((student) => {
      const id = Number(student.student_id || student.id);
      if (id) map.set(id, student);
    });
    return map;
  })();

  const getScoreRowClass = (percentage: number) => {
    if (percentage === 0) return 'bg-red-100 text-red-900 border-red-200';
    if (percentage >= 85) return 'bg-green-200 text-green-900 border-green-300';
    return 'bg-green-50 text-green-800 border-green-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {selectedClass?.class_name} - {selectedDate}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {!isStudent && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Attendance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-3 text-sm">
                    <Badge variant="secondary">Present: {attendanceSummary.presentIds.size}</Badge>
                    <Badge variant="secondary">Absent: {attendanceSummary.absentIds.size}</Badge>
                    <Badge variant="secondary">Unmarked: {attendanceSummary.unmarkedCount}</Badge>
                    <Badge variant="secondary">Total: {attendanceSummary.totalStudents}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Present</p>
                      <div className="space-y-1">
                        {lessonStudents
                          .filter((s) => attendanceSummary.presentIds.has(Number(s.student_id || s.id)))
                          .map((student, index) => (
                            <TooltipProvider key={`present-${student.student_id || student.id}-${index}`}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block text-sm font-medium">
                                    {student.first_name} {student.last_name}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {student.username ? `@${student.username}` : 'No username'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        {attendanceSummary.presentIds.size === 0 && (
                          <p className="text-xs text-muted-foreground">No present records.</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Absent</p>
                      <div className="space-y-1">
                        {lessonStudents
                          .filter((s) => attendanceSummary.absentIds.has(Number(s.student_id || s.id)))
                          .map((student, index) => (
                            <TooltipProvider key={`absent-${student.student_id || student.id}-${index}`}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block text-sm font-medium text-red-700">
                                    {student.first_name} {student.last_name}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {student.username ? `@${student.username}` : 'No username'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        {attendanceSummary.absentIds.size === 0 && (
                          <p className="text-xs text-muted-foreground">No absent records.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isStudent ? 'Your Grades' : 'Grades Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {gradeSummary.gradeRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No grades available.</p>
                ) : (
                  <>
                    {!isStudent && gradeSummary.topTwo.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Top 2</p>
                        <div className="space-y-1">
                          {gradeSummary.topTwo.map((row) => {
                            const student = studentById.get(row.studentId);
                            return (
                              <div
                                key={`top-${row.studentId}`}
                                className={cn(
                                  'p-2 rounded border text-xs font-medium',
                                  getScoreRowClass(row.percentage)
                                )}
                              >
                                {student?.first_name} {student?.last_name} - {row.percentage.toFixed(1)}%
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!isStudent && gradeSummary.bottomThree.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Bottom 3</p>
                        <div className="space-y-1">
                          {gradeSummary.bottomThree.map((row) => {
                            const student = studentById.get(row.studentId);
                            return (
                              <div
                                key={`bottom-${row.studentId}`}
                                className={cn(
                                  'p-2 rounded border text-xs font-medium',
                                  getScoreRowClass(row.percentage)
                                )}
                              >
                                {student?.first_name} {student?.last_name} - {row.percentage.toFixed(1)}%
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {isStudent && gradeSummary.gradeRows.length > 0 && (
                      <div className="space-y-1">
                        {gradeSummary.gradeRows.map((row) => (
                          <div
                              key={`student-${row.studentId}`}
                              className={cn(
                                'p-2 rounded border text-sm font-medium',
                                getScoreRowClass(row.percentage)
                              )}
                            >
                              {row.percentage.toFixed(1)}%
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
