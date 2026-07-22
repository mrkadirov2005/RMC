const pool = require('../../../db/pool');

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const toDateOnly = (date: Date) => date.toISOString().slice(0, 10);

const buildTransferAllocation = (source: any, targetClass: any, transferDate = new Date()) => {
  const sourceMonthly = Number(source.source_payment_amount || 0);
  const targetMonthly = Number(targetClass.payment_amount || 0);
  const monthStart = new Date(Date.UTC(transferDate.getUTCFullYear(), transferDate.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(transferDate.getUTCFullYear(), transferDate.getUTCMonth() + 1, 1));
  const monthEnd = new Date(nextMonthStart.getTime() - 24 * 60 * 60 * 1000);
  const effectiveDate = new Date(Date.UTC(transferDate.getUTCFullYear(), transferDate.getUTCMonth(), transferDate.getUTCDate()));
  const totalDays = monthEnd.getUTCDate();
  const transferDay = effectiveDate.getUTCDate();
  const sourceDays = Math.max(transferDay - 1, 0);
  const targetDays = Math.max(totalDays - sourceDays, 0);
  const sourceEarned = roundMoney((sourceMonthly * sourceDays) / totalDays);
  const sourceCredit = roundMoney(Math.max(sourceMonthly - sourceEarned, 0));
  const targetCharge = roundMoney((targetMonthly * targetDays) / totalDays);

  return {
    monthStart,
    monthEnd,
    effectiveDate,
    totalDays,
    sourceDays,
    targetDays,
    sourceMonthly,
    targetMonthly,
    sourceEarned,
    sourceCredit,
    targetCharge,
  };
};

interface StudentListFilters {
  q?: string;
  school_name?: string;
  class_id?: number;
  subject_id?: number;
  level?: number;
  address?: string;
  age?: number;
  gender?: string;
  status?: string;
  teacher_id?: number;
  page?: number;
  limit?: number;
}

const addStudentFilters = (
  conditions: string[],
  params: any[],
  filters: StudentListFilters = {},
  centerId?: number,
  teacherId?: number
) => {
  if (centerId) {
    params.push(centerId);
    conditions.push(`s.center_id = $${params.length}`);
  }

  conditions.push('s.deleted_at IS NULL');

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`COALESCE(c.teacher_id, s.teacher_id) = $${params.length}`);
  } else if (filters.teacher_id != null) {
    params.push(filters.teacher_id);
    conditions.push(`COALESCE(c.teacher_id, s.teacher_id) = $${params.length}`);
  }

  const search = String(filters.q || '').trim();
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(
      s.first_name ILIKE $${params.length}
      OR s.last_name ILIKE $${params.length}
      OR CONCAT_WS(' ', s.first_name, s.last_name) ILIKE $${params.length}
      OR s.enrollment_number ILIKE $${params.length}
      OR s.email ILIKE $${params.length}
      OR s.phone ILIKE $${params.length}
      OR s.parent_name ILIKE $${params.length}
      OR s.school_name ILIKE $${params.length}
      OR s.school_class ILIKE $${params.length}
    )`);
  }

  const schoolName = String(filters.school_name || '').trim();
  if (schoolName) {
    params.push(schoolName);
    conditions.push(`s.school_name = $${params.length}`);
  }

  if (filters.class_id != null) {
    if (Number(filters.class_id) === -1) {
      conditions.push('s.class_id IS NULL');
    } else {
      params.push(filters.class_id);
      conditions.push(`s.class_id = $${params.length}`);
    }
  }

  if (filters.subject_id != null) {
    params.push(filters.subject_id);
    conditions.push(`sub.subject_id = $${params.length}`);
  }

  if (filters.level != null) {
    params.push(filters.level);
    conditions.push(`c.level = $${params.length}`);
  }

  const address = String(filters.address || '').trim();
  if (address) {
    params.push(address);
    conditions.push(`ec.address = $${params.length}`);
  }

  if (filters.age != null) {
    params.push(filters.age);
    conditions.push(`DATE_PART('year', AGE(CURRENT_DATE, s.date_of_birth)) = $${params.length}`);
  }

  const gender = String(filters.gender || '').trim();
  if (gender) {
    params.push(gender);
    conditions.push(`s.gender = $${params.length}`);
  }

  const status = String(filters.status || '').trim();
  if (status) {
    params.push(status);
    conditions.push(`s.status = $${params.length}`);
  }
};

const findAllWithClass = async (centerId?: number, teacherId?: number) => {
  let query = `
    SELECT
      s.*,
      c.class_name,
      c.teacher_id AS class_teacher_id,
      COALESCE(c.teacher_id, s.teacher_id) AS effective_teacher_id
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id AND c.deleted_at IS NULL
  `;
  const params: any[] = [];
  const conditions: string[] = ['s.deleted_at IS NULL'];

  if (centerId) {
    params.push(centerId);
    conditions.push(`s.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`COALESCE(c.teacher_id, s.teacher_id) = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY s.student_id';

  const result = await pool.query(query, params);
  return result.rows;
};

const findPaginatedWithClass = async (filters: StudentListFilters = {}, centerId?: number, teacherId?: number) => {
  const fromClause = `
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id AND c.deleted_at IS NULL
    LEFT JOIN edu_centers ec ON s.center_id = ec.center_id
    LEFT JOIN subjects sub ON sub.class_id = c.class_id
  `;
  let query = `
    SELECT DISTINCT
      s.*,
      c.class_name,
      c.level AS class_level,
      c.teacher_id AS class_teacher_id,
      COALESCE(c.teacher_id, s.teacher_id) AS effective_teacher_id,
      ec.address AS center_address
    ${fromClause}
  `;
  let countQuery = `
    SELECT COUNT(DISTINCT s.student_id) AS total
    ${fromClause}
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  addStudentFilters(conditions, params, filters, centerId, teacherId);

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ');
    query += where;
    countQuery += where;
  }

  const countResult = await pool.query(countQuery, [...params]);
  const total = Number(countResult.rows[0]?.total || 0);

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 20)));
  const offset = (page - 1) * limit;

  query += ' ORDER BY s.student_id DESC';
  params.push(limit);
  query += ` LIMIT $${params.length}`;
  params.push(offset);
  query += ` OFFSET $${params.length}`;

  const result = await pool.query(query, params);
  return { data: result.rows, total, page, limit };
};

const findByIdWithClass = async (id: number, centerId?: number, teacherId?: number) => {
  let query = `
    SELECT
      s.*,
      c.class_name,
      (d.discount_id IS NOT NULL) AS is_discounted,
      d.discount_kind,
      d.discount_type AS discount_value_type,
      d.value AS discount_value,
      d.original_price AS discount_original_price,
      d.reason AS discount_reason
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id AND c.deleted_at IS NULL
    LEFT JOIN LATERAL (
      SELECT discount_id, discount_kind, discount_type, value, original_price, reason
      FROM discounts
      WHERE student_id = s.student_id
        AND active = TRUE
        AND (start_date IS NULL OR start_date <= CURRENT_DATE)
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      ORDER BY
        CASE discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT 1
    ) d ON TRUE
    WHERE s.student_id = $1 AND s.deleted_at IS NULL
  `;
  const params: any[] = [id];

  if (centerId) {
    query += ' AND s.center_id = $2';
    params.push(centerId);
  }

  if (teacherId) {
    query += ` AND COALESCE(c.teacher_id, s.teacher_id) = $${params.length + 1}`;
    params.push(teacherId);
  }

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const findDeletedWithClassAndTeacher = async (centerId?: number) => {
  let query = `
    SELECT
      s.*,
      c.class_name,
      c.class_code,
      t.first_name AS teacher_first_name,
      t.last_name AS teacher_last_name,
      t.employee_id AS teacher_employee_id
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id
    LEFT JOIN teachers t ON s.teacher_id = t.teacher_id
    WHERE s.deleted_at IS NOT NULL
  `;
  const params: any[] = [];
  if (centerId) {
    params.push(centerId);
    query += ` AND s.center_id = $${params.length}`;
  }
  query += ' ORDER BY s.deleted_at DESC, s.student_id DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const findByClassIncludingTransferred = async (classId: number, centerId?: number, teacherId?: number) => {
  let query = `
    SELECT
      s.*,
      c.class_name,
      c.teacher_id AS class_teacher_id,
      COALESCE(c.teacher_id, s.teacher_id) AS effective_teacher_id,
      c.payment_amount AS class_payment_amount,
      COALESCE(monthly_payments.paid_amount, 0)::numeric AS payment_amount_this_month,
      COALESCE(monthly_payments.completed_count, 0)::int AS payment_count_this_month,
      COALESCE(monthly_payments.completed_count, 0)::int > 0 AS paid_this_month,
      monthly_payments.last_payment_date AS last_payment_date_this_month,
      monthly_payments.last_payment_status AS payment_status_this_month
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(
          CASE
            WHEN LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid') THEN p.amount
            ELSE 0
          END
        ), 0)::numeric AS paid_amount,
        COUNT(*) FILTER (WHERE LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid'))::int AS completed_count,
        MAX(p.payment_date) FILTER (WHERE LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid')) AS last_payment_date,
        (ARRAY_AGG(p.payment_status ORDER BY p.payment_date DESC, p.payment_id DESC)
          FILTER (WHERE LOWER(COALESCE(p.payment_status, '')) IN ('completed', 'paid')))[1] AS last_payment_status
      FROM payments p
      WHERE p.student_id = s.student_id
        AND p.deleted_at IS NULL
        AND COALESCE(p.payment_type, '') <> 'Transfer Adjustment'
        AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)::date
        AND p.payment_date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
    ) monthly_payments ON TRUE
    WHERE s.class_id = $1
      AND (s.deleted_at IS NULL OR s.status = 'Transferred')
  `;
  const params: any[] = [classId];

  if (centerId) {
    params.push(centerId);
    query += ` AND s.center_id = $${params.length}`;
  }

  if (teacherId) {
    params.push(teacherId);
    query += ` AND COALESCE(c.teacher_id, s.teacher_id) = $${params.length}`;
  }

  query += ` ORDER BY
    CASE WHEN s.status = 'Transferred' THEN 1 ELSE 0 END,
    s.student_id`;

  const result = await pool.query(query, params);
  return result.rows;
};

const insert = async (payload: Record<string, unknown>) => {
  const {
    center_id,
    enrollment_number,
    first_name,
    last_name,
    username,
    password_hash,
    email,
    phone,
    date_of_birth,
    parent_name,
    parent_phone,
    gender,
    status,
    teacher_id,
    class_id,
    school_name,
    school_class,
    is_frozen,
  } = payload;
  const result = await pool.query(
    `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id, school_name, school_class, is_frozen)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
    [
      center_id,
      enrollment_number,
      first_name,
      last_name,
      username,
      password_hash,
      email,
      phone,
      date_of_birth,
      parent_name,
      parent_phone,
      gender,
      status || 'Active',
      teacher_id,
      class_id,
      school_name,
      school_class,
      is_frozen ?? false,
    ]
  );
  return result.rows[0];
};

const update = async (id: number, payload: Record<string, unknown>, centerId?: number, teacherId?: number) => {
  const { first_name, last_name, username, email, phone, status, class_id, teacher_id, is_frozen, school_name, school_class } =
    payload;
  let query = `UPDATE students SET
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      username = COALESCE($3, username),
      email = COALESCE($4, email),
      phone = COALESCE($5, phone),
      status = COALESCE($6, status),
      class_id = COALESCE($7, class_id),
      teacher_id = COALESCE($8, teacher_id),
      is_frozen = COALESCE($9, is_frozen),
      school_name = COALESCE($10, school_name),
      school_class = COALESCE($11, school_class),
      updated_at = CURRENT_TIMESTAMP
    WHERE student_id = $12 AND deleted_at IS NULL`;
  const params: any[] = [
    first_name,
    last_name,
    username,
    email,
    phone,
    status,
    class_id,
    teacher_id,
    is_frozen,
    school_name,
    school_class,
    id,
  ];

  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }

  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }

  query += ' RETURNING *';

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  let query = `UPDATE students
    SET deleted_at = CURRENT_TIMESTAMP,
        status = 'Removed',
        updated_at = CURRENT_TIMESTAMP
    WHERE student_id = $1 AND deleted_at IS NULL`;
  const params: any[] = [id];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }
  query += ' RETURNING *';
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const purge = async (id: number, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM students WHERE student_id = $1 AND deleted_at IS NOT NULL';
  const params: any[] = [id];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }
  query += ' RETURNING *';
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const transferToClass = async (id: number, targetClassId: number, centerId?: number, teacherId?: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let sourceQuery = `
      SELECT s.*, c.payment_amount AS source_payment_amount
      FROM students s
      LEFT JOIN classes c ON c.class_id = s.class_id
      WHERE s.student_id = $1 AND s.deleted_at IS NULL
    `;
    const sourceParams: any[] = [id];
    if (centerId) {
      sourceParams.push(centerId);
      sourceQuery += ` AND s.center_id = $${sourceParams.length}`;
    }
    if (teacherId) {
      sourceParams.push(teacherId);
      sourceQuery += ` AND s.teacher_id = $${sourceParams.length}`;
    }
    sourceQuery += ' FOR UPDATE OF s';
    const sourceResult = await client.query(sourceQuery, sourceParams);
    const source = sourceResult.rows[0];
    if (!source) {
      await client.query('ROLLBACK');
      return { error: 'not_found' as const };
    }

    let targetQuery = 'SELECT class_id, center_id, teacher_id, payment_amount FROM classes WHERE class_id = $1 AND deleted_at IS NULL';
    const targetParams: any[] = [targetClassId];
    if (centerId) {
      targetParams.push(centerId);
      targetQuery += ` AND center_id = $${targetParams.length}`;
    } else {
      targetParams.push(source.center_id);
      targetQuery += ` AND center_id = $${targetParams.length}`;
    }
    const targetResult = await client.query(targetQuery, targetParams);
    const targetClass = targetResult.rows[0];
    if (!targetClass) {
      await client.query('ROLLBACK');
      return { error: 'target_class_not_found' as const };
    }

    if (Number(source.class_id) === Number(targetClass.class_id)) {
      await client.query('ROLLBACK');
      return { error: 'same_class' as const };
    }

    const transferredResult = await client.query(
      `UPDATE students
       SET status = 'Transferred',
           deleted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $1
       RETURNING *`,
      [id]
    );

    const newStudentResult = await client.query(
      `INSERT INTO students (
        center_id,
        enrollment_number,
        first_name,
        last_name,
        username,
        password_hash,
        email,
        phone,
        date_of_birth,
        parent_name,
        parent_phone,
        gender,
        status,
        teacher_id,
        class_id,
        school_name,
        school_class,
        is_frozen,
        coins
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Active', $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        targetClass.center_id,
        source.enrollment_number,
        source.first_name,
        source.last_name,
        source.username,
        source.password_hash,
        source.email,
        source.phone,
        source.date_of_birth,
        source.parent_name,
        source.parent_phone,
        source.gender,
        targetClass.teacher_id || null,
        targetClass.class_id,
        source.school_name,
        source.school_class,
        source.is_frozen ?? false,
        Number(source.coins || 0),
      ]
    );
    const newStudent = newStudentResult.rows[0];

    const allocation = buildTransferAllocation(source, targetClass);
    const paidResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS paid_amount
       FROM payments
       WHERE student_id = $1
         AND center_id = $2
         AND deleted_at IS NULL
         AND LOWER(payment_status) IN ('completed', 'paid')
         AND COALESCE(payment_type, '') <> 'Transfer Adjustment'
         AND payment_date >= $3
         AND payment_date <= $4`,
      [id, source.center_id, toDateOnly(allocation.monthStart), toDateOnly(allocation.monthEnd)]
    );
    const paidAmount = Number(paidResult.rows[0]?.paid_amount || 0);
    const shouldAllocate = allocation.sourceMonthly > 0 && paidAmount >= allocation.sourceMonthly;

    if (shouldAllocate && allocation.sourceCredit > 0) {
      await client.query(
        `INSERT INTO payments (
          student_id,
          center_id,
          payment_date,
          amount,
          currency,
          payment_method,
          transaction_reference,
          receipt_number,
          payment_status,
          payment_type,
          notes,
          transfer_source_student_id,
          transfer_target_student_id,
          transfer_source_class_id,
          transfer_target_class_id,
          transfer_effective_date,
          covered_from,
          covered_to,
          coverage_days,
          coverage_total_days
        )
        VALUES ($1, $2, $3, $4, 'UZS', 'Cash', $5, NULL, 'Completed', 'Transfer Adjustment', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          id,
          source.center_id,
          toDateOnly(allocation.effectiveDate),
          -allocation.sourceCredit,
          `TRANSFER-${id}-${newStudent.student_id}-SOURCE`,
          `Transfer credit: ${allocation.sourceDays}/${allocation.totalDays} days kept in previous group`,
          id,
          newStudent.student_id,
          source.class_id,
          targetClass.class_id,
          toDateOnly(allocation.effectiveDate),
          toDateOnly(allocation.effectiveDate),
          toDateOnly(allocation.monthEnd),
          allocation.targetDays,
          allocation.totalDays,
        ]
      );
    }

    if (shouldAllocate && allocation.targetCharge > 0) {
      await client.query(
        `INSERT INTO payments (
          student_id,
          center_id,
          payment_date,
          amount,
          currency,
          payment_method,
          transaction_reference,
          receipt_number,
          payment_status,
          payment_type,
          notes,
          transfer_source_student_id,
          transfer_target_student_id,
          transfer_source_class_id,
          transfer_target_class_id,
          transfer_effective_date,
          covered_from,
          covered_to,
          coverage_days,
          coverage_total_days
        )
        VALUES ($1, $2, $3, $4, 'UZS', 'Cash', $5, NULL, 'Completed', 'Transfer Adjustment', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          newStudent.student_id,
          targetClass.center_id,
          toDateOnly(allocation.effectiveDate),
          allocation.targetCharge,
          `TRANSFER-${id}-${newStudent.student_id}-TARGET`,
          `Transfer charge: ${allocation.targetDays}/${allocation.totalDays} days in new group`,
          id,
          newStudent.student_id,
          source.class_id,
          targetClass.class_id,
          toDateOnly(allocation.effectiveDate),
          toDateOnly(allocation.effectiveDate),
          toDateOnly(allocation.monthEnd),
          allocation.targetDays,
          allocation.totalDays,
        ]
      );
    }

    await client.query(
      `INSERT INTO parent_students (parent_id, student_id, relationship, is_primary)
       SELECT parent_id, $2, relationship, is_primary
       FROM parent_students
       WHERE student_id = $1
       ON CONFLICT DO NOTHING`,
      [id, newStudentResult.rows[0].student_id]
    );

    await client.query('COMMIT');
    return {
      transferred: transferredResult.rows[0],
      student: newStudent,
      payment_allocation: {
        applied: shouldAllocate,
        paid_amount: paidAmount,
        source_monthly_amount: allocation.sourceMonthly,
        target_monthly_amount: allocation.targetMonthly,
        source_days: allocation.sourceDays,
        target_days: allocation.targetDays,
        total_days: allocation.totalDays,
        source_earned_amount: allocation.sourceEarned,
        source_credit_amount: shouldAllocate ? allocation.sourceCredit : 0,
        target_charge_amount: shouldAllocate ? allocation.targetCharge : 0,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const findByUsername = async (username: string) => {
  const result = await pool.query(
    'SELECT student_id, first_name, last_name, email, password_hash, status, class_id, center_id, is_frozen FROM students WHERE username = $1 AND deleted_at IS NULL',
    [username]
  );
  return result.rows[0] || null;
};

const findPasswordHashById = async (id: number) => {
  const result = await pool.query('SELECT password_hash FROM students WHERE student_id = $1 AND deleted_at IS NULL', [id]);
  return result.rows[0]?.password_hash ?? null;
};

const setCredentials = async (
  id: number,
  username: string,
  password_hash: string,
  centerId?: number,
  teacherId?: number
) => {
  let query =
    'UPDATE students SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE student_id = $3 AND deleted_at IS NULL';
  const params: any[] = [username, password_hash, id];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }
  query += ' RETURNING student_id, username, email';
  const result = await pool.query(
    query,
    params
  );
  return result.rows[0] || null;
};

const updatePasswordHash = async (id: number, password_hash: string) => {
  await pool.query('UPDATE students SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2 AND deleted_at IS NULL', [
    password_hash,
    id,
  ]);
};

module.exports = {
  findAllWithClass,
  findPaginatedWithClass,
  findByIdWithClass,
  findDeletedWithClassAndTeacher,
  findByClassIncludingTransferred,
  insert,
  update,
  remove,
  purge,
  transferToClass,
  findByUsername,
  findPasswordHashById,
  setCredentials,
  updatePasswordHash,
};

export {};
