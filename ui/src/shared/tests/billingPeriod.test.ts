import { describe, expect, it } from 'vitest';
import {
  coversExpectedAmount,
  getFeeToCollectThisMonth,
  getCenterMonthKey,
  getDaysInGroupForMonth,
  getExpectedAmountForMonth,
  wasInGroupOn,
} from '../billingPeriod';

describe('billing period', () => {
  it('bills records without dates for the whole month, exactly as before', () => {
    expect(getExpectedAmountForMonth({}, 600000, '2026-10')).toBe(600000);
    expect(getExpectedAmountForMonth(null, '450000', '2026-10')).toBe(450000);
    expect(getExpectedAmountForMonth({ start_date: null, end_date: null }, 600000, '2026-02')).toBe(600000);
  });

  it('bills the old group for the days before the transfer', () => {
    expect(getDaysInGroupForMonth({ end_date: '2026-10-10' }, '2026-10')).toEqual({ days: 10, totalDays: 31 });
    expect(getExpectedAmountForMonth({ end_date: '2026-10-10' }, 600000, '2026-10')).toBe(193548.39);
  });

  it('bills the new group from the transfer day to the end of the month', () => {
    expect(getExpectedAmountForMonth({ start_date: '2026-10-11' }, 450000, '2026-10')).toBe(304838.71);
  });

  it('matches the backend split so a transferred payment counts as fully paid', () => {
    const earned = getExpectedAmountForMonth({ end_date: '2026-10-10' }, 600000, '2026-10');
    expect(coversExpectedAmount(600000 - 406451.61, earned)).toBe(true);
    expect(coversExpectedAmount(193548.37, earned)).toBe(false);
  });

  it('bills full months after the start and nothing outside the record', () => {
    expect(getExpectedAmountForMonth({ start_date: '2026-10-11' }, 450000, '2026-11')).toBe(450000);
    expect(getExpectedAmountForMonth({ start_date: '2026-10-11' }, 450000, '2026-09')).toBe(0);
    expect(getExpectedAmountForMonth({ end_date: '2026-10-10' }, 600000, '2026-11')).toBe(0);
    expect(getExpectedAmountForMonth({ end_date: '2026-09-30' }, 600000, '2026-10')).toBe(0);
  });

  it('handles a start and end inside the same month', () => {
    expect(getDaysInGroupForMonth({ start_date: '2026-09-05', end_date: '2026-09-10' }, '2026-09')).toEqual({ days: 6, totalDays: 30 });
  });

  it('uses the real length of February', () => {
    expect(getDaysInGroupForMonth({ start_date: '2028-02-15' }, '2028-02')).toEqual({ days: 15, totalDays: 29 });
  });

  it('accepts timestamps as well as plain dates', () => {
    expect(getExpectedAmountForMonth({ start_date: '2026-10-11T00:00:00.000Z' }, 310000, '2026-10')).toBe(210000);
  });

  it('knows whether a record was in its group on a day', () => {
    const left = { end_date: '2026-10-10' };
    expect(wasInGroupOn(left, '2026-10-10')).toBe(true);
    expect(wasInGroupOn(left, '2026-10-11')).toBe(false);
    expect(wasInGroupOn({ start_date: '2026-10-11' }, '2026-10-10')).toBe(false);
    expect(wasInGroupOn({}, '2026-10-11')).toBe(true);
    expect(wasInGroupOn(left, '')).toBe(true);
  });

  it('reads the month in Tashkent time', () => {
    expect(getCenterMonthKey(new Date('2026-09-30T18:59:00Z'))).toBe('2026-09');
    expect(getCenterMonthKey(new Date('2026-09-30T19:00:00Z'))).toBe('2026-10');
  });
});

describe('getFeeToCollectThisMonth', () => {
  const october20 = new Date('2026-10-20T09:00:00Z');

  it('fills in only the days from the start date, rounded up to whole so\'m', () => {
    // 12 of 31 days of 320,000 is 123,870.97.
    expect(getFeeToCollectThisMonth({ start_date: '2026-10-20' }, 320000, october20)).toBe(123871);
  });

  it('fills in the whole fee without a start date or once the start month is over', () => {
    expect(getFeeToCollectThisMonth({}, 320000, october20)).toBe(320000);
    expect(getFeeToCollectThisMonth({ start_date: '2026-09-10' }, 320000, october20)).toBe(320000);
  });

  it('fills in the whole fee for a student paying ahead of a later start', () => {
    expect(getFeeToCollectThisMonth({ start_date: '2026-11-05' }, 320000, october20)).toBe(320000);
  });
});

describe('billing by lessons (12 a month)', () => {
  // October 2026: Mon/Wed/Fri has 13 lesson days; Oct 1 is a Thursday.
  const mwf = ['Monday', 'Wednesday', 'Friday'];

  it('a whole month is the full price, even with 13 lesson days', () => {
    expect(getExpectedAmountForMonth({}, 320000, '2026-10', mwf)).toBe(320000);
  });

  it('a student who joins partway pays price / 12 per lesson left', () => {
    // From Tue 6 Oct: Wed 7, Fri 9, Mon 12 ... Fri 30 = 11 lessons.
    expect(getExpectedAmountForMonth({ start_date: '2026-10-06' }, 320000, '2026-10', mwf)).toBe(293333.33);
    // From Mon 26 Oct: Mon 26, Wed 28, Fri 30 = 3 lessons.
    expect(getExpectedAmountForMonth({ start_date: '2026-10-26' }, 300000, '2026-10', mwf)).toBe(75000);
  });

  it('never more than the full price', () => {
    // From Fri 2 Oct: 13 lessons, capped at 12.
    expect(getExpectedAmountForMonth({ start_date: '2026-10-02' }, 300000, '2026-10', mwf)).toBe(300000);
  });

  it('a student who leaves partway pays for the lessons until they left', () => {
    // Until Mon 5 Oct: Fri 2, Mon 5 = 2 lessons.
    expect(getExpectedAmountForMonth({ end_date: '2026-10-05' }, 340000, '2026-10', mwf)).toBe(56666.67);
  });

  it('takes the lesson days from the loaded group schedules by class_id', async () => {
    const { setGroupPricesForTest } = await import('../groupPrices');
    setGroupPricesForTest({}, { '35': mwf });
    expect(getExpectedAmountForMonth({ class_id: 35, start_date: '2026-10-26' }, 300000, '2026-10')).toBe(75000);
    setGroupPricesForTest({});
  });

  it('a group without lesson days goes by calendar days', () => {
    expect(getExpectedAmountForMonth({ start_date: '2026-10-06' }, 310000, '2026-10', [])).toBe(260000);
  });
});
