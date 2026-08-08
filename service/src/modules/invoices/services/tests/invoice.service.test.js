jest.mock('../../repositories/invoice.repository', () => ({
  countNumberLike: jest.fn(), findAllFiltered: jest.fn(), findById: jest.fn(), findItems: jest.fn(),
  insertInvoice: jest.fn(), insertItem: jest.fn(), deleteItemsByInvoice: jest.fn(),
  updateInvoice: jest.fn(), deleteInvoice: jest.fn(),
}));

const repository = require('../../repositories/invoice.repository');
const service = require('../invoice.service');

describe('invoice service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns null for a missing scoped invoice and combines existing items', async () => {
    repository.findById.mockResolvedValueOnce(null);
    await expect(service.getInvoiceWithItems(1, 2)).resolves.toBeNull();
    repository.findById.mockResolvedValueOnce({ invoice_id: 1, center_id: 2 });
    repository.findItems.mockResolvedValue([{ description: 'Tuition' }]);
    await expect(service.getInvoiceWithItems(1, 2)).resolves.toEqual({ invoice_id: 1, center_id: 2, items: [{ description: 'Tuition' }] });
  });

  test('creates an invoice with computed subtotal, discount, tax, and line totals', async () => {
    repository.insertInvoice.mockResolvedValue({ invoice_id: 8 });
    await service.createInvoice({
      student_id: 3, center_id: 99, invoice_number: 'INV-1', issue_date: '2026-08-08',
      discount_total: 100, tax_total: 50,
      items: [{ description: 'A', quantity: 2, unit_price: 400 }, { description: 'B', unit_price: 300 }],
    }, 2);
    expect(repository.insertInvoice).toHaveBeenCalledWith([3, 2, 'INV-1', '2026-08-08', null, 'Draft', 1100, 100, 50, 1050, null]);
    expect(repository.insertItem).toHaveBeenNthCalledWith(1, 8, 'A', 2, 400, 800);
    expect(repository.insertItem).toHaveBeenNthCalledWith(2, 8, 'B', 1, 300, 300);
  });

  test('generates a deterministic monthly sequence when number is omitted', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-08T00:00:00Z'));
    repository.countNumberLike.mockResolvedValue(3);
    repository.insertInvoice.mockResolvedValue({ invoice_id: 1 });
    await service.createInvoice({ student_id: 3, issue_date: '2026-08-08' }, 2);
    expect(repository.countNumberLike).toHaveBeenCalledWith('2-202608-%', 2);
    expect(repository.insertInvoice.mock.calls[0][0][2]).toBe('2-202608-0004');
    jest.useRealTimers();
  });

  test('replaces invoice items and recalculates totals on update', async () => {
    repository.findById.mockResolvedValue({ subtotal: 500, total: 500, discount_total: 0, tax_total: 0 });
    repository.updateInvoice.mockResolvedValue({ invoice_id: 1 });
    await service.updateInvoice(1, { discount_total: 50, items: [{ description: 'X', quantity: 3, unit_price: 200 }] }, 2);
    expect(repository.deleteItemsByInvoice).toHaveBeenCalledWith(1);
    expect(repository.insertItem).toHaveBeenCalledWith(1, 'X', 3, 200, 600);
    expect(repository.updateInvoice.mock.calls[0][0].slice(5, 7)).toEqual([600, 550]);
  });
});
