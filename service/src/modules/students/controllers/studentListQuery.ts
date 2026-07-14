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

const studentListParamKeys = [
  'q',
  'search',
  'name',
  'school_name',
  'class_id',
  'subject_id',
  'level',
  'address',
  'age',
  'gender',
  'status',
  'teacher_id',
  'page',
  'limit',
];

const parseStudentListQuery = (query: Record<string, unknown>) => ({
  q: cleanString(query.q || query.search || query.name),
  school_name: cleanString(query.school_name),
  class_id: toInt(query.class_id),
  subject_id: toPositiveInt(query.subject_id),
  level: toInt(query.level),
  address: cleanString(query.address),
  age: toPositiveInt(query.age),
  gender: cleanString(query.gender),
  status: cleanString(query.status),
  teacher_id: toPositiveInt(query.teacher_id),
  page: toPositiveInt(query.page) || 1,
  limit: Math.min(100, toPositiveInt(query.limit) || 20),
});

const hasStudentListParams = (query: Record<string, unknown>) =>
  studentListParamKeys.some((key) => query[key] !== undefined && query[key] !== '');

module.exports = {
  hasStudentListParams,
  parseStudentListQuery,
};

export {};
