import { describe, expect, it } from 'vitest';
import { buildOwnerDailyIncomeRows } from '../utils';

// Local-time literals (no trailing Z, no bare `YYYY-MM-DD`) keep bucketing timezone independent.
const paidOn = (date: string, overrides: Record<string, unknown> = {}) => ({
  payment_id: Math.random(),
  student_id: 1,
  status: 'Paid',
  amount: 100,
  payment_date: date,
  ...overrides,
});

describe('buildOwnerDailyIncomeRows', () => {
  it('collapses several payments made on the same day into one row', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        paidOn('2026-08-05T09:00:00', { student_id: 1, amount: 100 }),
        paidOn('2026-08-05T18:30:00', { student_id: 2, amount: 250 }),
        paidOn('2026-08-05T23:59:00', { student_id: 3, amount: 50 }),
      ],
      '2026-08'
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dateKey: '2026-08-05', paymentCount: 3, studentCount: 3, total: 400 });
  });

  it('counts distinct students, so one student paying twice a day is a single student', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        paidOn('2026-08-05T09:00:00', { student_id: 7, amount: 100 }),
        paidOn('2026-08-05T15:00:00', { student_id: 7, amount: 100 }),
        paidOn('2026-08-05T16:00:00', { student_id: 8, amount: 100 }),
      ],
      '2026-08'
    );

    expect(rows[0].paymentCount).toBe(3);
    expect(rows[0].studentCount).toBe(2);
  });

  it('ignores missing or zero student ids when counting students but still counts the payment', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        paidOn('2026-08-05T09:00:00', { student_id: 0, amount: 100 }),
        paidOn('2026-08-05T10:00:00', { student_id: undefined, amount: 100 }),
        paidOn('2026-08-05T11:00:00', { student_id: 4, amount: 100 }),
      ],
      '2026-08'
    );

    expect(rows[0]).toMatchObject({ paymentCount: 3, studentCount: 1, total: 300 });
  });

  it('excludes payments that fall outside the selected month', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        paidOn('2026-07-31T12:00:00', { amount: 999 }),
        paidOn('2026-08-01T12:00:00', { amount: 100 }),
        paidOn('2026-09-01T12:00:00', { amount: 999 }),
        paidOn('2025-08-01T12:00:00', { amount: 999 }),
      ],
      '2026-08'
    );

    expect(rows.map((row) => row.dateKey)).toEqual(['2026-08-01']);
    expect(rows[0].total).toBe(100);
  });

  it('keeps only paid and completed payments and ignores every other status', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        paidOn('2026-08-05T09:00:00', { status: 'paid', amount: 100 }),
        paidOn('2026-08-05T10:00:00', { status: 'completed', amount: 200 }),
        paidOn('2026-08-05T11:00:00', { status: 'pending', amount: 999 }),
        paidOn('2026-08-05T12:00:00', { status: 'failed', amount: 999 }),
        paidOn('2026-08-05T13:00:00', { status: 'unpaid', amount: 999 }),
        paidOn('2026-08-05T14:00:00', { status: '', amount: 999 }),
        { payment_date: '2026-08-05T15:00:00', amount: 999, student_id: 3 },
      ],
      '2026-08'
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ paymentCount: 2, total: 300 });
  });

  it('matches statuses case-insensitively and accepts payment_status as an alias', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        paidOn('2026-08-05T09:00:00', { status: 'PAID', amount: 100 }),
        paidOn('2026-08-05T10:00:00', { status: 'CoMpLeTeD', amount: 100 }),
        paidOn('2026-08-05T11:00:00', { status: undefined, payment_status: 'Paid', amount: 100 }),
        paidOn('2026-08-05T12:00:00', { status: undefined, payment_status: 'COMPLETED', amount: 100 }),
        paidOn('2026-08-05T13:00:00', { status: undefined, payment_status: 'Pending', amount: 999 }),
      ],
      '2026-08'
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ paymentCount: 4, total: 400 });
  });

  it('produces no row for days without any paid payment', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        paidOn('2026-08-03T09:00:00'),
        paidOn('2026-08-06T09:00:00'),
        paidOn('2026-08-04T09:00:00', { status: 'pending' }),
      ],
      '2026-08'
    );

    expect(rows.map((row) => row.dateKey)).toEqual(['2026-08-06', '2026-08-03']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(buildOwnerDailyIncomeRows([], '2026-08')).toEqual([]);
    expect(buildOwnerDailyIncomeRows([paidOn('2026-08-05T09:00:00', { status: 'pending' })], '2026-08')).toEqual([]);
  });

  it('sorts rows newest first by dateKey', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        paidOn('2026-08-02T09:00:00'),
        paidOn('2026-08-19T09:00:00'),
        paidOn('2026-08-09T09:00:00'),
        paidOn('2026-08-28T09:00:00'),
      ],
      '2026-08'
    );

    expect(rows.map((row) => row.dateKey)).toEqual(['2026-08-28', '2026-08-19', '2026-08-09', '2026-08-02']);
  });

  it('survives malformed, missing and unparseable dates without emitting junk rows', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        { status: 'paid', amount: 100, student_id: 1, payment_date: null },
        { status: 'paid', amount: 100, student_id: 1, payment_date: '' },
        { status: 'paid', amount: 100, student_id: 1, payment_date: 'not-a-date' },
        { status: 'paid', amount: 100, student_id: 1 },
        { status: 'paid', amount: 100, student_id: 1, payment_date: '2026-13-45T00:00:00' },
        null,
        undefined,
        paidOn('2026-08-05T09:00:00', { amount: 100 }),
      ] as any[],
      '2026-08'
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ dateKey: '2026-08-05', paymentCount: 1, total: 100 });
    expect(rows.every((row) => row.dateKey.startsWith('2026-08'))).toBe(true);
  });

  it('falls back through the known date and amount field names', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        { status: 'paid', student_id: 1, paid_at: '2026-08-05T09:00:00', paid_amount: 40 },
        { status: 'paid', student_id: 2, date: '2026-08-05T10:00:00', payment_amount: 60 },
        { status: 'paid', student_id: 3, created_at: '2026-08-05T11:00:00', amount: '25' },
      ],
      '2026-08'
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ paymentCount: 3, studentCount: 3, total: 125 });
  });

  it('inherits getOwnerPaymentAmount behaviour for a non-numeric amount', () => {
    // Known limitation of the shared amount reader: a garbage amount poisons the bucket total.
    // Rendering still degrades safely because formatMoney coerces NaN to 0.
    const rows = buildOwnerDailyIncomeRows(
      [paidOn('2026-08-05T09:00:00', { amount: 'abc' }), paidOn('2026-08-05T10:00:00', { amount: 100 })],
      '2026-08'
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].paymentCount).toBe(2);
    expect(Number.isNaN(rows[0].total)).toBe(true);
  });

  it('gives every row a non-empty human readable label', () => {
    const rows = buildOwnerDailyIncomeRows([paidOn('2026-08-05T09:00:00')], '2026-08');

    expect(rows[0].dateLabel).toEqual(expect.any(String));
    expect(rows[0].dateLabel.length).toBeGreaterThan(0);
  });

  it('keeps the summary figures the panel derives consistent with the rows', () => {
    const rows = buildOwnerDailyIncomeRows(
      [
        paidOn('2026-08-05T09:00:00', { student_id: 1, amount: 100 }),
        paidOn('2026-08-05T10:00:00', { student_id: 1, amount: 150 }),
        paidOn('2026-08-11T10:00:00', { student_id: 2, amount: 250 }),
        paidOn('2026-08-20T10:00:00', { student_id: 3, amount: 500 }),
        paidOn('2026-09-20T10:00:00', { student_id: 3, amount: 999 }),
        paidOn('2026-08-21T10:00:00', { student_id: 3, amount: 999, status: 'pending' }),
      ],
      '2026-08'
    );

    const monthTotal = rows.reduce((sum, row) => sum + row.total, 0);
    const totalPaymentCount = rows.reduce((sum, row) => sum + row.paymentCount, 0);

    expect(rows.map((row) => row.dateKey)).toEqual(['2026-08-20', '2026-08-11', '2026-08-05']);
    expect(monthTotal).toBe(1000);
    expect(totalPaymentCount).toBe(4);
    expect(rows).toHaveLength(3);
  });

  it('accepts date-only values and keeps them in a single bucket', () => {
    // `payment_date` is a SQL DATE column, so the API can send bare `YYYY-MM-DD`.
    const rows = buildOwnerDailyIncomeRows(
      [
        { status: 'paid', student_id: 1, amount: 100, payment_date: '2026-08-05' },
        { status: 'paid', student_id: 2, amount: 200, payment_date: '2026-08-05' },
      ],
      '2026-08'
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ paymentCount: 2, studentCount: 2, total: 300 });
  });
});
