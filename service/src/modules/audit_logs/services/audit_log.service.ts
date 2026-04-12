const auditLogRepository = require('../repositories/audit_log.repository');

const listLogs = (
  query: { entity_type?: string; entity_id?: string; user_type?: string; user_id?: string; limit?: string; offset?: string },
  centerId?: number
) => {
  const params: any[] = [];
  const conditions: string[] = [];

  if (query.entity_type) {
    params.push(query.entity_type);
    conditions.push(`entity_type = $${params.length}`);
  }
  if (query.entity_id) {
    params.push(query.entity_id);
    conditions.push(`entity_id = $${params.length}`);
  }
  if (query.user_type) {
    params.push(query.user_type);
    conditions.push(`user_type = $${params.length}`);
  }
  if (query.user_id) {
    params.push(query.user_id);
    conditions.push(`user_id = $${params.length}`);
  }
  if (centerId) {
    params.push(String(centerId));
    conditions.push(`COALESCE(details->>'center_id', '') = $${params.length}`);
  }

  const limit = query.limit ? parseInt(query.limit, 10) : undefined;
  const offset = query.offset ? parseInt(query.offset, 10) : undefined;

  return auditLogRepository.findFiltered(conditions, params, limit, offset);
};

module.exports = { listLogs };

export {};
