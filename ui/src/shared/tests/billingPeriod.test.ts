import { describe, expect, it } from 'vitest';
import {
  coversExpectedAmount,
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
