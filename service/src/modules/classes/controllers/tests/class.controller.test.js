jest.mock('../../services/class.service', () => ({
  listClasses: jest.fn(),
  listClassesPaginated: jest.fn(),
  getClass: jest.fn(),
  createClass: jest.fn(),
  updateClass: jest.fn(),
  deleteClass: jest.fn(),
  purgeClass: jest.fn(),
}));

jest.mock('../../../sessions/services/session.service', () => ({
  listByClass: jest.fn(),
  listByClasses: jest.fn(),
  generateMonthlySessions: jest.fn(),
  createSession: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const classController = require('../class.controller');
const classService = require('../../services/class.service');
const sessionService = require('../../../sessions/services/session.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('classes controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    getScopedCenterId.mockReturnValue({ centerId: 3, isGlobal: false });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('returns paginated classes with parsed filters', async () => {
    const req = { query: { search: 'math', teacher_id: '5', limit: '300' }, user: { userType: 'superuser' } };
    const res = createResponse();
    classService.listClassesPaginated.mockResolvedValue({ data: [], total: 0 });

    await classController.getAllClasses(req, res);

    expect(classService.listClassesPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'math', teacher_id: 5, limit: 100 }),
      3,
      undefined
    );
    expect(res.json).toHaveBeenCalledWith({ data: [], total: 0 });
  });

  it('blocks students from listing classes', async () => {
    const req = { query: {}, user: { userType: 'student' } };
    const res = createResponse();

    await classController.getAllClasses(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied.' });
  });

  it('returns bad teacher error on invalid teacher during create', async () => {
    const req = { body: { teacher_id: 99 }, user: { userType: 'superuser' } };
    const res = createResponse();
    classService.createClass.mockResolvedValue({ error: 'bad_teacher' });

    await classController.createClass(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Teacher not found. Please provide a valid teacher_id' });
  });

  it('returns session generation validation errors', async () => {
    const req = { params: { id: '7' }, body: { month: 7, year: 2026 }, user: { userType: 'superuser' } };
    const res = createResponse();
    sessionService.generateMonthlySessions.mockResolvedValue({ error: 'missing_schedule' });

    await classController.generateClassSessions(req, res);

    expect(sessionService.generateMonthlySessions).toHaveBeenCalledWith(expect.objectContaining({
      classId: 7,
      centerId: 3,
      month: 7,
      year: 2026,
    }));
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
