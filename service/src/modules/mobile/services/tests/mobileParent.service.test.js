jest.mock('../../../parents/services/parent.service', () => ({ getMyStudents: jest.fn() }));
jest.mock('../mobileLearner.service', () => ({ profile: jest.fn() }));

const parentService = require('../../../parents/services/parent.service');
const learner = require('../mobileLearner.service');
const service = require('../mobileParent.service');

const aziza = { student_id: 7, center_id: 2, groups: [{ student_id: 7 }, { student_id: 8 }] };
const jasur = { student_id: 20, center_id: 2, groups: [{ student_id: 20 }] };

describe('mobile parent service', () => {
  beforeEach(() => {
    // Parent links are copied to each group record, so the parent sees Aziza twice.
    parentService.getMyStudents.mockResolvedValue([
      { student_id: 7, center_id: 2 },
      { student_id: 8, center_id: 2 },
      { student_id: 20, center_id: 2 },
    ]);
    learner.profile.mockImplementation(async (id) => (id === 20 ? jasur : aziza));
  });

  // @MOB-026
  it('lists each child once with every record id that belongs to them', async () => {
    const children = await service.listChildren(11);

    expect(children.map((c) => c.student_id)).toEqual([7, 20]);
    expect(children[0].linked_ids.sort()).toEqual([7, 8]);
    expect(learner.profile).toHaveBeenCalledWith(8, 2);
  });

  it('skips records whose profile cannot be loaded', async () => {
    parentService.getMyStudents.mockResolvedValue([{ student_id: 99, center_id: 2 }]);
    learner.profile.mockResolvedValue(null);
    await expect(service.listChildren(11)).resolves.toEqual([]);

    parentService.getMyStudents.mockResolvedValue(null);
    await expect(service.listChildren(11)).resolves.toEqual([]);
  });

  // @MOB-025 @MOB-013 A parent reaches a linked child by any of the child's record ids, and no other student.
  it('findChild accepts any record of a linked child and refuses other students', async () => {
    await expect(service.findChild(11, 8)).resolves.toMatchObject({ student_id: 7 });
    await expect(service.findChild(11, 20)).resolves.toMatchObject({ student_id: 20 });
    await expect(service.findChild(11, 555)).resolves.toBeNull();
  });
});
