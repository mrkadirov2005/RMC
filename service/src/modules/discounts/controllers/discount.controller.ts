const { logAudit } = require('../../../utils/audit');
const discountService = require('../services/discount.service');
const { getCenterScope, sendError, sendScopeError } = require('../../../shared/controller');

const getAllDiscounts = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    res.json(await discountService.list(req.query, centerId ?? undefined));
  } catch (error: any) {
    sendError(res, error, 'Failed to fetch discounts');
  }
};

const getDiscountById = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const row = await discountService.getById(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Discount not found' });
    res.json(row);
  } catch (error: any) {
    sendError(res, error, 'Failed to fetch discount');
  }
};

const getActiveSerialDiscountByStudent = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const row = await discountService.getActiveSerialByStudent(Number(req.params.studentId), centerId ?? undefined);
    res.json(row || null);
  } catch (error: any) {
    sendError(res, error, 'Failed to fetch active discount');
  }
};

const getActiveDiscountByStudent = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const row = await discountService.getActiveByStudent(
      Number(req.params.studentId),
      centerId ?? undefined,
      req.query.discount_kind ? String(req.query.discount_kind) : undefined
    );
    res.json(row || null);
  } catch (error: any) {
    sendError(res, error, 'Failed to fetch active discount');
  }
};

const createDiscount = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req, { requireConcreteCenter: true });
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const out = await discountService.create(req.body, centerId ?? undefined);
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Student does not belong to this center.' });
    }
    const { row } = out as { row: any };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'CREATE',
      entity_type: 'discount',
      entity_id: row?.discount_id,
      center_id: centerId ?? undefined,
      details: {
        student_id: req.body.student_id,
        value: req.body.value,
        discount_type: req.body.discount_type || req.body.value_type,
        discount_kind: req.body.discount_kind,
      },
      ip_address: req.ip,
    });
    res.status(201).json({ message: 'Discount created', discount: row });
  } catch (error: any) {
    sendError(res, error, 'Failed to create discount');
  }
};

const updateDiscount = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const row = await discountService.update(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Discount not found' });
    res.json({ message: 'Discount updated', discount: row });
  } catch (error: any) {
    sendError(res, error, 'Failed to update discount');
  }
};

const deleteDiscount = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const { centerId } = scope;
    const row = await discountService.remove(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Discount not found' });
    res.json({ message: 'Discount deleted', discount: row });
  } catch (error: any) {
    sendError(res, error, 'Failed to delete discount');
  }
};

module.exports = {
  getAllDiscounts,
  getDiscountById,
  getActiveSerialDiscountByStudent,
  getActiveDiscountByStudent,
  createDiscount,
  updateDiscount,
  deleteDiscount,
};

export {};
