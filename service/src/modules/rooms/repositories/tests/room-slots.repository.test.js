// RMC-036 / Critical Finding #2: findBookingsBySlot is the query behind
// GET /room-slots/bookings/slot/:slotId. Before the fix, a caller who merely
// guessed or otherwise learned a slot_id belonging to a DIFFERENT center
// could read that booking. The fix scopes the query by the caller's own
// center id (eq(roomBookings.centerId, centerId)) in addition to the slot id.
// We assert on the real drizzle-orm `eq`/`and` condition objects (not just
// "where was called") so a regression that drops the center_id filter — even
// while keeping some other unrelated `where` call — would be caught.
const mockDb = { select: jest.fn() };

jest.mock('../../../../db/pool', () => ({ db: mockDb }));

const { and, eq } = require('drizzle-orm');
const { roomBookings } = require('../../../../db/schema');
const roomSlotsRepository = require('../room-slots.repository');

const createSelectChain = (rows) => {
  const chain = {};
  chain.from = jest.fn(() => chain);
  chain.innerJoin = jest.fn(() => chain);
  chain.where = jest.fn(() => chain);
  chain.then = jest.fn((resolve, reject) => Promise.resolve(rows).then(resolve, reject));
  return chain;
};

describe('room-slots repository — findBookingsBySlot is center-scoped (RMC-036)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('filters by both slot id and the caller\'s center id in the same WHERE clause', async () => {
    const chain = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(chain);

    await roomSlotsRepository.findBookingsBySlot(77, 2);

    // The exact condition object the query builder receives must include an
    // eq() on roomBookings.centerId bound to the caller's own center (2),
    // alongside the eq() on the requested slot id.
    expect(chain.where).toHaveBeenCalledWith(
      and(eq(roomBookings.slotId, 77), eq(roomBookings.centerId, 2))
    );
  });

  it('would not match a booking under a different center for the same slot id: the WHERE differs per caller center', async () => {
    const chainForCenterA = createSelectChain([{ booking_id: 1, center_id: 2 }]);
    mockDb.select.mockReturnValueOnce(chainForCenterA);
    await roomSlotsRepository.findBookingsBySlot(77, 2);
    expect(chainForCenterA.where).toHaveBeenCalledWith(and(eq(roomBookings.slotId, 77), eq(roomBookings.centerId, 2)));

    const chainForCenterB = createSelectChain([]);
    mockDb.select.mockReturnValueOnce(chainForCenterB);
    // Same guessed slot id (77), different caller center (9): the WHERE clause
    // must be built against center 9, not center 2 — proving the filter is not
    // hardcoded and tracks whichever center the caller was resolved to.
    await roomSlotsRepository.findBookingsBySlot(77, 9);
    expect(chainForCenterB.where).toHaveBeenCalledWith(and(eq(roomBookings.slotId, 77), eq(roomBookings.centerId, 9)));
    expect(chainForCenterB.where).not.toHaveBeenCalledWith(and(eq(roomBookings.slotId, 77), eq(roomBookings.centerId, 2)));
  });
});
