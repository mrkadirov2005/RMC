const toPositiveInt = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
};

const toInt = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
};

const cleanString = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || undefined;
};

const hasClassListParams = (query: Record<string, unknown>) =>
  ['q', 'search', 'teacher_id', 'level', 'page', 'limit'].some((key) => query[key] !== undefined && query[key] !== '');

const parseClassListQuery = (query: Record<string, unknown>) => ({
  q: cleanString(query.q || query.search),
  teacher_id: toPositiveInt(query.teacher_id),
  level: toInt(query.level),
  page: toPositiveInt(query.page) || 1,
  limit: Math.min(100, toPositiveInt(query.limit) || 20),
});

module.exports = {
  hasClassListParams,
  parseClassListQuery,
};

export {};
