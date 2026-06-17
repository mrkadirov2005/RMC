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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Edit Grade' : 'Add New Grade'}</DialogTitle>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="marks_obtained">Marks Obtained *</Label>
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
              <Label htmlFor="total_marks">Total Marks</Label>
              <Input
                type="number"
                id="total_marks"
                value={formData.total_marks || 100}
                onChange={(e) => setFormData((current) => ({ ...current, total_marks: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="percentage">Percentage</Label>
              <Input type="number" id="percentage" step="0.1" value={formData.percentage || 0} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade_letter">Grade Letter</Label>
              <Input type="text" id="grade_letter" value={formData.grade_letter || 'F'} disabled className="bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year *</Label>
              <Input
                type="number"
                id="academic_year"
                required
                value={formData.academic_year || new Date().getFullYear()}
                onChange={(e) => setFormData((current) => ({ ...current, academic_year: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term">Term *</Label>
              <Select
                required
                value={formData.term || 'First'}
                onValueChange={(value) => setFormData((current) => ({ ...current, term: value }))}
              >
                <SelectTrigger>
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

export default GradeFormDialog;
