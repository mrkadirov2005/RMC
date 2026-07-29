export interface Student {
  student_id: number;
  id?: number;
  center_id: number;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  password_hash?: string | null;
  phone?: string | null;
  status?: string | null;
  teacher_id?: number | null;
  class_id?: number | null;
  school_name?: string | null;
  school_class?: string | null;
  is_frozen?: boolean | null;
}
