import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const toValidationErrors = (errors: any[]): Array<{ field: string; message: string }> => {
  const out: Array<{ field: string; message: string }> = [];

  const walk = (items: any[], parentPath = '') => {
    for (const item of items) {
      const path = parentPath ? `${parentPath}.${item.property}` : item.property;
      if (item.constraints) {
        for (const message of Object.values(item.constraints)) {
          out.push({ field: path, message: String(message) });
        }
      }
      if (item.children?.length) {
        walk(item.children, path);
      }
    }
  };

  walk(errors);
  return out;
};

const validateInput =
  (DtoClass: any, source: 'body' | 'query' | 'params' = 'body') =>
  async (req: any, res: any, next: any) => {
    const instance = plainToInstance(DtoClass, req[source], {
      enableImplicitConversion: true,
    });

    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: false,
      skipMissingProperties: false,
      validationError: { target: false, value: false },
    });

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: toValidationErrors(errors),
      });
    }

    req[source] = instance;
    return next();
  };

const validateBody = (DtoClass: any) => validateInput(DtoClass, 'body');
const validateQuery = (DtoClass: any) => validateInput(DtoClass, 'query');
const validateParams = (DtoClass: any) => validateInput(DtoClass, 'params');

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
};

export {};
