// Domain types for the teacher salary tracking feature.

export interface SalaryRecord {
  salary_id: number;
  center_id?: number | null;
  teacher_id: number;
  salary_year: number;
  salary_month: number;
  amount: number | string;
  is_paid: boolean;
  paid_at?: string | null;
  marked_by_id?: number | null;
  marked_by_user_type?: string | null;
  marked_by_role?: string | null;
  marked_by_name?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SalaryStudentStats {
  total_students: number;
  paid_students: number;
  unpaid_students: number;
  paid_percent: number;
  unpaid_percent: number;
}

export interface SalaryOverviewRow {
  teacher_id: number;
  first_name?: string;
  last_name?: string;
  center_id?: number | null;
  salary: SalaryRecord | null;
  student_stats: SalaryStudentStats;
}

export interface SalaryHistoryEntry {
  salary_year: number;
  salary_month: number;
  salary: SalaryRecord | null;
  student_stats: SalaryStudentStats;
}

export interface SalaryTeacherSummary {
  teacher_id: number;
  first_name?: string;
  last_name?: string;
}

export interface SalaryTeacherDetail {
  teacher: SalaryTeacherSummary;
  history: SalaryHistoryEntry[];
}

export interface MarkSalaryPaidPayload {
  teacher_id: number;
  salary_year: number;
  salary_month: number;
  amount: number;
  payment_method?: string;
  notes?: string;
}

export interface UpdateSalaryPayload {
  id: number;
  data: {
    amount?: number;
    is_paid?: boolean;
    payment_method?: string;
    notes?: string;
  };
  teacherId?: number;
}
