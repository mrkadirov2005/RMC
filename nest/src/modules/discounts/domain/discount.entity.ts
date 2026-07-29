export type DiscountKind = 'serial_discount' | 'monthly_discount';
export type DiscountValueType = 'fixed' | 'percent';

export interface Discount {
  discount_id: number;
  student_id: number;
  center_id: number;
  discount_type: DiscountValueType;
  discount_kind: DiscountKind;
  value: number;
  original_price?: number | null;
  final_price?: number | null;
  reason?: string | null;
  payment_period?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DiscountCalculation {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}
