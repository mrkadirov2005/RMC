const { z } = require('zod');
const { hashPassword } = require('../../../shared/password');
const teacherRepository = require('../repositories/teacher.repository');

const DEFAULT_TEACHER_PASSWORD = '012345678';

const createTeacherSchema = z.object({
  center_id: z.number(),
  employee_id: z.string().min(1, 'Employee ID is required'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  qualification: z.string().optional(),
  specialization: z.string().optional(),
  status: z.string().default('Active'),
  roles: z.array(z.string()).optional(),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const buildUsername = (name: string) => {
  const cleaned = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  if (!cleaned) return 'teacher';
  return cleaned.length >= 3 ? cleaned : cleaned.padEnd(3, '0');
};

const getAvailableUsername = async (base: string) => {
  let candidate = base;
  let suffix = 2;
  while ((await teacherRepository.countByUsername(candidate)) > 0) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
};

const listTeachers = (centerId?: number) => teacherRepository.findAll(centerId);

const getTeacher = (id: number, centerId?: number) => teacherRepository.findById(id, centerId);

const createTeacher = async (body: any) => {
  const defaultUsername = buildUsername(body?.first_name);
  const explicitUsername = String(body?.username || '').trim();
  const bodyWithDefaults = {
    ...body,
    username: explicitUsername || defaultUsername,
    password: body?.password || DEFAULT_TEACHER_PASSWORD,
  };
  const validationResult = createTeacherSchema.safeParse(bodyWithDefaults);
  if (!validationResult.success) {
    return {
      error: 'validation',
      details: validationResult.error.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
    };
  }
  const d = validationResult.data;
  const shouldAutoResolveUsername = !explicitUsername || explicitUsername === defaultUsername;
  const username = shouldAutoResolveUsername ? await getAvailableUsername(d.username) : d.username;
  const exists = await teacherRepository.countByUsername(username);
  if (!shouldAutoResolveUsername && exists > 0) return { error: 'username_taken' };
  const password_hash = hashPassword(d.password);
  const row = await teacherRepository.insert([
    d.center_id,
    d.employee_id,
    d.first_name,
    d.last_name,
    d.email,
    d.phone,
    d.date_of_birth,
    d.gender,
    d.qualification,
    d.specialization,
    d.status,
    JSON.stringify(d.roles || []),
    username,
    password_hash,
  ]);
  return { row };
};

const updateTeacher = (id: number, body: any, centerId?: number) => {
  const { first_name, last_name, username, email, phone, status, roles } = body;
  return teacherRepository.update(id, [first_name, last_name, username, email, phone, status, roles ? JSON.stringify(roles) : null], centerId);
};

const deleteTeacher = async (id: number, centerId?: number, options?: { force?: boolean }) => {
  const teacher = await teacherRepository.findById(id, centerId);
  if (!teacher) return { kind: 'not_found' as const };

  const dependencies = await teacherRepository.getDeleteDependencies(id, centerId);
  const hasHistory = dependencies.attendance_count > 0 || dependencies.grades_count > 0;
  if (hasHistory) {
    return { kind: 'blocked' as const, reason: 'history', dependencies };
  }

  if (teacherRepository.hasDeleteDependencies(dependencies)) {
    if (!options?.force) return { kind: 'has_dependencies' as const, dependencies };
    await teacherRepository.unassignDeleteDependencies(id, centerId);
  }

  const row = await teacherRepository.remove(id, centerId);
  return { kind: 'deleted' as const, row, dependencies };
};

const authenticate = async (username: string, password: string) => {
  const teacher = await teacherRepository.findByUsername(username);
  if (!teacher) return { kind: 'invalid' as const };
  if (teacher.status !== 'Active') return { kind: 'inactive' as const };
  if (hashPassword(password) !== teacher.password_hash) return { kind: 'invalid' as const };
  return { kind: 'ok' as const, teacher };
};

const setPasswordByAdmin = (id: number, username: string, password: string, centerId?: number) => {
  return teacherRepository.setCredentials(id, username, hashPassword(password), centerId);
};

const changePassword = async (id: number, old_password: string, new_password: string) => {
  const existing = await teacherRepository.findPasswordHash(id);
  if (existing === undefined) return { ok: false as const, reason: 'not_found' as const };
  if (hashPassword(old_password) !== existing) return { ok: false as const, reason: 'bad_old' as const };
  await teacherRepository.updatePasswordHash(id, hashPassword(new_password));
  return { ok: true as const };
};

module.exports = {
  listTeachers,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  authenticate,
  setPasswordByAdmin,
  changePassword,
};

export {};
