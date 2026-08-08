jest.mock('../../repositories/saved_filter.repository', () => ({ findForUser: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn() }));
const repository = require('../../repositories/saved_filter.repository');
const service = require('../saved_filter.service');

describe('saved filter service', () => {
  beforeEach(() => jest.clearAllMocks());
  test('lists only filters owned by actor, center, and entity', () => {
    service.listMine('superuser', 3, 2, 'students');
    expect(repository.findForUser).toHaveBeenCalledWith('superuser', 3, 2, 'students');
  });
  test('requires center and serializes filter JSON on create', async () => {
    expect(service.create('superuser', 3, 0, {})).toEqual({ error: 'validation' });
    repository.insert.mockResolvedValue({ filter_id: 1 });
    await service.create('superuser', 3, 2, { name: 'Active', entity: 'students', filters_json: { active: true } });
    expect(repository.insert).toHaveBeenCalledWith([2, 'superuser', 3, 'Active', 'students', '{"active":true}']);
  });
  test('scopes updates/deletes and preserves absent filter JSON as null', () => {
    service.update(1, 'teacher', 4, 2, { name: 'Mine' }); service.remove(1, 'teacher', 4, 2);
    expect(repository.update).toHaveBeenCalledWith(1, 'teacher', 4, 2, 'Mine', null);
    expect(repository.remove).toHaveBeenCalledWith(1, 'teacher', 4, 2);
  });
});
