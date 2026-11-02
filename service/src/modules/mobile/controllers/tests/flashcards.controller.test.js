jest.mock('../../services/flashcards.service', () => ({ session: jest.fn(), review: jest.fn() }));

const service = require('../../services/flashcards.service');
const controller = require('../flashcards.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('flashcards controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // @MOB-145
  it('returns the session of the signed-in student', async () => {
    service.session.mockResolvedValue({ cards: [] });
    const res = createResponse();
    await controller.session({ user: { id: '7' } }, res);
    expect(service.session).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ cards: [] });
    service.session.mockRejectedValue(new Error('db'));
    const failed = createResponse();
    await controller.session({ user: { id: '7' } }, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
  });

  it('validates and records reviews', async () => {
    const bad = createResponse();
    await controller.review({ user: { id: 7 }, params: { wordId: 'x' }, body: {} }, bad);
    expect(bad.status).toHaveBeenCalledWith(400);

    for (const [kind, status] of [['invalid', 400], ['not_found', 404]]) {
      service.review.mockResolvedValue({ kind });
      const res = createResponse();
      await controller.review({ user: { id: 7 }, params: { wordId: '3' }, body: { grade: 'good' } }, res);
      expect(res.status).toHaveBeenCalledWith(status);
    }
    service.review.mockResolvedValue({ kind: 'ok', review: { word_id: 3 } });
    const ok = createResponse();
    await controller.review({ user: { id: 7 }, params: { wordId: '3' }, body: { grade: 'easy' } }, ok);
    expect(service.review).toHaveBeenLastCalledWith(7, 3, 'easy');
    expect(ok.json).toHaveBeenCalledWith({ word_id: 3 });
  });
});
