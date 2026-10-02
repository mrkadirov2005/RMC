const { buildTransferAllocation, todayInCenterTimeZone } = require('../transferAllocation');

const day = (iso) => new Date(`${iso}T00:00:00Z`);

describe('transfer allocation', () => {
  it('never creates or loses money: earned plus moved equals what was paid', () => {
    for (const paid of [0, 1, 99999.99, 193548, 450000, 600000, 1200000]) {
      for (const date of ['2026-10-01', '2026-10-11', '2026-10-31', '2028-02-29']) {
        const result = buildTransferAllocation(600000, 450000, paid, day(date));
        const kept = Math.min(paid, result.sourceEarned);
        expect(Math.round((kept + result.movedAmount) * 100)).toBe(Math.round(paid * 100));
      }
    }
  });

  it('splits a 31-day month for groups with different prices', () => {
    const result = buildTransferAllocation(600000, 450000, 600000, day('2026-10-11'));

    expect(result).toMatchObject({
      totalDays: 31,
      sourceDays: 10,
      targetDays: 21,
      sourceEarned: 193548.39,
      movedAmount: 406451.61,
      targetCharge: 304838.71,
      targetBalance: 101612.9,
    });
  });

  it('uses the real length of February, including leap years', () => {
    expect(buildTransferAllocation(280000, 280000, 280000, day('2027-02-15'))).toMatchObject({ totalDays: 28, sourceDays: 14, targetDays: 14 });
    expect(buildTransferAllocation(290000, 290000, 290000, day('2028-02-15'))).toMatchObject({ totalDays: 29, sourceDays: 14, targetDays: 15 });
  });

  it('gives the new group a single day when the transfer is on the last day', () => {
    const result = buildTransferAllocation(300000, 300000, 300000, day('2026-09-30'));

    expect(result).toMatchObject({ sourceDays: 29, targetDays: 1, sourceEarned: 290000, movedAmount: 10000, targetCharge: 10000, targetBalance: 0 });
  });

  it('moves prepaid money too when the student paid more than the month', () => {
    expect(buildTransferAllocation(300000, 300000, 600000, day('2026-09-11')).movedAmount).toBe(500000);
  });

  it('ignores a start date from an earlier month', () => {
    expect(buildTransferAllocation(300000, 300000, 300000, day('2026-09-11'), '2026-08-20').sourceDays).toBe(10);
  });

  it('earns nothing for a record started and transferred on the same day', () => {
    const result = buildTransferAllocation(300000, 300000, 300000, day('2026-09-11'), '2026-09-11');

    expect(result).toMatchObject({ sourceDays: 0, sourceEarned: 0, movedAmount: 300000 });
  });

  it('reads today in Tashkent time', () => {
    expect(todayInCenterTimeZone(new Date('2026-10-01T18:59:00Z')).toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(todayInCenterTimeZone(new Date('2026-10-01T19:00:00Z')).toISOString().slice(0, 10)).toBe('2026-10-02');
  });
});
