const audit_db = require('../../config/dbcon');

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

    await audit_db.query(
      `INSERT INTO audit_logs (user_type, user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user_type,
        user_id,
        action,
        entity_type,
        entity_id || null,
        JSON.stringify({
          ...(details || {}),
          center_id: center_id ?? details?.center_id ?? null,
        }),
        ip_address || null,
      ]
    );
  } catch (err) {
    // Audit logging should never block main flow
    console.error('Audit log error:', err);
  }
};

export {};
