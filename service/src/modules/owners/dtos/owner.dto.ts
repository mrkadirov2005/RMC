const { z } = require('zod');

const ownerStatuses = ['Active', 'Inactive', 'Suspended'] as const;

const normalizeOptionalString = (schema: any) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, schema.optional());

const normalizeStatus = (value: string) => {
  const normalized = value.trim().charAt(0).toUpperCase() + value.trim().slice(1).toLowerCase();
  return ownerStatuses.includes(normalized as any) ? normalized : null;
};

const statusSchema = z
  .string()
  .trim()
  .min(1, 'Status is required')
  .transform((value) => normalizeStatus(value))
  .refine((value) => value !== null, { message: 'Invalid status' });

const optionalStatusSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value) => normalizeStatus(value))
  .refine((value) => value === null || ownerStatuses.includes(value as any), { message: 'Invalid status' })
  .optional();

const createOwnerDtoSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  status: statusSchema.default('Active'),
});

const registerOwnerDtoSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  invite_key: z.string().trim().min(1, 'Keyword is required'),
});

const updateOwnerDtoSchema = z.object({
  email: normalizeOptionalString(z.string().trim().email('Invalid email format')),
  first_name: normalizeOptionalString(z.string().trim().min(1, 'First name is required')),
  last_name: normalizeOptionalString(z.string().trim().min(1, 'Last name is required')),
  status: optionalStatusSchema,
  password: normalizeOptionalString(z.string().min(6, 'Password must be at least 6 characters')),
});

const loginOwnerDtoSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const changeOwnerPasswordDtoSchema = z.object({
  old_password: z.string().min(1, 'Old password is required'),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
});

type CreateOwnerDto = import('zod').infer<typeof createOwnerDtoSchema>;
type RegisterOwnerDto = import('zod').infer<typeof registerOwnerDtoSchema>;
type UpdateOwnerDto = import('zod').infer<typeof updateOwnerDtoSchema>;
type LoginOwnerDto = import('zod').infer<typeof loginOwnerDtoSchema>;
type ChangeOwnerPasswordDto = import('zod').infer<typeof changeOwnerPasswordDtoSchema>;
type OwnerValidationIssue = { field: string; message: string };

const parseValidationError = (error: any) =>
  error.issues.map((issue: any) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

module.exports = {
  createOwnerDtoSchema,
  registerOwnerDtoSchema,
  updateOwnerDtoSchema,
  loginOwnerDtoSchema,
  changeOwnerPasswordDtoSchema,
  parseValidationError,
};

export type {
  CreateOwnerDto,
  RegisterOwnerDto,
  UpdateOwnerDto,
  LoginOwnerDto,
  ChangeOwnerPasswordDto,
  OwnerValidationIssue,
};
export {};
