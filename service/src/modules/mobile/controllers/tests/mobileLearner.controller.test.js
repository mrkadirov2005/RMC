jest.mock('../../services/mobileLearner.service', () => ({
  dashboard: jest.fn(),
  attendance: jest.fn(),
  schedule: jest.fn(),
  grades: jest.fn(),
  coins: jest.fn(),
  payments: jest.fn(),
  leaderboard: jest.fn(),
}));
jest.mock('../../services/mobileParent.service', () => ({ listChildren: jest.fn(), findChild: jest.fn() }));
jest.mock('../../repositories/mobileSession.repository', () => ({}));

const learner = require('../../services/mobileLearner.service');
const parentService = require('../../services/mobileParent.service');
const controller = require('../mobileLearner.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('mobile learner controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // @MOB-031
  it('a student request reads the signed-in student', async () => {
    learner.dashboard.mockResolvedValue({ ok: true });
    const res = createResponse();

    await controller.dashboard({ user: { id: 7, center_id: 2 }, query: {} }, res);

    expect(learner.dashboard).toHaveBeenCalledWith(7, 2);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  // @MOB-025
  it('a parent request reads the linked child, never the parent id', async () => {
    learner.attendance.mockResolvedValue({ items: [] });
    const res = createResponse();

    await controller.attendance({ user: { id: 11 }, child: { student_id: 7, center_id: 2 }, query: { page: '2', page_size: '5' } }, res);

    expect(learner.attendance).toHaveBeenCalledWith(7, 2, 2, 5);
  });

  it.each(['schedule', 'grades', 'coins', 'payments'])('%s passes the target through', async (handler) => {
    learner[handler].mockResolvedValue({ items: [] });
    const res = createResponse();
    await controller[handler]({ user: { id: 7, center_id: 2 }, query: {} }, res);
    expect(learner[handler].mock.calls[0].slice(0, 2)).toEqual([7, 2]);
    expect(res.json).toHaveBeenCalledWith({ items: [] });
  });

  it('leaderboard accepts only class or center', async () => {
    learner.leaderboard.mockResolvedValue({ items: [] });
    await controller.leaderboard({ user: { id: 7, center_id: 2 }, query: { scope: 'center' } }, createResponse());
    await controller.leaderboard({ user: { id: 7, center_id: 2 }, query: { scope: 'everyone' } }, createResponse());
    expect(learner.leaderboard.mock.calls.map((c) => c[2])).toEqual(['center', 'class']);
  });

  it('answers 404 when there is no data and 500 when loading fails', async () => {
    learner.dashboard.mockResolvedValueOnce(null);
    let res = createResponse();
    await controller.dashboard({ user: { id: 7 }, query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    learner.dashboard.mockRejectedValueOnce(new Error('db'));
    res = createResponse();
    await controller.dashboard({ user: { id: 7 }, query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  // @MOB-026
  it('listChildren hides the internal linked ids', async () => {
    parentService.listChildren.mockResolvedValue([{ student_id: 7, linked_ids: [7, 8] }]);
    const res = createResponse();
    await controller.listChildren({ user: { id: 11 } }, res);
    expect(res.json).toHaveBeenCalledWith({ items: [{ student_id: 7 }] });

    parentService.listChildren.mockRejectedValueOnce(new Error('db'));
    const failed = createResponse();
    await controller.listChildren({ user: { id: 11 } }, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
  });

  // @MOB-025 @MOB-013
  describe('requireLinkedChild', () => {
    it('rejects a bad id', async () => {
      const res = createResponse();
      await controller.requireLinkedChild({ user: { id: 11 }, params: { studentId: 'x' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects a student who is not linked to the parent', async () => {
      parentService.findChild.mockResolvedValue(null);
      const res = createResponse();
      const next = jest.fn();
      await controller.requireLinkedChild({ user: { id: 11 }, params: { studentId: '555' } }, res, next);
      expect(parentService.findChild).toHaveBeenCalledWith(11, 555);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'CHILD_NOT_LINKED' }));
      expect(next).not.toHaveBeenCalled();
    });

    it('sets req.child for a linked child', async () => {
      parentService.findChild.mockResolvedValue({ student_id: 7, center_id: 2 });
      const req = { user: { id: 11 }, params: { studentId: '8' } };
      const next = jest.fn();
      await controller.requireLinkedChild(req, createResponse(), next);
      expect(req.child).toEqual({ student_id: 7, center_id: 2 });
      expect(next).toHaveBeenCalled();
    });

    it('answers 500 when the check fails', async () => {
      parentService.findChild.mockRejectedValue(new Error('db'));
      const res = createResponse();
      await controller.requireLinkedChild({ user: { id: 11 }, params: { studentId: '8' } }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
