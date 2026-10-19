require('reflect-metadata');
const { validateBody } = require('../../middleware/validation');
const { UpdateTeacherPreferencesDto } = require('../teachers.dto');

const run = async (body) => {
  const req = { body };
  const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
  const next = jest.fn();
  await validateBody(UpdateTeacherPreferencesDto)(req, res, next);
  return { req, res, next };
};

describe('teacher preferences request', () => {
  it('keeps a #RRGGBB colour', async () => {
    const { req, next } = await run({ top_students_color: '#facc15' });
    expect(next).toHaveBeenCalled();
    expect(req.body.top_students_color).toBe('#facc15');
  });

  it('accepts null or empty to go back to the default', async () => {
    expect((await run({ top_students_color: null })).next).toHaveBeenCalled();
    expect((await run({ top_students_color: '' })).next).toHaveBeenCalled();
  });

  it('refuses anything that is not a colour', async () => {
    for (const value of ['yellow', '#fff', 'red; background:url(x)', '#GGGGGG']) {
      const { res, next } = await run({ top_students_color: value });
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });
});
