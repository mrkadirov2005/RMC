import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeacherPaymentsOverview from '../TeacherPaymentsOverview';
import type { TeacherGroupPayments } from '../types';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string>) => value.replace(/\{(\w+)\}/g, (_, key) => vars?.[key] ?? `{${key}}`),
  }),
}));

// Plain numbers so assertions don't depend on the currency formatter.
vi.mock('@/utils/helpers', () => ({ formatMoney: (amount: unknown) => String(Number(amount || 0)) }));

const getMyPayments = vi.fn();
vi.mock('../../api', () => ({ salaryAPI: { getMyPayments: (params: unknown) => getMyPayments(params) } }));

const payload: TeacherGroupPayments = {
  month: '2026-10',
  salary_percentage: 40,
  totals: {
    groups: 1,
    total_students: 2,
    paid_students: 1,
    partial_students: 0,
    unpaid_students: 1,
    expected: 800000,
    collected: 400000,
    remaining: 400000,
    collected_percent: 50,
    current_salary: 160000,
    potential_salary: 320000,
  },
  salary_record: null,
  groups: [
    {
      class_id: 1,
      class_name: 'Math A',
      monthly_fee: 400000,
      total_students: 2,
      paid_students: 1,
      partial_students: 0,
      unpaid_students: 1,
      expected: 800000,
      collected: 400000,
      remaining: 400000,
      collected_percent: 50,
      teacher_share: 160000,
      students: [
        { student_id: 10, name: 'Ali V', state: 'paid', expected: 400000, paid: 400000, remaining: 0 },
        { student_id: 11, name: 'Bek K', state: 'unpaid', expected: 400000, paid: 0, remaining: 400000 },
      ],
    },
  ],
};

describe('TeacherPaymentsOverview', () => {
  beforeEach(() => {
    getMyPayments.mockReset();
  });

  it('shows the overall share collected, the teacher salary and each group', async () => {
    getMyPayments.mockResolvedValue({ data: payload });
    render(<TeacherPaymentsOverview />);

    expect(await screen.findByText('Math A')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('My salary so far')).toBeTruthy();
    expect(screen.getAllByText('160000').length).toBeGreaterThan(0);
    expect(screen.getByText('40% of collected payments')).toBeTruthy();
    expect(screen.getByText('1 / 2 paid')).toBeTruthy();

    // The student list opens from the group card.
    expect(screen.queryByText('Bek K')).toBeNull();
    fireEvent.click(screen.getByText('Math A'));
    expect(screen.getByText('Bek K')).toBeTruthy();
    expect(screen.getByText('400000 left')).toBeTruthy();
  });

  it('says so when the statistics cannot be loaded', async () => {
    getMyPayments.mockRejectedValue(new Error('offline'));
    render(<TeacherPaymentsOverview />);

    expect(await screen.findByText('Could not load payment statistics.')).toBeTruthy();
  });
});
