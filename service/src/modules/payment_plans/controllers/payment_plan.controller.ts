const { logAudit } = require('../../../utils/audit');
const paymentPlanService = require('../services/payment_plan.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAllPlans = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    res.json(await paymentPlanService.list(req.query, centerId ?? undefined));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payment plans', details: error.message || String(error) });
  }
};

const getPlanById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const data = await paymentPlanService.getWithInstallments(Number(req.params.id), centerId ?? undefined);
    if (!data) return res.status(404).json({ error: 'Payment plan not found' });
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payment plan', details: error.message || String(error) });
  }
};

const createPlan = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const out = await paymentPlanService.create(req.body, centerId ?? undefined);
    if (out.error === 'validation') {
      return res.status(400).json({ error: 'student_id, center_id, name, total_amount, and start_date are required' });
    }
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Student does not belong to this center.' });
    }
    const { plan } = out as { plan: any };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'CREATE',
      entity_type: 'payment_plan',
      entity_id: plan.plan_id,
      center_id: centerId ?? undefined,
      details: { total_amount: plan.total_amount, installments_count: req.body.installments?.length || 0 },
      ip_address: req.ip,
    });
    res.status(201).json({ message: 'Payment plan created', plan });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create payment plan', details: error.message || String(error) });
  }
};

const updatePlan = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await paymentPlanService.update(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Payment plan not found' });
    res.json({ message: 'Payment plan updated', plan: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update payment plan', details: error.message || String(error) });
  }
};

const deletePlan = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await paymentPlanService.remove(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Payment plan not found' });
    res.json({ message: 'Payment plan deleted', plan: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete payment plan', details: error.message || String(error) });
  }
};

module.exports = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
};

export {};
