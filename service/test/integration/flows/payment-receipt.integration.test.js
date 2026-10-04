describe('printed payment receipts with PostgreSQL', () => {
  let pool;
  let paymentService;
  let centerId;
  let studentId;
  let ownerId;
  let adminId;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query(
      `INSERT INTO edu_centers (center_name, center_code, phone, address)
       VALUES ('TEMURBEK SCHOOL', 'RCPT-A', '992969003', 'Sobir Rahimov ko''chasi 10-uy') RETURNING center_id`
    )).rows[0].center_id;
    const teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'RCPT-T', 'Muhammad', 'Baxrillayev') RETURNING teacher_id`,
      [centerId]
    )).rows[0].teacher_id;
    const classId = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount) VALUES ($1, 'English A1', 'RCPT-EN', $2, 340000) RETURNING class_id`,
      [centerId, teacherId]
    )).rows[0].class_id;
    await pool.query(
      `INSERT INTO subjects (center_id, class_id, subject_name, subject_code) VALUES ($1, $2, 'Ingliz tili', 'RCPT-S')`,
      [centerId, classId]
    );
    studentId = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status)
       VALUES ($1, 'RCPT-1', 'Hojiakbar', 'Karimov', $2, $3, 'Active') RETURNING student_id`,
      [centerId, classId, teacherId]
    )).rows[0].student_id;
    ownerId = (await pool.query(
      `INSERT INTO owners (username, password_hash, first_name, last_name, email) VALUES ('rcpt_owner', 'x', 'Temur', 'Owner', 'rcpt-owner@example.com') RETURNING owner_id`
    )).rows[0].owner_id;
    adminId = (await pool.query(
      `INSERT INTO superusers (center_id, username, password_hash, first_name, last_name, email, role)
       VALUES ($1, 'rcpt_admin', 'x', 'Anvar', 'Jalolov', 'rcpt-admin@example.com', 'admin') RETURNING superuser_id`,
      [centerId]
    )).rows[0].superuser_id;
    paymentService = require('../../../src/modules/payments/services/payment.service');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  test('the admin who records a payment is printed as the cashier with every receipt field', async () => {
    const cashier = await paymentService.resolveCashierName({ id: adminId, userType: 'superuser', role: 'admin' });
    expect(cashier).toBe('Anvar Jalolov');

    const payment = await paymentService.createPayment(
      { student_id: studentId, amount: 340000, payment_date: '2026-10-03', payment_type: 'Tuition' }, centerId, cashier
    );
    expect(payment.received_by_name).toBe('Anvar Jalolov');

    const receipt = await paymentService.getReceipt(payment.payment_id, centerId);
    expect(receipt).toMatchObject({
      payer_name: 'Karimov Hojiakbar',
      subject: 'Ingliz tili',
      expected_amount: 340000,
      paid_amount: 340000,
      teacher_name: 'Baxrillayev Muhammad',
      billing_month: '2026-10',
      cashier_name: 'Anvar Jalolov',
      center_name: 'TEMURBEK SCHOOL',
      center_phone: '992969003',
      center_address: "Sobir Rahimov ko'chasi 10-uy",
    });
    expect(new Date(receipt.paid_at).toString()).not.toBe('Invalid Date');
  });

  test('owners are named from the owners table', async () => {
    await expect(paymentService.resolveCashierName({ id: ownerId, userType: 'superuser', role: 'owner' })).resolves.toBe('Temur Owner');
  });

  test('another center cannot read the receipt, and deleted payments have none', async () => {
    const payment = await paymentService.createPayment({ student_id: studentId, amount: 100000, payment_date: '2026-10-04' }, centerId, null);

    await expect(paymentService.getReceipt(payment.payment_id, centerId + 999)).resolves.toBeNull();
    expect((await paymentService.getReceipt(payment.payment_id, centerId)).cashier_name).toBeNull();

    await pool.query('UPDATE payments SET deleted_at = NOW() WHERE payment_id = $1', [payment.payment_id]);
    await expect(paymentService.getReceipt(payment.payment_id, centerId)).resolves.toBeNull();
  });
});
