import type { QuestionType, TestType } from '@/features/crm/tests/questionTypes';

// Auth Types
export interface AuthUser {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  roles?: string[]; // For teachers
  permissions?: string[]; // For superusers/admins
  userType: 'superuser' | 'teacher' | 'student';
  branch_id?: number;
  center_id: number;
  class_id?: number; // For students
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
}

// Student Types
export interface Student {
  id?: number;
  center_id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  school_name?: string | null;
  school_class?: string | null;
  gender: string;
  status: string;
  teacher_id: number;
  class_id: number;
}

// Teacher Types
export interface Teacher {
  id?: number;
  center_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  qualification: string;
  specialization: string;
  salary_percentage?: number;
  status: string;
  roles: string[];
}

// Class Types
export interface Class {
  id?: number;
  center_id: number;
  class_name: string;
  class_code: string;
  level: number;
  section: string;
  capacity: number;
  teacher_id: number;
  room_number: string;
  payment_amount: number;
  payment_frequency: string;
}

// Payment Types
export interface Payment {
  id?: number;
  student_id: number;
  center_id: number;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_reference: string;
  receipt_number: string;
  payment_status: string;
  payment_type: string;
  notes: string;
}

// Grade Types
export interface Grade {
  id?: number;
  student_id: number;
  teacher_id: number;
  subject: string;
  class_id: number;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade_letter: string;
  academic_year: number;
  term: string;
}

// Attendance Types
export interface Attendance {
  id?: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  attendance_date: string;
  status: string;
  remarks: string;
}

// Assignment Types
export interface Assignment {
  id?: number;
  class_id: number;
  assignment_title: string;
  description: string;
  due_date: string;
  submission_date: string;
  status: string;
  grade?: number;
}

// Debt Types
export interface Debt {
  id?: number;
  student_id: number;
  center_id: number;
  debt_amount: number;
  debt_date: string;
  due_date: string;
  amount_paid: number;
  remarks: string;
}

// Center Types
export interface Center {
  id?: number;
  center_name: string;
  center_code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  principal_name: string;
}

// Subject Types
export interface Subject {
  id?: number;
  class_id: number;
  subject_name: string;
  subject_code: string;
  teacher_id: number;
  total_marks: number;
  passing_marks: number;
}

// Test Types
export type SubmissionStatus = 'not_started' | 'in_progress' | 'submitted' | 'graded' | 'reviewed';

export interface ReadingPassage {
  passage_id: number;
  center_id: number;
  test_id: number;
  title: string;
  content: string;
  word_count?: number | null;
  difficulty_level?: string | null;
  passage_order?: number | null;
  audio_url?: string | null;
  image_url?: string | null;
}

export interface TestQuestion {
  question_id: number;
  center_id: number;
  test_id: number;
  passage_id?: number | null;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  negative_marks?: number | null;
  question_order?: number | null;
  options?: string[] | null;
  correct_answer?: any;
  explanation?: string | null;
  image_url?: string | null;
  is_required?: boolean | null;
  word_limit?: number | null;
  rubric?: string | null;
}

export interface Test {
  test_id: number;
  center_id: number;
  subject_id?: number | null;
  test_name: string;
  test_type: TestType;
  description?: string | null;
  instructions?: string | null;
  total_marks: number;
  passing_marks: number;
  duration_minutes: number;
  assignment_type?: string | null;
  is_timed?: boolean | null;
  shuffle_questions?: boolean | null;
  show_results_immediately?: boolean | null;
  allow_retake?: boolean | null;
  max_retakes?: number | null;
  created_by?: number | null;
  created_by_type?: string | null;
  is_active?: boolean | null;
  is_private?: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  questions?: TestQuestion[];
  passages?: ReadingPassage[];
}

export interface TestAnswer {
  answer_id: number;
  center_id: number;
  submission_id: number;
  question_id: number;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  negative_marks?: number | null;
  question_order?: number | null;
  options?: string[] | null;
  correct_answer?: any;
  explanation?: string | null;
  word_limit?: number | null;
  passage_id?: number | null;
  rubric?: string | null;
  student_answer?: any;
  is_correct?: boolean | null;
  marks_obtained?: number | null;
  feedback?: string | null;
  graded?: boolean | null;
  graded_at?: string | null;
  graded_by?: number | null;
  graded_by_type?: string | null;
}

export interface TestSubmission {
  submission_id: number;
  center_id: number;
  test_id: number;
  student_id: number;
  test_name: string;
  test_type: TestType;
  total_marks: number;
  passing_marks: number;
  first_name: string;
  last_name: string;
  enrollment_number?: string | null;
  started_at?: string | null;
  submitted_at?: string | null;
  time_taken_seconds?: number | null;
  total_score?: number | null;
  obtained_marks?: number | null;
  score?: number | null;
  percentage?: number | null;
  status: SubmissionStatus;
  is_passed?: boolean | null;
  feedback?: string | null;
  graded_by?: number | null;
  graded_by_type?: string | null;
  graded_at?: string | null;
  attempt_number?: number | null;
  pending_manual_count?: number;
  is_fully_graded?: boolean;
  answers: TestAnswer[];
}

// RBAC Types
export interface Role {
  name: string;
  permissions: Permission[];
}

export interface Permission {
  code: string;
  name: string;
  description?: string;
}

export const PERMISSION_CODES = {
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  VIEW_TELEGRAM_LEADS: 'VIEW_TELEGRAM_LEADS',
  VIEW_ARCHIVE: 'VIEW_ARCHIVE',
  VIEW_RETENTION: 'VIEW_RETENTION',
  VIEW_CALENDAR: 'VIEW_CALENDAR',
  CRUD_STUDENT: 'CRUD_STUDENT',
  CRUD_TEACHER: 'CRUD_TEACHER',
  CRUD_CLASS: 'CRUD_CLASS',
  CRUD_ROOM: 'CRUD_ROOM',
  CRUD_PAYMENT: 'CRUD_PAYMENT',
  CRUD_GRADE: 'CRUD_GRADE',
  CRUD_ATTENDANCE: 'CRUD_ATTENDANCE',
  CRUD_ASSIGNMENT: 'CRUD_ASSIGNMENT',
  CRUD_TEACHER_TASK: 'CRUD_TEACHER_TASK',
  CRUD_SUBJECT: 'CRUD_SUBJECT',
  CRUD_DEBT: 'CRUD_DEBT',
  CRUD_CENTER: 'CRUD_CENTER',
  VIEW_FINANCE: 'VIEW_FINANCE',
  MANAGE_SALARY: 'MANAGE_SALARY',
  MANAGE_TESTS: 'MANAGE_TESTS',
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_USERS: 'MANAGE_USERS',
};
