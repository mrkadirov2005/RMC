const crypto = require('crypto');
const repo = require('../repositories/mobileAccount.repository');
const smsGateway = require('../../sms/services/smsGateway');
const studentRepository = require('../../students/repositories/student.repository');
const parentRepository = require('../../parents/repositories/parent.repository');
const { hashPassword } = require('../../../shared/password');

type Role = 'student' | 'parent';

const CODE_TTL_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;
const MAX_CODES_PER_HOUR = 3;
const ID_TOKEN_TTL_SECONDS = 60;
const MAX_OPEN_LINK_REQUESTS = 5;

const secret = () => {
  const configured = String(process.env.MOBILE_ID_SECRET || process.env.JWT_SECRET || '').trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') throw new Error('MOBILE_ID_SECRET or JWT_SECRET must be configured in production.');
  return 'crm_mobile_dev_secret';
};
const hmac = (value: string) => crypto.createHmac('sha256', secret()).update(value).digest('base64url');
const sameText = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** +998XXXXXXXXX, or null when the saved number cannot be an Uzbek one. */
const normalizePhone = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
};
// Only the last two digits are shown, so the reply does not reveal whose number it is.
const phoneHint = (phone: string) => `+998 ** *** ** ${phone.slice(-2)}`;

const codeHash = (role: Role, userId: number, code: string) => hmac(`reset:${role}:${userId}:${code}`);

const findForReset = async (username: string, role?: Role) => {
  const roles: Role[] = role ? [role] : ['student', 'parent'];
  const found = await Promise.all(roles.map((r) => (r === 'student' ? repo.findStudentForReset(username) : repo.findParentForReset(username))));
  const matches = roles.map((r, i) => ({ role: r, account: found[i] })).filter((m) => m.account && m.account.status === 'Active');
  if (matches.length > 1) return { kind: 'role_required' as const };
  if (matches.length === 0) return { kind: 'none' as const };
  return { kind: 'ok' as const, role: matches[0].role, userId: Number(matches[0].account.user_id), phone: normalizePhone(matches[0].account.phone) };
};

// @MOB-024 Sends a 6-digit code to the account's phone. An unknown username gets the same reply
// as a known one, so the screen cannot be used to discover accounts.
const requestPasswordReset = async (username: string, role?: Role, send = smsGateway.sendSms) => {
  const found = await findForReset(username, role);
  if (found.kind === 'role_required') return found;
  if (found.kind === 'none') return { kind: 'sent' as const, phone_hint: null };
  if (!found.phone) return { kind: 'no_phone' as const };
  if ((await repo.countRecentResets(found.role, found.userId, 60)) >= MAX_CODES_PER_HOUR) return { kind: 'too_many' as const };

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await repo.insertReset({ userType: found.role, userId: found.userId, phone: found.phone, codeHash: codeHash(found.role, found.userId, code), ttlMinutes: CODE_TTL_MINUTES });
  const text = `TEMURBEK SCHOOL: parolni tiklash kodi ${code}. Kod ${CODE_TTL_MINUTES} daqiqa amal qiladi. Kodni hech kimga bermang.`;
  if (smsGateway.isConfigured()) {
    await send(found.phone, text, CODE_TTL_MINUTES * 60);
  } else if (process.env.NODE_ENV === 'production') {
    return { kind: 'sms_unavailable' as const };
  } else {
    // Development without a gateway: the code goes to the server log.
    console.log(`[mobile] password reset code for ${found.role} ${found.userId}: ${code}`);
  }
  return { kind: 'sent' as const, phone_hint: phoneHint(found.phone) };
};

// @MOB-024 Checks the newest code and sets the new password; every device is signed out.
const confirmPasswordReset = async (username: string, code: string, newPassword: string, role?: Role) => {
  const found = await findForReset(username, role);
  if (found.kind === 'role_required') return found;
  if (found.kind === 'none') return { kind: 'invalid' as const };
  const reset = await repo.latestOpenReset(found.role, found.userId);
  if (!reset) return { kind: 'invalid' as const };
  if (reset.expired) return { kind: 'expired' as const };
  if (Number(reset.attempts) >= MAX_CODE_ATTEMPTS) return { kind: 'too_many_attempts' as const };
  if (!sameText(reset.code_hash, codeHash(found.role, found.userId, String(code).trim()))) {
    await repo.addAttempt(reset.reset_id);
    return Number(reset.attempts) + 1 >= MAX_CODE_ATTEMPTS ? { kind: 'too_many_attempts' as const } : { kind: 'invalid' as const };
  }
  if (!(await repo.useReset(reset.reset_id))) return { kind: 'invalid' as const };
  const passwordHash = hashPassword(newPassword);
  if (found.role === 'student') await studentRepository.updatePasswordHash(found.userId, passwordHash);
  else await parentRepository.updatePasswordHash(found.userId, passwordHash);
  await repo.revokeAllSessions(found.role, found.userId);
  return { kind: 'ok' as const };
};

// @MOB-125 A signed token for the student ID QR, good for 60 seconds: "v1.<student>.<expiry>.<signature>".
const issueIdToken = (studentId: number, now = Date.now()) => {
  const exp = Math.floor(now / 1000) + ID_TOKEN_TTL_SECONDS;
  return {
    token: `v1.${studentId}.${exp}.${hmac(`student-id:${studentId}:${exp}`)}`,
    expires_at: new Date(exp * 1000).toISOString(),
    ttl_seconds: ID_TOKEN_TTL_SECONDS,
  };
};

const readIdToken = (token: string, now = Date.now()) => {
  const parts = String(token || '').trim().split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || !/^\d+$/.test(parts[1]) || !/^\d+$/.test(parts[2])) return { kind: 'malformed' as const };
  const [, studentId, exp, signature] = parts;
  if (!sameText(signature, hmac(`student-id:${studentId}:${exp}`))) return { kind: 'bad_signature' as const };
  if (Number(exp) * 1000 < now) return { kind: 'expired' as const };
  return { kind: 'ok' as const, studentId: Number(studentId) };
};

// @MOB-125 Staff scan the QR. A screenshot of an old code is expired; staff of another center
// cannot read a student's details.
const verifyIdToken = async (token: string, staff: any, now = Date.now()) => {
  const read = readIdToken(token, now);
  if (read.kind !== 'ok') return { valid: false, reason: read.kind };
  const card = await repo.studentCard(read.studentId);
  if (!card) return { valid: false, reason: 'not_found' };
  if (staff?.center_id && card.center_id && Number(staff.center_id) !== Number(card.center_id)) return { valid: false, reason: 'other_center' };
  return {
    valid: card.status === 'Active',
    reason: card.status === 'Active' ? null : 'inactive',
    student: {
      student_id: card.student_id,
      first_name: card.first_name,
      last_name: card.last_name,
      status: card.status,
      is_frozen: Boolean(card.is_frozen),
      groups: card.groups || [],
    },
  };
};

// @MOB-032 A parent asks to follow a child by the child's phone or login. An admin approves it in
// RMC; nothing about the child is shown before that.
const requestLink = async (parentId: number, childQuery: string) => {
  const value = String(childQuery || '').trim().slice(0, 100);
  if (!value) return { kind: 'invalid' as const };
  const digits = value.replace(/\D/g, '').slice(-9);
  const byPhone = digits.length === 9 && /^[+\d\s()-]+$/.test(value);
  const children = await repo.findChildrenByQuery(byPhone, byPhone ? digits : value);
  if (children.length === 0) return { kind: 'not_found' as const };
  if ((await repo.countOpenRequests(parentId)) >= MAX_OPEN_LINK_REQUESTS) return { kind: 'too_many' as const };

  const parent = await repo.parentById(parentId);
  const parentName = parent ? [parent.first_name, parent.last_name].filter(Boolean).join(' ') || null : null;
  let created = 0;
  let linked = 0;
  for (const child of children) {
    if (await repo.isLinked(parentId, Number(child.student_id))) {
      linked += 1;
      continue;
    }
    const row = await repo.insertLinkRequest({
      centerId: child.center_id ?? null,
      studentId: Number(child.student_id),
      parentId,
      parentName,
      parentPhone: parent?.phone ?? null,
      childQuery: value,
    });
    if (row) created += 1;
  }
  if (created > 0) return { kind: 'created' as const };
  return linked > 0 ? { kind: 'already_linked' as const } : { kind: 'duplicate' as const };
};

const listLinkRequests = (parentId: number) => repo.listLinkRequests(parentId);

// @MOB-166
const adoption = () => repo.adoption();

module.exports = {
  requestPasswordReset,
  confirmPasswordReset,
  issueIdToken,
  readIdToken,
  verifyIdToken,
  requestLink,
  listLinkRequests,
  adoption,
  normalizePhone,
  ID_TOKEN_TTL_SECONDS,
};

export {};
