const service = require('../services/parent_link_request.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const scopeOrDeny = (req: any, res: any) => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  if (!centerId && !isGlobal) {
    res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    return null;
  }
  return { centerId: centerId ?? undefined };
};

const decidedBy = (req: any) => (req.user?.id ? Number(req.user.id) : null);

const listRequests = async (req: any, res: any) => {
  try {
    const scope = scopeOrDeny(req, res);
    if (!scope) return;
    const status = String(req.query.status || '').trim() || undefined;
    res.json(await service.listRequests(scope.centerId, status));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Ota-ona so'rovlarini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const sendDecision = (res: any, result: any, okMessage: string) => {
  if (result?.error === 'not_found') return res.status(404).json({ error: "So'rov topilmadi" });
  if (result?.error === 'already_decided') return res.status(409).json({ error: "So'rov allaqachon ko'rib chiqilgan", status: result.status });
  return res.json({ message: okMessage, ...result });
};

const approveRequest = async (req: any, res: any) => {
  try {
    const scope = scopeOrDeny(req, res);
    if (!scope) return;
    sendDecision(res, await service.approveRequest(Number(req.params.id), scope.centerId, decidedBy(req)), "So'rov tasdiqlandi");
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "So'rovni tasdiqlab bo'lmadi", details: error.message || String(error) });
  }
};

const rejectRequest = async (req: any, res: any) => {
  try {
    const scope = scopeOrDeny(req, res);
    if (!scope) return;
    sendDecision(res, await service.rejectRequest(Number(req.params.id), scope.centerId, decidedBy(req)), "So'rov rad etildi");
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "So'rovni rad etib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = { listRequests, approveRequest, rejectRequest };

export {};
