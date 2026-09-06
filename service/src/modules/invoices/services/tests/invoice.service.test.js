const mockClient = { __tag: 'tx-client' };

jest.mock('../../repositories/invoice.repository', () => ({
  countNumberLike: jest.fn(), lockNumberPrefix: jest.fn(), findAllFiltered: jest.fn(), findById: jest.fn(), findItems: jest.fn(),
  insertInvoice: jest.fn(), insertItem: jest.fn(), deleteItemsByInvoice: jest.fn(),
  updateInvoice: jest.fn(), deleteInvoice: jest.fn(), withTransaction: jest.fn(),
}));

const repository = require('../../repositories/invoice.repository');
const service = require('../invoice.service');

describe('invoice service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repository.withTransaction.mockImplementation((callback) => callback(mockClient));
  });

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
    expect(repository.insertInvoice).toHaveBeenCalledWith([3, 2, 'INV-1', '2026-08-08', null, 'Draft', 1100, 100, 50, 1050, null], mockClient);
    expect(repository.insertItem).toHaveBeenNthCalledWith(1, 8, 'A', 2, 400, 800, mockClient);
    expect(repository.insertItem).toHaveBeenNthCalledWith(2, 8, 'B', 1, 300, 300, mockClient);
  });

  test('generates a deterministic monthly sequence when number is omitted', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-08T00:00:00Z'));
    repository.countNumberLike.mockResolvedValue(3);
    repository.insertInvoice.mockResolvedValue({ invoice_id: 1 });
    await service.createInvoice({ student_id: 3, issue_date: '2026-08-08' }, 2);
    expect(repository.lockNumberPrefix).toHaveBeenCalledWith('2-202608', mockClient);
    expect(repository.countNumberLike).toHaveBeenCalledWith('2-202608-%', 2, mockClient);
    expect(repository.insertInvoice.mock.calls[0][0][2]).toBe('2-202608-0004');
    jest.useRealTimers();
  });

  test('replaces invoice items and recalculates totals on update', async () => {
    repository.findById.mockResolvedValue({ subtotal: 500, total: 500, discount_total: 0, tax_total: 0 });
    repository.updateInvoice.mockResolvedValue({ invoice_id: 1 });
    await service.updateInvoice(1, { discount_total: 50, items: [{ description: 'X', quantity: 3, unit_price: 200 }] }, 2);
    expect(repository.deleteItemsByInvoice).toHaveBeenCalledWith(1, mockClient);
    expect(repository.insertItem).toHaveBeenCalledWith(1, 'X', 3, 200, 600, mockClient);
    expect(repository.updateInvoice.mock.calls[0][0].slice(5, 7)).toEqual([600, 550]);
  });

  // RMC-069: the header insert and every line-item insert run inside the same
  // withTransaction call, so a failure partway through the items rolls back the
  // header write too rather than leaving an invoice with missing/partial items.
  test('a failure partway through writing invoice line items aborts the transaction instead of leaving a headless partial write', async () => {
    repository.insertInvoice.mockResolvedValue({ invoice_id: 8 });
    repository.insertItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('line item write failed'));

    await expect(service.createInvoice({
      student_id: 3,
      center_id: 99,
      invoice_number: 'INV-2',
      issue_date: '2026-08-08',
      items: [
        { description: 'A', quantity: 1, unit_price: 100 },
        { description: 'B', quantity: 1, unit_price: 200 },
        { description: 'C', quantity: 1, unit_price: 300 },
      ],
    }, 2)).rejects.toThrow('line item write failed');

    // The header insert already ran inside the same transaction that then aborts;
    // the third item is never attempted, and only one transaction wraps the batch.
    expect(repository.withTransaction).toHaveBeenCalledTimes(1);
    expect(repository.insertInvoice).toHaveBeenCalledTimes(1);
    expect(repository.insertItem).toHaveBeenCalledTimes(2);
  });

  // RMC-069: updateInvoice's item replacement (delete then re-insert) also runs
  // inside a single withTransaction call, so a failed re-insert rolls back the
  // delete and the invoice header update together.
  test('a failure partway through re-inserting updated invoice items aborts the whole update transaction', async () => {
    repository.findById.mockResolvedValue({ subtotal: 500, total: 500, discount_total: 0, tax_total: 0 });
    repository.insertItem.mockRejectedValueOnce(new Error('line item write failed'));

    await expect(service.updateInvoice(1, {
      items: [{ description: 'X', quantity: 1, unit_price: 200 }],
    }, 2)).rejects.toThrow('line item write failed');

    expect(repository.withTransaction).toHaveBeenCalledTimes(1);
    expect(repository.deleteItemsByInvoice).toHaveBeenCalledTimes(1);
    expect(repository.updateInvoice).not.toHaveBeenCalled();
  });
});
