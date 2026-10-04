jest.mock('../../repositories/payment.repository', () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  insert: jest.fn(),
  withTransaction: jest.fn(),
  update: jest.fn(),
  findByStudent: jest.fn(),
  remove: jest.fn(),
  purge: jest.fn(),
  findReceipt: jest.fn(),
  findStaffName: jest.fn(),
}));

jest.mock('../../../discounts/services/discount.service', () => ({
  calculateDiscount: jest.fn(),
  getActiveSerialByStudent: jest.fn(),
  getActiveByStudent: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../../debts/repositories/debt.repository', () => ({
  findOpenDebtsForStudent: jest.fn(),
  applyPayment: jest.fn(),
}));

jest.mock('../../../invoices/repositories/invoice.repository', () => ({
  findOpenInvoiceForPeriod: jest.fn(),
  updateStatus: jest.fn(),
}));

const paymentService = require('../payment.service');
const paymentRepository = require('../../repositories/payment.repository');
const discountService = require('../../../discounts/services/discount.service');
const debtRepository = require('../../../debts/repositories/debt.repository');
const invoiceRepository = require('../../../invoices/repositories/invoice.repository');

describe('payments service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    paymentRepository.insert.mockResolvedValue({ payment_id: 1 });
    paymentRepository.withTransaction.mockImplementation(async (callback) => callback({ query: jest.fn() }));
    discountService.getActiveByStudent.mockResolvedValue(null);
    discountService.getActiveSerialByStudent.mockResolvedValue(null);
    debtRepository.findOpenDebtsForStudent.mockResolvedValue([]);
    invoiceRepository.findOpenInvoiceForPeriod.mockResolvedValue(null);
  });

  it('applies explicit monthly discount before inserting payment', async () => {
    discountService.calculateDiscount.mockReturnValue({
      originalAmount: 300000,
      discountAmount: 50000,
      finalAmount: 250000,
    });

    await paymentService.createPayment({
      student_id: 9,
      amount: 250000,
      original_amount: 300000,
      discount_kind: 'monthly_discount',
      discount_value_type: 'fixed',
      discount_value: 50000,
      payment_type: 'Tuition',
    }, 4);

    expect(discountService.getActiveSerialByStudent).not.toHaveBeenCalled();
    expect(paymentRepository.insert).toHaveBeenCalledWith(expect.arrayContaining([
      9,
      4,
      expect.any(String),
      250000,
      'UZS',
      'Cash',
    ]), expect.anything());
    const payload = paymentRepository.insert.mock.calls[0][0];
    expect(payload.slice(11, 19)).toEqual([
      null,
      'monthly_discount',
      'fixed',
      50000,
      300000,
      50000,
      250000,
      true,
    ]);
  });

  it('uses active serial discount when no monthly discount is supplied', async () => {
    discountService.getActiveSerialByStudent.mockResolvedValue({
      discount_id: 7,
      discount_type: 'percent',
      value: 10,
    });
    discountService.calculateDiscount.mockReturnValue({
      originalAmount: 100000,
      discountAmount: 10000,
      finalAmount: 90000,
    });

    await paymentService.createPayment({ student_id: 3, amount: 50000, original_amount: 100000 }, 2);

    const payload = paymentRepository.insert.mock.calls[0][0];
    expect(discountService.getActiveSerialByStudent).toHaveBeenCalledWith(3, 2);
    expect(payload.slice(11, 19)).toEqual([
      7,
      'serial_discount',
      'percent',
      10,
      100000,
      10000,
      90000,
      false,
    ]);
  });

  it('uses and deactivates an active monthly discount in one transaction', async () => {
    discountService.getActiveByStudent.mockResolvedValue({
      discount_id: 12,
      discount_type: 'fixed',
      value: 25000,
    });
    discountService.calculateDiscount.mockReturnValue({
      originalAmount: 100000,
      discountAmount: 25000,
      finalAmount: 75000,
    });

    await paymentService.createPayment({ student_id: 5, amount: 75000, original_amount: 100000 }, 8);

    expect(discountService.getActiveByStudent).toHaveBeenCalledWith(5, 8, 'monthly_discount');
    expect(discountService.getActiveSerialByStudent).not.toHaveBeenCalled();
    expect(paymentRepository.withTransaction).toHaveBeenCalledTimes(1);
    expect(discountService.update).toHaveBeenCalledWith(12, { active: false }, 8, expect.any(Object));
    const payload = paymentRepository.insert.mock.calls[0][0];
    expect(payload.slice(11, 19)).toEqual([
      12,
      'monthly_discount',
      'fixed',
      25000,
      100000,
      25000,
      75000,
      true,
    ]);
  });

  it('stores the cashier name last, and null when there is none', async () => {
    await paymentService.createPayment({ student_id: 9, amount: 340000 }, 4, 'Jalolov Anvar');
    expect(paymentRepository.insert.mock.calls[0][0][19]).toBe('Jalolov Anvar');

    await paymentService.createPayment({ student_id: 9, amount: 340000 }, 4);
    expect(paymentRepository.insert.mock.calls[1][0][19]).toBeNull();
  });

  it('names the cashier from the owner or admin account, and never from teachers or students', async () => {
    paymentRepository.findStaffName.mockResolvedValueOnce('Owner Person').mockResolvedValueOnce(null);

    await expect(paymentService.resolveCashierName({ id: 1, userType: 'superuser', role: 'owner' })).resolves.toBe('Owner Person');
    expect(paymentRepository.findStaffName).toHaveBeenLastCalledWith('owners', 1);
    // An admin without a first or last name falls back to the username.
    await expect(paymentService.resolveCashierName({ id: 5, userType: 'superuser', role: 'admin', username: 'kassa1' })).resolves.toBe('kassa1');
    expect(paymentRepository.findStaffName).toHaveBeenLastCalledWith('superusers', 5);
    await expect(paymentService.resolveCashierName({ id: 3, userType: 'teacher' })).resolves.toBeNull();
    await expect(paymentService.resolveCashierName(undefined)).resolves.toBeNull();
  });

  it('builds receipt fields from the payment, its group and the center', async () => {
    paymentRepository.findReceipt.mockResolvedValueOnce({
      payment_id: 12, receipt_number: 'R-12', payment_date: '2026-10-03', created_at: '2026-10-03T08:51:00.000Z',
      amount: '340000', currency: 'UZS', payment_method: 'Cash', original_amount: '340000', discount_amount: '0',
      covered_from: null, received_by_name: 'Jalolov Anvar',
      student_first_name: 'Hojiakbar', student_last_name: 'Karimov',
      class_name: 'English A1', class_payment_amount: '340000', subject_name: 'Ingliz tili',
      teacher_first_name: 'Muhammad', teacher_last_name: 'Baxrillayev',
      center_name: 'TEMURBEK SCHOOL', center_phone: '992969003', center_address: "Sobir Rahimov ko'chasi 10-uy",
    });

    await expect(paymentService.getReceipt(12, 4)).resolves.toEqual({
      payment_id: 12, receipt_number: 'R-12', payer_name: 'Karimov Hojiakbar', subject: 'Ingliz tili',
      expected_amount: 340000, discount_amount: 0, paid_amount: 340000, currency: 'UZS', payment_method: 'Cash',
      teacher_name: 'Baxrillayev Muhammad', paid_at: '2026-10-03T08:51:00.000Z', billing_month: '2026-10',
      cashier_name: 'Jalolov Anvar', center_name: 'TEMURBEK SCHOOL', center_phone: '992969003',
      center_address: "Sobir Rahimov ko'chasi 10-uy",
    });
    expect(paymentRepository.findReceipt).toHaveBeenCalledWith(12, 4);
  });

  it('falls back to the class name and fee, and the covered month, for older payments', async () => {
    paymentRepository.findReceipt.mockResolvedValueOnce({
      payment_id: 13, amount: '200000', original_amount: null, discount_amount: null, class_payment_amount: '300000',
      class_name: 'Math', subject_name: null, payment_date: '2026-10-03', covered_from: '2026-09-15', received_by_name: null,
    });
    const receipt = await paymentService.getReceipt(13, 4);
    expect(receipt).toMatchObject({ subject: 'Math', expected_amount: 300000, paid_amount: 200000, billing_month: '2026-09', cashier_name: null, payer_name: null });

    paymentRepository.findReceipt.mockResolvedValueOnce(null);
    await expect(paymentService.getReceipt(99, 4)).resolves.toBeNull();
  });

  it('delegates list filters to repository', async () => {
    paymentRepository.findAll.mockResolvedValue([]);

    await paymentService.listPayments({ centerId: 1, teacherId: 2, limit: 25, offset: 50 });

    expect(paymentRepository.findAll).toHaveBeenCalledWith({ centerId: 1, teacherId: 2, limit: 25, offset: 50 });
  });

  // RMC-067: recording a payment now reconciles the matching debt's balance and
  // the matching invoice's status, all inside the same withTransaction client.
  describe('debt/invoice reconciliation', () => {
    it('applies the payment to the open debt and marks a fully-covered invoice paid, in the same transaction client', async () => {
      const client = { query: jest.fn() };
      paymentRepository.withTransaction.mockImplementation(async (callback) => callback(client));
      discountService.calculateDiscount.mockReturnValue({ originalAmount: 100000, discountAmount: 0, finalAmount: 100000 });
      debtRepository.findOpenDebtsForStudent.mockResolvedValue([
        { debt_id: 55, balance: 100000, amount_paid: 0 },
      ]);
      invoiceRepository.findOpenInvoiceForPeriod.mockResolvedValue({ invoice_id: 77, total: 100000 });

      await paymentService.createPayment({ student_id: 9, amount: 100000, original_amount: 100000, payment_date: '2026-03-05' }, 4);

      expect(debtRepository.findOpenDebtsForStudent).toHaveBeenCalledWith(9, client);
      expect(debtRepository.applyPayment).toHaveBeenCalledWith(55, 100000, 0, client);
      expect(invoiceRepository.findOpenInvoiceForPeriod).toHaveBeenCalledWith(9, 4, '2026-03-05', client);
      expect(invoiceRepository.updateStatus).toHaveBeenCalledWith(77, 'Paid', client);
    });

    it('marks a partially-covered invoice Partially Paid and reduces the debt balance by the paid amount without going below zero', async () => {
      const client = { query: jest.fn() };
      paymentRepository.withTransaction.mockImplementation(async (callback) => callback(client));
      // Explicit monthly discount resolves the final (post-discount) amount actually
      // applied to the debt/invoice to 60000, independent of the raw `amount` field.
      discountService.calculateDiscount.mockReturnValue({ originalAmount: 100000, discountAmount: 40000, finalAmount: 60000 });
      debtRepository.findOpenDebtsForStudent.mockResolvedValue([
        { debt_id: 55, balance: 40000, amount_paid: 60000 },
      ]);
      invoiceRepository.findOpenInvoiceForPeriod.mockResolvedValue({ invoice_id: 77, total: 100000 });

      await paymentService.createPayment({
        student_id: 9,
        amount: 60000,
        original_amount: 100000,
        discount_kind: 'monthly_discount',
        discount_value_type: 'fixed',
        discount_value: 40000,
      }, 4);

      // balance (40000) - paid (60000) would go negative; it is floored at 0.
      expect(debtRepository.applyPayment).toHaveBeenCalledWith(55, 120000, 0, client);
      expect(invoiceRepository.updateStatus).toHaveBeenCalledWith(77, 'Partially Paid', client);
    });

    it('does not touch debts or invoices when there is no open debt/invoice, or when the paid amount is zero', async () => {
      const client = { query: jest.fn() };
      paymentRepository.withTransaction.mockImplementation(async (callback) => callback(client));
      discountService.calculateDiscount.mockReturnValue({ originalAmount: 0, discountAmount: 0, finalAmount: 0 });
      debtRepository.findOpenDebtsForStudent.mockResolvedValue([]);
      invoiceRepository.findOpenInvoiceForPeriod.mockResolvedValue(null);

      await paymentService.createPayment({ student_id: 9, amount: 0, original_amount: 0 }, 4);

      expect(debtRepository.applyPayment).not.toHaveBeenCalled();
      expect(invoiceRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  // RMC-067: resolveAppliedDiscount is shared by all three discount-resolution call
  // sites (explicit monthly, auto-detected monthly, auto-detected serial); this test
  // pins that, given equivalent inputs, all three paths compute the same numbers.
  it('resolves an identical final amount from the shared discount calculator regardless of which of the three call sites triggers it', async () => {
    discountService.calculateDiscount.mockReturnValue({ originalAmount: 200000, discountAmount: 40000, finalAmount: 160000 });

    await paymentService.createPayment({
      student_id: 1,
      amount: 160000,
      original_amount: 200000,
      discount_kind: 'monthly_discount',
      discount_value_type: 'percent',
      discount_value: 20,
    }, 1);
    const explicitPayload = paymentRepository.insert.mock.calls[0][0];

    jest.clearAllMocks();
    paymentRepository.insert.mockResolvedValue({ payment_id: 1 });
    paymentRepository.withTransaction.mockImplementation(async (callback) => callback({ query: jest.fn() }));
    debtRepository.findOpenDebtsForStudent.mockResolvedValue([]);
    invoiceRepository.findOpenInvoiceForPeriod.mockResolvedValue(null);
    discountService.calculateDiscount.mockReturnValue({ originalAmount: 200000, discountAmount: 40000, finalAmount: 160000 });
    discountService.getActiveByStudent.mockResolvedValue({ discount_id: 12, discount_type: 'percent', value: 20 });

    await paymentService.createPayment({ student_id: 1, amount: 160000, original_amount: 200000 }, 1);
    const autoMonthlyPayload = paymentRepository.insert.mock.calls[0][0];

    jest.clearAllMocks();
    paymentRepository.insert.mockResolvedValue({ payment_id: 1 });
    paymentRepository.withTransaction.mockImplementation(async (callback) => callback({ query: jest.fn() }));
    debtRepository.findOpenDebtsForStudent.mockResolvedValue([]);
    invoiceRepository.findOpenInvoiceForPeriod.mockResolvedValue(null);
    discountService.calculateDiscount.mockReturnValue({ originalAmount: 200000, discountAmount: 40000, finalAmount: 160000 });
    discountService.getActiveByStudent.mockResolvedValue(null);
    discountService.getActiveSerialByStudent.mockResolvedValue({ discount_id: 12, discount_type: 'percent', value: 20 });

    await paymentService.createPayment({ student_id: 1, amount: 160000, original_amount: 200000 }, 1);
    const serialPayload = paymentRepository.insert.mock.calls[0][0];

    // original_amount, discount_amount, final_amount (indices 15-17) must agree across all three paths.
    expect(explicitPayload.slice(15, 18)).toEqual([200000, 40000, 160000]);
    expect(autoMonthlyPayload.slice(15, 18)).toEqual([200000, 40000, 160000]);
    expect(serialPayload.slice(15, 18)).toEqual([200000, 40000, 160000]);
  });
});
