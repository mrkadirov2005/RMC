const { hashPassword } = require('../../../shared/password');
const teacherRepository = require('../repositories/teacher.repository');

const DEFAULT_TEACHER_PASSWORD = '012345678';
const PLATFORM_EMAIL_DOMAIN = 'teachers.platform.local';

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

const getAvailableEmployeeId = async (centerId: number | string | undefined) => {
  const centerPart = Number(centerId || 0) > 0 ? String(centerId).padStart(3, '0') : '000';
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    const candidate = `TCH-${centerPart}-${randomPart}`;
    if ((await teacherRepository.countByEmployeeId(candidate)) === 0) return candidate;
  }
  return `TCH-${centerPart}-${Date.now()}`;
};

const getAvailableEmail = async (username: string) => {
  const base = username || 'teacher';
  let candidate = `${base}@${PLATFORM_EMAIL_DOMAIN}`;
  let suffix = 2;
  while ((await teacherRepository.countByEmail(candidate)) > 0) {
    candidate = `${base}${suffix}@${PLATFORM_EMAIL_DOMAIN}`;
    suffix += 1;
  }
  return candidate;
};

const normalizeSalaryPercentage = (value: any) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.min(Math.max(number, 0), 100);
};

const listTeachers = (centerId?: number) => teacherRepository.findAll(centerId);

const listTeachersPaginated = (filters: Record<string, unknown>, centerId?: number) =>
  teacherRepository.findPaginated(filters, centerId);

const getTeacher = (id: number, centerId?: number) => teacherRepository.findById(id, centerId);

const createTeacher = async (body: any) => {
  const defaultUsername = buildUsername(body?.first_name);
  const explicitUsername = String(body?.username || '').trim();
  const d = {
    ...body,
    status: 'Active',
    roles: body?.roles || [],
    username: explicitUsername || defaultUsername,
    password: body?.password || DEFAULT_TEACHER_PASSWORD,
    salary_percentage: normalizeSalaryPercentage(body?.salary_percentage),
  };
  const shouldAutoResolveUsername = !explicitUsername || explicitUsername === defaultUsername;
  const username = shouldAutoResolveUsername ? await getAvailableUsername(d.username) : d.username;
  const exists = await teacherRepository.countByUsername(username);
  if (!shouldAutoResolveUsername && exists > 0) return { error: 'username_taken' };
  const employeeId = await getAvailableEmployeeId(d.center_id);
  const email = await getAvailableEmail(username);
  const password_hash = hashPassword(d.password);
  const row = await teacherRepository.insert([
    d.center_id,
    employeeId,
    d.first_name,
    d.last_name,
    email,
    d.phone,
    d.date_of_birth,
    d.gender,
    d.qualification,
    d.specialization,
    d.salary_percentage,
    d.status,
    JSON.stringify(d.roles || []),
    username,
    password_hash,
  ]);
  return { row };
};

const updateTeacher = (id: number, body: any, centerId?: number) => {
  const { first_name, last_name, username, email, phone, date_of_birth, gender, qualification, specialization, status, roles } = body;
  const salaryPercentage = body.salary_percentage == null ? null : normalizeSalaryPercentage(body.salary_percentage);
  return teacherRepository.update(
    id,
    [first_name, last_name, username, email, phone, salaryPercentage, status, roles ? JSON.stringify(roles) : null, date_of_birth, gender, qualification, specialization],
    centerId
  );
};

const deleteTeacher = async (id: number, centerId?: number, options?: { force?: boolean }) => {
  const teacher = await teacherRepository.findById(id, centerId);
  if (!teacher) return { kind: 'not_found' as const };

  const dependencies = await teacherRepository.getDeleteDependencies(id, centerId);
  if (teacherRepository.hasDeleteDependencies(dependencies)) {
    await teacherRepository.unassignDeleteDependencies(id, centerId);
  }

  const row = await teacherRepository.remove(id, centerId);
  return { kind: 'deleted' as const, row, dependencies };
};

const purgeTeacher = async (id: number, centerId?: number) => {
  const row = await teacherRepository.purge(id, centerId);
  if (!row) return { kind: 'not_found' as const };
  return { kind: 'purged' as const, row };
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
  listTeachersPaginated,
  getTeacher,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  purgeTeacher,
  authenticate,
  setPasswordByAdmin,
  changePassword,
};

export {};
