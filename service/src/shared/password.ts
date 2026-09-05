const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_SALT_ROUNDS = 10;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

function legacySha256(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
}

// Accounts created before the bcrypt migration still carry a bare SHA-256 digest.
// Callers must re-hash with bcrypt (via hashPassword) and persist it when `legacy` is true.
function verifyPassword(password: string, storedHash?: string | null): { valid: boolean; legacy: boolean } {
  if (!storedHash) return { valid: false, legacy: false };
  if (BCRYPT_HASH_PATTERN.test(storedHash)) {
    return { valid: bcrypt.compareSync(password, storedHash), legacy: false };
  }
  return { valid: legacySha256(password) === storedHash, legacy: true };
}

module.exports = { hashPassword, verifyPassword };

export {};
