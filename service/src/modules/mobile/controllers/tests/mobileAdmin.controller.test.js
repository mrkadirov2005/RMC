jest.mock('../../repositories/mobileContent.repository', () => ({
  adminListLinks: jest.fn(),
  adminCreateLink: jest.fn(),
  adminUpdateLink: jest.fn(),
  adminDeleteLink: jest.fn(),
  adminListAnnouncements: jest.fn(),
  adminDeleteAnnouncement: jest.fn(),
  adminListPolicies: jest.fn(),
  adminCreatePolicy: jest.fn(),
  adminPublishPolicyVersion: jest.fn(),
  adminPolicyVersions: jest.fn(),
  adminListHelpRequests: jest.fn(),
}));
jest.mock('../../services/mobileContent.service', () => ({
  AUDIENCES: ['all', 'student', 'parent'],
  HELP_STATUSES: ['submitted', 'in_review', 'resolved'],
  createAnnouncement: jest.fn(),
  updateHelpRequest: jest.fn(),
}));
jest.mock('../../../../shared/tenant', () => ({ getScopedCenterId: jest.fn() }));

const repo = require('../../repositories/mobileContent.repository');
const service = require('../../services/mobileContent.service');
const { getScopedCenterId } = require('../../../../shared/tenant');
const controller = require('../mobileAdmin.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const req = (extra = {}) => ({ user: { userType: 'superuser', username: 'admin1' }, params: {}, query: {}, body: {}, ...extra });

describe('mobile admin controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 2, isGlobal: false });
  });

  const handlers = [
    'listLinks', 'createLink', 'updateLink', 'deleteLink', 'listAnnouncements', 'createAnnouncement', 'deleteAnnouncement',
    'listPolicies', 'createPolicy', 'publishPolicyVersion', 'policyVersions', 'listHelpRequests', 'updateHelpRequest',
  ];

  it.each(handlers)('%s refuses a request with no center scope', async (handler) => {
    getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
    const res = createResponse();
    await controller[handler](req(), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // @MOB-160
  it('validates and saves links in the admin center', async () => {
    let res = createResponse();
    await controller.createLink(req({ body: { title: 'TG', url: 'ftp://x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);

    repo.adminCreateLink.mockResolvedValue({ link_id: 1 });
    res = createResponse();
    await controller.createLink(req({ body: { title: ' TG ', url: ' https://t.me/x ' } }), res);
    expect(repo.adminCreateLink).toHaveBeenCalledWith(expect.objectContaining({ title: 'TG', url: 'https://t.me/x', center_id: 2 }));
    expect(res.status).toHaveBeenCalledWith(201);

    repo.adminListLinks.mockResolvedValue([]);
    await controller.listLinks(req(), createResponse());
    expect(repo.adminListLinks).toHaveBeenCalledWith(2);
  });

  it('updates and deletes links, the owner across centers', async () => {
    let res = createResponse();
    await controller.updateLink(req({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    res = createResponse();
    await controller.updateLink(req({ params: { id: '1' }, body: { url: 'bad' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);

    repo.adminUpdateLink.mockResolvedValueOnce(null);
    res = createResponse();
    await controller.updateLink(req({ params: { id: '1' }, body: { title: 'New' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);

    getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
    repo.adminUpdateLink.mockResolvedValueOnce({ link_id: 1 });
    await controller.updateLink(req({ params: { id: '1' }, body: { title: 'New' } }), createResponse());
    expect(repo.adminUpdateLink).toHaveBeenLastCalledWith(1, null, { title: 'New' });

    res = createResponse();
    await controller.deleteLink(req({ params: { id: '0' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    repo.adminDeleteLink.mockResolvedValueOnce(null);
    res = createResponse();
    await controller.deleteLink(req({ params: { id: '1' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    repo.adminDeleteLink.mockResolvedValueOnce({ link_id: 1 });
    res = createResponse();
    await controller.deleteLink(req({ params: { id: '1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
  });

  // @MOB-161
  it('creates announcements only for a named center with valid fields', async () => {
    getScopedCenterId.mockReturnValueOnce({ centerId: null, isGlobal: true });
    let res = createResponse();
    await controller.createAnnouncement(req({ body: { title: 't', body: 'b' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);

    res = createResponse();
    await controller.createAnnouncement(req({ body: { title: 't', body: 'b', audience: 'teachers' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);

    service.createAnnouncement.mockResolvedValue({ queued: 3 });
    res = createResponse();
    await controller.createAnnouncement(req({ body: { title: 'Majlis', body: 'Shanba', audience: 'parent', class_id: '4', send_push: true } }), res);
    expect(service.createAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ center_id: 2, audience: 'parent', class_id: 4, send_push: true, created_by_name: 'admin1' }),
    );
    expect(res.status).toHaveBeenCalledWith(201);

    repo.adminListAnnouncements.mockResolvedValue([]);
    await controller.listAnnouncements(req(), createResponse());

    res = createResponse();
    await controller.deleteAnnouncement(req({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    repo.adminDeleteAnnouncement.mockResolvedValueOnce(null);
    res = createResponse();
    await controller.deleteAnnouncement(req({ params: { id: '3' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    repo.adminDeleteAnnouncement.mockResolvedValueOnce({ announcement_id: 3 });
    res = createResponse();
    await controller.deleteAnnouncement(req({ params: { id: '3' } }), res);
    expect(res.json).toHaveBeenCalled();
  });

  // @MOB-162
  it('creates rules and publishes new versions', async () => {
    let res = createResponse();
    await controller.createPolicy(req({ body: { title: 'T' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);

    repo.adminCreatePolicy.mockResolvedValue({ policy_id: 1 });
    res = createResponse();
    await controller.createPolicy(req({ body: { title: 'T', body: 'B', requires_acceptance: false } }), res);
    expect(repo.adminCreatePolicy).toHaveBeenCalledWith(expect.objectContaining({ center_id: 2, requires_acceptance: false, published_by_name: 'admin1' }));
    expect(res.status).toHaveBeenCalledWith(201);

    res = createResponse();
    await controller.publishPolicyVersion(req({ params: { id: '1' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    repo.adminPublishPolicyVersion.mockResolvedValueOnce(null);
    res = createResponse();
    await controller.publishPolicyVersion(req({ params: { id: '1' }, body: { body: 'B2' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    repo.adminPublishPolicyVersion.mockResolvedValueOnce({ current_version: 2 });
    res = createResponse();
    await controller.publishPolicyVersion(req({ params: { id: '1' }, body: { body: 'B2' } }), res);
    expect(res.json).toHaveBeenCalledWith({ current_version: 2 });

    res = createResponse();
    await controller.policyVersions(req({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    repo.adminPolicyVersions.mockResolvedValue([{ version: 1 }]);
    res = createResponse();
    await controller.policyVersions(req({ params: { id: '1' } }), res);
    expect(res.json).toHaveBeenCalledWith({ items: [{ version: 1 }] });

    repo.adminListPolicies.mockResolvedValue([]);
    await controller.listPolicies(req(), createResponse());
  });

  // @MOB-164
  it('lists and answers help requests', async () => {
    repo.adminListHelpRequests.mockResolvedValue([]);
    await controller.listHelpRequests(req({ query: { status: 'resolved' } }), createResponse());
    await controller.listHelpRequests(req({ query: { status: 'weird' } }), createResponse());
    expect(repo.adminListHelpRequests.mock.calls.map((c) => c[1])).toEqual(['resolved', null]);

    let res = createResponse();
    await controller.updateHelpRequest(req({ params: { id: '1' }, body: { status: 'closed' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    res = createResponse();
    await controller.updateHelpRequest(req({ params: { id: '1' }, body: { response: '   ' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);

    service.updateHelpRequest.mockResolvedValueOnce(null);
    res = createResponse();
    await controller.updateHelpRequest(req({ params: { id: '1' }, body: { status: 'resolved' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);

    service.updateHelpRequest.mockResolvedValueOnce({ request_id: 1 });
    res = createResponse();
    await controller.updateHelpRequest(req({ params: { id: '1' }, body: { status: 'resolved', response: 'Javob' } }), res);
    expect(service.updateHelpRequest).toHaveBeenLastCalledWith(1, 2, { status: 'resolved', response: 'Javob', handled_by_name: 'admin1' });
  });

  it.each([
    ['listLinks', repo, 'adminListLinks', {}],
    ['createLink', repo, 'adminCreateLink', { body: { title: 'T', url: 'https://x.uz' } }],
    ['updateLink', repo, 'adminUpdateLink', { params: { id: '1' } }],
    ['deleteLink', repo, 'adminDeleteLink', { params: { id: '1' } }],
    ['listAnnouncements', repo, 'adminListAnnouncements', {}],
    ['createAnnouncement', service, 'createAnnouncement', { body: { title: 'T', body: 'B' } }],
    ['deleteAnnouncement', repo, 'adminDeleteAnnouncement', { params: { id: '1' } }],
    ['listPolicies', repo, 'adminListPolicies', {}],
    ['createPolicy', repo, 'adminCreatePolicy', { body: { title: 'T', body: 'B' } }],
    ['publishPolicyVersion', repo, 'adminPublishPolicyVersion', { params: { id: '1' }, body: { body: 'B' } }],
    ['policyVersions', repo, 'adminPolicyVersions', { params: { id: '1' } }],
    ['listHelpRequests', repo, 'adminListHelpRequests', {}],
    ['updateHelpRequest', service, 'updateHelpRequest', { params: { id: '1' }, body: { status: 'resolved' } }],
  ])('%s answers 500 when loading fails', async (handler, target, method, extra) => {
    target[method].mockRejectedValue(new Error('db'));
    const res = createResponse();
    await controller[handler](req(extra), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
