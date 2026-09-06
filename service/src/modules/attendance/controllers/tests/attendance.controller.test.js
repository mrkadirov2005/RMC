// RMC-063: the update-path status enum fix lives in the route's DTO layer
// (UpdateAttendanceDto, applied via validateBody in routes/attendanceRoutes.ts),
// not in the controller function itself -- the controller just forwards
// req.body through once validation has already run. So the most direct way
// to prove the fix is to exercise that same validation middleware + DTO pair
// exactly as the route wires them up, rather than unit-testing the controller
// function in isolation (which never re-validates status on its own).
require('reflect-metadata');
const { validateBody } = require('../../../../middleware/validation');
const { CreateAttendanceDto, UpdateAttendanceDto } = require('../../../../dtos/attendance.dto');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const runMiddleware = async (dto, body) => {
  const req = { body };
  const res = createResponse();
  const next = jest.fn();
  await validateBody(dto)(req, res, next);
  return { req, res, next };
};

describe('attendance controller / DTO validation (RMC-029, RMC-063)', () => {
  describe('update path (UpdateAttendanceDto)', () => {
    it.each(['Present', 'Absent', 'Late', 'Excused'])('accepts the valid status "%s" on update', async (status) => {
      const { res, next } = await runMiddleware(UpdateAttendanceDto, { status });

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects an invalid status value on update with 400, matching create behavior', async () => {
      const { res, next } = await runMiddleware(UpdateAttendanceDto, { status: 'Bogus' });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validation failed' }));
    });

    it('allows updating only remarks without a status', async () => {
      const { res, next } = await runMiddleware(UpdateAttendanceDto, { remarks: 'Left early' });

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('create path (CreateAttendanceDto) — confirms the pre-existing enum guard is unchanged', () => {
    const validCreateBody = {
      student_id: 1,
      class_id: 2,
      attendance_date: '2026-09-01',
      status: 'Present',
    };

    it('still rejects an invalid status value on create', async () => {
      const { res, next } = await runMiddleware(CreateAttendanceDto, { ...validCreateBody, status: 'Bogus' });

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it.each(['Present', 'Absent', 'Late', 'Excused'])('still accepts the valid status "%s" on create', async (status) => {
      const { res, next } = await runMiddleware(CreateAttendanceDto, { ...validCreateBody, status });

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
