import { describe, expect, it } from 'vitest';
import { clockLabels, eventPosition, timeToMinutes } from '../timeGridModel';

describe('calendar time grid', () => {
  it('provides the complete midnight-to-midnight clock axis', () => {
    expect(clockLabels).toHaveLength(25);
    expect(clockLabels[0]).toBe('00:00');
    expect(clockLabels[24]).toBe('24:00');
  });

  it('positions lessons according to their real time and duration', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(eventPosition('09:30', '11:00')).toEqual({ top: 494, height: 78 });
  });
});
