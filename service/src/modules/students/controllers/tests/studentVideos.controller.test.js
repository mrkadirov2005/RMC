jest.mock('../../services/student.service', () => ({ getVideos: jest.fn(), saveVideos: jest.fn() }));
jest.mock('../../../../shared/tenant', () => ({ getScopedCenterId: jest.fn(() => ({ centerId: 2, isGlobal: false })) }));
jest.mock('../../../../shared/tenantDb', () => ({ studentBelongsToTeacher: jest.fn() }));

const controller = require('../student.controller');
const service = require('../../services/student.service');
const { studentBelongsToTeacher } = require('../../../../shared/tenantDb');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('student videos controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets a teacher view only their own student', async () => {
    studentBelongsToTeacher.mockResolvedValueOnce(false);
    const refused = createResponse();
    await controller.getStudentVideos({ params: { id: '5' }, user: { userType: 'teacher', id: 3 } }, refused);
    expect(refused.status).toHaveBeenCalledWith(403);

    studentBelongsToTeacher.mockResolvedValueOnce(true);
    service.getVideos.mockResolvedValue({ before_video_url: 'https://www.loom.com/share/a' });
    const ok = createResponse();
    await controller.getStudentVideos({ params: { id: '5' }, user: { userType: 'teacher', id: 3 } }, ok);
    expect(ok.json).toHaveBeenCalledWith({ before_video_url: 'https://www.loom.com/share/a' });
  });

  it('rejects a link from another site with a clear message', async () => {
    service.saveVideos.mockResolvedValue({ error: 'invalid_url' });
    const res = createResponse();
    await controller.saveStudentVideos({ params: { id: '5' }, body: { before_video_url: 'https://x.example' }, user: { userType: 'superuser' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('keeps students out', async () => {
    const res = createResponse();
    await controller.getStudentVideos({ params: { id: '5' }, user: { userType: 'student', id: 5 } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
