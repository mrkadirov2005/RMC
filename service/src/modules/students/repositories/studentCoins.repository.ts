const pool = require('../../../db/pool');

const findStudentForUpdate = async (client: any, studentId: number) => {
  const result = await client.query(
    'SELECT student_id, center_id, teacher_id, coins FROM students WHERE student_id = $1 FOR UPDATE',
    [studentId]
  );
  return result.rows[0] || null;
};

const listTransactions = async (studentId: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT t.* FROM student_coin_transactions t JOIN students s ON s.student_id = t.student_id';
  const params: any[] = [studentId];
  const conditions: string[] = ['t.student_id = $1'];

  if (centerId) {
    params.push(centerId);
    conditions.push(`s.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`s.teacher_id = $${params.length}`);
  }

  query += ` WHERE ${conditions.join(' AND ')} ORDER BY t.transaction_id DESC`;
  const result = await pool.query(query, params);
  return result.rows;
};

const addTransaction = async (
  studentId: number,
  delta: number,
  reason: string | null,
  createdBy: number | null,
  createdByType: string | null
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const student = await findStudentForUpdate(client, studentId);
    if (!student) {
      await client.query('ROLLBACK');
      return { error: 'not_found' as const };
    }

    const currentCoins = Number(student.coins || 0);
    const nextCoins = currentCoins + delta;
    // Note: Allow coins to go negative (students can lose coins for poor performance)
    // Only reject if delta would make coins go below a minimum threshold
    const MIN_COINS = -9999; // Allow significant negative balance
    if (nextCoins < MIN_COINS) {
      await client.query('ROLLBACK');
      return { error: 'insufficient' as const, balance: currentCoins };
    }

    await client.query('UPDATE students SET coins = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2', [
      nextCoins,
      studentId,
    ]);

    const tx = await client.query(
      `INSERT INTO student_coin_transactions (student_id, center_id, delta, reason, created_by, created_by_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [studentId, student.center_id, delta, reason, createdBy, createdByType]
    );

    await client.query('COMMIT');
    return { balance: nextCoins, transaction: tx.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateTransaction = async (
  studentId: number,
  transactionId: number,
  delta: number,
  reason: string | null
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const student = await findStudentForUpdate(client, studentId);
    if (!student) {
      await client.query('ROLLBACK');
      return { error: 'not_found' as const };
    }

    const txRes = await client.query(
      'SELECT delta FROM student_coin_transactions WHERE transaction_id = $1 AND student_id = $2 FOR UPDATE',
      [transactionId, studentId]
    );
    const existing = txRes.rows[0];
    if (!existing) {
      await client.query('ROLLBACK');
      return { error: 'tx_not_found' as const };
    }

    const currentCoins = Number(student.coins || 0);
    const nextCoins = currentCoins + (delta - Number(existing.delta));
    if (nextCoins < 0) {
      await client.query('ROLLBACK');
      return { error: 'insufficient' as const, balance: currentCoins };
    }

    await client.query('UPDATE students SET coins = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2', [
      nextCoins,
      studentId,
    ]);

    const updated = await client.query(
      'UPDATE student_coin_transactions SET delta = $1, reason = $2, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $3 RETURNING *',
      [delta, reason, transactionId]
    );

    await client.query('COMMIT');
    return { balance: nextCoins, transaction: updated.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteTransaction = async (studentId: number, transactionId: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const student = await findStudentForUpdate(client, studentId);
    if (!student) {
      await client.query('ROLLBACK');
      return { error: 'not_found' as const };
    }

    const txRes = await client.query(
      'SELECT delta FROM student_coin_transactions WHERE transaction_id = $1 AND student_id = $2 FOR UPDATE',
      [transactionId, studentId]
    );
    const existing = txRes.rows[0];
    if (!existing) {
      await client.query('ROLLBACK');
      return { error: 'tx_not_found' as const };
    }

    const currentCoins = Number(student.coins || 0);
    const nextCoins = currentCoins - Number(existing.delta);
    if (nextCoins < 0) {
      await client.query('ROLLBACK');
      return { error: 'insufficient' as const, balance: currentCoins };
    }

    await client.query('UPDATE students SET coins = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2', [
      nextCoins,
      studentId,
    ]);

    await client.query('DELETE FROM student_coin_transactions WHERE transaction_id = $1', [transactionId]);

    await client.query('COMMIT');
    return { balance: nextCoins };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  listTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
};

export {};
