jest.mock('../../services/mobileContent.service', () => ({
  HELP_KINDS: ['help', 'complaint', 'thanks', 'suggestion'],
  links: jest.fn(),
  announcements: jest.fn(),
  policies: jest.fn(),
  acceptPolicy: jest.fn(),
  helpRequests: jest.fn(),
  createHelpRequest: jest.fn(),
}));
jest.mock('../../services/mobileParent.service', () => ({ findChild: jest.fn() }));
jest.mock('../../repositories/mobileSession.repository', () => ({}));

const service = require('../../services/mobileContent.service');
const parentService = require('../../services/mobileParent.service');
const controller = require('../mobileContent.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const parent = { id: 11, userType: 'parent' };
const student = { id: 7, userType: 'student' };

describe('mobile content controller', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

  // @MOB-060 @MOB-061 @MOB-062
  it('passes reads through with paging', async () => {
    service.links.mockResolvedValue({ items: [] });
    service.announcements.mockResolvedValue({ items: [] });
    service.policies.mockResolvedValue({ items: [] });
    service.helpRequests.mockResolvedValue({ items: [] });
    await controller.links({ user: parent }, createResponse());
    await controller.announcements({ user: parent, query: { page: '3' } }, createResponse());
    await controller.policies({ user: parent }, createResponse());
    await controller.listHelpRequests({ user: parent }, createResponse());
    expect(service.announcements).toHaveBeenCalledWith(parent, 3, 20);
  });

  it('accepts a rule, validating the id', async () => {
    let res = createResponse();
    await controller.acceptPolicy({ user: parent, params: { policyId: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    service.acceptPolicy.mockResolvedValueOnce(null);
    res = createResponse();
    await controller.acceptPolicy({ user: parent, params: { policyId: '4' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    service.acceptPolicy.mockResolvedValueOnce({ accepted: true });
    res = createResponse();
    await controller.acceptPolicy({ user: parent, params: { policyId: '4' } }, res);
    expect(res.json).toHaveBeenCalledWith({ accepted: true });
  });

  // @MOB-063
  describe('createHelpRequest', () => {
    it.each([
      [{ kind: 'spam', message: 'hello' }, 'INVALID_KIND'],
      [{ kind: 'help', message: ' x ' }, 'INVALID_MESSAGE'],
      [{ kind: 'help', message: 'y'.repeat(4001) }, 'INVALID_MESSAGE'],
    ])('rejects %o', async (body, code) => {
      const res = createResponse();
      await controller.createHelpRequest({ user: parent, body }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code }));
    });

    it('ties a student request to the student and a parent request to a linked child only', async () => {
      service.createHelpRequest.mockResolvedValue({ request_id: 1 });
      let res = createResponse();
      await controller.createHelpRequest({ user: student, body: { kind: 'help', message: ' Savol bor ' } }, res);
      expect(service.createHelpRequest).toHaveBeenLastCalledWith(student, { kind: 'help', message: 'Savol bor' }, 7);
      expect(res.status).toHaveBeenCalledWith(201);

      parentService.findChild.mockResolvedValueOnce(null);
      res = createResponse();
      await controller.createHelpRequest({ user: parent, body: { kind: 'help', message: 'Savol', student_id: 99 } }, res);
      expect(res.status).toHaveBeenCalledWith(403);

      parentService.findChild.mockResolvedValueOnce({ student_id: 7 });
      await controller.createHelpRequest({ user: parent, body: { kind: 'thanks', message: 'Rahmat', student_id: 8 } }, createResponse());
      expect(service.createHelpRequest).toHaveBeenLastCalledWith(parent, { kind: 'thanks', message: 'Rahmat' }, 7);

      await controller.createHelpRequest({ user: parent, body: { kind: 'suggestion', message: 'Taklif' } }, createResponse());
      expect(service.createHelpRequest).toHaveBeenLastCalledWith(parent, { kind: 'suggestion', message: 'Taklif' }, null);
    });
  });

  it.each([
    ['links', 'links'],
    ['announcements', 'announcements'],
    ['policies', 'policies'],
    ['acceptPolicy', 'acceptPolicy'],
    ['listHelpRequests', 'helpRequests'],
    ['createHelpRequest', 'createHelpRequest'],
  ])('%s answers 500 when the service throws', async (handler, method) => {
    service[method].mockRejectedValue(new Error('db'));
    const res = createResponse();
    await controller[handler]({ user: student, query: {}, params: { policyId: '1' }, body: { kind: 'help', message: 'Savol' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
