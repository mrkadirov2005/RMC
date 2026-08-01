// Source file for the students area in the crm feature.

import type { ReactNode } from 'react';
import { BadgePercent, Building2, GraduationCap, KeyRound, Megaphone, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Student } from '../types';
import { SelectField } from './SelectField';

interface Option { id?: number; label: string; value: string | number }
interface Props { formData: Partial<Student>; setFormData: (value: Partial<Student>) => void; centerOptions: Option[]; classOptions: Option[]; teacherOptions: Option[]; acquisitionSourceOptions?: Option[]; genderOptions: Option[]; statusOptions: Option[]; showCenterField?: boolean }

interface FormSectionProps {
  title: string;
  detail: string;
  icon: ReactNode;
  tone: string;
  children: ReactNode;
}

const sectionTones: Record<string, { shell: string; header: string; icon: string }> = {
  sky: {
    shell: 'border-sky-200 bg-sky-50',
    header: 'bg-sky-600 text-white',
    icon: 'bg-white text-sky-700',
  },
  emerald: {
    shell: 'border-emerald-200 bg-emerald-50',
    header: 'bg-emerald-600 text-white',
    icon: 'bg-white text-emerald-700',
  },
  amber: {
    shell: 'border-amber-200 bg-amber-50',
    header: 'bg-amber-500 text-white',
    icon: 'bg-white text-amber-700',
  },
  fuchsia: {
    shell: 'border-fuchsia-200 bg-fuchsia-50',
    header: 'bg-fuchsia-600 text-white',
    icon: 'bg-white text-fuchsia-700',
  },
  rose: {
    shell: 'border-rose-200 bg-rose-50',
    header: 'bg-rose-600 text-white',
    icon: 'bg-white text-rose-700',
  },
};

const inputClass = 'h-9 border-white bg-white px-3 text-sm shadow-sm focus-visible:ring-2';
const fieldClass = 'space-y-1';

const FormSection = ({ title, detail, icon, tone, children }: FormSectionProps) => {
  const colors = sectionTones[tone] || sectionTones.sky;
  return (
    <section className={`overflow-hidden rounded-lg border shadow-sm ${colors.shell}`}>
      <div className={`flex items-center gap-2.5 px-3 py-2.5 ${colors.header}`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md shadow-sm ${colors.icon}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-tight">{title}</h3>
          <p className="text-[11px] leading-snug text-white/85">{detail}</p>
        </div>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
};

const TextField = ({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder,
  readOnly = false,
}: {
  label: string;
  value: string | number | undefined;
  onChange?: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
}) => (
  <div className={fieldClass}>
    <Label className="text-xs font-bold uppercase text-slate-600">{label}</Label>
    <Input
      className={inputClass}
      type={type}
      value={value || ''}
      onChange={(event) => onChange?.(event.target.value)}
      required={required}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  </div>
);

// Renders the student form fields module.
export const StudentFormFields = ({ formData, setFormData, centerOptions, classOptions, teacherOptions, acquisitionSourceOptions = [
  { label: 'Advertisement', value: 1 }, { label: 'Teacher referral', value: 2 }, { label: 'Student or parent referral', value: 3 }, { label: 'Social media', value: 4 }, { label: 'Walk-in', value: 5 }, { label: 'Other', value: 6 },
], genderOptions, statusOptions, showCenterField = true }: Props) => {
  const discountOriginalPrice = Number(formData.discount_original_price || 0);
  const discountValue = Number(formData.discount_value || 0);
  const discountAmount =
    formData.discount_value_type === 'percent'
      ? Math.min(discountOriginalPrice, (discountOriginalPrice * Math.min(discountValue, 100)) / 100)
      : Math.min(discountOriginalPrice, discountValue);
  const finalPrice = Math.max(0, discountOriginalPrice - discountAmount);

  return (
    <div className="space-y-4">
      <FormSection
        title="Profile"
        detail="Core identity and parent contact details."
        icon={<UserRound className="h-5 w-5" />}
        tone="sky"
      >
        <TextField label="First name" value={formData.first_name} onChange={(value) => setFormData({ ...formData, first_name: value })} required />
        <TextField label="Last name" value={formData.last_name} onChange={(value) => setFormData({ ...formData, last_name: value })} required />
        <TextField label="Phone" value={formData.phone} onChange={(value) => setFormData({ ...formData, phone: value })} required />
        <TextField label="Date of birth" type="date" value={formData.date_of_birth} onChange={(value) => setFormData({ ...formData, date_of_birth: value })} required />
        <div className={fieldClass}>
          <SelectField compact label="Gender" name="gender" value={formData.gender || ''} onChange={(value) => setFormData({ ...formData, gender: value })} options={genderOptions} placeholder="Select gender" />
        </div>
        <div className={fieldClass}>
          <SelectField compact label="Status" name="status" value={formData.status || ''} onChange={(value) => setFormData({ ...formData, status: value })} options={statusOptions} placeholder="Select status" />
        </div>
      </FormSection>

      <FormSection title="How they found us" detail="Track the channel or person who introduced this student." icon={<Megaphone className="h-5 w-5" />} tone="amber">
        <div className={fieldClass}>
          <SelectField compact label="Source" name="acquisition_source_id" value={formData.acquisition_source_id || ''} onChange={(value) => setFormData({ ...formData, acquisition_source_id: Number(value), referred_by_teacher_id: Number(value) === 2 ? formData.referred_by_teacher_id : undefined })} options={[...acquisitionSourceOptions, { label: '+ Add a custom source', value: -1 }]} placeholder="Select source" />
        </div>
        {Number(formData.acquisition_source_id) === -1 && <TextField label="New source name" value={formData.custom_acquisition_source || ''} onChange={(value) => setFormData({ ...formData, custom_acquisition_source: value })} required placeholder="Enter your own source" />}
        {Number(formData.acquisition_source_id) === 2 && <div className={fieldClass}><SelectField compact label="Referring teacher" name="referred_by_teacher_id" value={formData.referred_by_teacher_id || ''} onChange={(value) => setFormData({ ...formData, referred_by_teacher_id: Number(value) })} options={teacherOptions} placeholder="Select teacher" /></div>}
        <TextField label="Source details" value={formData.acquisition_detail || ''} onChange={(value) => setFormData({ ...formData, acquisition_detail: value })} placeholder="Campaign, person name, platform, or note" />
      </FormSection>

      <FormSection
        title="Placement"
        detail="Connect the student to center, class, and teacher ownership."
        icon={<GraduationCap className="h-5 w-5" />}
        tone="emerald"
      >
        {showCenterField && (
          <div className={fieldClass}>
            <SelectField compact label="Center" name="center_id" value={formData.center_id || ''} onChange={(value) => setFormData({ ...formData, center_id: Number(value) })} options={centerOptions} placeholder="Select center" />
          </div>
        )}
        <div className={fieldClass}>
          <SelectField compact label="Class" name="class_id" value={formData.class_id || ''} onChange={(value) => setFormData({ ...formData, class_id: Number(value) })} options={classOptions} placeholder="Select class" />
        </div>
        <div className={fieldClass}>
          <SelectField compact label="Teacher" name="teacher_id" value={formData.teacher_id || ''} onChange={(value) => setFormData({ ...formData, teacher_id: Number(value) })} options={teacherOptions} placeholder="Select teacher" />
        </div>
      </FormSection>

      <FormSection
        title="School"
        detail="Optional school information used for filtering and reports."
        icon={<Building2 className="h-5 w-5" />}
        tone="amber"
      >
        <TextField label="School" value={formData.school_name || ''} onChange={(value) => setFormData({ ...formData, school_name: value })} placeholder="School name" />
        <TextField label="School class" value={formData.school_class || ''} onChange={(value) => setFormData({ ...formData, school_class: value })} placeholder="Example: 7" />
      </FormSection>

      <FormSection
        title="Account"
        detail="Login credentials are optional because the platform can generate identity data."
        icon={<KeyRound className="h-5 w-5" />}
        tone="fuchsia"
      >
        <TextField label="Username" value={formData.username} onChange={(value) => setFormData({ ...formData, username: value })} placeholder="Auto-generated if empty" />
        <TextField label="Password" type="password" value={formData.password} onChange={(value) => setFormData({ ...formData, password: value })} placeholder="Auto-generated if empty" />
      </FormSection>

      <section className="overflow-hidden rounded-lg border border-rose-200 bg-rose-50 shadow-sm">
        <div className="flex items-center justify-between gap-3 bg-rose-600 px-3 py-2.5 text-white">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-rose-700 shadow-sm">
              <BadgePercent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Discount</h3>
              <p className="text-[11px] leading-snug text-white/85">Choose serial or one-time tuition discount.</p>
            </div>
          </div>
          <Switch
            checked={Boolean(formData.is_discounted)}
            onCheckedChange={(checked) => setFormData({ ...formData, is_discounted: checked })}
          />
        </div>
        {formData.is_discounted && (
          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-5">
            <SelectField
              compact
              label="Discount kind"
              name="discount_kind"
              value={formData.discount_kind || 'serial_discount'}
              onChange={(value) => setFormData({ ...formData, discount_kind: value as 'serial_discount' | 'monthly_discount' })}
              options={[
                { label: 'Serial', value: 'serial_discount' },
                { label: 'One-time', value: 'monthly_discount' },
              ]}
            />
            <SelectField
              compact
              label="Discount type"
              name="discount_value_type"
              value={formData.discount_value_type || 'fixed'}
              onChange={(value) => setFormData({ ...formData, discount_value_type: value as 'percent' | 'fixed' })}
              options={[
                { label: 'Fixed', value: 'fixed' },
                { label: 'Percent', value: 'percent' },
              ]}
            />
            <TextField label="Current price" type="number" value={formData.discount_original_price} onChange={(value) => setFormData({ ...formData, discount_original_price: Number(value) })} />
            <TextField label="Discount value" type="number" value={formData.discount_value} onChange={(value) => setFormData({ ...formData, discount_value: Number(value) })} />
            <TextField label="Final price" value={discountOriginalPrice > 0 ? finalPrice.toFixed(2) : ''} readOnly />
            <div className="sm:col-span-2 lg:col-span-5">
              <TextField label="Reason" value={formData.discount_reason} onChange={(value) => setFormData({ ...formData, discount_reason: value })} placeholder="Reason for discount" />
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
