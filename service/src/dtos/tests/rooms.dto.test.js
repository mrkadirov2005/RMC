// RMC-036: room/slot/booking creation used to accept payloads with missing
// required fields, which fell through to Postgres NOT NULL constraint
// violations and surfaced as opaque 500s. dtos/rooms.dto.ts now validates
// these fields at the route layer (validateBody) so a missing required field
// is rejected with a 400 before it ever reaches the database.
require('reflect-metadata');
const { validateBody } = require('../../middleware/validation');
const { CreateRoomDto, CreateRoomSlotDto, CreateRoomBookingDto } = require('../rooms.dto');

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
  return { res, next };
};

describe('rooms DTOs reject missing required fields with 400, not a 500 (RMC-036)', () => {
  it('CreateRoomDto: rejects a room create missing room_number', async () => {
    const { res, next } = await runMiddleware(CreateRoomDto, { day: 'Monday', time: '09:00' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('CreateRoomDto: rejects a room create missing day', async () => {
    const { res, next } = await runMiddleware(CreateRoomDto, { room_number: 'A1', time: '09:00' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('CreateRoomDto: accepts a well-formed room create', async () => {
    const { res, next } = await runMiddleware(CreateRoomDto, { room_number: 'A1', day: 'Monday', time: '09:00' });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('CreateRoomSlotDto: rejects a slot create missing room_id', async () => {
    const { res, next } = await runMiddleware(CreateRoomSlotDto, { slot_date: '2026-09-10', start_time: '09:00', end_time: '09:30' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('CreateRoomSlotDto: rejects a slot create missing slot_date', async () => {
    const { res, next } = await runMiddleware(CreateRoomSlotDto, { room_id: 5, start_time: '09:00', end_time: '09:30' });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('CreateRoomSlotDto: accepts a well-formed slot create', async () => {
    const { res, next } = await runMiddleware(CreateRoomSlotDto, { room_id: 5, slot_date: '2026-09-10', start_time: '09:00', end_time: '09:30' });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('CreateRoomBookingDto: rejects a booking create missing slot_id', async () => {
    const { res, next } = await runMiddleware(CreateRoomBookingDto, { class_id: 4 });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('CreateRoomBookingDto: rejects a booking create missing class_id', async () => {
    const { res, next } = await runMiddleware(CreateRoomBookingDto, { slot_id: 7 });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('CreateRoomBookingDto: accepts a well-formed booking create', async () => {
    const { res, next } = await runMiddleware(CreateRoomBookingDto, { slot_id: 7, class_id: 4 });

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
