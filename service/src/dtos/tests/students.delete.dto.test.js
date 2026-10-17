// Archiving a student with a reason that needs a note ("finished successfully", "went to another
// center") always failed: the request schema had no reason_note, so validation dropped the note
// and the server answered that the note was missing.
require('reflect-metadata');
const { validateBody } = require('../../middleware/validation');
const { DeleteStudentDto } = require('../students.dto');

const run = async (body) => {
  const req = { body };
  const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
  const next = jest.fn();
  await validateBody(DeleteStudentDto)(req, res, next);
  return { req, res, next };
};

describe('archive student request', () => {
  it('keeps the note for the reason', async () => {
    const { req, next } = await run({ reason_id: '33', reason_note: 'IELTS 7.0' });
    expect(next).toHaveBeenCalled();
    expect(req.body).toMatchObject({ reason_id: 33, reason_note: 'IELTS 7.0' });
  });

  it('still works without a note', async () => {
    const { req, next } = await run({ reason_id: 31 });
    expect(next).toHaveBeenCalled();
    expect(req.body.reason_note).toBeUndefined();
  });

  it('rejects a note longer than 500 characters', async () => {
    const { res, next } = await run({ reason_id: 33, reason_note: 'x'.repeat(501) });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
