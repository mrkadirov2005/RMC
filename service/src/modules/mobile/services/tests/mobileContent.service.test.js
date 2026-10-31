jest.mock('../../repositories/mobileContent.repository', () => ({
  audienceOf: jest.fn(),
  linksFor: jest.fn(),
  announcementsFor: jest.fn(),
  policiesFor: jest.fn(),
  acceptPolicy: jest.fn(),
  createHelpRequest: jest.fn(),
  helpRequestsOf: jest.fn(),
  adminCreateAnnouncement: jest.fn(),
  enqueueAnnouncement: jest.fn(),
  adminUpdateHelpRequest: jest.fn(),
}));
jest.mock('../../repositories/mobileNotification.repository', () => ({ enqueue: jest.fn() }));

const repo = require('../../repositories/mobileContent.repository');
const notificationRepo = require('../../repositories/mobileNotification.repository');
const service = require('../mobileContent.service');

const parent = { userType: 'parent', id: 11 };

describe('mobile content service', () => {
  beforeEach(() => {
    repo.audienceOf.mockResolvedValue({ centerIds: [2], classIds: [3, 4] });
  });

  // @MOB-060 @MOB-061
  it('scopes links and announcements to the user centers and groups', async () => {
    repo.linksFor.mockResolvedValue([{ link_id: 1 }]);
    await expect(service.links(parent)).resolves.toEqual({ items: [{ link_id: 1 }] });
    expect(repo.linksFor).toHaveBeenCalledWith([2]);

    repo.announcementsFor.mockResolvedValue({ items: [], total: 0 });
    await expect(service.announcements(parent, 2, 10)).resolves.toEqual({ items: [], page: 2, page_size: 10, total: 0 });
    expect(repo.announcementsFor).toHaveBeenCalledWith('parent', [2], [3, 4], 10, 10);
  });

  // @MOB-062
  it('counts rules waiting for acceptance and accepts only the current version', async () => {
    repo.policiesFor.mockResolvedValue([
      { policy_id: 1, version: 3, requires_acceptance: true, accepted: false },
      { policy_id: 2, version: 1, requires_acceptance: false, accepted: false },
    ]);
    await expect(service.policies(parent)).resolves.toMatchObject({ pending: 1 });
    await expect(service.acceptPolicy(parent, 1)).resolves.toEqual({ policy_id: 1, version: 3, accepted: true });
    expect(repo.acceptPolicy).toHaveBeenCalledWith(1, 3, 'parent', 11);
    await expect(service.acceptPolicy(parent, 99)).resolves.toBeNull();
  });

  // @MOB-063
  it('files a request under the user first center', async () => {
    repo.createHelpRequest.mockResolvedValue({ request_id: 5 });
    await service.createHelpRequest(parent, { kind: 'help', message: 'Savol' }, 7);
    expect(repo.createHelpRequest).toHaveBeenCalledWith({ centerId: 2, userType: 'parent', userId: 11, studentId: 7, kind: 'help', message: 'Savol' });

    repo.audienceOf.mockResolvedValueOnce({ centerIds: [], classIds: [] });
    await service.createHelpRequest(parent, { kind: 'help', message: 'Savol' }, null);
    expect(repo.createHelpRequest).toHaveBeenLastCalledWith(expect.objectContaining({ centerId: null }));

    repo.helpRequestsOf.mockResolvedValue([{ request_id: 5 }]);
    await expect(service.helpRequests(parent)).resolves.toEqual({ items: [{ request_id: 5 }] });
  });

  // @MOB-161
  it('queues pushes only for announcements that ask for them', async () => {
    repo.adminCreateAnnouncement.mockResolvedValueOnce({ announcement_id: 1, send_push: false });
    await expect(service.createAnnouncement({})).resolves.toMatchObject({ queued: 0 });
    expect(repo.enqueueAnnouncement).not.toHaveBeenCalled();

    repo.adminCreateAnnouncement.mockResolvedValueOnce({ announcement_id: 2, send_push: true });
    repo.enqueueAnnouncement.mockResolvedValue(14);
    await expect(service.createAnnouncement({})).resolves.toMatchObject({ queued: 14 });
  });

  // @MOB-164
  it('tells the sender when a request is answered or its status changes', async () => {
    repo.adminUpdateHelpRequest.mockResolvedValueOnce(null);
    await expect(service.updateHelpRequest(1, 2, { status: 'resolved' })).resolves.toBeNull();
    expect(notificationRepo.enqueue).not.toHaveBeenCalled();

    const row = { request_id: 1, user_type: 'parent', user_id: 11, status: 'in_review', updated_at: '2026-10-31T10:00:00Z' };
    repo.adminUpdateHelpRequest.mockResolvedValue(row);
    await service.updateHelpRequest(1, 2, { status: 'in_review' });
    expect(notificationRepo.enqueue).toHaveBeenLastCalledWith(expect.objectContaining({ userType: 'parent', userId: 11, category: 'help', body: "Murojaatingiz ko'rib chiqilmoqda." }));

    await service.updateHelpRequest(1, 2, { response: 'Javob' });
    expect(notificationRepo.enqueue).toHaveBeenLastCalledWith(expect.objectContaining({ body: 'Javob' }));

    notificationRepo.enqueue.mockClear();
    await service.updateHelpRequest(1, 2, { handled_by_name: 'x' });
    expect(notificationRepo.enqueue).not.toHaveBeenCalled();
  });
});
