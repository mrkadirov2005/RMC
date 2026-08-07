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
  class_teacher_id?: number;
  effective_teacher_id?: number;
  class_id?: number;
  school_name?: string | null;
  school_class?: string | null;
  class_name?: string | null;
  class_code?: string | null;
  class_level?: number | null;
  center_address?: string | null;
  deleted_at?: string | null;
  coins?: number;
  class_payment_amount?: number | string | null;
  paid_this_month?: boolean;
  payment_amount_this_month?: number | string | null;
  payment_count_this_month?: number;
  payment_status_this_month?: string | null;
  last_payment_date_this_month?: string | null;
  username?: string;
  password?: string;
  is_discounted?: boolean;
  discount_kind?: 'serial_discount' | 'monthly_discount';
  discount_value_type?: 'percent' | 'fixed';
  discount_value?: number;
  discount_original_price?: number;
  discount_reason?: string;
  acquisition_source_id?: number;
  acquisition_detail?: string;
  referred_by_teacher_id?: number;
  custom_acquisition_source?: string;
}

export interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
  capacity: number;
  center_id?: number;
  teacher_id?: number;
  student_count?: number;
  section?: string | null;
  room_assignments?: Array<{ day?: string | null }>;
}
