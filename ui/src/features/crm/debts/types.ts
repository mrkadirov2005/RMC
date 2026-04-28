// Shared TypeScript types.

export interface Debt {
  debt_id?: number;
  id?: number;
  student_id: number;
  center_id: number;
  debt_amount: number;
  debt_date: string;
  due_date: string;
  amount_paid: number;
  remarks?: string;
}

