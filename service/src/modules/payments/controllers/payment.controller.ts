const paymentService = require('../services/payment.service');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');
const { getCenterScope, sendError, sendScopeError } = require('../../../shared/controller');

const ensurePaymentAccess = (req: any, res: any) => {
  if (req.user?.userType === 'student') {
    res.status(403).json({ error: 'Kirish rad etildi.' });
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
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId, teacherId } = scope;
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 200)
      : undefined;
    const requestedPage = Number(req.query.page || 1);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const studentId = req.query.student_id ? Number(req.query.student_id) : undefined;
    const rows = await paymentService.listPayments({
      centerId: centerId ?? undefined,
      teacherId,
      studentId,
      limit,
      offset: limit ? (page - 1) * limit : undefined,
    });
    if (req.user?.userType === 'teacher') {
      return res.json(rows.map(toTeacherPaymentView));
    }
    res.json(rows);
  } catch (error: any) {
    sendError(res, error, "To'lovlarni yuklab bo'lmadi");
  }
};

const getPaymentById = async (req: any, res: any) => {
  try {
    if (!ensurePaymentAccess(req, res)) return;
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId, teacherId } = scope;
    const row = await paymentService.getPayment(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: "To'lov topilmadi" });
    if (req.user?.userType === 'student' && row.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    if (req.user?.userType === 'teacher') {
      return res.json(toTeacherPaymentView(row));
    }
    res.json(row);
  } catch (error: any) {
    sendError(res, error, "To'lovni yuklab bo'lmadi");
  }
};

const createPayment = async (req: any, res: any) => {
  try {
    if (req.user?.userType === 'teacher') {
      return res.status(403).json({ error: "O'qituvchilar to'lov yarata olmaydi." });
    }
    const scope = getCenterScope(req, { requireConcreteCenter: true });
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    res.status(201).json(await paymentService.createPayment(req.body, centerId ?? undefined));
  } catch (error: any) {
    sendError(res, error, "To'lovni yaratib bo'lmadi");
  }
};

const updatePayment = async (req: any, res: any) => {
  try {
    if (req.user?.userType === 'teacher') {
      return res.status(403).json({ error: "O'qituvchilar to'lovni yangilay olmaydi." });
    }
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId, teacherId } = scope;
    const row = await paymentService.updatePayment(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: "To'lov topilmadi" });
    res.json(row);
  } catch (error: any) {
    sendError(res, error, "To'lovni yangilab bo'lmadi");
  }
};

const getPaymentsByStudent = async (req: any, res: any) => {
  try {
    if (!ensurePaymentAccess(req, res)) return;
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId, teacherId } = scope;
    const studentId = Number(req.params.studentId);
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    const rows = await paymentService.listByStudent(studentId, centerId ?? undefined, teacherId);
    if (req.user?.userType === 'teacher') {
      return res.json(rows.map(toTeacherPaymentView));
    }
    res.json(rows);
  } catch (error: any) {
    sendError(res, error, "To'lovlarni yuklab bo'lmadi");
  }
};

const deletePayment = async (req: any, res: any) => {
  try {
    if (req.user?.userType === 'teacher') {
      return res.status(403).json({ error: "O'qituvchilar to'lovni o'chira olmaydi." });
    }
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId, teacherId } = scope;
    const row = await paymentService.deletePayment(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: "To'lov topilmadi" });
    res.json({ message: "To'lov muvaffaqiyatli o'chirildi", payment: row });
  } catch (error: any) {
    sendError(res, error, "To'lovni o'chirib bo'lmadi");
  }
};

const purgePayment = async (req: any, res: any) => {
  try {
    if (req.user?.userType === 'teacher') {
      return res.status(403).json({ error: "O'qituvchilar to'lovni butunlay o'chira olmaydi." });
    }
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId, teacherId } = scope;
    const row = await paymentService.purgePayment(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: "O'chirilgan to'lov topilmadi" });
    res.json({ message: "To'lov butunlay o'chirildi", payment: row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: "To'lov boshqa yozuvlarda hali ishlatilmoqda",
        message: "Bu yozuvni butunlay o'chirishdan oldin bog'liq yozuvlarni o'chiring yoki boshqasiga o'tkazing.",
        details: error.detail,
      });
    }
    sendError(res, error, "To'lovni butunlay o'chirib bo'lmadi");
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  getPaymentsByStudent,
  deletePayment,
  purgePayment,
};

export {};
