import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPaymentsPage from '../DashboardPaymentsPage';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
vi.mock('@/utils/helpers', () => ({ formatMoney: (amount: unknown) => `${Number(amount || 0)} so'm` }));

const api = vi.hoisted(() => ({
  getStudentsSummary: vi.fn(),
  teachers: vi.fn(async () => ({ data: [{ teacher_id: 7, first_name: 'Ibrohim', last_name: 'M' }] })),
  classes: vi.fn(async () => ({ data: [{ class_id: 3, class_name: 'English A', teacher_id: 7 }] })),
  subjects: vi.fn(async () => ({ data: [{ subject_name: 'English' }, { subject_name: 'English' }] })),
}));
const paymentHook = vi.hoisted(() => ({
  handleOpenModalForStudent: vi.fn(),
  handleCloseModal: vi.fn(),
  handleSubmit: vi.fn(),
  setFormData: vi.fn(),
  isModalOpen: false,
  formData: {},
  state: { loading: false, items: [] },
  students: [],
  classes: [],
  studentOptions: [],
  centerOptions: [],
  isLoadingOptions: false,
}));
vi.mock('../../payments/hooks/usePaymentsPage', () => ({ usePaymentsPage: () => paymentHook }));
vi.mock('../../payments/components/PaymentFormDialog', () => ({ PaymentFormDialog: () => null }));

vi.mock('../api', () => ({
  paymentAPI: { getStudentsSummary: (params: unknown) => api.getStudentsSummary(params) },
  teacherAPI: { getAll: () => api.teachers() },
  classAPI: { getAll: () => api.classes() },
  subjectAPI: { getAll: () => api.subjects() },
}));

const response = (page: number, total: number) => ({ data: {
  period: { from: '2026-10-01', to: '2026-10-31', months: 1 },
  page, limit: 100, total,
  totals: { students: total, paid_students: 1, partial_students: 0, unpaid_students: total - 1, collected: 300000, remaining: 600000 },
  rows: [
    { student_id: 1, first_name: 'Ali', last_name: 'Valiyev', phone: '901112233', parent_phone: null, class_id: 3, class_name: 'English A', teacher_name: 'Ibrohim M', subject: 'English', monthly_fee: 300000, paid_amount: 300000, expected: 300000, remaining: 0, payments_count: 1, last_payment_date: '2026-10-03', state: 'paid' },
    { student_id: 2, first_name: 'Bek', last_name: 'Karimov', phone: null, parent_phone: '911112233', class_id: 3, class_name: 'English A', teacher_name: 'Ibrohim M', subject: 'English', monthly_fee: 300000, paid_amount: 0, expected: 300000, remaining: 300000, payments_count: 0, last_payment_date: null, state: 'unpaid' },
  ],
} });

describe('dashboard payments page', () => {
  beforeEach(() => {
    api.getStudentsSummary.mockReset();
    api.getStudentsSummary.mockImplementation(async (params: { page: number }) => response(params.page, 250));
  });

  it('lists students with their payment state and totals for this month', async () => {
    render(<MemoryRouter><DashboardPaymentsPage /></MemoryRouter>);
    expect(await screen.findByText('Valiyev Ali')).toBeTruthy();
    expect(screen.getByText('Karimov Bek')).toBeTruthy();
    expect(screen.getAllByText('Unpaid').length).toBeGreaterThan(0);
    expect(screen.getByText('1–100 of 250')).toBeTruthy();
    const first = api.getStudentsSummary.mock.calls[0][0];
    expect(first).toMatchObject({ page: 1 });
    expect(first.from).toMatch(/-01$/);
    expect(first.status).toBeUndefined();
  });

  it('filters by status and pages through 100 at a time', async () => {
    render(<MemoryRouter><DashboardPaymentsPage /></MemoryRouter>);
    await screen.findByText('Valiyev Ali');

    fireEvent.click(screen.getByRole('radio', { name: 'Unpaid' }));
    await waitFor(() => expect(api.getStudentsSummary).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'unpaid', page: 1 })));

    fireEvent.click(screen.getByLabelText('Next page'));
    await waitFor(() => expect(api.getStudentsSummary).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'unpaid', page: 2 })));
    expect(await screen.findByText('101–200 of 250')).toBeTruthy();
  });

  it('records a payment for a student who has not paid, with what they owe filled in', async () => {
    render(<MemoryRouter><DashboardPaymentsPage /></MemoryRouter>);
    await screen.findByText('Karimov Bek');
    // Only students not paid in full get the button.
    const buttons = screen.getAllByText("To'lov");
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(paymentHook.handleOpenModalForStudent).toHaveBeenCalledWith(2, { amount: 300000 });
  });
});
