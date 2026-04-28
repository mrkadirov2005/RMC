// Source file for the students area in the crm feature.

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Student } from '../types';
import { SelectField } from './SelectField';

interface Option { id?: number; label: string; value: string | number }
interface Props { formData: Partial<Student>; setFormData: (value: Partial<Student>) => void; centerOptions: Option[]; classOptions: Option[]; teacherOptions: Option[]; genderOptions: Option[]; statusOptions: Option[]; showCenterField?: boolean }

// Renders the student form fields module.
export const StudentFormFields = ({ formData, setFormData, centerOptions, classOptions, teacherOptions, genderOptions, statusOptions, showCenterField = true }: Props) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2"><Label>First Name</Label><Input value={formData.first_name || ''} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required /></div>
    <div className="space-y-2"><Label>Last Name</Label><Input value={formData.last_name || ''} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required /></div>
    <div className="space-y-2"><Label>Enrollment #</Label><Input value={formData.enrollment_number || ''} onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })} required /></div>
    <div className="space-y-2"><Label>Email</Label><Input value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required /></div>
    <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required /></div>
    <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={formData.date_of_birth || ''} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} required /></div>
    <SelectField label="Gender" name="gender" value={formData.gender || ''} onChange={(value) => setFormData({ ...formData, gender: value })} options={genderOptions} placeholder="Select gender" />
    <SelectField label="Status" name="status" value={formData.status || ''} onChange={(value) => setFormData({ ...formData, status: value })} options={statusOptions} placeholder="Select status" />
    {showCenterField && <SelectField label="Center" name="center_id" value={formData.center_id || ''} onChange={(value) => setFormData({ ...formData, center_id: Number(value) })} options={centerOptions} placeholder="Select center" />}
    <SelectField label="Class" name="class_id" value={formData.class_id || ''} onChange={(value) => setFormData({ ...formData, class_id: Number(value) })} options={classOptions} placeholder="Select class" />
    <SelectField label="Teacher" name="teacher_id" value={formData.teacher_id || ''} onChange={(value) => setFormData({ ...formData, teacher_id: Number(value) })} options={teacherOptions} placeholder="Select teacher" />
    <div className="space-y-2"><Label>School (optional)</Label><Input value={formData.school_name || ''} onChange={(e) => setFormData({ ...formData, school_name: e.target.value })} /></div>
    <div className="space-y-2"><Label>School Class (optional)</Label><Input value={formData.school_class || ''} onChange={(e) => setFormData({ ...formData, school_class: e.target.value })} /></div>
    <div className="space-y-2"><Label>Username</Label><Input value={formData.username || ''} onChange={(e) => setFormData({ ...formData, username: e.target.value })} /></div>
    <div className="space-y-2"><Label>Password</Label><Input type="password" value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>
  </div>
);
