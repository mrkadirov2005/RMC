// Source file for the students area in the crm feature.

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Student } from '../types';
import { SelectField } from './SelectField';

interface Option { id?: number; label: string; value: string | number }
interface Props { formData: Partial<Student>; setFormData: (value: Partial<Student>) => void; centerOptions: Option[]; classOptions: Option[]; teacherOptions: Option[]; genderOptions: Option[]; statusOptions: Option[]; showCenterField?: boolean }

// Renders the student form fields module.
export const StudentFormFields = ({ formData, setFormData, centerOptions, classOptions, teacherOptions, genderOptions, statusOptions, showCenterField = true }: Props) => {
  const discountOriginalPrice = Number(formData.discount_original_price || 0);
  const discountValue = Number(formData.discount_value || 0);
  const discountAmount =
    formData.discount_value_type === 'percent'
      ? Math.min(discountOriginalPrice, (discountOriginalPrice * Math.min(discountValue, 100)) / 100)
      : Math.min(discountOriginalPrice, discountValue);
  const finalPrice = Math.max(0, discountOriginalPrice - discountAmount);
  const inputClass = 'border-white bg-white shadow-sm focus-visible:ring-2';
  const fieldClass = 'space-y-2 rounded-md border p-3 shadow-sm';
  const fieldStyles = {
    sky: 'border-sky-300 bg-sky-200',
    emerald: 'border-emerald-300 bg-emerald-200',
    rose: 'border-rose-300 bg-rose-200',
    amber: 'border-amber-300 bg-amber-200',
    violet: 'border-violet-300 bg-violet-200',
    cyan: 'border-cyan-300 bg-cyan-200',
    indigo: 'border-indigo-300 bg-indigo-200',
    lime: 'border-lime-300 bg-lime-200',
  };

  return (
  <div className="grid gap-4 md:grid-cols-2">
    <div className={`${fieldClass} ${fieldStyles.sky}`}><Label className="text-sky-900">First Name</Label><Input className={inputClass} value={formData.first_name || ''} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required /></div>
    <div className={`${fieldClass} ${fieldStyles.emerald}`}><Label className="text-emerald-900">Last Name</Label><Input className={inputClass} value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required /></div>
    <div className={`${fieldClass} ${fieldStyles.rose}`}><Label className="text-rose-900">Phone</Label><Input className={inputClass} value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required /></div>
    <div className={`${fieldClass} ${fieldStyles.amber}`}><Label className="text-amber-900">Date of Birth</Label><Input className={inputClass} type="date" value={formData.date_of_birth || ''} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} required /></div>
    <div className={`${fieldClass} ${fieldStyles.violet}`}><SelectField label="Gender" name="gender" value={formData.gender || ''} onChange={(value) => setFormData({ ...formData, gender: value })} options={genderOptions} placeholder="Select gender" /></div>
    <div className={`${fieldClass} ${fieldStyles.lime}`}><SelectField label="Status" name="status" value={formData.status || ''} onChange={(value) => setFormData({ ...formData, status: value })} options={statusOptions} placeholder="Select status" /></div>
    {showCenterField && <div className={`${fieldClass} ${fieldStyles.cyan}`}><SelectField label="Center" name="center_id" value={formData.center_id || ''} onChange={(value) => setFormData({ ...formData, center_id: Number(value) })} options={centerOptions} placeholder="Select center" /></div>}
    <div className={`${fieldClass} ${fieldStyles.indigo}`}><SelectField label="Class" name="class_id" value={formData.class_id || ''} onChange={(value) => setFormData({ ...formData, class_id: Number(value) })} options={classOptions} placeholder="Select class" /></div>
    <div className={`${fieldClass} ${fieldStyles.sky}`}><SelectField label="Teacher" name="teacher_id" value={formData.teacher_id || ''} onChange={(value) => setFormData({ ...formData, teacher_id: Number(value) })} options={teacherOptions} placeholder="Select teacher" /></div>
    <div className={`${fieldClass} ${fieldStyles.amber}`}><Label className="text-amber-900">School (optional)</Label><Input className={inputClass} value={formData.school_name || ''} onChange={(e) => setFormData({ ...formData, school_name: e.target.value })} /></div>
    <div className={`${fieldClass} ${fieldStyles.violet}`}><Label className="text-violet-900">School Class (optional)</Label><Input className={inputClass} value={formData.school_class || ''} onChange={(e) => setFormData({ ...formData, school_class: e.target.value })} /></div>
    <div className={`${fieldClass} ${fieldStyles.cyan}`}><Label className="text-cyan-900">Username</Label><Input className={inputClass} value={formData.username || ''} onChange={(e) => setFormData({ ...formData, username: e.target.value })} /></div>
    <div className={`${fieldClass} ${fieldStyles.rose}`}><Label className="text-rose-900">Password</Label><Input className={inputClass} type="password" value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>
    <div className="rounded-lg border border-emerald-300 bg-emerald-200 p-3 shadow-sm md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm font-bold text-emerald-900">Discounted student</Label>
          <p className="text-xs text-emerald-700">Creates an active serial discount for this student.</p>
        </div>
        <Switch
          checked={Boolean(formData.is_discounted)}
          onCheckedChange={(checked) => setFormData({ ...formData, is_discounted: checked })}
        />
      </div>
      {formData.is_discounted && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <SelectField
            label="Discount type"
            name="discount_value_type"
            value={formData.discount_value_type || 'fixed'}
            onChange={(value) => setFormData({ ...formData, discount_value_type: value as 'percent' | 'fixed' })}
            options={[
              { label: 'Fixed', value: 'fixed' },
              { label: 'Percent', value: 'percent' },
            ]}
          />
          <div className="space-y-2">
            <Label>Current price</Label>
            <Input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={formData.discount_original_price || ''}
              onChange={(e) => setFormData({ ...formData, discount_original_price: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Discount value</Label>
            <Input
              className={inputClass}
              type="number"
              min="0"
              max={formData.discount_value_type === 'percent' ? 100 : undefined}
              step="0.01"
              value={formData.discount_value || ''}
              onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Final price</Label>
            <Input className={inputClass} readOnly value={discountOriginalPrice > 0 ? finalPrice.toFixed(2) : ''} />
          </div>
          <div className="space-y-2 md:col-span-4">
            <Label>Reason</Label>
            <Input
              className={inputClass}
              value={formData.discount_reason || ''}
              onChange={(e) => setFormData({ ...formData, discount_reason: e.target.value })}
              placeholder="Reason for serial discount"
            />
          </div>
        </div>
      )}
    </div>
  </div>
  );
};
