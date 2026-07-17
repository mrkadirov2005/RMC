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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formLabelClassName } from '@/components/ui/form-control';
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
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit Attendance' : 'Add New Attendance'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
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
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <Label htmlFor="attendance_date" className={formLabelClassName}>Attendance Date *</Label>
              <Input
                type="date"
                id="attendance_date"
                required
                value={formData.attendance_date || ''}
                onChange={(e) => setFormData((current) => ({ ...current, attendance_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status" className={formLabelClassName}>Status *</Label>
              <Select
                required
                value={formData.status || 'Present'}
                onValueChange={(value) => setFormData((current) => ({ ...current, status: value }))}
              >
                <SelectTrigger>
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="remarks" className={formLabelClassName}>Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks || ''}
              onChange={(e) => setFormData((current) => ({ ...current, remarks: e.target.value }))}
              placeholder="Additional remarks..."
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} onClick={onSubmit}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceFormDialog;
