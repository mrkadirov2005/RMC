export type TeacherOverviewField = 'first_name' | 'last_name' | 'username' | 'email' | 'phone' | 'date_of_birth' | 'gender' | 'qualification' | 'specialization' | 'salary_percentage' | 'status';
export type TeacherOverviewDraft = Record<TeacherOverviewField, string>;

export const TEACHER_OVERVIEW_FIELDS: Record<string, TeacherOverviewField> = {
  'First name': 'first_name', 'Last name': 'last_name', Username: 'username', Email: 'email', Phone: 'phone',
  'Date of birth': 'date_of_birth', Gender: 'gender', Qualification: 'qualification', Specialization: 'specialization',
  'Teacher share': 'salary_percentage', Status: 'status',
};

const display = (value: unknown) => String(value ?? '').trim() || '-';
const dateValue = (value: unknown) => value ? String(value).slice(0, 10) : '';

export const createTeacherOverviewDraft = (teacher: any): TeacherOverviewDraft => ({
  first_name: String(teacher.first_name || ''), last_name: String(teacher.last_name || ''), username: String(teacher.username || ''),
  email: String(teacher.email || ''), phone: String(teacher.phone || ''), date_of_birth: dateValue(teacher.date_of_birth),
  gender: String(teacher.gender || ''), qualification: String(teacher.qualification || ''), specialization: String(teacher.specialization || ''),
  salary_percentage: String(teacher.salary_percentage ?? 50), status: String(teacher.status || ''),
});

export const buildTeacherOverviewColumns = (teacher: any) => ({
  main: [
    { label: 'First name', value: display(teacher.first_name) }, { label: 'Last name', value: display(teacher.last_name) },
    { label: 'Status', value: display(teacher.status) }, { label: 'Username', value: display(teacher.username) },
    { label: 'Employee ID', value: display(teacher.employee_id) }, { label: 'Date of birth', value: teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : '-' },
    { label: 'Gender', value: display(teacher.gender) }, { label: 'Center ID', value: display(teacher.center_id) },
  ],
  professional: [
    { label: 'Email', value: display(teacher.email) }, { label: 'Phone', value: display(teacher.phone) },
    { label: 'Qualification', value: display(teacher.qualification) }, { label: 'Specialization', value: display(teacher.specialization) },
    { label: 'Teacher share', value: `${Number(teacher.salary_percentage ?? 50)}%` },
  ],
});

export const buildTeacherOverviewUpdate = (draft: TeacherOverviewDraft) => ({
  ...Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])),
  salary_percentage: Number(draft.salary_percentage),
});
