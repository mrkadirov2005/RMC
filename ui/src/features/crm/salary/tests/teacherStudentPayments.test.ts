import { describe, expect, it } from 'vitest';
import { groupStudentPayments, monthRange, totalStudentPayments, type StudentPaymentRow } from '../model/teacherStudentPayments';

const row = (id: number, classId: number, className: string, state: StudentPaymentRow['state'], paid: number, name = `S${id}`): StudentPaymentRow => ({
  student_id: id,
  first_name: name,
  last_name: '',
  phone: null,
  parent_phone: null,
  class_id: classId,
  class_name: className,
  monthly_fee: 480000,
  paid_amount: paid,
  expected: 480000,
  remaining: 480000 - paid,
  payments_count: paid ? 1 : 0,
  last_payment_date: paid ? '2026-10-05' : null,
  state,
});

describe('teacher student payments', () => {
  it('gives the first and last day of the month', () => {
    expect(monthRange(2026, 10)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange(2027, 2)).toEqual({ from: '2027-02-01', to: '2027-02-28' });
  });

  it('groups by group name and puts unpaid students first', () => {
    const groups = groupStudentPayments([
      row(1, 2, 'IELTS', 'paid', 480000, 'Ali'),
      row(2, 1, 'B1', 'unpaid', 0, 'Vali'),
      row(3, 2, 'IELTS', 'unpaid', 0, 'Zarina'),
      row(4, 2, 'IELTS', 'partial', 200000, 'Bek'),
    ]);
    expect(groups.map((g) => g.className)).toEqual(['B1', 'IELTS']);
    expect(groups[1].students.map((s) => s.first_name)).toEqual(['Zarina', 'Bek', 'Ali']);
    expect(groups[1]).toMatchObject({ paid: 1, partial: 1, unpaid: 1, collected: 680000, expected: 1440000 });
  });

  it('adds up the totals', () => {
    expect(totalStudentPayments([row(1, 1, 'B1', 'paid', 480000), row(2, 1, 'B1', 'partial', 100000), row(3, 1, 'B1', 'unpaid', 0)])).toEqual({
      students: 3, paid: 1, partial: 1, unpaid: 1, collected: 580000, remaining: 860000,
    });
  });
});
