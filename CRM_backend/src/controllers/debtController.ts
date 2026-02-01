const debt_db = require('../../config/dbcon');

exports.getAllDebts = async (req: any, res: any) => {
  try {
    const result = await debt_db.query('SELECT * FROM debts ORDER BY debt_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

exports.getDebtById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await debt_db.query('SELECT * FROM debts WHERE debt_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debt', details: error.message || error.toString() });
  }
};

exports.createDebt = async (req: any, res: any) => {
  try {
    const { student_id, center_id, debt_amount, debt_date, due_date, amount_paid, remarks } = req.body;
    const balance = debt_amount - (amount_paid || 0);
    const result = await debt_db.query(
      'INSERT INTO debts (student_id, center_id, debt_amount, debt_date, due_date, amount_paid, balance, remarks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [student_id, center_id, debt_amount, debt_date, due_date, amount_paid || 0, balance, remarks]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create debt', details: error.message || error.toString() });
  }
};

exports.updateDebt = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { amount_paid, remarks } = req.body;
    
    // Get current debt info
    const currentDebt = await debt_db.query('SELECT debt_amount, amount_paid FROM debts WHERE debt_id = $1', [id]);
    if (currentDebt.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    const newAmountPaid = amount_paid || currentDebt.rows[0].amount_paid;
    const balance = currentDebt.rows[0].debt_amount - newAmountPaid;
    
    const result = await debt_db.query(
      'UPDATE debts SET amount_paid = $1, balance = $2, remarks = COALESCE($3, remarks), updated_at = CURRENT_TIMESTAMP WHERE debt_id = $4 RETURNING *',
      [newAmountPaid, balance, remarks, id]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update debt', details: error.message || error.toString() });
  }
};

exports.getDebtsByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const result = await debt_db.query('SELECT * FROM debts WHERE student_id = $1 ORDER BY debt_date DESC', [studentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

exports.deleteDebt = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await debt_db.query('DELETE FROM debts WHERE debt_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json({ message: 'Debt deleted successfully', debt: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete debt', details: error.message || error.toString() });
  }
};
