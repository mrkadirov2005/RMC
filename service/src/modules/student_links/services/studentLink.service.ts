const studentLinkRepository = require('../repositories/studentLink.repository');

const RELATION_TYPES = ['siblings', 'relatives', 'friends'];
const MAX_MEMBERS = 20;

/** Validates a link: a known relation, 2 to 20 distinct students, all in one branch the caller can see. */
const prepare = async (body: any, centerId?: number) => {
  const relationType = String(body?.relation_type || '');
  if (!RELATION_TYPES.includes(relationType)) return { error: 'invalid_relation' as const };
  const studentIds = Array.from(new Set<number>((Array.isArray(body?.student_ids) ? body.student_ids : []).map(Number)))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (studentIds.length < 2 || studentIds.length > MAX_MEMBERS) return { error: 'invalid_members' as const };
  const found = await studentLinkRepository.findStudentCenters(studentIds, centerId);
  const centers = new Set(found.map((row: any) => Number(row.center_id)));
  if (found.length !== studentIds.length || centers.size !== 1) return { error: 'students_not_found' as const };
  const note = String(body?.note ?? '').trim().slice(0, 1000) || null;
  return { relationType, studentIds, note, centerId: Number([...centers][0]) };
};

const list = (centerId?: number) => studentLinkRepository.findAll(centerId);

const create = async (body: any, centerId: number | undefined, createdByName: string | null) => {
  const prepared: any = await prepare(body, centerId);
  if (prepared.error) return prepared;
  return { row: await studentLinkRepository.insert({ ...prepared, createdByName }) };
};

const update = async (linkId: number, body: any, centerId?: number) => {
  const prepared: any = await prepare(body, centerId);
  if (prepared.error) return prepared;
  const updated = await studentLinkRepository.update(linkId, prepared, centerId);
  return updated ? { ok: true } : { error: 'not_found' as const };
};

const remove = (linkId: number, centerId?: number) => studentLinkRepository.softDelete(linkId, centerId);

module.exports = { list, create, update, remove };
export {};
