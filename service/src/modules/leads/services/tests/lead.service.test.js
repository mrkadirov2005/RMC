jest.mock('../../repositories/lead.repository', () => ({
  findOpen: jest.fn(),
  countDue: jest.fn(async () => 2),
  insert: jest.fn(async (row) => ({ lead_id: 1, ...row })),
  update: jest.fn(),
  close: jest.fn(),
}));

const repository = require('../../repositories/lead.repository');
const service = require('../lead.service');

describe('leads service', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks leads whose call-back day has come (Tashkent date)', async () => {
    repository.findOpen.mockResolvedValue([
      { lead_id: 1, call_back_on: '2026-10-09' },
      { lead_id: 2, call_back_on: '2026-10-10' },
      { lead_id: 3, call_back_on: null },
    ]);
    const rows = await service.list('waiting_group', 4, new Date('2026-10-09T20:30:00Z'));
    expect(repository.findOpen).toHaveBeenCalledWith('waiting_group', 4);
    expect(rows.map((row) => row.call_back_due)).toEqual([true, true, false]);
  });

  it('counts due call-backs for today in Tashkent', async () => {
    await expect(service.dueCount(4, new Date('2026-10-09T08:00:00Z'))).resolves.toBe(2);
    expect(repository.countDue).toHaveBeenCalledWith('2026-10-09', 4);
  });

  it('needs a stage, a name and a phone, and a valid call-back day', async () => {
    expect(await service.create({ stage: 'other', full_name: 'A', phone: '1' }, 4, null)).toEqual({ error: 'invalid_stage' });
    expect(await service.create({ stage: 'new_group', full_name: ' ', phone: '1' }, 4, null)).toEqual({ error: 'name_phone_required' });
    expect(await service.create({ stage: 'new_group', full_name: 'A', phone: '1', call_back_on: '10.10.2026' }, 4, null)).toEqual({ error: 'invalid_date' });
    await service.create({ stage: 'waiting_group', full_name: ' Ali Valiyev ', phone: '+998901234567', subject: 'IELTS', call_back_on: '2026-10-12' }, 4, 'Admin');
    expect(repository.insert).toHaveBeenCalledWith(expect.objectContaining({ centerId: 4, stage: 'waiting_group', fullName: 'Ali Valiyev', subject: 'IELTS', callBackOn: '2026-10-12', note: null, createdByName: 'Admin' }));
  });

  it('closes a lead as enrolled or lost only', async () => {
    expect(await service.close(1, { outcome: 'maybe' }, 4)).toEqual({ error: 'invalid_outcome' });
    repository.close.mockResolvedValue(false);
    expect(await service.close(1, { outcome: 'lost' }, 4)).toEqual({ error: 'not_found' });
  });
});
