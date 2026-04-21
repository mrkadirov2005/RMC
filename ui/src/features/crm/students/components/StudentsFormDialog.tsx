import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { FormEvent } from 'react';
import type { Student } from '../types';
import { StudentFormFields } from './StudentFormFields';

interface Option { id?: number; label: string; value: string | number }
interface Props { open: boolean; editing: boolean; formData: Partial<Student>; setFormData: (value: Partial<Student>) => void; centerOptions: Option[]; classOptions: Option[]; teacherOptions: Option[]; genderOptions: Option[]; statusOptions: Option[]; onClose: () => void; onSubmit: (e: FormEvent) => void; loading: boolean; showCenterField?: boolean; error?: string | null }

export const StudentsFormDialog = ({ open, editing, formData, setFormData, centerOptions, classOptions, teacherOptions, genderOptions, statusOptions, onClose, onSubmit, loading, showCenterField = true, error }: Props) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>{editing ? 'Edit Student' : 'Add New Student'}</DialogTitle></DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <StudentFormFields {...{ formData, setFormData, centerOptions, classOptions, teacherOptions, genderOptions, statusOptions, showCenterField }} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
);
