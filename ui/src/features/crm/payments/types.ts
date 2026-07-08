export interface Payment {
  payment_id?: number;
  id?: number;
  student_id: number;
  center_id?: number;
  payment_date?: string;
  amount?: number;
  currency?: string;
  payment_method?: string;
  payment_type?: string;
  status?: string;
  payment_status?: string;
  receipt_number?: string;
  reference_number?: string;
  transaction_reference?: string;
  notes?: string;
  discount_id?: number | null;
  discount_kind?: 'serial_discount' | 'monthly_discount' | null;
  discount_value_type?: 'percent' | 'fixed' | null;
  discount_value?: number;
  original_amount?: number;
  discount_amount?: number;
  final_amount?: number;
  is_complete?: boolean;
  use_monthly_discount?: boolean;
  student_first_name?: string;
  student_last_name?: string;
  student_class_id?: number;
  student_teacher_id?: number;
  student_status?: string;
  student_deleted_at?: string;
  student_class_name?: string;
  coverage_days?: number;
  coverage_total_days?: number;
  transfer_effective_date?: string;
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
  payment_amount?: number;
  payment_frequency?: string;
}

export interface Student {
  student_id?: number;
  id?: number;
  center_id?: number;
  first_name: string;
  last_name: string;
  phone?: string;
  class_id?: number;
  teacher_id?: number;
  class_name?: string;
  school_name?: string | null;
  school_class?: string | null;
}

export type FolderType = 'teacher' | 'class' | 'student';
export type TeacherDetailView = 'groups' | 'total';
