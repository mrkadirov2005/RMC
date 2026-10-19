import { describe, expect, it } from 'vitest';
import { studentMonthChange } from '../monthChange';

describe('retention month change', () => {
  it('shows more leavers than last month as a loss', () => {
    expect(studentMonthChange('retention', 157, 15700)).toEqual({ value: '-157', percent: '-15700%', direction: 'loss' });
  });

  it('shows fewer leavers than last month as a gain', () => {
    expect(studentMonthChange('retention', -4, -20)).toEqual({ value: '+4', percent: '+20%', direction: 'gain' });
  });

  it('shows more new students than last month as a gain', () => {
    expect(studentMonthChange('intake', 30, 12.5)).toEqual({ value: '+30', percent: '+12.5%', direction: 'gain' });
  });

  it('shows no change as flat', () => {
    expect(studentMonthChange('retention', 0, 0)).toEqual({ value: '0', percent: '0%', direction: 'flat' });
  });
});
