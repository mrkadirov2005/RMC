import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/utils/helpers';
import { OwnerFinancePanel } from '../components/OwnerFinancePanel';
import type { OwnerManagerStatisticsCollections } from '../types';

// formatMoney groups with non-breaking spaces; testing-library normalizes those away in the DOM.
const money = (amount: number) => formatMoney(amount).replace(/\s+/g, ' ');

const collections: OwnerManagerStatisticsCollections = {
  students: [
    { student_id: 1, first_name: 'Ali', last_name: 'Valiyev', class_id: 10, payment_amount: 500 },
    { student_id: 2, first_name: 'Dilnoza', last_name: 'Karimova', class_id: 10, payment_amount: 500 },
  ],
  teachers: [{ teacher_id: 5, first_name: 'Ada', last_name: 'Lovelace' }],
  classes: [{ class_id: 10, teacher_id: 5, class_name: 'Math A', payment_amount: 500 }],
  payments: [
    { payment_id: 1, student_id: 1, status: 'Paid', amount: 200, payment_date: '2026-08-05T09:00:00' },
    { payment_id: 2, student_id: 1, status: 'Completed', amount: 100, payment_date: '2026-08-05T14:00:00' },
    { payment_id: 3, student_id: 2, status: 'paid', amount: 400, payment_date: '2026-08-17T11:00:00' },
    { payment_id: 4, student_id: 2, status: 'pending', amount: 999, payment_date: '2026-08-18T11:00:00' },
    { payment_id: 5, student_id: 1, status: 'paid', amount: 999, payment_date: '2026-07-05T11:00:00' },
    { payment_id: 6, student_id: 2, status: 'paid', amount: 50, payment_date: '2026-09-02T11:00:00' },
  ],
  discounts: [],
  deletedStudents: [],
  attendance: [],
};

const renderPanel = (payments = collections.payments) => {
  const view = render(<OwnerFinancePanel collections={{ ...collections, payments }} loading={false} />);
  // Pin the month so the panel never depends on the real current date.
  fireEvent.change(document.querySelector('input[type="month"]') as HTMLInputElement, {
    target: { value: '2026-08' },
  });
  return view;
};

const dailyTab = () => screen.getByRole('button', { name: /Kunlik/ });
const statsTab = () => screen.getByRole('button', { name: /Statistika/ });
const teachersTab = () => screen.getByRole('button', { name: /O'qituvchilar/ });

describe('OwnerFinancePanel daily tab', () => {
  it('offers all three finance tabs', () => {
    renderPanel();

    expect(statsTab()).toBeInTheDocument();
    expect(teachersTab()).toBeInTheDocument();
    expect(dailyTab()).toBeInTheDocument();
  });

  it('starts on Statistika with the daily view hidden', () => {
    renderPanel();

    expect(screen.getByText(/Umumiy oylik to'lov statistikasi/)).toBeInTheDocument();
    expect(screen.queryByText('Kunlik tushum')).not.toBeInTheDocument();
  });

  it('shows the daily view and hides the other views when Kunlik is clicked', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(dailyTab());

    expect(screen.getByText('Kunlik tushum')).toBeInTheDocument();
    expect(screen.queryByText(/Umumiy oylik to'lov statistikasi/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Talabalar to'lov holati/)).not.toBeInTheDocument();
  });

  it('keeps the teachers-only header strip and card grid hidden on the daily tab', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(dailyTab());

    expect(screen.queryAllByText(/o'qituvchi$/)).toHaveLength(0);
    expect(screen.queryByText('Jami tolov')).not.toBeInTheDocument();
    expect(screen.queryByText('Maosh 20%')).not.toBeInTheDocument();
    expect(screen.queryByText('Qarzdor')).not.toBeInTheDocument();
  });

  it('aggregates the selected month into one row per paid day with a matching summary', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(dailyTab());

    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(2);

    const newest = within(bodyRows[0]).getAllByRole('cell');
    expect(newest[1]).toHaveTextContent('1');
    expect(newest[2]).toHaveTextContent('1');
    expect(newest[3]).toHaveTextContent(money(400));

    const oldest = within(bodyRows[1]).getAllByRole('cell');
    expect(oldest[1]).toHaveTextContent('2');
    expect(oldest[2]).toHaveTextContent('1');
    expect(oldest[3]).toHaveTextContent(money(300));

    expect(screen.getByText('2 kun tushum bilan')).toBeInTheDocument();
    expect(screen.getByText("3 ta to'lov")).toBeInTheDocument();
    expect(screen.getByText(money(700))).toBeInTheDocument();
  });

  it('recomputes the daily list when the month changes', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(dailyTab());
    expect(screen.getAllByRole('row').slice(1)).toHaveLength(2);

    fireEvent.change(document.querySelector('input[type="month"]') as HTMLInputElement, {
      target: { value: '2026-09' },
    });

    const septemberRows = screen.getAllByRole('row').slice(1);
    expect(septemberRows).toHaveLength(1);
    expect(within(septemberRows[0]).getAllByRole('cell')[3]).toHaveTextContent(money(50));
    expect(screen.getByText('1 kun tushum bilan')).toBeInTheDocument();
  });

  it('renders the empty state for a month without paid payments', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(dailyTab());
    fireEvent.change(document.querySelector('input[type="month"]') as HTMLInputElement, {
      target: { value: '2026-10' },
    });

    expect(screen.getByText(/tolov topilmadi/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('restores the Statistika view when switching back from Kunlik', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(dailyTab());
    expect(screen.getByText('Kunlik tushum')).toBeInTheDocument();

    await user.click(statsTab());
    expect(screen.queryByText('Kunlik tushum')).not.toBeInTheDocument();
    expect(screen.getByText(/Umumiy oylik to'lov statistikasi/)).toBeInTheDocument();
  });

  it('shows the teachers view with its header strip and card grid when switching from Kunlik', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(dailyTab());
    await user.click(teachersTab());

    expect(screen.queryByText('Kunlik tushum')).not.toBeInTheDocument();
    expect(screen.getAllByText(/o'qituvchi$/).length).toBeGreaterThan(0);
    expect(screen.getByText('Jami tolov')).toBeInTheDocument();
    expect(screen.getByText('Maosh 20%')).toBeInTheDocument();
    expect(screen.getByText('Qarzdor')).toBeInTheDocument();
  });

  it('renders the empty state when the panel receives no payments at all', async () => {
    const user = userEvent.setup();
    renderPanel([]);

    await user.click(dailyTab());

    expect(screen.getByText(/tolov topilmadi/i)).toBeInTheDocument();
    expect(screen.getByText('0 kun tushum bilan')).toBeInTheDocument();
  });
});
