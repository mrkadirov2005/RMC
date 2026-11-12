// A student moved to another teacher on the 16th and then paid the whole month in the new group.
// The payment is split by the lessons each group taught that month, so the first teacher is paid
// for their lessons and the student does not show as unpaid in the old group.
describe('payment of a student transferred mid-month, with PostgreSQL', () => {
  let pool;
  let centerId;
  let oldRecord;
  let newRecord;

  const MONDAY_WEDNESDAY_FRIDAY = JSON.stringify({ days: ['Monday', 'Wednesday', 'Friday'], time: '09:00', endTime: '10:30' });

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, payments RESTART IDENTITY CASCADE');
    await require('../../../src/modules/developer/seal').reseal();
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Split Center', 'SPLIT-C') RETURNING center_id`)).rows[0].center_id;
    const teacher = async (code) => (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, $2, $2, 'Teacher') RETURNING teacher_id`, [centerId, code],
    )).rows[0].teacher_id;
    const group = async (name, teacherId) => (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount, section) VALUES ($1, $2, $2, $3, 400000, $4) RETURNING class_id`,
      [centerId, name, teacherId, MONDAY_WEDNESDAY_FRIDAY],
    )).rows[0].class_id;
    const firstGroup = await group('First', await teacher('T-1'));
    const secondGroup = await group('Second', await teacher('T-2'));

    // September 2026: in the first group 1-15 (6 lessons), in the second from the 16th (7 lessons).
    oldRecord = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, status, start_date, end_date)
       VALUES ($1, 'SPLIT-1', 'Ali', 'Valiyev', $2, 'Transferred', '2026-08-01', '2026-09-15') RETURNING student_id`,
      [centerId, firstGroup],
    )).rows[0].student_id;
    newRecord = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, status, start_date, transferred_from_student_id)
       VALUES ($1, 'SPLIT-1', 'Ali', 'Valiyev', $2, 'Active', '2026-09-16', $3) RETURNING student_id`,
      [centerId, secondGroup, oldRecord],
    )).rows[0].student_id;
  });

  afterAll(async () => {
    const { db } = pool;
    if (db?.$client?.end) await db.$client.end().catch(() => {});
    else await pool.end?.().catch(() => {});
  });

  const paidIn = async (studentId) => Number((await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE student_id = $1 AND deleted_at IS NULL AND date_trunc('month', payment_date) = '2026-09-01'`,
    [studentId],
  )).rows[0].paid);

  test('reads each group\'s lessons, price and payments for the month', async () => {
    const shares = await require('../../../src/modules/payments/repositories/payment.repository').findTransferMonthShares(newRecord, '2026-09-20');
    const byId = Object.fromEntries(shares.map((row) => [row.student_id, row]));
    expect(byId[oldRecord]).toMatchObject({ share: 0.5, expected: 200000, paid: 0 });
    expect(byId[newRecord].share).toBeCloseTo(7 / 12, 6);
    expect(byId[newRecord].expected).toBeCloseTo(233333.33, 2);
  });

  test('a full-month payment in the new group is split 6 : 7 by lessons', async () => {
    const paymentService = require('../../../src/modules/payments/services/payment.service');
    await paymentService.createPayment({ student_id: newRecord, payment_date: '2026-09-20', amount: 400000, payment_type: 'Tuition', payment_method: 'Cash' }, centerId, 'admin');

    expect(await paidIn(oldRecord)).toBeCloseTo(184615.38, 1);
    expect(await paidIn(newRecord)).toBeCloseTo(215384.62, 1);
    expect((await paidIn(oldRecord)) + (await paidIn(newRecord))).toBeCloseTo(400000, 2);
    const split = (await pool.query(`SELECT payment_type, transaction_reference FROM payments WHERE student_id = $1`, [oldRecord])).rows[0];
    expect(split.payment_type).toBe('Transfer Split');
    expect(split.transaction_reference).toMatch(/^SPLIT-\d+-\d+-2026-09$/);
  });

  test('once the old group is paid for its lessons, later payments stay in the new group', async () => {
    const paymentService = require('../../../src/modules/payments/services/payment.service');
    await paymentService.createPayment({ student_id: newRecord, payment_date: '2026-09-25', amount: 100000, payment_type: 'Tuition', payment_method: 'Cash' }, centerId, 'admin');
    // The old group is owed 200 000 - 184 615.38 = 15 384.62 and gets at most that.
    expect(await paidIn(oldRecord)).toBeCloseTo(200000, 2);
    await paymentService.createPayment({ student_id: newRecord, payment_date: '2026-09-26', amount: 50000, payment_type: 'Tuition', payment_method: 'Cash' }, centerId, 'admin');
    expect(await paidIn(oldRecord)).toBeCloseTo(200000, 2);
    expect(await paidIn(newRecord)).toBeCloseTo(550000 - 200000, 2);
  });

  test('a payment made later still pays the old group for the transfer month, dated the day it is paid', async () => {
    const groupOf = async (record) => (await pool.query('SELECT class_id FROM students WHERE student_id = $1', [record])).rows[0].class_id;
    // October 2026: in the first group 1-15 (6 lessons), in the second from the 16th (7 lessons); pays in December.
    const lateOld = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, status, start_date, end_date)
       VALUES ($1, 'SPLIT-2', 'Vali', 'Aliyev', $2, 'Transferred', '2026-09-01', '2026-10-15') RETURNING student_id`,
      [centerId, await groupOf(oldRecord)],
    )).rows[0].student_id;
    const lateNew = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, status, start_date, transferred_from_student_id)
       VALUES ($1, 'SPLIT-2', 'Vali', 'Aliyev', $2, 'Active', '2026-10-16', $3) RETURNING student_id`,
      [centerId, await groupOf(newRecord), lateOld],
    )).rows[0].student_id;
    const paymentService = require('../../../src/modules/payments/services/payment.service');
    const splits = async () => (await pool.query(
      `SELECT payment_date::text AS d, amount::numeric AS amount, transaction_reference AS ref FROM payments WHERE student_id = $1 ORDER BY payment_id`, [lateOld],
    )).rows;

    await paymentService.createPayment({ student_id: lateNew, payment_date: '2026-12-02', amount: 400000, payment_type: 'Tuition', payment_method: 'Cash' }, centerId, 'admin');
    let rows = await splits();
    expect(rows).toHaveLength(1);
    expect(rows[0].d).toBe('2026-12-02');
    expect(Number(rows[0].amount)).toBeCloseTo(184615.38, 1);
    expect(rows[0].ref).toMatch(/^SPLIT-\d+-\d+-2026-10$/);

    // The October share counts as paid even though it came in December: next payments top it up to 200 000, never more.
    await paymentService.createPayment({ student_id: lateNew, payment_date: '2026-12-10', amount: 100000, payment_type: 'Tuition', payment_method: 'Cash' }, centerId, 'admin');
    await paymentService.createPayment({ student_id: lateNew, payment_date: '2026-12-20', amount: 100000, payment_type: 'Tuition', payment_method: 'Cash' }, centerId, 'admin');
    rows = await splits();
    expect(rows.reduce((sum, row) => sum + Number(row.amount), 0)).toBeCloseTo(200000, 2);
    const shares = await require('../../../src/modules/payments/repositories/payment.repository').findTransferMonthShares(lateNew, '2026-10-01', { transferMonthOnly: true });
    expect(shares.find((row) => row.student_id === lateOld)).toMatchObject({ expected: 200000, paid: 200000 });
  });
});
