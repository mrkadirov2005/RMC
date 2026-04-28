const searchRepository = require('../repositories/search.repository');

const runSearch = async (
  q: string,
  entity: string | undefined,
  limit: string | undefined,
  centerId?: number,
  teacherId?: number
) => {
  const max = Math.min(parseInt(limit || '20', 10), 100);
  const pattern = `%${q}%`;
  const results: any = {};

  const doStudents = !entity || entity === 'students';
  const doTeachers = !entity || entity === 'teachers';
  const doClasses = !entity || entity === 'classes';
  const doPayments = !entity || entity === 'payments';

  if (doStudents) results.students = await searchRepository.searchStudents(pattern, max, centerId, teacherId);
  if (doTeachers) results.teachers = await searchRepository.searchTeachers(pattern, max, centerId);
  if (doClasses) results.classes = await searchRepository.searchClasses(pattern, max, centerId);
  if (doPayments) results.payments = await searchRepository.searchPayments(pattern, max, centerId);

  return { results };
};

module.exports = { runSearch };

export {};
