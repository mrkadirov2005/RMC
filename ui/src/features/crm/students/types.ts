// Shared TypeScript types.

export interface Student {
  student_id?: number;
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
  gender: string;
  status: string;
  teacher_id?: number;
  class_id?: number;
  school_name?: string | null;
  school_class?: string | null;
  coins?: number;
  username?: string;
  password?: string;
}

export interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
  capacity: number;
}
