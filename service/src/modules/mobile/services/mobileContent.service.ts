const contentRepo = require('../repositories/mobileContent.repository');
const notificationRepo = require('../repositories/mobileNotification.repository');

const HELP_KINDS = ['help', 'complaint', 'thanks', 'suggestion'];
const HELP_STATUSES = ['submitted', 'in_review', 'resolved'];
const AUDIENCES = ['all', 'student', 'parent'];

// @MOB-060 Links for the user's centers, plus the ones every center shares.
const links = async (user: any) => {
  const { centerIds } = await contentRepo.audienceOf(user.userType, Number(user.id));
  return { items: await contentRepo.linksFor(centerIds) };
};

// @MOB-061 Announcements meant for this role, center and groups.
const announcements = async (user: any, page: number, pageSize: number) => {
  const { centerIds, classIds } = await contentRepo.audienceOf(user.userType, Number(user.id));
  const { items, total } = await contentRepo.announcementsFor(user.userType, centerIds, classIds, pageSize, (page - 1) * pageSize);
  return { items, page, page_size: pageSize, total };
};

// @MOB-062 Rules with the user's acceptance of each current version.
const policies = async (user: any) => {
  const { centerIds } = await contentRepo.audienceOf(user.userType, Number(user.id));
  const items = await contentRepo.policiesFor(centerIds, user.userType, Number(user.id));
  return { items, pending: items.filter((p: any) => p.requires_acceptance && !p.accepted).length };
};

// @MOB-062 Accepts the current version only, so a stale screen cannot accept old text.
const acceptPolicy = async (user: any, policyId: number) => {
  const { items } = await policies(user);
  const policy = items.find((p: any) => Number(p.policy_id) === policyId);
  if (!policy) return null;
  await contentRepo.acceptPolicy(policyId, Number(policy.version), user.userType, Number(user.id));
  return { policy_id: policyId, version: Number(policy.version), accepted: true };
};

// @MOB-063 A student or parent sends a request; the center is the user's (first) center.
const createHelpRequest = async (user: any, body: any, studentId: number | null) => {
  const { centerIds } = await contentRepo.audienceOf(user.userType, Number(user.id));
  return contentRepo.createHelpRequest({
    centerId: centerIds[0] ?? null,
    userType: user.userType,
    userId: Number(user.id),
    studentId,
    kind: body.kind,
    message: body.message,
  });
};

const helpRequests = async (user: any) => ({ items: await contentRepo.helpRequestsOf(user.userType, Number(user.id)) });

// ---------------- Admin ----------------
// @MOB-161 Publishes an announcement and, when asked, queues a push for its whole audience.
const createAnnouncement = async (data: any) => {
  const announcement = await contentRepo.adminCreateAnnouncement(data);
  const queued = announcement.send_push ? await contentRepo.enqueueAnnouncement(announcement) : 0;
  return { announcement, queued };
};

// @MOB-164 Updates a request and tells the sender in the app.
const updateHelpRequest = async (id: number, centerId: number | null, update: any) => {
  const request = await contentRepo.adminUpdateHelpRequest(id, centerId, update);
  if (request && (update.status || update.response)) {
    const statusText: Record<string, string> = { submitted: 'qabul qilindi', in_review: "ko'rib chiqilmoqda", resolved: 'hal qilindi' };
    await notificationRepo.enqueue({
      userType: request.user_type,
      userId: Number(request.user_id),
      category: 'help',
      title: 'Murojaatingiz',
      body: update.response ? String(update.response).slice(0, 300) : `Murojaatingiz ${statusText[request.status] || request.status}.`,
      data: { url: '/help' },
      dedupeKey: `help:${request.request_id}:${request.status}:${Date.parse(request.updated_at) || Date.now()}`,
    });
  }
  return request;
};

module.exports = {
  HELP_KINDS,
  HELP_STATUSES,
  AUDIENCES,
  links,
  announcements,
  policies,
  acceptPolicy,
  createHelpRequest,
  helpRequests,
  createAnnouncement,
  updateHelpRequest,
};

export {};
