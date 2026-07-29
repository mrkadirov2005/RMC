const auditLogRepository = require('../repositories/audit_log.repository');

const listLogs = (
  query: { entity_type?: string; entity_id?: string; user_type?: string; user_id?: string; limit?: string; offset?: string },
  centerId?: number
) => {
  const limit = query.limit ? parseInt(query.limit, 10) : undefined;
  const offset = query.offset ? parseInt(query.offset, 10) : undefined;

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
