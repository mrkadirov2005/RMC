const { logAudit } = require('../../../utils/audit');
const refundService = require('../services/refund.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAllRefunds = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    res.json(await refundService.list(req.query, centerId ?? undefined));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch refunds', details: error.message || String(error) });
  }
};

const getRefundById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await refundService.getById(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Refund not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch refund', details: error.message || String(error) });
  }
};

const createRefund = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const out = await refundService.create(req.body, centerId ?? undefined);
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Payment does not belong to this center.' });
    }
    const { row } = out as { row: any };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'CREATE',
      entity_type: 'refund',
      entity_id: row?.refund_id,
      center_id: centerId ?? undefined,
      details: { payment_id: req.body.payment_id, amount: req.body.amount },
      ip_address: req.ip,
    });
    res.status(201).json({ message: 'Refund requested', refund: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create refund', details: error.message || String(error) });
  }
};

const updateRefund = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await refundService.update(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Refund not found' });
    res.json({ message: 'Refund updated', refund: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update refund', details: error.message || String(error) });
  }
};

const deleteRefund = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await refundService.remove(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Refund not found' });
    res.json({ message: 'Refund deleted', refund: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete refund', details: error.message || String(error) });
  }
};

module.exports = {
  getAllRefunds,
  getRefundById,
  createRefund,
  updateRefund,
  deleteRefund,
};

export {};
