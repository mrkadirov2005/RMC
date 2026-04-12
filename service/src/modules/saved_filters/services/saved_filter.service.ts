const savedFilterRepository = require('../repositories/saved_filter.repository');

const listMine = (userType: string, userId: number, centerId?: number, entity?: string) =>
  savedFilterRepository.findForUser(userType, userId, centerId, entity);

const create = (userType: string, userId: number, centerId: number, body: any) => {
  const { name, entity, filters_json } = body;
  if (!name || !entity || !filters_json || !centerId) return { error: 'validation' as const };
  return savedFilterRepository
    .insert([centerId, userType, userId, name, entity, JSON.stringify(filters_json)])
    .then((row: any) => ({ row }));
};

const update = (id: number, userType: string, userId: number, centerId: number, body: any) => {
  const { name, filters_json } = body;
  const fj = filters_json ? JSON.stringify(filters_json) : null;
  return savedFilterRepository.update(id, userType, userId, centerId, name, fj);
};

const remove = (id: number, userType: string, userId: number, centerId: number) =>
  savedFilterRepository.remove(id, userType, userId, centerId);

module.exports = { listMine, create, update, remove };

export {};
