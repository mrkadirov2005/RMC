import { describe, expect, it } from 'vitest';
import { paymentsByMonth, type CashPayment } from '../cashFormat';

const payment = (id: number, forMonth: string | null, group: CashPayment['method_group'], amount: number): CashPayment => ({
  payment_id: id,
  student_id: id,
  student_name: `S${id}`,
  class_name: null,
  amount,
  payment_method: group,
  method_group: group,
  for_month: forMonth,
  received_by_name: null,
  paid_at: null,
});

describe('paymentsByMonth', () => {
  it("puts the day's own month first, then the other months newest first, each split by method", () => {
    const sections = paymentsByMonth(
      [
        payment(1, '2026-09', 'cash', 100),
        payment(2, '2026-11', 'card', 200),
        payment(3, '2026-10', 'cash', 300),
        payment(4, null, 'cash', 400),
        payment(5, '2026-10', 'card', 500),
      ],
      '2026-11'
    );
    expect(sections.map((section) => [section.month, section.current, section.total])).toEqual([
      ['2026-11', true, 600],
      ['2026-10', false, 800],
      ['2026-09', false, 100],
    ]);
    expect(sections[0].methods.map((method) => [method.group, method.total])).toEqual([
      ['cash', 400],
      ['card', 200],
    ]);
  });
});
