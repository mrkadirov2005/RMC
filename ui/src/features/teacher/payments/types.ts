// Shape of GET /salaries/me/payments: the signed-in teacher's money per group for one month.

export type StudentPaymentState = 'paid' | 'partial' | 'unpaid';

export interface GroupPaymentStudent {
  student_id: number;
  name: string;
  state: StudentPaymentState;
  expected: number;
  paid: number;
  remaining: number;
  /** Moved to another group this month; counts for this teacher's salary until the month ends. */
  transferred?: boolean;
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

/** A payment for an earlier month that came in late; it counts in the month it was entered. */
export interface LatePayment {
  payment_id: number;
  student_id: number;
  name: string;
  class_id: number | null;
  class_name: string | null;
  /** YYYY-MM the payment was for. */
  for_month: string | null;
  entered_at: string | null;
  amount: number;
  teacher_share: number;
}

/** The month's salary by the teacher's pay rate: the rate of the money that came in. */
export interface TeacherEarningsTotals {
  rate: number;
  on_time_amount: number;
  late_amount: number;
  base_amount: number;
  /** What the center owes the teacher for the month. */
  due: number;
  paying_students: number;
}

export interface TeacherEarnings extends TeacherEarningsTotals {
  late_payments: LatePayment[];
}

export interface TeacherGroupPayments {
  month: string;
  salary_percentage: number;
  totals: GroupPaymentCounts & {
    groups: number;
    current_salary: number;
    potential_salary: number;
  };
  salary_record: { amount: number | string; is_paid: boolean; paid_at?: string | null } | null;
  groups: GroupPayment[];
  earnings?: TeacherEarnings;
  advances?: Array<{ advance_id: number; amount: number | string; given_at?: string | null; payment_method?: string | null; notes?: string | null; given_by_name?: string | null }>;
  advance_total?: number;
}
