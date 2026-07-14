const studentService = require('../services/student.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getStudentCoins = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = Number(req.params.id);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const summary = await studentService.getCoinSummary(studentId, centerId ?? undefined, teacherId);
    if (!summary) return res.status(404).json({ error: 'Student not found' });
    res.json(summary);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch coins', details: error.message || String(error) });
  }
};

const addStudentCoins = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = Number(req.params.id);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const rawAmount = Number(req.body?.amount);
    const direction = String(req.body?.direction || '').toLowerCase();
    const delta = direction === 'subtract' ? -Math.abs(rawAmount) : rawAmount;
    const reason = req.body?.reason ? String(req.body.reason) : null;

    const scopedStudent = await studentService.getStudent(studentId, centerId ?? undefined, teacherId);
    if (!scopedStudent) return res.status(404).json({ error: 'Student not found' });

    const out = await studentService.addCoins(studentId, delta, reason, req.user?.id ?? null, req.user?.userType ?? null);
    if (out.error === 'insufficient') {
      return res.status(400).json({ error: 'Insufficient coins for this operation.' });
    }
    if (out.error === 'not_found') {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update coins', details: error.message || String(error) });
  }
};

const updateStudentCoinTransaction = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = Number(req.params.id);
    const transactionId = Number(req.params.transactionId);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const rawAmount = Number(req.body?.amount);
    const direction = String(req.body?.direction || '').toLowerCase();
    const delta = direction === 'subtract' ? -Math.abs(rawAmount) : rawAmount;
    const reason = req.body?.reason ? String(req.body.reason) : null;

    const scopedStudent = await studentService.getStudent(studentId, centerId ?? undefined, teacherId);
    if (!scopedStudent) return res.status(404).json({ error: 'Student not found' });

    const out = await studentService.updateCoinTransaction(studentId, transactionId, delta, reason);
    if (out.error === 'insufficient') {
      return res.status(400).json({ error: 'Insufficient coins for this operation.' });
    }
    if (out.error === 'not_found' || out.error === 'tx_not_found') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update coins', details: error.message || String(error) });
  }
};

const deleteStudentCoinTransaction = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = Number(req.params.id);
    const transactionId = Number(req.params.transactionId);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const scopedStudent = await studentService.getStudent(studentId, centerId ?? undefined, teacherId);
    if (!scopedStudent) return res.status(404).json({ error: 'Student not found' });

    const out = await studentService.deleteCoinTransaction(studentId, transactionId);
    if (out.error === 'insufficient') {
      return res.status(400).json({ error: 'Insufficient coins for this operation.' });
    }
    if (out.error === 'not_found' || out.error === 'tx_not_found') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete coins', details: error.message || String(error) });
  }
};

module.exports = {
  getStudentCoins,
  addStudentCoins,
  updateStudentCoinTransaction,
  deleteStudentCoinTransaction,
};

export {};
