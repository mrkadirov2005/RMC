const pool = require('../db/pool');
const { auditLogs } = require('../db/schema');

const db = pool.db;

interface AuditPayload {
  user_type: string;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id?: number | null;
  center_id?: number | null;
  details?: any;
  ip_address?: string | null;
}

exports.logAudit = async (payload: AuditPayload) => {
  try {
    const {
      user_type,
      user_id,
      action,
      entity_type,
      entity_id,
      center_id,
      details,
      ip_address,
    } = payload;

    const resolvedCenterId = center_id ?? details?.center_id ?? null;
    await db.insert(auditLogs).values({
      centerId: resolvedCenterId,
      userType: user_type,
      userId: user_id,
      action,
      entityType: entity_type,
      entityId: entity_id || null,
      details: {
        ...(details || {}),
        center_id: resolvedCenterId,
      },
      ipAddress: ip_address || null,
    });
  } catch (err) {
    // Audit logging should never block main flow
    console.error('Audit log error:', err);
  }
};

export {};
