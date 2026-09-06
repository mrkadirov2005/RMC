// RMC-031/RMC-065: PassageDto is now applied via validateBody(PassageDto) on
// both the create (`POST /:testId/passages`) and update (`PUT /passages/:passageId`)
// routes in routes/testRoutes.ts, closing a gap where a malformed passage body
// (e.g. missing title/content) previously reached the controller/service
// unvalidated.
require('reflect-metadata');
const fs = require('fs');
const path = require('path');
const { validateBody } = require('../../middleware/validation');
const { PassageDto } = require('../tests.dto');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const runMiddleware = async (body) => {
  const req = { body };
  const res = createResponse();
  const next = jest.fn();
  await validateBody(PassageDto)(req, res, next);
  return { res, next };
};

describe('PassageDto validation (RMC-031)', () => {
  it('rejects a passage body missing both required fields', async () => {
    const { res, next } = await runMiddleware({});

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation failed' }));
  });

  it('rejects a passage body with an empty title', async () => {
    const { res, next } = await runMiddleware({ title: '', content: 'Once upon a time...' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a passage body with a non-string word_count', async () => {
    const { res, next } = await runMiddleware({ title: 'A Passage', content: 'Text here', word_count: 'not-a-number' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepts a well-formed passage body', async () => {
    const { res, next } = await runMiddleware({
      title: 'A Passage',
      content: 'Once upon a time, there was a passage.',
      word_count: 8,
      difficulty_level: 'medium',
      passage_order: 1,
    });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('is actually wired up on both the create and update passage routes', () => {
    const routesPath = path.join(__dirname, '..', '..', 'routes', 'testRoutes.ts');
    const source = fs.readFileSync(routesPath, 'utf8');
    expect(source).toMatch(/router_test\.post\('\/:testId\/passages'.*validateBody\(PassageDto\)/);
    expect(source).toMatch(/router_test\.put\('\/passages\/:passageId'.*validateBody\(PassageDto\)/);
  });
});
