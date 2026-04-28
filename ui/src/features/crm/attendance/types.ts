// Shared TypeScript types.

export interface Attendance {
  attendance_id?: number;
  id?: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  attendance_date: string;
  status: string;
  remarks?: string;
}

export interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

export interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
  teacher_id?: number;
}

export interface Student {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  class_id?: number;
  teacher_id?: number;
}

export type AttendanceTabType = 'students' | 'classes' | 'teachers' | 'statistics';
export type AttendanceFolderType = 'teacher' | 'class' | 'student';

export interface AttendanceFolderSelection {
  type: AttendanceFolderType;
  id: number;
  name: string;
}

