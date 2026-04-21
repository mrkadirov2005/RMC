export type ClassItem = {
  class_id?: number;
  id?: number;
  center_id?: number;
  class_name: string;
  class_code?: string;
  level?: number;
  teacher_id?: number;
  section?: string;
  capacity?: number;
  room_number?: string;
  payment_amount?: number;
  payment_frequency?: string;
};

export type CalendarDay = {
  date: number;
  isCurrentMonth: boolean;
  dayName: string;
  isoDate: string;
};

export type AttendanceItem = {
  attendance_id?: number;
  student_id: number;
  class_id: number;
  session_id?: number | null;
  attendance_date: string;
  status: string;
};

export type GradeItem = {
  grade_id?: number;
  student_id: number;
  class_id: number;
  session_id?: number | null;
  marks_obtained?: number;
  total_marks?: number;
  percentage?: number;
  created_at?: string;
};

export type SessionItem = {
  session_id: number;
  class_id: number;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  end_time: string;
};

export type StudentItem = {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  username?: string | null;
  class_id?: number;
};
