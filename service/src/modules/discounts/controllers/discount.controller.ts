const { logAudit } = require('../../../utils/audit');
const discountService = require('../services/discount.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAllDiscounts = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    res.json(await discountService.list(req.query, centerId ?? undefined));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch discounts', details: error.message || String(error) });
  }
};

const getDiscountById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await discountService.getById(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Discount not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch discount', details: error.message || String(error) });
  }
};

const createDiscount = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
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
      details: { student_id: req.body.student_id, value: req.body.value, discount_type: req.body.discount_type },
      ip_address: req.ip,
    });
    res.status(201).json({ message: 'Discount created', discount: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create discount', details: error.message || String(error) });
  }
};

const updateDiscount = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await discountService.update(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Discount not found' });
    res.json({ message: 'Discount updated', discount: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update discount', details: error.message || String(error) });
  }
};

const deleteDiscount = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await discountService.remove(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Discount not found' });
    res.json({ message: 'Discount deleted', discount: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete discount', details: error.message || String(error) });
  }
};

module.exports = {
  getAllDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  deleteDiscount,
};

export {};
