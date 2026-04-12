const paymentService = require('../services/payment.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');

const ensurePaymentAccess = (req: any, res: any) => {
  if (req.user?.userType === 'student') {
    res.status(403).json({ error: 'Access denied.' });
    return false;
  }
  if (req.user?.userType === 'teacher' && !req.user?.payment_access) {
    res.status(403).json({ error: 'Payment access requires a separate login.' });
    return false;
  }
  return true;
};

const toTeacherPaymentView = (row: any) => {
  if (!row) return row;
  return {
    payment_id: row.payment_id,
    student_id: row.student_id,
    payment_date: row.payment_date,
    payment_status: row.payment_status,
  };
};

const getAllPayments = async (req: any, res: any) => {
  try {
    if (!ensurePaymentAccess(req, res)) return;
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const rows = await paymentService.listPayments(centerId ?? undefined, teacherId);
    if (req.user?.userType === 'teacher') {
      return res.json(rows.map(toTeacherPaymentView));
    }
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message || String(error) });
  }
};

const getPaymentById = async (req: any, res: any) => {
  try {
    if (!ensurePaymentAccess(req, res)) return;
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await paymentService.getPayment(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Payment not found' });
    if (req.user?.userType === 'student' && row.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      return res.json(toTeacherPaymentView(row));
    }
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payment', details: error.message || String(error) });
  }
};

const createPayment = async (req: any, res: any) => {
  try {
    if (req.user?.userType === 'teacher') {
      return res.status(403).json({ error: 'Teachers cannot create payments.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(req.body.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    res.status(201).json(await paymentService.createPayment(req.body, centerId ?? undefined));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create payment', details: error.message || String(error) });
  }
};

const updatePayment = async (req: any, res: any) => {
  try {
    if (req.user?.userType === 'teacher') {
      return res.status(403).json({ error: 'Teachers cannot update payments.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await paymentService.updatePayment(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Payment not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update payment', details: error.message || String(error) });
  }
};

const getPaymentsByStudent = async (req: any, res: any) => {
  try {
    if (!ensurePaymentAccess(req, res)) return;
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const studentId = Number(req.params.studentId);
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    const rows = await paymentService.listByStudent(studentId, centerId ?? undefined, teacherId);
    if (req.user?.userType === 'teacher') {
      return res.json(rows.map(toTeacherPaymentView));
    }
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message || String(error) });
  }
};

const deletePayment = async (req: any, res: any) => {
  try {
    if (req.user?.userType === 'teacher') {
      return res.status(403).json({ error: 'Teachers cannot delete payments.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await paymentService.deletePayment(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Payment not found' });
    res.json({ message: 'Payment deleted successfully', payment: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete payment', details: error.message || String(error) });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  getPaymentsByStudent,
  deletePayment,
};

export {};
