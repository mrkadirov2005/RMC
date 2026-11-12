const { splitTransferPayment, isSplittable } = require('../transferSplit');

describe('payment of a student transferred mid-month', () => {
  test('a full-month payment in the new group is split by the lessons each group taught', () => {
    // 6 lessons in each group at 400 000 a month: 200 000 each; the student pays 400 000.
    const parts = splitTransferPayment(400000, [
      { student_id: 2, expected: 200000, paid: 0 },
      { student_id: 1, expected: 200000, paid: 0 },
    ], 2);
    expect(parts.map((part) => [part.student_id, part.amount])).toEqual([[1, 200000]]);
  });

  test('the old group never gets more than it is still owed', () => {
    const parts = splitTransferPayment(400000, [
      { student_id: 2, expected: 200000, paid: 0 },
      { student_id: 1, expected: 200000, paid: 150000 },
    ], 2);
    expect(parts.map((part) => [part.student_id, part.amount])).toEqual([[1, 50000]]);
  });

  test('a part payment is shared in the same proportion', () => {
    // 3 lessons in the old group (100 000), 9 in the new (300 000); 200 000 paid: 50 000 / 150 000.
    const parts = splitTransferPayment(200000, [
      { student_id: 2, expected: 300000, paid: 0 },
      { student_id: 1, expected: 100000, paid: 0 },
    ], 2);
    expect(parts.map((part) => [part.student_id, part.amount])).toEqual([[1, 50000]]);
  });

  test('nothing is split without an earlier group in that month, or when it is already paid', () => {
    expect(splitTransferPayment(400000, [{ student_id: 2, expected: 400000, paid: 0 }], 2)).toEqual([]);
    expect(splitTransferPayment(400000, [
      { student_id: 2, expected: 200000, paid: 0 },
      { student_id: 1, expected: 200000, paid: 200000 },
    ], 2)).toEqual([]);
    expect(splitTransferPayment(0, [{ student_id: 2, expected: 1, paid: 0 }, { student_id: 1, expected: 1, paid: 0 }], 2)).toEqual([]);
  });

  test('two transfers in one month: each earlier group gets its own part', () => {
    const parts = splitTransferPayment(360000, [
      { student_id: 3, expected: 120000, paid: 0 },
      { student_id: 2, expected: 120000, paid: 0 },
      { student_id: 1, expected: 120000, paid: 0 },
    ], 3);
    expect(parts.map((part) => [part.student_id, part.amount])).toEqual([[2, 120000], [1, 120000]]);
  });

  test('transfer adjustments and split parts are never split again', () => {
    expect(isSplittable('Transfer Adjustment')).toBe(false);
    expect(isSplittable('Transfer Split')).toBe(false);
    expect(isSplittable('Tuition')).toBe(true);
    expect(isSplittable(undefined)).toBe(true);
  });
});
