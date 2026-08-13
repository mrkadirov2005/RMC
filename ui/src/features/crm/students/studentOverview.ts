type StudentOverviewSource = {
  student_id?: number;
  id?: number;
  first_name?: string;
  last_name?: string;
  status?: string;
  username?: string;
  enrollment_number?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  parent_name?: string;
  parent_phone?: string;
  school_name?: string | null;
  school_class?: string | null;
  center_id?: number;
  created_at?: string;
  createdAt?: string;
};

export type StudentOverviewEditField =
  | 'first_name' | 'last_name' | 'status' | 'username' | 'enrollment_number'
  | 'email' | 'phone' | 'date_of_birth' | 'gender' | 'parent_name'
  | 'parent_phone' | 'school_name' | 'school_class';

export type StudentOverviewDraft = Record<StudentOverviewEditField, string>;

export const STUDENT_ACCOUNT_STATUSES = ['Active', 'Inactive', 'Suspended'] as const;

export const getNextStudentAccountStatus = (status?: string) =>
  String(status || '').toLowerCase() === 'active' ? 'Inactive' : 'Active';

export const STUDENT_OVERVIEW_EDIT_FIELDS: Record<string, StudentOverviewEditField> = {
  'First name': 'first_name', 'Last name': 'last_name', Status: 'status', Username: 'username',
  'Enrollment number': 'enrollment_number', Email: 'email', Phone: 'phone', 'Date of birth': 'date_of_birth',
  Gender: 'gender', 'Parent name': 'parent_name', 'Parent phone': 'parent_phone', School: 'school_name',
  'School class': 'school_class',
};

export const createStudentOverviewDraft = (student: StudentOverviewSource): StudentOverviewDraft =>
  Object.fromEntries(Object.values(STUDENT_OVERVIEW_EDIT_FIELDS).map((field) => [field, String(student[field] ?? '')])) as StudentOverviewDraft;

export const buildStudentOverviewUpdate = (draft: StudentOverviewDraft) =>
  Object.fromEntries(Object.entries(draft).map(([field, value]) => [field, value.trim()]));

const display = (value: unknown) => String(value ?? '').trim() || '-';

const formatDate = (value: unknown) => {
  if (!value) return '-';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

export const buildStudentOverviewRows = ({
  student,
  groupName,
  teacherName,
  coinBalance,
}: {
  student: StudentOverviewSource;
  groupName?: string;
  teacherName?: string;
  coinBalance: number;
}) => [
  { label: 'First name', value: display(student.first_name) },
  { label: 'Last name', value: display(student.last_name) },
  { label: 'Status', value: display(student.status) },
  { label: 'Username', value: display(student.username) },
  { label: 'Enrollment number', value: display(student.enrollment_number) },
  { label: 'Group', value: display(groupName) },
  { label: 'Teacher', value: display(teacherName) },
  { label: 'Email', value: display(student.email) },
  { label: 'Phone', value: display(student.phone) },
  { label: 'Date of birth', value: formatDate(student.date_of_birth) },
  { label: 'Gender', value: display(student.gender) },
  { label: 'Parent name', value: display(student.parent_name) },
  { label: 'Parent phone', value: display(student.parent_phone) },
  { label: 'School', value: display(student.school_name) },
  { label: 'School class', value: display(student.school_class) },
  { label: 'Coins', value: Number(coinBalance || 0).toLocaleString() },
  { label: 'Student ID', value: display(student.student_id ?? student.id) },
  { label: 'Center ID', value: display(student.center_id) },
  { label: 'Added on', value: formatDate(student.created_at ?? student.createdAt) },
];

export const splitStudentOverviewRows = (rows: Array<{ label: string; value: string }>) => ({
  main: rows.filter((row) => [
    'First name', 'Last name', 'Status', 'Username', 'Enrollment number',
    'Group', 'Teacher', 'Date of birth', 'Gender', 'Coins',
  ].includes(row.label)),
  additional: rows.filter((row) => [
    'Email', 'Phone', 'Parent name', 'Parent phone', 'School',
    'School class', 'Student ID', 'Center ID', 'Added on',
  ].includes(row.label)),
});
