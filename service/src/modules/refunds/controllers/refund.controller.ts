const { logAudit } = require('../../../utils/audit');
const refundService = require('../services/refund.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAllRefunds = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    res.json(await refundService.list(req.query, centerId ?? undefined));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lov qaytarilishlarini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getRefundById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await refundService.getById(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: "To'lov qaytarilishi topilmadi" });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lov qaytarilishini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createRefund = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const out = await refundService.create(req.body, centerId ?? undefined);
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Payment does not belong to this center.' });
    }
    if (out.error === 'payment_not_found') {
      return res.status(404).json({ error: "To'lov topilmadi" });
    }
    if (out.error === 'refund_exceeds_payment') {
      return res.status(400).json({ error: 'Refund amount exceeds the original payment amount.' });
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
    res.status(500).json({ error: "To'lov qaytarilishini yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateRefund = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await refundService.update(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: "To'lov qaytarilishi topilmadi" });
    if ((row as any).error === 'refund_exceeds_payment') {
      return res.status(400).json({ error: 'Refund amount exceeds the original payment amount.' });
    }
    res.json({ message: "To'lov qaytarilishi yangilandi", refund: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lov qaytarilishini yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteRefund = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await refundService.remove(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: "To'lov qaytarilishi topilmadi" });
    res.json({ message: "To'lov qaytarilishi o'chirildi", refund: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lov qaytarilishini o'chirib bo'lmadi", details: error.message || String(error) });
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
