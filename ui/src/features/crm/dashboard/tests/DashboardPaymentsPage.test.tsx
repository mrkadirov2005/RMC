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
  sendPayment: vi.fn(),
}));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));
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
const rbac = vi.hoisted(() => ({ permissions: ['CRUD_PAYMENT', 'SEND_SMS'] as string[] }));
vi.mock('../../hooks/useRBAC', () => ({ useRBAC: () => ({ canAccess: (code: string) => rbac.permissions.includes(code) }) }));

vi.mock('../api', () => ({
  paymentAPI: { getStudentsSummary: (params: unknown) => api.getStudentsSummary(params) },
  teacherAPI: { getAll: () => api.teachers() },
  classAPI: { getAll: () => api.classes() },
  subjectAPI: { getAll: () => api.subjects() },
  smsAPI: { sendPayment: (body: unknown) => api.sendPayment(body) },
}));

// Radix menus open on a keyboard press in jsdom.
const openMenu = (trigger: HTMLElement) => fireEvent.keyDown(trigger, { key: 'Enter' });

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
    api.sendPayment.mockReset();
    Object.values(toast).forEach((fn) => fn.mockReset());
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

  it('texts one parent "payment waiting" from the row, for the period on screen', async () => {
    api.sendPayment.mockResolvedValue({ data: { queued: 1, already_sent: 0, no_phone: 0, not_applicable: 0, daily_limit: 30, sent_today: 3, waiting: 1, sending_now: true } });
    render(<MemoryRouter><DashboardPaymentsPage /></MemoryRouter>);
    await screen.findByText('Karimov Bek');

    const rowMenus = screen.getAllByRole('button', { name: 'SMS to parents' }).filter((button) => button.textContent === '');
    openMenu(rowMenus[1]);
    // Bek owes the whole fee: nothing was paid to confirm.
    expect((await screen.findByRole('menuitem', { name: 'Payment received' })).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Payment waiting' }));

    await waitFor(() => expect(api.sendPayment).toHaveBeenCalledWith(expect.objectContaining({ type: 'waiting', student_ids: [2] })));
    expect(api.sendPayment.mock.calls[0][0].from).toMatch(/-01$/);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 SMS queued'));
  });

  it('shows no SMS buttons to an admin the owner has not allowed to send SMS', async () => {
    rbac.permissions = ['CRUD_PAYMENT'];
    render(<MemoryRouter><DashboardPaymentsPage /></MemoryRouter>);
    await screen.findByText('Karimov Bek');
    expect(screen.queryAllByRole('button', { name: /SMS to parents/ })).toHaveLength(0);
    rbac.permissions = ['CRUD_PAYMENT', 'SEND_SMS'];
  });

  it('asks before texting everyone on the page who still owes', async () => {
    const twoOwing = response(1, 3);
    twoOwing.data.rows.push({ ...twoOwing.data.rows[1], student_id: 3, first_name: 'Sardor', state: 'partial', paid_amount: 100000, remaining: 200000 });
    api.getStudentsSummary.mockResolvedValue(twoOwing);
    api.sendPayment.mockResolvedValue({ data: { queued: 2, already_sent: 0, no_phone: 0, not_applicable: 0, daily_limit: 30, sent_today: 29, waiting: 2, sending_now: true } });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<MemoryRouter><DashboardPaymentsPage /></MemoryRouter>);
    await screen.findByText('Karimov Sardor');
    const bulk = () => screen.getAllByRole('button', { name: /SMS to parents/ }).find((button) => button.textContent === 'SMS to parents')!;

    openMenu(bulk());
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Payment waiting (2)' }));
    expect(confirm).toHaveBeenCalledWith('Send a "payment waiting" SMS to the parents of 2 students?');
    expect(api.sendPayment).not.toHaveBeenCalled();

    openMenu(bulk());
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Payment waiting (2)' }));
    await waitFor(() => expect(api.sendPayment).toHaveBeenCalledWith(expect.objectContaining({ type: 'waiting', student_ids: [2, 3] })));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 SMS queued · Daily limit is 30; the rest go out tomorrow'));
    confirm.mockRestore();
  });
});
