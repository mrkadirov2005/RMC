// Shape of GET /salaries/me/payments: the signed-in teacher's money per group for one month.

export type StudentPaymentState = 'paid' | 'partial' | 'unpaid';

export interface GroupPaymentStudent {
  student_id: number;
  name: string;
  state: StudentPaymentState;
  expected: number;
  paid: number;
  remaining: number;
}

export interface GroupPaymentCounts {
  total_students: number;
  paid_students: number;
  partial_students: number;
  unpaid_students: number;
  expected: number;
  collected: number;
  remaining: number;
  collected_percent: number;
}

export interface GroupPayment extends GroupPaymentCounts {
  class_id: number;
  class_name: string;
  monthly_fee: number;
  teacher_share: number;
  students: GroupPaymentStudent[];
}

export interface TeacherGroupPayments {
  month: string;
  salary_percentage: number;
  totals: GroupPaymentCounts & {
    groups: number;
    current_salary: number;
    potential_salary: number;
  };
  salary_record: { amount: number | string; is_paid: boolean } | null;
  groups: GroupPayment[];
}
