jest.mock('../../repositories/studentLink.repository', () => ({
  findAll: jest.fn(),
  findStudentCenters: jest.fn(),
  insert: jest.fn(async () => ({ link_id: 1 })),
  update: jest.fn(),
  softDelete: jest.fn(),
}));

const repository = require('../../repositories/studentLink.repository');
const service = require('../studentLink.service');

describe('student links service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('links two or more distinct students of one branch', async () => {
    repository.findStudentCenters.mockResolvedValue([{ student_id: 1, center_id: 4 }, { student_id: 2, center_id: 4 }]);
    await expect(service.create({ relation_type: 'siblings', student_ids: [1, '2', 2], note: ' aka-uka ' }, 4, 'Admin')).resolves.toEqual({ row: { link_id: 1 } });
    expect(repository.findStudentCenters).toHaveBeenCalledWith([1, 2], 4);
    expect(repository.insert).toHaveBeenCalledWith({ relationType: 'siblings', studentIds: [1, 2], note: 'aka-uka', centerId: 4, createdByName: 'Admin' });
  });

  it('refuses unknown relations, fewer than two students, and students outside the branch', async () => {
    expect(await service.create({ relation_type: 'cousins', student_ids: [1, 2] }, 4, null)).toEqual({ error: 'invalid_relation' });
    expect(await service.create({ relation_type: 'friends', student_ids: [1, 1] }, 4, null)).toEqual({ error: 'invalid_members' });
    repository.findStudentCenters.mockResolvedValue([{ student_id: 1, center_id: 4 }]);
    expect(await service.create({ relation_type: 'friends', student_ids: [1, 2] }, 4, null)).toEqual({ error: 'students_not_found' });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('refuses to link students of two branches (owner, all branches)', async () => {
    repository.findStudentCenters.mockResolvedValue([{ student_id: 1, center_id: 4 }, { student_id: 2, center_id: 5 }]);
    expect(await service.create({ relation_type: 'relatives', student_ids: [1, 2] }, undefined, null)).toEqual({ error: 'students_not_found' });
  });

  it('answers not_found when the group is not in the branch', async () => {
    repository.findStudentCenters.mockResolvedValue([{ student_id: 1, center_id: 4 }, { student_id: 2, center_id: 4 }]);
    repository.update.mockResolvedValue(false);
    expect(await service.update(9, { relation_type: 'friends', student_ids: [1, 2] }, 4)).toEqual({ error: 'not_found' });
  });
});
