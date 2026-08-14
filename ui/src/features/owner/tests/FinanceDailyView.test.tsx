import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatMoney } from '@/utils/helpers';
import { FinanceDailyView } from '../components/finance/FinanceDailyView';
import type { DailyIncomeRow } from '../components/finance/FinanceDailyView';

// formatMoney groups with non-breaking spaces; testing-library normalizes those away in the DOM.
const money = (amount: number) => formatMoney(amount).replace(/\s+/g, ' ');

const rows: DailyIncomeRow[] = [
  { dateKey: '2026-08-20', dateLabel: '20.08.2026', paymentCount: 4, studentCount: 3, total: 700 },
  { dateKey: '2026-08-11', dateLabel: '11.08.2026', paymentCount: 1, studentCount: 1, total: 250 },
  { dateKey: '2026-08-05', dateLabel: '05.08.2026', paymentCount: 2, studentCount: 1, total: 125 },
];

const renderView = (overrides: Partial<React.ComponentProps<typeof FinanceDailyView>> = {}) =>
  render(<FinanceDailyView
    selectedMonth="2026-08"
    rows={rows}
    monthTotal={1075}
    totalPaymentCount={7}
    daysWithIncome={3}
    {...overrides}
  />);

describe('FinanceDailyView', () => {
  it('renders the daily heading and the selected month', () => {
    renderView();

    const heading = screen.getByText('Kunlik tushum');
    expect(heading).toBeInTheDocument();
    expect(heading.parentElement).toHaveTextContent(/2026/);
  });

  it('renders one table row per daily income row, newest first, with formatted amounts', () => {
    renderView();

    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(3);

    expect(bodyRows.map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
      '20.08.2026',
      '11.08.2026',
      '05.08.2026',
    ]);

    const firstCells = within(bodyRows[0]).getAllByRole('cell');
    expect(firstCells[1]).toHaveTextContent('4');
    expect(firstCells[2]).toHaveTextContent('3');
    expect(firstCells[3]).toHaveTextContent(money(700));

    expect(within(bodyRows[2]).getAllByRole('cell')[3]).toHaveTextContent(money(125));
  });

  it('labels the table columns in Uzbek', () => {
    renderView();

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Sana', "To'lovlar", "O'quvchilar", 'Tushum']);
  });

  it('shows the summary strip with days, payment count and month total', () => {
    renderView();

    expect(screen.getByText('3 kun tushum bilan')).toBeInTheDocument();
    expect(screen.getByText("7 ta to'lov")).toBeInTheDocument();
    expect(screen.getByText(money(1075))).toBeInTheDocument();
  });

  it('renders the empty state and no table when there are no rows', () => {
    renderView({ rows: [], monthTotal: 0, totalPaymentCount: 0, daysWithIncome: 0 });

    expect(screen.getByText(/tolov topilmadi/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('0 kun tushum bilan')).toBeInTheDocument();
    expect(screen.getByText("0 ta to'lov")).toBeInTheDocument();
  });

  it('renders a zero-income day without hiding the row', () => {
    renderView({
      rows: [{ dateKey: '2026-08-05', dateLabel: '05.08.2026', paymentCount: 1, studentCount: 0, total: 0 }],
      monthTotal: 0,
      totalPaymentCount: 1,
      daysWithIncome: 1,
    });

    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(1);
    expect(within(bodyRows[0]).getAllByRole('cell')[2]).toHaveTextContent('0');
  });
});
