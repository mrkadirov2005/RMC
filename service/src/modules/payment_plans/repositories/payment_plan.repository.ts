const pool = require('../../../db/pool');

const findAllFiltered = (conditions: string[], params: any[]) => {
  let query = 'SELECT * FROM payment_plans';
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY created_at DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findPlanById = (id: number, centerId?: number) => {
  let query = 'SELECT * FROM payment_plans WHERE plan_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findInstallments = (planId: number) =>
  pool
    .query('SELECT * FROM payment_plan_installments WHERE plan_id = $1 ORDER BY due_date ASC', [planId])
    .then((r: any) => r.rows);

const insertPlan = (params: any[]) =>
  pool
    .query(
      `INSERT INTO payment_plans (student_id, center_id, name, total_amount, currency, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const insertInstallment = (planId: number, due_date: any, amount: any, status?: string) =>
  pool.query(
    `INSERT INTO payment_plan_installments (plan_id, due_date, amount, status) VALUES ($1,$2,$3,$4)`,
    [planId, due_date, amount, status || 'Pending']
  );

const insertInstallmentSimple = (planId: number, due_date: any, amount: any) =>
  pool.query(`INSERT INTO payment_plan_installments (plan_id, due_date, amount) VALUES ($1,$2,$3)`, [planId, due_date, amount]);

const updatePlan = (id: number, params: any[], centerId?: number) =>
  pool
    .query(
      `UPDATE payment_plans SET
        name = COALESCE($1, name),
        total_amount = COALESCE($2, total_amount),
        currency = COALESCE($3, currency),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        status = COALESCE($6, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE plan_id = $7${centerId ? ' AND center_id = $8' : ''} RETURNING *`,
      centerId ? [...params, id, centerId] : [...params, id]
    )
    .then((r: any) => r.rows[0] || null);

const deleteInstallmentsByPlan = (planId: number) =>
  pool.query('DELETE FROM payment_plan_installments WHERE plan_id = $1', [planId]);

const deletePlan = (id: number, centerId?: number) => {
  let query = 'DELETE FROM payment_plans WHERE plan_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = {
  findAllFiltered,
  findPlanById,
  findInstallments,
  insertPlan,
  insertInstallment,
  insertInstallmentSimple,
  updatePlan,
  deleteInstallmentsByPlan,
  deletePlan,
};

export {};
