import { describe, expect, it } from 'vitest';
import {
  buildReceiptHtml,
  buildReceiptRows,
  formatReceiptAmount,
  formatReceiptMonth,
  formatReceiptTime,
  type PaymentReceiptData,
} from '../paymentReceipt';
import { getCreatedPaymentId } from '../printPaymentReceipt';

const receipt: PaymentReceiptData = {
  payment_id: 12,
  payer_name: 'Karimov Hojiakbar',
  subject: 'Ingliz tili',
  expected_amount: 340000,
  discount_amount: 0,
  paid_amount: 340000,
  currency: 'UZS',
  teacher_name: 'Baxrillayev Muhammad',
  paid_at: '2026-10-03T08:51:00.000Z',
  billing_month: '2026-10',
  cashier_name: 'Jalolov Anvar',
  center_name: 'TEMURBEK SCHOOL',
  center_phone: '992969003',
  center_address: "Sobir Rahimov ko'chasi 10-uy",
};

describe('payment receipt', () => {
  it('formats amounts, months and Tashkent time like the paper receipt', () => {
    expect(formatReceiptAmount(340000, 'UZS')).toBe("340.000 so'm");
    expect(formatReceiptAmount(1250000, null)).toBe("1.250.000 so'm");
    expect(formatReceiptAmount(50, 'usd')).toBe('50 USD');
    expect(formatReceiptMonth('2026-10')).toBe('Oktyabr uchun');
    expect(formatReceiptMonth('2026-01-15')).toBe('Yanvar uchun');
    expect(formatReceiptMonth(null)).toBe('');
    // 08:51 UTC is 13:51 in Tashkent.
    expect(formatReceiptTime('2026-10-03T08:51:00.000Z')).toBe('03.10.2026 13:51');
    expect(formatReceiptTime('not a date')).toBe('');
  });

  it('lists the rows in the paper receipt order', () => {
    expect(buildReceiptRows(receipt)).toEqual([
      ["To'lovchi", 'Karimov Hojiakbar'],
      ['Fan', 'Ingliz tili'],
      ["To'lov miqdori", "340.000 so'm"],
      ["To'langan summa", "340.000 so'm"],
      ["O'qituvchi", 'Baxrillayev Muhammad'],
      ['Vaqt', '03.10.2026 13:51'],
      ['Kassir', 'Jalolov Anvar'],
      ["To'landi", 'Oktyabr uchun'],
      ['Telefon', '992969003'],
      ['Manzil', "Sobir Rahimov ko'chasi 10-uy"],
    ]);
  });

  it('shows a discount line when there is one and drops empty rows', () => {
    const rows = buildReceiptRows({ ...receipt, discount_amount: 40000, paid_amount: 300000, cashier_name: null, center_address: '' });
    expect(rows).toContainEqual(['Chegirma', "40.000 so'm"]);
    expect(rows.map(([label]) => label)).not.toContain('Kassir');
    expect(rows.map(([label]) => label)).not.toContain('Manzil');
  });

  it('builds a printable page and escapes data', () => {
    const html = buildReceiptHtml({ ...receipt, payer_name: '<b>Ali</b>' }, 'https://app.test/logo.jpg');
    expect(html).toContain("To'lov cheki");
    expect(html).toContain("Rahmat! TEMURBEK SCHOOL bilan birga o'sing");
    expect(html).toContain('src="https://app.test/logo.jpg"');
    expect(html).toContain('&lt;b&gt;Ali&lt;/b&gt;');
    expect(html).not.toContain('<b>Ali</b>');
    // Like the paper receipt, no receipt number is printed.
    expect(html).not.toContain('№');
  });

  it('reads the new payment id from the create response', () => {
    expect(getCreatedPaymentId({ data: { payment_id: 41 } })).toBe(41);
    expect(getCreatedPaymentId({ data: { payment_id: '7' } })).toBe(7);
    expect(getCreatedPaymentId({ data: null })).toBeNull();
    expect(getCreatedPaymentId(undefined)).toBeNull();
  });
});
