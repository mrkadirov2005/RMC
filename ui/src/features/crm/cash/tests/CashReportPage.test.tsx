import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CashReportPage from '../CashReportPage';
import { monthBounds, shiftDay } from '../cashFormat';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));
vi.mock('@/utils/helpers', () => ({ formatMoney: (amount: unknown) => `${Number(amount || 0)} so'm` }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/utils/toast', () => ({ showToast: toast }));

const totals = (cash: number, card: number, bank: number) => ({ cash, card, bank, other: 0, total: cash + card + bank });
const api = vi.hoisted(() => ({ getDaily: vi.fn(), getExpenses: vi.fn(), createExpense: vi.fn(), deleteExpense: vi.fn() }));
vi.mock('../api', () => ({ cashAPI: api }));

describe('cash report page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getExpenses.mockResolvedValue({ data: [] });
    api.getDaily.mockResolvedValue({
      data: {
        date: '2026-10-09',
        payments: [
          { payment_id: 1, student_name: 'Axmadov Alisher', class_name: 'B1', amount: 2500000, payment_method: 'Cash', method_group: 'cash', received_by_name: 'Admin', paid_at: '2026-10-09T05:00:00Z' },
          { payment_id: 2, student_name: 'Karimov Ali', class_name: 'B1', amount: 500000, payment_method: 'Credit Card', method_group: 'card', received_by_name: 'Admin', paid_at: '2026-10-09T06:00:00Z' },
        ],
        expenses: [{ expense_id: 9, amount: 1000000, payment_method: 'Cash', method_group: 'cash', description: 'Farrosh uchun', created_by_name: 'Admin' }],
        income: totals(2500000, 500000, 0),
        expenses_total: totals(1000000, 0, 0),
        remaining: totals(1500000, 500000, 0),
      },
    });
  });

  it('shows what came in, was spent and is left per method, and lists the day', async () => {
    render(<CashReportPage />);

    const cash = await screen.findByTestId('cash-total-cash');
    expect(within(cash).getByText("2500000 so'm")).toBeTruthy();
    expect(within(cash).getByText("1500000 so'm")).toBeTruthy();
    expect(within(screen.getByTestId('cash-total-all')).getByText("2000000 so'm")).toBeTruthy();
    expect(screen.getByText('Axmadov Alisher')).toBeTruthy();
    expect(screen.getByText('10:00')).toBeTruthy();
    expect(screen.getByText('Farrosh uchun')).toBeTruthy();
    expect(screen.queryByTestId('cash-total-other')).toBeNull();
  });

  it('records an expense and refreshes the report', async () => {
    api.createExpense.mockResolvedValue({ data: { expense_id: 10 } });
    render(<CashReportPage />);
    await screen.findByTestId('cash-total-cash');
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Expenses' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Expenses' }));

    fireEvent.change(await screen.findByLabelText("Amount (so'm)"), { target: { value: '150000' } });
    fireEvent.change(screen.getByLabelText('What it was for'), { target: { value: ' Suv ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));

    await waitFor(() => expect(api.createExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 150000, description: 'Suv', payment_method: 'Cash' })));
    await waitFor(() => expect(api.getDaily).toHaveBeenCalledTimes(2));
    expect(toast.success).toHaveBeenCalledWith('Expense saved');
  });
});

describe('cash report dates', () => {
  it('moves across month ends and finds the month', () => {
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(monthBounds('2026-02-14')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });
});
