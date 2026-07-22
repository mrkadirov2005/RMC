import { BookOpenText, CheckCircle2, GraduationCap, Percent, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { compactFormControlClassName, formLabelClassName } from '@/components/ui/form-control';
import { SelectField } from '../../students/components/SelectField';
import { termOptions } from '@/utils/dropdownOptions';
import type { Grade } from '../types';

interface GradeFormDialogProps {
  open: boolean;
  editingId: number | null;
  loading: boolean;
  formData: Partial<Grade>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Grade>>>;
  studentOptions: Array<{ id?: number; value: string | number; label: string }>;
  teacherOptions: Array<{ id?: number; value: string | number; label: string }>;
  subjectOptions: Array<{ id?: number; value: string | number; label: string }>;
  classOptions: Array<{ id?: number; value: string | number; label: string }>;
  isLoadingOptions: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onMarksChange: (marks: number) => void;
}

const shellClass =
  'rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/96';
const sectionClass =
  'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70';
const statClass =
  'rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70';

const getOptionLabel = (
  options: Array<{ id?: number; value: string | number; label: string }>,
  value: string | number | undefined
) => options.find((option) => String(option.value) === String(value))?.label;

const GradeFormDialog = ({
  open,
  editingId,
  loading,
  formData,
  setFormData,
  studentOptions,
  teacherOptions,
  subjectOptions,
  classOptions,
  isLoadingOptions,
  onClose,
  onSubmit,
  onMarksChange,
}: GradeFormDialogProps) => {
  const studentLabel = getOptionLabel(studentOptions, formData.student_id);
  const subjectLabel = getOptionLabel(subjectOptions, formData.subject);
  const classLabel = getOptionLabel(classOptions, formData.class_id);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={`${shellClass} max-h-[90vh] max-w-5xl overflow-y-auto p-0 gap-0`}>
        <DialogHeader className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-600 text-white shadow-lg shadow-fuchsia-500/20">
              <BookOpenText className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {editingId ? 'Edit Grade' : 'Add Grade'}
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Record marks, term details, and the final grade from one clear, structured dialog.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-4">
            <div className={statClass}>
              <p className={formLabelClassName}>Student</p>
              <div className="mt-2 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {studentLabel || 'Not selected'}
                </p>
              </div>
            </div>
            <div className={statClass}>
              <p className={formLabelClassName}>Subject</p>
              <div className="mt-2 flex items-center gap-2">
                <BookOpenText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {subjectLabel || 'Not selected'}
                </p>
              </div>
            </div>
            <div className={statClass}>
              <p className={formLabelClassName}>Class</p>
              <div className="mt-2 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {classLabel || 'Not selected'}
                </p>
              </div>
            </div>
            <div className={statClass}>
              <p className={formLabelClassName}>Result</p>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {Number(formData.percentage || 0).toFixed(1)}% / {formData.grade_letter || 'F'}
                </p>
              </div>
            </div>
          </div>

          <section className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                <UserRound className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Student and subject</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Attach the grade to the right student, teacher, subject, and class.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Student"
                name="student_id"
                value={formData.student_id || ''}
                onChange={(value) => setFormData((current) => ({ ...current, student_id: Number(value) }))}
                options={studentOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a student"
              />
              <SelectField
                label="Teacher"
                name="teacher_id"
                value={formData.teacher_id || ''}
                onChange={(value) => setFormData((current) => ({ ...current, teacher_id: Number(value) }))}
                options={teacherOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a teacher"
              />
              <SelectField
                label="Subject"
                name="subject"
                value={formData.subject || ''}
                onChange={(value) => setFormData((current) => ({ ...current, subject: value }))}
                options={subjectOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a subject"
              />
              <SelectField
                label="Class"
                name="class_id"
                value={formData.class_id || ''}
                onChange={(value) => setFormData((current) => ({ ...current, class_id: Number(value) }))}
                options={classOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a class"
              />
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300">
                <Percent className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Scoring</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter the achieved marks and let the system keep percentage and grade letter aligned.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="marks_obtained" className={formLabelClassName}>Marks obtained</Label>
                <Input
                  type="number"
                  id="marks_obtained"
                  required
                  step="0.1"
                  value={formData.marks_obtained || ''}
                  onChange={(e) => onMarksChange(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_marks" className={formLabelClassName}>Total marks</Label>
                <Input
                  type="number"
                  id="total_marks"
                  value={formData.total_marks || 100}
                  onChange={(e) => setFormData((current) => ({ ...current, total_marks: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="percentage" className={formLabelClassName}>Percentage</Label>
                <Input
                  type="number"
                  id="percentage"
                  step="0.1"
                  value={formData.percentage || 0}
                  disabled
                  className="bg-slate-50 dark:bg-slate-900/70"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade_letter" className={formLabelClassName}>Grade letter</Label>
                <Input
                  type="text"
                  id="grade_letter"
                  value={formData.grade_letter || 'F'}
                  disabled
                  className="bg-slate-50 dark:bg-slate-900/70"
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Academic context</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Keep the grade attached to the right year and term for reports.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="academic_year" className={formLabelClassName}>Academic year</Label>
                <Input
                  type="number"
                  id="academic_year"
                  required
                  value={formData.academic_year || new Date().getFullYear()}
                  onChange={(e) => setFormData((current) => ({ ...current, academic_year: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term" className={formLabelClassName}>Term</Label>
                <Select
                  required
                  value={formData.term || 'First'}
                  onValueChange={(value) => setFormData((current) => ({ ...current, term: value }))}
                >
                  <SelectTrigger id="term" className={compactFormControlClassName}>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {termOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <DialogFooter className="border-t border-slate-200/80 px-0 pt-5 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GradeFormDialog;
