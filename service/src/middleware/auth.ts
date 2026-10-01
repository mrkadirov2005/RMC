export {};

/**
 * JWT Authentication & Role-Based Access Control Middleware
 */
const jwt = require('jsonwebtoken');
const { and, eq, isNull } = require('drizzle-orm');
const pool = require('../db/pool');
const { students } = require('../db/schema');

const db = pool.db;

const DEVELOPMENT_JWT_SECRET = 'crm_jwt_secret_key_2024_change_in_production';
const resolveJwtSecret = (environment = process.env.NODE_ENV, configuredSecret = process.env.JWT_SECRET) => {
  const configured = String(configuredSecret || '').trim();
  if (configured) return configured;
  if (environment === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }
  return DEVELOPMENT_JWT_SECRET;
};
const JWT_SECRET = resolveJwtSecret();
const JWT_EXPIRES_IN = '24h';
const PAYMENT_TOKEN_EXPIRES_IN = process.env.PAYMENT_TOKEN_EXPIRES_IN || '8h';

// Type definitions
type UserType = 'superuser' | 'teacher' | 'student' | 'parent';

interface JwtPayload {
  id: number;
  username?: string;
  email?: string;
  userType: UserType;
  branch_id?: number;
  center_id?: number;
  class_id?: number;
  role?: string;
  permissions?: string[];
  payment_access?: boolean;
  is_frozen?: boolean;
  can_hard_delete?: boolean;
}

/**
 * Generate a JWT token for an authenticated user
 */
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function generateTokenWithExpiry(payload: JwtPayload, expiresIn: string): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function generatePaymentToken(payload: JwtPayload): string {
  return generateTokenWithExpiry(payload, PAYMENT_TOKEN_EXPIRES_IN);
}

/**
 * Verify and decode a JWT token
 */
function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Middleware: Require authentication (any valid JWT)
 * Attaches `req.user` with the decoded token payload
 */
async function requireAuth(req: any, res: any, next: any): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Tizimga kirish talab qilinadi. Iltimos, tizimga kiring.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    // Frozen students are view-only: allow reads, block writes.
    if (
      decoded.userType === 'student' &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())
    ) {
      const rows = await db
        .select({ is_frozen: students.isFrozen })
        .from(students)
        .where(and(eq(students.studentId, decoded.id), isNull(students.deletedAt)))
        .limit(1);
      const isFrozen = Boolean(rows?.[0]?.is_frozen);
      if (isFrozen) {
        res.status(423).json({
          error: "O'quvchi hisobi muzlatilgan va hozir faqat ko'rish rejimida.",
          code: 'STUDENT_ACCOUNT_FROZEN',
        });
        return;
      }
    }
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Sessiya muddati tugadi. Iltimos, qaytadan tizimga kiring.' });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Sessiya yaroqsiz. Iltimos, qaytadan tizimga kiring.' });
    } else {
      console.error('Authentication middleware error:', err);
      res.status(500).json({ error: "Tizimga kirish holatini tekshirib bo'lmadi." });
    }
  }
}

/**
 * Middleware: Require specific user types (role-based access)
 * Must be used AFTER requireAuth
 * 
 * Usage:
 *   requireRole('superuser')              — only superusers
 *   requireRole('superuser', 'teacher')   — superusers or teachers
 */
function requireRole(...allowedTypes: UserType[]) {
  return (req: any, res: any, next: any): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Tizimga kirish talab qilinadi.' });
      return;
    }

    if (req.user.userType === 'superuser' && String(req.user.role || '').toLowerCase() === 'owner') {
      next();
      return;
    }

    if (!allowedTypes.includes(req.user.userType)) {
      res.status(403).json({ 
        error: "Kirish rad etildi. Bu amalni bajarishga ruxsatingiz yo'q.",
        required: allowedTypes,
        current: req.user.userType
      });
      return;
    }

    next();
  };
}

function requireMuzaffarHardDelete(req: any, res: any, next: any): void {
  if (!req.user) {
    res.status(401).json({ error: 'Tizimga kirish talab qilinadi.' });
    return;
  }

  const canHardDelete = req.user.userType === 'superuser' && req.user.can_hard_delete === true;
  if (canHardDelete) {
    next();
    return;
  }

  res.status(403).json({ error: "Yozuvlarni butunlay o'chirishga ruxsatingiz yo'q." });
}

/**
 * Middleware: Require that authenticated user can only access their own data
 * Checks if request parameter matches the authenticated user's ID
 * Superusers bypass this check (they can access any user's data)
 * 
 * Usage:
 *   requireSelfOrAdmin('studentId')  — student can only access their own data
 */
function requireSelfOrAdmin(paramName: string, userIdField: string = 'id') {
  return (req: any, res: any, next: any): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Tizimga kirish talab qilinadi.' });
      return;
    }

    // Superusers and teachers can access any data
    if (
      req.user.userType === 'superuser' ||
      req.user.userType === 'teacher' ||
      (req.user.userType === 'superuser' && String(req.user.role || '').toLowerCase() === 'owner')
    ) {
      next();
      return;
    }

    const requestedId = parseInt(req.params[paramName], 10);
    const userId = req.user[userIdField];

    if (requestedId !== userId) {
      res.status(403).json({ 
        error: "Kirish rad etildi. Siz faqat o'z ma'lumotlaringizga kira olasiz." 
      });
      return;
    }

    next();
  };
}

module.exports = {
  generateToken,
  generateTokenWithExpiry,
  generatePaymentToken,
  verifyToken,
  requireAuth,
  requireRole,
  requireMuzaffarHardDelete,
  requireSelfOrAdmin,
  requireOwner: (req: any, res: any, next: any) => {
    if (!req.user) {
      res.status(401).json({ error: 'Tizimga kirish talab qilinadi.' });
      return;
    }
    if (req.user.userType === 'superuser' && String(req.user.role || '').toLowerCase() === 'owner') {
      next();
      return;
    }
    res.status(403).json({ error: 'Kirish rad etildi. Ega huquqlari talab qilinadi.' });
  },
  JWT_SECRET,
  JWT_EXPIRES_IN,
  PAYMENT_TOKEN_EXPIRES_IN,
  resolveJwtSecret,
};
