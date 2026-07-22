import { BadgePercent, CheckCircle2, GraduationCap, Loader2, Save, UserRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StudentFormFields } from './StudentFormFields';
import type { Class, Student } from '../types';

type Option = { id?: number; label: string; value: string | number };

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: Partial<Student>;
  setFormData: (value: Partial<Student>) => void;
  onSubmit: (event: React.FormEvent) => void;
  saving?: boolean;
  showCenterField?: boolean;
  centerOptions: Option[];
  classOptions: Option[];
  teacherOptions: Option[];
  genderOptions: Option[];
  statusOptions: Option[];
  classes: Class[];
}

export const StudentFormDialog = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  saving = false,
  showCenterField = true,
  centerOptions,
  classOptions,
  teacherOptions,
  genderOptions,
  statusOptions,
  classes,
}: StudentFormDialogProps) => {
  const selectedClass = classes.find(
    (item) => Number(item.class_id || item.id || 0) === Number(formData.class_id || 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto border border-slate-200/90 bg-white p-0 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/96">
        <DialogHeader className="border-b border-slate-200/80 px-6 py-4 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20">
              <UserRound className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Add Student
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                Create a student from a single structured popup instead of leaving the students workspace.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                Class
              </p>
              <div className="mt-2 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {selectedClass?.class_name || 'No class selected'}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                Discount
              </p>
              <div className="mt-2 flex items-center gap-2">
                <BadgePercent className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {formData.is_discounted ? 'Enabled' : 'Not enabled'}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                Status
              </p>
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {formData.status || 'Not set'}
                </p>
              </div>
            </div>
          </div>

          <StudentFormFields
            formData={formData}
            setFormData={setFormData}
            centerOptions={centerOptions}
            classOptions={classOptions}
            teacherOptions={teacherOptions}
            genderOptions={genderOptions}
            statusOptions={statusOptions}
            showCenterField={showCenterField}
          />

          <DialogFooter className="sticky bottom-0 border-t border-slate-200/80 bg-white/95 px-0 pt-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2 bg-rose-600 hover:bg-rose-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
