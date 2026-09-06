const auditLogRepository = require('../repositories/audit_log.repository');

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

const listLogs = (
  query: { entity_type?: string; entity_id?: string; user_type?: string; user_id?: string; limit?: string; offset?: string },
  centerId?: number
) => {
  const requestedLimit = query.limit ? parseInt(query.limit, 10) : DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT));
  const offset = query.offset ? Math.max(0, parseInt(query.offset, 10) || 0) : undefined;

  return auditLogRepository.findFiltered(
    {
      entityType: query.entity_type,
      entityId: query.entity_id ? Number(query.entity_id) : undefined,
      userType: query.user_type,
      userId: query.user_id ? Number(query.user_id) : undefined,
      centerId,
    },
    limit,
    offset
  );
};

module.exports = { listLogs };

export {};
