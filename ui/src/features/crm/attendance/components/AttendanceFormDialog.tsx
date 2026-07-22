import { CalendarDays, CheckCircle2, ClipboardCheck, UserRound } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
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
import type { Attendance } from '../types';

interface AttendanceFormDialogProps {
  open: boolean;
  editingId: number | null;
  loading: boolean;
  formData: Partial<Attendance>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Attendance>>>;
  studentOptions: Array<{ id?: number; value: string | number; label: string }>;
  teacherOptions: Array<{ id?: number; value: string | number; label: string }>;
  classOptions: Array<{ id?: number; value: string | number; label: string }>;
  isLoadingOptions: boolean;
  attendanceStatusOptions: Array<{ id: string | number; value: string; label: string }>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const shellClass =
  'rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/96';
const sectionClass =
  'rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70';
const statClass =
  'rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70';

const getOptionLabel = (
  options: Array<{ id?: string | number; value: string | number; label: string }>,
  value: string | number | undefined
) => options.find((option) => String(option.value) === String(value))?.label;

const AttendanceFormDialog = ({
  open,
  editingId,
  loading,
  formData,
  setFormData,
  studentOptions,
  teacherOptions,
  classOptions,
  isLoadingOptions,
  attendanceStatusOptions,
  onClose,
  onSubmit,
}: AttendanceFormDialogProps) => {
  const studentLabel = getOptionLabel(studentOptions, formData.student_id);
  const teacherLabel = getOptionLabel(teacherOptions, formData.teacher_id);
  const classLabel = getOptionLabel(classOptions, formData.class_id);
  const statusLabel = getOptionLabel(attendanceStatusOptions, formData.status);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={`${shellClass} max-h-[90vh] max-w-5xl overflow-y-auto p-0 gap-0`}>
        <DialogHeader className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <ClipboardCheck className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {editingId ? 'Edit Attendance' : 'Add Attendance'}
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Mark attendance with a clearer, more colorful form that still keeps the workflow quick.
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
              <p className={formLabelClassName}>Teacher</p>
              <div className="mt-2 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {teacherLabel || 'Not selected'}
                </p>
              </div>
            </div>
            <div className={statClass}>
              <p className={formLabelClassName}>Class</p>
              <div className="mt-2 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {classLabel || 'Not selected'}
                </p>
              </div>
            </div>
            <div className={statClass}>
              <p className={formLabelClassName}>Status</p>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {statusLabel || 'Not selected'}
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
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Attendance target</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Connect the attendance record to the right student, teacher, and class.
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
                label="Class"
                name="class_id"
                value={formData.class_id || ''}
                onChange={(value) => setFormData((current) => ({ ...current, class_id: Number(value) }))}
                options={classOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a class"
              />
              <div className="space-y-2">
                <Label htmlFor="attendance_date" className={formLabelClassName}>Attendance date</Label>
                <Input
                  type="date"
                  id="attendance_date"
                  required
                  value={formData.attendance_date || ''}
                  onChange={(e) => setFormData((current) => ({ ...current, attendance_date: e.target.value }))}
                />
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Attendance result</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Set the attendance status and leave a short note if anything unusual happened.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status" className={formLabelClassName}>Status</Label>
                <Select
                  required
                  value={formData.status || 'Present'}
                  onValueChange={(value) => setFormData((current) => ({ ...current, status: value }))}
                >
                  <SelectTrigger id="status" className={compactFormControlClassName}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {attendanceStatusOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="remarks" className={formLabelClassName}>Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData((current) => ({ ...current, remarks: e.target.value }))}
                  placeholder="Additional remarks..."
                />
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

export default AttendanceFormDialog;
