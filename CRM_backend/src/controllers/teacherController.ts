const pool = require('../../config/dbcon');
const cryptoModule = require('crypto');

// Hash password function
const hashPassword = (password: string) => {
  return cryptoModule.createHash('sha256').update(password).digest('hex');
};

exports.getAllTeachers = async (req: any, res: any) => {
  try {
    const result = await pool.query('SELECT * FROM teachers ORDER BY teacher_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers', details: error.message || error.toString() });
  }
};

exports.getTeacherById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM teachers WHERE teacher_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher', details: error.message || error.toString() });
  }
};

exports.createTeacher = async (req: any, res: any) => {
  try {
    const { center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status, roles } = req.body;
    const result = await pool.query(
      'INSERT INTO teachers (center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status, roles) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status || 'Active', JSON.stringify(roles || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create teacher', details: error.message || error.toString() });
  }
};

exports.updateTeacher = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, status, roles } = req.body;
    const result = await pool.query(
      'UPDATE teachers SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), email = COALESCE($3, email), phone = COALESCE($4, phone), status = COALESCE($5, status), roles = COALESCE($6, roles), updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $7 RETURNING *',
      [first_name, last_name, email, phone, status, roles ? JSON.stringify(roles) : null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update teacher', details: error.message || error.toString() });
  }
};

exports.deleteTeacher = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM teachers WHERE employee_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json({ message: 'Teacher deleted successfully', teacher: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete teacher', details: error.message || error.toString() });
  }
};

exports.teacherLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query('SELECT teacher_id, first_name, last_name, email, password_hash, status FROM teachers WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const teacher = result.rows[0];

    if (teacher.status !== 'Active') {
      return res.status(403).json({ error: 'Teacher account is not active' });
    }

    const password_hash = hashPassword(password);
    if (password_hash !== teacher.password_hash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      message: 'Login successful',
      teacher: {
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email
      }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || error.toString() });
  }
};

exports.setTeacherPassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const password_hash = hashPassword(password);
    const result = await pool.query(
      'UPDATE teachers SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $3 RETURNING teacher_id, username, email',
      [username, password_hash, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    res.json({ message: 'Teacher password set successfully', teacher: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to set password', details: error.message || error.toString() });
  }
};

exports.changeTeacherPassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old and new password required' });
    }

    const result = await pool.query('SELECT password_hash FROM teachers WHERE teacher_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const old_hash = hashPassword(old_password);
    if (old_hash !== result.rows[0].password_hash) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const new_hash = hashPassword(new_password);
    await pool.query('UPDATE teachers SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $2', [new_hash, id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message || error.toString() });
  }
};
