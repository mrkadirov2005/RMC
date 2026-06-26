import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TeacherGradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: any[];
  subjects: any[];
  teacherStudents: any[];
  selectedClassId: number | null;
  selectedSubjectId: number | null;
  selectedTerm: string;
  gradeEntries: Array<{ student_id: number; percentage: number; grade_letter: string }>;
  isSavingGrades: boolean;
  setSelectedSubjectId: (id: number) => void;
  setSelectedTerm: (term: string) => void;
  onClose: () => void;
  onClassSelect: (classId: number) => void;
  onPercentageChange: (index: number, percentage: number) => void;
  onSaveGrades: () => void;
  getGradeBadgeClasses: (letter: string) => string;
}

export default function TeacherGradeDialog({
  open,
  onOpenChange,
  classes,
  subjects,
  teacherStudents,
  selectedClassId,
  selectedSubjectId,
  selectedTerm,
  gradeEntries,
  isSavingGrades,
  setSelectedSubjectId,
  setSelectedTerm,
  onClose,
  onClassSelect,
  onPercentageChange,
  onSaveGrades,
  getGradeBadgeClasses,
}: TeacherGradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); else onOpenChange(nextOpen); }}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto rounded-lg p-0">
        <DialogHeader className="bg-fuchsia-600 p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-semibold text-white">
              Add Grades to Students
            </DialogTitle>
            <button onClick={onClose} className="text-white hover:text-white/80">
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Select Class</Label>
              <Select value={String(selectedClassId || '')} onValueChange={(value) => onClassSelect(Number(value))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.class_id || cls.id} value={String(cls.class_id || cls.id)}>
                      {cls.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Select Subject</Label>
              <Select value={String(selectedSubjectId || '')} onValueChange={(value) => setSelectedSubjectId(Number(value))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.subject_id || subject.id} value={String(subject.subject_id || subject.id)}>
                      {subject.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Select Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                  <SelectItem value="Semester 1">Semester 1</SelectItem>
                  <SelectItem value="Semester 2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClassId && gradeEntries.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold">Enter Grades for Students</h3>
              <div className="overflow-hidden rounded-lg border">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="h-8 font-semibold">Enrollment #</TableHead>
                      <TableHead className="h-8 font-semibold">Student Name</TableHead>
                      <TableHead className="h-8 font-semibold">Percentage</TableHead>
                      <TableHead className="h-8 font-semibold">Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeEntries.map((entry, index) => {
                      const student = teacherStudents.find((item) => (item.student_id || item.id) === entry.student_id);
                      return (
                        <TableRow key={entry.student_id} className="hover:bg-muted/50">
                          <TableCell>{student?.enrollment_number}</TableCell>
                          <TableCell>{student?.first_name} {student?.last_name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={entry.percentage}
                              onChange={(event) => onPercentageChange(index, Number(event.target.value))}
                              className="h-8 w-20 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <span className={cn('inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold min-w-[2.5rem]', getGradeBadgeClasses(entry.grade_letter))}>
                              {entry.grade_letter}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 pt-0">
          <Button size="sm" className="h-8 rounded-lg bg-slate-700 text-xs text-white hover:bg-slate-800" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 rounded-lg bg-fuchsia-600 px-5 text-xs text-white hover:bg-fuchsia-700"
            onClick={onSaveGrades}
            disabled={isSavingGrades || !selectedClassId || !selectedSubjectId || gradeEntries.length === 0}
          >
            {isSavingGrades ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Grades'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
