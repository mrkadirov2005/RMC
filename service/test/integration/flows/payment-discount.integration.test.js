describe('discounted payments and concurrency with PostgreSQL', () => {
  let pool;
  let paymentService;
  let centerId;
  let studentId;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Payment Center', 'PAY-A') RETURNING center_id`)).rows[0].center_id;
    studentId = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name) VALUES ($1, 'PAY-S1', 'Pay', 'Student') RETURNING student_id`, [centerId]
    )).rows[0].student_id;
    paymentService = require('../../../src/modules/payments/services/payment.service');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  const addDiscount = async (kind, type, value) => (await pool.query(
    `INSERT INTO discounts (student_id, center_id, discount_type, discount_kind, value, active)
     VALUES ($1, $2, $3, $4, $5, true) RETURNING discount_id`, [studentId, centerId, type, kind, value]
  )).rows[0].discount_id;

  test('monthly discount snapshot is stored and consumed in the payment transaction', async () => {
    const discountId = await addDiscount('monthly_discount', 'percent', 25);
    const payment = await paymentService.createPayment({
      student_id: studentId, amount: 500, original_amount: 1000, receipt_number: 'PAY-R1', payment_type: 'Tuition',
    }, centerId);
    expect(payment).toMatchObject({ discount_id: discountId, discount_kind: 'monthly_discount', is_complete: false });
    const stored = (await pool.query(
      `SELECT original_amount::float, discount_amount::float, final_amount::float, amount::float, is_complete,
              discount_kind, discount_value_type, discount_value::float
       FROM payments WHERE payment_id=$1`, [payment.payment_id]
    )).rows[0];
    expect(stored).toEqual({ original_amount: 1000, discount_amount: 250, final_amount: 750, amount: 500, is_complete: false, discount_kind: 'monthly_discount', discount_value_type: 'percent', discount_value: 25 });
    expect((await pool.query('SELECT active FROM discounts WHERE discount_id=$1', [discountId])).rows[0].active).toBe(false);
  });

  test('serial discount remains active and explicit completion is honored', async () => {
    const discountId = await addDiscount('serial_discount', 'fixed', 300);
    const payment = await paymentService.createPayment({
      student_id: studentId, amount: 100, original_amount: 1000, receipt_number: 'PAY-R2', is_complete: true,
    }, centerId);
    expect(payment).toMatchObject({ discount_id: discountId, discount_kind: 'serial_discount', final_amount: '700.00', is_complete: true });
    expect((await pool.query('SELECT active FROM discounts WHERE discount_id=$1', [discountId])).rows[0].active).toBe(true);
  });

  test('snapshot remains unchanged after the source discount is edited', async () => {
    const paymentBefore = (await pool.query(`SELECT payment_id, discount_amount::float, final_amount::float FROM payments WHERE receipt_number='PAY-R2'`)).rows[0];
    await pool.query(`UPDATE discounts SET value=900 WHERE discount_id=(SELECT discount_id FROM payments WHERE payment_id=$1)`, [paymentBefore.payment_id]);
    const paymentAfter = (await pool.query('SELECT discount_amount::float, final_amount::float FROM payments WHERE payment_id=$1', [paymentBefore.payment_id])).rows[0];
    expect(paymentAfter).toEqual({ discount_amount: paymentBefore.discount_amount, final_amount: paymentBefore.final_amount });
  });

  test('concurrent duplicate receipts create one payment and consume monthly discount once', async () => {
    await pool.query(`UPDATE discounts SET active=false WHERE student_id=$1`, [studentId]);
    const discountId = await addDiscount('monthly_discount', 'fixed', 100);
    const body = { student_id: studentId, amount: 900, original_amount: 1000, receipt_number: 'PAY-CONCURRENT' };
    const results = await Promise.allSettled([
      paymentService.createPayment(body, centerId),
      paymentService.createPayment(body, centerId),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(Number((await pool.query(`SELECT COUNT(*) count FROM payments WHERE receipt_number='PAY-CONCURRENT'`)).rows[0].count)).toBe(1);
    expect((await pool.query('SELECT active FROM discounts WHERE discount_id=$1', [discountId])).rows[0].active).toBe(false);
  });
});
