// RMC-044/RMC-079: the bulk-upsert size cap and per-field type checks live in the DTO
// layer (BulkUpsertTranslationsDto's @ArrayMaxSize(2000), TranslationItemDto's @IsString()),
// applied via validateBody in routes/translationRoutes.ts -- the controller/service just
// forward req.body through once validation has already run (translation.service.ts's own
// normalizeText would otherwise silently coerce a non-string to ''). So the most direct way
// to prove the fix is to exercise that same validation middleware + DTO pair exactly as the
// route wires them up, matching the pattern used for RMC-063's attendance DTO test.
require('reflect-metadata');
const { validateBody } = require('../../middleware/validation');
const { SaveTranslationDto, BulkUpsertTranslationsDto } = require('../../dtos/translations.dto');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const runMiddleware = async (dto, body) => {
  const req = { body };
  const res = createResponse();
  const next = jest.fn();
  await validateBody(dto)(req, res, next);
  return { req, res, next };
};

describe('translation routes DTO validation (RMC-044 / RMC-079)', () => {
  describe('bulk upsert (BulkUpsertTranslationsDto)', () => {
    it('rejects a translations array larger than the configured max size (2000) with 400', async () => {
      const translations = Array.from({ length: 2001 }, (_v, i) => ({ id: `t${i}`, english: 'E', uzbek: 'U' }));
      const { res, next } = await runMiddleware(BulkUpsertTranslationsDto, { translations });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('accepts a translations array at exactly the max size (2000)', async () => {
      const translations = Array.from({ length: 2000 }, (_v, i) => ({ id: `t${i}`, english: 'E', uzbek: 'U' }));
      const { res, next } = await runMiddleware(BulkUpsertTranslationsDto, { translations });

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects a non-string (array) value on a nested translation item field with 400', async () => {
      const { res, next } = await runMiddleware(BulkUpsertTranslationsDto, {
        translations: [{ id: 'greeting', english: ['not', 'a', 'string'], uzbek: 'Salom' }],
      });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    // Discrepancy from the RMC-044 ticket's assumption: validateBody's plainToInstance call uses
    // enableImplicitConversion: true, so class-transformer coerces a scalar (number/boolean/plain
    // object) to its String() representation *before* @IsString() runs, rather than @IsString()
    // rejecting it. Only non-coercible shapes (arrays, per the test above) are actually rejected.
    // This differs from the old normalizeText, which silently turned any non-string into '' instead
    // of a String()-coerced value -- but it is still not a clean 400 rejection for every non-string
    // input the way the ticket described. Documented here rather than "fixed" in production code.
    it('documents current behavior: a numeric translation value is coerced to its string form rather than rejected', async () => {
      const { req, res, next } = await runMiddleware(BulkUpsertTranslationsDto, {
        translations: [{ id: 'greeting', english: 12345, uzbek: 'Salom' }],
      });

      expect(res.status).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body.translations[0].english).toBe('12345');
    });

    it('rejects a non-array translations payload with 400', async () => {
      const { res, next } = await runMiddleware(BulkUpsertTranslationsDto, { translations: 'not-an-array' });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('single-item save (SaveTranslationDto)', () => {
    it('rejects a non-string english/uzbek field with 400', async () => {
      const { res, next } = await runMiddleware(SaveTranslationDto, { english: ['not', 'a', 'string'], uzbek: 'Salom' });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('accepts a well-formed payload and forwards it unchanged', async () => {
      const { req, res, next } = await runMiddleware(SaveTranslationDto, { english: 'Hello', uzbek: 'Salom' });

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body.english).toBe('Hello');
      expect(req.body.uzbek).toBe('Salom');
    });
  });
});
