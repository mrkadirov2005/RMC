import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentFormDialog } from '../components/PaymentFormDialog';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (value: string, vars?: Record<string, string | number>) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? `{${key}}`)),
  }),
}));

const Harness = ({ fee }: { fee?: number }) => {
  const [formData, setFormData] = useState<any>({ student_id: 5, amount: 300000 });
  return (
    <>
      <PaymentFormDialog
        open
        onOpenChange={() => {}}
        title="Add payment"
        description=""
        formData={formData}
        setFormData={setFormData}
        onSubmit={(event) => event.preventDefault()}
        selectedStudent={{ name: 'Ali Valiyev', amount: fee }}
      />
      <output data-testid="amount">{String(formData.amount)}</output>
    </>
  );
};

const amountField = () => document.getElementById('amount') as HTMLInputElement;

describe('payment amount limit', () => {
  it("never lets the amount go above the student's fee", () => {
    render(<Harness fee={300000} />);
    expect(amountField().max).toBe('300000');
    fireEvent.change(amountField(), { target: { value: '3000000' } });
    expect(screen.getByTestId('amount').textContent).toBe('300000');
    fireEvent.change(amountField(), { target: { value: '250000' } });
    expect(screen.getByTestId('amount').textContent).toBe('250000');
    fireEvent.change(amountField(), { target: { value: '' } });
    expect(screen.getByTestId('amount').textContent).toBe('undefined');
    expect(screen.getByText(/At most 300/)).toBeTruthy();
  });

  it('has no limit when the student has no fee set', () => {
    render(<Harness />);
    fireEvent.change(amountField(), { target: { value: '450000' } });
    expect(screen.getByTestId('amount').textContent).toBe('450000');
  });
});
