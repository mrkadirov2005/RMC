export interface Payment {
  payment_id: number;
  student_id: number;
  center_id: number;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_reference?: string | null;
  receipt_number?: string | null;
  payment_status: string;
  payment_type?: string | null;
  notes?: string | null;
  discount_id?: number | null;
  discount_kind?: string | null;
  discount_value_type?: string | null;
  discount_value?: number | null;
  original_amount?: number | null;
  discount_amount?: number | null;
  final_amount?: number | null;
  is_complete?: boolean | null;
  deleted_at?: string | null;
}
