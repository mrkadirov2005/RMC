export interface StudentProfile {
  id?: number;
  student_id?: number;
  first_name?: string;
  last_name?: string;
  enrollment_number?: string;
  phone?: string;
  email?: string;
  parent_name?: string;
  parent_phone?: string;
  class_id?: number;
  teacher_id?: number;
  status?: string;
  coins?: number;
  created_at?: string;
  createdAt?: string;
}

export interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

export interface ClassInfo {
  class_id?: number;
  id?: number;
  class_name?: string;
  class_code?: string;
  level?: number;
  section?: string;
  room_number?: string;
}

export interface Subject {
  subject_id?: number;
  id?: number;
  subject_name?: string;
  teacher_name?: string;
}

export interface Test {
  test_id: number;
  test_name: string;
  test_type: string;
  duration_minutes?: number;
  due_date?: string;
  submission_status?: string;
  total_marks?: number;
}

export interface Attendance {
  attendance_date?: string;
  status?: string;
}

export interface Assignment {
  assignment_id?: number;
  id?: number;
  assignment_title?: string;
  title?: string;
  due_date?: string;
  status?: string;
}

export interface Grade {
  grade_id?: number;
  id?: number;
  subject?: string;
  marks_obtained?: number;
  total_marks?: number;
  percentage?: number;
  grade_letter?: string;
}

export interface Payment {
  payment_id?: number;
  id?: number;
  amount?: number;
  payment_date?: string;
  status?: string;
  payment_status?: string;
  receipt_number?: string;
}

export interface Debt {
  debt_id?: number;
  id?: number;
  debt_amount?: number;
  amount_paid?: number;
  due_date?: string;
}

export interface ScheduleItem {
  room_id: number;
  room_number: string;
  day: string;
  time: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  rate: number;
}
