const contentRepo = require('../repositories/mobileContent.repository');
const contentService = require('../services/mobileContent.service');
const { getScopedCenterId } = require('../../../shared/tenant');

// Web panel endpoints for the mobile app's content. Center admins work on their own center;
// the owner works on all centers, and may create content shared by every center.

const fail = (res: any, error: any, message: string) => {
  console.error('Mobile admin error:', error);
  res.status(500).json({ error: message });
};

const scope = (req: any, res: any) => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  if (!centerId && !isGlobal) {
    res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    return null;
  }
  return { centerId: centerId ?? null, isGlobal: Boolean(isGlobal) };
};

const actorName = (req: any) => req.user?.username || req.user?.email || null;
const idParam = (req: any) => {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const text = (value: any, max: number) => (typeof value === 'string' && value.trim() && value.trim().length <= max ? value.trim() : null);
const isUrl = (value: any) => typeof value === 'string' && /^(https?:\/\/|tg:\/\/)\S+$/i.test(value.trim());

// @MOB-160 Links
const listLinks = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    res.json({ items: await contentRepo.adminListLinks(s.centerId) });
  } catch (error: any) {
    fail(res, error, "Havolalarni yuklab bo'lmadi");
  }
};

const createLink = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    const title = text(req.body?.title, 150);
    if (!title || !isUrl(req.body?.url)) return res.status(400).json({ error: "Nomi va to'g'ri havola (https://...) kerak" });
    const link = await contentRepo.adminCreateLink({ ...req.body, title, url: req.body.url.trim(), center_id: s.centerId });
    res.status(201).json(link);
  } catch (error: any) {
    fail(res, error, "Havolani saqlab bo'lmadi");
  }
};

const updateLink = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    const id = idParam(req);
    if (!id) return res.status(400).json({ error: "Havola noto'g'ri ko'rsatilgan" });
    if (req.body?.url != null && !isUrl(req.body.url)) return res.status(400).json({ error: "Havola noto'g'ri" });
    const link = await contentRepo.adminUpdateLink(id, s.isGlobal ? null : s.centerId, req.body || {});
    if (!link) return res.status(404).json({ error: 'Havola topilmadi' });
    res.json(link);
  } catch (error: any) {
    fail(res, error, "Havolani saqlab bo'lmadi");
  }
};

const deleteLink = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    const id = idParam(req);
    if (!id) return res.status(400).json({ error: "Havola noto'g'ri ko'rsatilgan" });
    const removed = await contentRepo.adminDeleteLink(id, s.isGlobal ? null : s.centerId);
    if (!removed) return res.status(404).json({ error: 'Havola topilmadi' });
    res.json({ message: "O'chirildi" });
  } catch (error: any) {
    fail(res, error, "Havolani o'chirib bo'lmadi");
  }
};

// @MOB-161 Announcements
const listAnnouncements = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    res.json({ items: await contentRepo.adminListAnnouncements(s.centerId) });
  } catch (error: any) {
    fail(res, error, "E'lonlarni yuklab bo'lmadi");
  }
};

const createAnnouncement = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  if (!s.centerId) return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
  try {
    const title = text(req.body?.title, 200);
    const body = text(req.body?.body, 5000);
    const audience = req.body?.audience || 'all';
    if (!title || !body || !contentService.AUDIENCES.includes(audience)) return res.status(400).json({ error: "Sarlavha, matn va auditoriya to'g'ri bo'lishi kerak" });
    const classId = req.body?.class_id ? Number(req.body.class_id) : null;
    const result = await contentService.createAnnouncement({
      center_id: s.centerId,
      title,
      body,
      audience,
      class_id: classId,
      send_push: Boolean(req.body?.send_push),
      created_by_name: actorName(req),
    });
    res.status(201).json(result);
  } catch (error: any) {
    fail(res, error, "E'lonni saqlab bo'lmadi");
  }
};

const deleteAnnouncement = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    const id = idParam(req);
    if (!id) return res.status(400).json({ error: "E'lon noto'g'ri ko'rsatilgan" });
    const removed = await contentRepo.adminDeleteAnnouncement(id, s.centerId);
    if (!removed) return res.status(404).json({ error: "E'lon topilmadi" });
    res.json({ message: "O'chirildi" });
  } catch (error: any) {
    fail(res, error, "E'lonni o'chirib bo'lmadi");
  }
};

// @MOB-162 Policies
const listPolicies = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    res.json({ items: await contentRepo.adminListPolicies(s.centerId) });
  } catch (error: any) {
    fail(res, error, "Qoidalarni yuklab bo'lmadi");
  }
};

const createPolicy = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    const title = text(req.body?.title, 200);
    const body = text(req.body?.body, 20000);
    if (!title || !body) return res.status(400).json({ error: 'Sarlavha va matn kerak' });
    const policy = await contentRepo.adminCreatePolicy({
      center_id: s.centerId,
      title,
      body,
      sort_order: Number(req.body?.sort_order) || 0,
      requires_acceptance: req.body?.requires_acceptance !== false,
      published_by_name: actorName(req),
    });
    res.status(201).json(policy);
  } catch (error: any) {
    fail(res, error, "Qoidani saqlab bo'lmadi");
  }
};

const publishPolicyVersion = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    const id = idParam(req);
    const body = text(req.body?.body, 20000);
    if (!id || !body) return res.status(400).json({ error: 'Qoida va yangi matn kerak' });
    const policy = await contentRepo.adminPublishPolicyVersion(id, s.isGlobal ? null : s.centerId, {
      title: text(req.body?.title, 200),
      body,
      requires_acceptance: req.body?.requires_acceptance !== false,
      published_by_name: actorName(req),
    });
    if (!policy) return res.status(404).json({ error: 'Qoida topilmadi' });
    res.json(policy);
  } catch (error: any) {
    fail(res, error, "Yangi versiyani saqlab bo'lmadi");
  }
};

const policyVersions = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    const id = idParam(req);
    if (!id) return res.status(400).json({ error: "Qoida noto'g'ri ko'rsatilgan" });
    res.json({ items: await contentRepo.adminPolicyVersions(id) });
  } catch (error: any) {
    fail(res, error, "Versiyalarni yuklab bo'lmadi");
  }
};

// @MOB-164 Help requests
const listHelpRequests = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    const status = contentService.HELP_STATUSES.includes(req.query?.status) ? req.query.status : null;
    res.json({ items: await contentRepo.adminListHelpRequests(s.centerId, status) });
  } catch (error: any) {
    fail(res, error, "Murojaatlarni yuklab bo'lmadi");
  }
};

const updateHelpRequest = async (req: any, res: any) => {
  const s = scope(req, res);
  if (!s) return;
  try {
    const id = idParam(req);
    const status = req.body?.status;
    const response = req.body?.response == null ? undefined : text(req.body.response, 4000);
    if (!id || (status != null && !contentService.HELP_STATUSES.includes(status)) || response === null) {
      return res.status(400).json({ error: "Holat yoki javob noto'g'ri" });
    }
    const request = await contentService.updateHelpRequest(id, s.centerId, { status, response, handled_by_name: actorName(req) });
    if (!request) return res.status(404).json({ error: 'Murojaat topilmadi' });
    res.json(request);
  } catch (error: any) {
    fail(res, error, "Murojaatni yangilab bo'lmadi");
  }
};

module.exports = {
  listLinks,
  createLink,
  updateLink,
  deleteLink,
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  listPolicies,
  createPolicy,
  publishPolicyVersion,
  policyVersions,
  listHelpRequests,
  updateHelpRequest,
};

export {};
