jest.mock('../../services/teacher.service', () => ({
  listTeachers: jest.fn(),
  listTeachersPaginated: jest.fn(),
  getTeacher: jest.fn(),
  updateTeacher: jest.fn(),
  createTeacher: jest.fn(),
}));
jest.mock('../../services/teacher_payment.service', () => ({}));
jest.mock('../../../../shared/tenant', () => ({ getScopedCenterId: jest.fn(() => ({ centerId: 2, isGlobal: false })) }));

const controller = require('../teacher.controller');
const service = require('../../services/teacher.service');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const owner = { userType: 'superuser', role: 'owner', id: 1 };
const admin = { userType: 'superuser', role: 'admin', id: 2 };

describe('teacher salary share visibility', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the share to the owner only, in lists and paginated lists', async () => {
    service.listTeachers.mockResolvedValue([{ teacher_id: 7, first_name: 'A', salary_percentage: 40 }]);
    const forOwner = createResponse();
    await controller.getAllTeachers({ query: {}, user: owner }, forOwner);
    expect(forOwner.json.mock.calls[0][0][0].salary_percentage).toBe(40);

    const forAdmin = createResponse();
    await controller.getAllTeachers({ query: {}, user: admin }, forAdmin);
    expect(forAdmin.json.mock.calls[0][0][0]).toEqual({ teacher_id: 7, first_name: 'A' });

    service.listTeachersPaginated.mockResolvedValue({ data: [{ teacher_id: 7, salary_percentage: 40 }], total: 1 });
    const paged = createResponse();
    await controller.getAllTeachers({ query: { page: '1' }, user: admin }, paged);
    expect(paged.json.mock.calls[0][0]).toEqual({ data: [{ teacher_id: 7 }], total: 1 });
  });

  it('lets a teacher see their own share but not a colleague’s', async () => {
    service.getTeacher.mockResolvedValue({ teacher_id: 7, salary_percentage: 40 });
    const own = createResponse();
    await controller.getTeacherById({ params: { id: '7' }, user: { userType: 'teacher', id: 7 } }, own);
    expect(own.json.mock.calls[0][0].salary_percentage).toBe(40);

    const other = createResponse();
    await controller.getTeacherById({ params: { id: '7' }, user: { userType: 'teacher', id: 8 } }, other);
    expect(other.json.mock.calls[0][0].salary_percentage).toBeUndefined();
  });

  it('ignores a share sent by an admin', async () => {
    service.updateTeacher.mockResolvedValue({ teacher_id: 7, salary_percentage: 40 });
    await controller.updateTeacher({ params: { id: '7' }, body: { first_name: 'B', salary_percentage: 90 }, user: admin }, createResponse());
    expect(service.updateTeacher).toHaveBeenCalledWith(7, { first_name: 'B' }, 2);

    await controller.updateTeacher({ params: { id: '7' }, body: { salary_percentage: 45 }, user: owner }, createResponse());
    expect(service.updateTeacher).toHaveBeenLastCalledWith(7, { salary_percentage: 45 }, 2);
  });
});
