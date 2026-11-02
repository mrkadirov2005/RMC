jest.mock('../../repositories/mobileAccount.repository', () => ({
  findStudentForReset: jest.fn(),
  findParentForReset: jest.fn(),
  countRecentResets: jest.fn(),
  insertReset: jest.fn(),
  latestOpenReset: jest.fn(),
  addAttempt: jest.fn(),
  useReset: jest.fn(),
  revokeAllSessions: jest.fn(),
  findChildrenByQuery: jest.fn(),
  parentById: jest.fn(),
  isLinked: jest.fn(),
  countOpenRequests: jest.fn(),
  insertLinkRequest: jest.fn(),
  listLinkRequests: jest.fn(),
  studentCard: jest.fn(),
  adoption: jest.fn(),
}));
jest.mock('../../../sms/services/smsGateway', () => ({ isConfigured: jest.fn(), sendSms: jest.fn() }));
jest.mock('../../../students/repositories/student.repository', () => ({ updatePasswordHash: jest.fn() }));
jest.mock('../../../parents/repositories/parent.repository', () => ({ updatePasswordHash: jest.fn() }));

const repo = require('../../repositories/mobileAccount.repository');
const smsGateway = require('../../../sms/services/smsGateway');
const studentRepository = require('../../../students/repositories/student.repository');
const parentRepository = require('../../../parents/repositories/parent.repository');
const { verifyPassword } = require('../../../../shared/password');
const service = require('../mobileAccount.service');

const student = { user_id: 7, status: 'Active', phone: '90 123 45 67' };

describe('mobile account service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repo.findStudentForReset.mockResolvedValue(null);
    repo.findParentForReset.mockResolvedValue(null);
    repo.countRecentResets.mockResolvedValue(0);
    smsGateway.isConfigured.mockReturnValue(true);
  });

  // @MOB-024
  describe('password reset', () => {
    it('sends a 6-digit code by SMS and stores only its hash', async () => {
      repo.findStudentForReset.mockResolvedValue(student);
      const send = jest.fn();
      const result = await service.requestPasswordReset('ali', undefined, send);
      expect(result).toEqual({ kind: 'sent', phone_hint: '+998 ** *** ** 67' });
      const [phone, text, ttl] = send.mock.calls[0];
      expect(phone).toBe('+998901234567');
      expect(ttl).toBe(600);
      const code = text.match(/\d{6}/)[0];
      const saved = repo.insertReset.mock.calls[0][0];
      expect(saved).toMatchObject({ userType: 'student', userId: 7, phone: '+998901234567', ttlMinutes: 10 });
      expect(saved.codeHash).not.toContain(code);
    });

    it('answers an unknown username the same way, without sending anything', async () => {
      const send = jest.fn();
      await expect(service.requestPasswordReset('nobody', undefined, send)).resolves.toEqual({ kind: 'sent', phone_hint: null });
      expect(send).not.toHaveBeenCalled();
      expect(repo.insertReset).not.toHaveBeenCalled();
    });

    it('asks for the role when the username is both a student and a parent', async () => {
      repo.findStudentForReset.mockResolvedValue(student);
      repo.findParentForReset.mockResolvedValue({ user_id: 3, status: 'Active', phone: '901112233' });
      await expect(service.requestPasswordReset('ali')).resolves.toEqual({ kind: 'role_required' });
      await expect(service.requestPasswordReset('ali', 'parent', jest.fn())).resolves.toMatchObject({ kind: 'sent' });
    });

    it('limits codes per hour and needs a saved phone', async () => {
      repo.findStudentForReset.mockResolvedValue({ ...student, phone: null });
      await expect(service.requestPasswordReset('ali')).resolves.toEqual({ kind: 'no_phone' });
      repo.findStudentForReset.mockResolvedValue(student);
      repo.countRecentResets.mockResolvedValue(3);
      await expect(service.requestPasswordReset('ali')).resolves.toEqual({ kind: 'too_many' });
    });

    it('accepts the right code once, sets the password and signs every device out', async () => {
      repo.findStudentForReset.mockResolvedValue(student);
      const send = jest.fn();
      await service.requestPasswordReset('ali', undefined, send);
      const code = send.mock.calls[0][1].match(/\d{6}/)[0];
      const { codeHash } = repo.insertReset.mock.calls[0][0];
      repo.latestOpenReset.mockResolvedValue({ reset_id: 5, code_hash: codeHash, attempts: 0, expired: false });
      repo.useReset.mockResolvedValue(true);

      await expect(service.confirmPasswordReset('ali', code, 'new-secret')).resolves.toEqual({ kind: 'ok' });
      expect(repo.useReset).toHaveBeenCalledWith(5);
      const [id, hash] = studentRepository.updatePasswordHash.mock.calls[0];
      expect(id).toBe(7);
      expect(verifyPassword('new-secret', hash).valid).toBe(true);
      expect(repo.revokeAllSessions).toHaveBeenCalledWith('student', 7);

      // Used once: a second try finds the code already taken.
      repo.useReset.mockResolvedValue(false);
      await expect(service.confirmPasswordReset('ali', code, 'other')).resolves.toEqual({ kind: 'invalid' });
    });

    it('counts wrong codes and stops after five; expired codes fail', async () => {
      repo.findParentForReset.mockResolvedValue({ user_id: 3, status: 'Active', phone: '901112233' });
      repo.latestOpenReset.mockResolvedValue({ reset_id: 9, code_hash: 'x'.repeat(43), attempts: 3, expired: false });
      await expect(service.confirmPasswordReset('dad', '000000', 'new-secret')).resolves.toEqual({ kind: 'invalid' });
      expect(repo.addAttempt).toHaveBeenCalledWith(9);
      repo.latestOpenReset.mockResolvedValue({ reset_id: 9, code_hash: 'x'.repeat(43), attempts: 4, expired: false });
      await expect(service.confirmPasswordReset('dad', '000000', 'new-secret')).resolves.toEqual({ kind: 'too_many_attempts' });
      repo.latestOpenReset.mockResolvedValue({ reset_id: 9, code_hash: 'x', attempts: 5, expired: false });
      await expect(service.confirmPasswordReset('dad', '000000', 'new-secret')).resolves.toEqual({ kind: 'too_many_attempts' });
      repo.latestOpenReset.mockResolvedValue({ reset_id: 9, code_hash: 'x', attempts: 0, expired: true });
      await expect(service.confirmPasswordReset('dad', '000000', 'new-secret')).resolves.toEqual({ kind: 'expired' });
      expect(parentRepository.updatePasswordHash).not.toHaveBeenCalled();
    });

    it('logs the code in development when no SMS gateway is set, and refuses in production', async () => {
      repo.findStudentForReset.mockResolvedValue(student);
      smsGateway.isConfigured.mockReturnValue(false);
      const log = jest.spyOn(console, 'log').mockImplementation(() => {});
      await expect(service.requestPasswordReset('ali')).resolves.toMatchObject({ kind: 'sent' });
      expect(log).toHaveBeenCalled();
      const env = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
      try {
        await expect(service.requestPasswordReset('ali')).resolves.toEqual({ kind: 'sms_unavailable' });
      } finally {
        process.env.NODE_ENV = env;
        log.mockRestore();
      }
    });
  });

  // @MOB-125
  describe('student ID token', () => {
    const now = Date.UTC(2026, 9, 31, 10, 0, 0);

    it('is valid for 60 seconds and fails after that', () => {
      const { token, ttl_seconds } = service.issueIdToken(7, now);
      expect(ttl_seconds).toBe(60);
      expect(service.readIdToken(token, now + 59_000)).toEqual({ kind: 'ok', studentId: 7 });
      expect(service.readIdToken(token, now + 61_000)).toEqual({ kind: 'expired' });
    });

    it('rejects edited and malformed tokens', () => {
      const { token } = service.issueIdToken(7, now);
      const forged = token.replace('v1.7.', 'v1.8.');
      expect(service.readIdToken(forged, now)).toEqual({ kind: 'bad_signature' });
      expect(service.readIdToken('hello', now)).toEqual({ kind: 'malformed' });
    });

    it('shows the student to staff of the same center only', async () => {
      const { token } = service.issueIdToken(7);
      repo.studentCard.mockResolvedValue({ student_id: 7, first_name: 'Ali', last_name: 'V', status: 'Active', center_id: 2, groups: ['IELTS'] });
      await expect(service.verifyIdToken(token, { center_id: 2 })).resolves.toMatchObject({ valid: true, student: { first_name: 'Ali', groups: ['IELTS'] } });
      await expect(service.verifyIdToken(token, { center_id: 3 })).resolves.toEqual({ valid: false, reason: 'other_center' });
      repo.studentCard.mockResolvedValue({ student_id: 7, status: 'Inactive', center_id: 2 });
      await expect(service.verifyIdToken(token, {})).resolves.toMatchObject({ valid: false, reason: 'inactive' });
    });
  });

  // @MOB-032
  describe('link requests', () => {
    beforeEach(() => {
      repo.parentById.mockResolvedValue({ parent_id: 3, first_name: 'Karim', last_name: 'Karimov', phone: '+998901112233' });
      repo.countOpenRequests.mockResolvedValue(0);
      repo.isLinked.mockResolvedValue(false);
    });

    it('finds the child by phone or by login and files a request', async () => {
      repo.findChildrenByQuery.mockResolvedValue([{ student_id: 7, center_id: 2 }]);
      repo.insertLinkRequest.mockResolvedValue({ request_id: 1 });
      await expect(service.requestLink(3, '+998 90 123-45-67')).resolves.toEqual({ kind: 'created' });
      expect(repo.findChildrenByQuery).toHaveBeenLastCalledWith(true, '901234567');
      expect(repo.insertLinkRequest).toHaveBeenCalledWith({
        centerId: 2, studentId: 7, parentId: 3, parentName: 'Karim Karimov', parentPhone: '+998901112233', childQuery: '+998 90 123-45-67',
      });
      await service.requestLink(3, 'ali_v');
      expect(repo.findChildrenByQuery).toHaveBeenLastCalledWith(false, 'ali_v');
    });

    it('rejects duplicates, unknown children, too many open requests and already linked children', async () => {
      await expect(service.requestLink(3, '  ')).resolves.toEqual({ kind: 'invalid' });
      repo.findChildrenByQuery.mockResolvedValue([]);
      await expect(service.requestLink(3, 'x')).resolves.toEqual({ kind: 'not_found' });
      repo.findChildrenByQuery.mockResolvedValue([{ student_id: 7, center_id: 2 }]);
      repo.insertLinkRequest.mockResolvedValue(null);
      await expect(service.requestLink(3, 'ali')).resolves.toEqual({ kind: 'duplicate' });
      repo.isLinked.mockResolvedValue(true);
      await expect(service.requestLink(3, 'ali')).resolves.toEqual({ kind: 'already_linked' });
      repo.countOpenRequests.mockResolvedValue(5);
      await expect(service.requestLink(3, 'ali')).resolves.toEqual({ kind: 'too_many' });
    });
  });
});
