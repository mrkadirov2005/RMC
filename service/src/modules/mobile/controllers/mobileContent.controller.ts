const contentService = require('../services/mobileContent.service');
const parentMobileService = require('../services/mobileParent.service');
const { pageParams } = require('../mobileAccess');

const fail = (res: any, error: any, message: string) => {
  console.error('Mobile content error:', error);
  res.status(500).json({ error: message });
};

// @MOB-060 GET /links
const links = async (req: any, res: any) => {
  try {
    res.json(await contentService.links(req.user));
  } catch (error: any) {
    fail(res, error, "Havolalarni yuklab bo'lmadi");
  }
};

// @MOB-061 GET /announcements
const announcements = async (req: any, res: any) => {
  try {
    const { page, pageSize } = pageParams(req.query);
    res.json(await contentService.announcements(req.user, page, pageSize));
  } catch (error: any) {
    fail(res, error, "E'lonlarni yuklab bo'lmadi");
  }
};

// @MOB-062 GET /policies
const policies = async (req: any, res: any) => {
  try {
    res.json(await contentService.policies(req.user));
  } catch (error: any) {
    fail(res, error, "Qoidalarni yuklab bo'lmadi");
  }
};

// @MOB-062 POST /policies/:policyId/accept
const acceptPolicy = async (req: any, res: any) => {
  try {
    const policyId = Number(req.params.policyId);
    if (!Number.isInteger(policyId) || policyId < 1) return res.status(400).json({ error: "Qoida noto'g'ri ko'rsatilgan" });
    const result = await contentService.acceptPolicy(req.user, policyId);
    if (!result) return res.status(404).json({ error: 'Qoida topilmadi' });
    res.json(result);
  } catch (error: any) {
    fail(res, error, "Qoidani qabul qilib bo'lmadi");
  }
};

// @MOB-063 GET /help-requests
const listHelpRequests = async (req: any, res: any) => {
  try {
    res.json(await contentService.helpRequests(req.user));
  } catch (error: any) {
    fail(res, error, "Murojaatlarni yuklab bo'lmadi");
  }
};

// @MOB-063 POST /help-requests  { kind, message, student_id? }  (student_id: a parent's child)
const createHelpRequest = async (req: any, res: any) => {
  try {
    const { kind, message } = req.body || {};
    const text = typeof message === 'string' ? message.trim() : '';
    if (!contentService.HELP_KINDS.includes(kind)) return res.status(400).json({ error: "Murojaat turi noto'g'ri", code: 'INVALID_KIND' });
    if (text.length < 3 || text.length > 4000) return res.status(400).json({ error: "Xabar 3–4000 belgidan iborat bo'lishi kerak", code: 'INVALID_MESSAGE' });
    let studentId: number | null = req.user.userType === 'student' ? Number(req.user.id) : null;
    if (req.user.userType === 'parent' && req.body.student_id != null) {
      const child = await parentMobileService.findChild(Number(req.user.id), Number(req.body.student_id));
      if (!child) return res.status(403).json({ error: "Bu o'quvchi sizga biriktirilmagan.", code: 'CHILD_NOT_LINKED' });
      studentId = Number(child.student_id);
    }
    const request = await contentService.createHelpRequest(req.user, { kind, message: text }, studentId);
    res.status(201).json(request);
  } catch (error: any) {
    fail(res, error, "Murojaatni yuborib bo'lmadi");
  }
};

module.exports = { links, announcements, policies, acceptPolicy, listHelpRequests, createHelpRequest };

export {};
