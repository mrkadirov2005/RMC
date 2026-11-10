import { describe, expect, it } from 'vitest';
import { attendanceRate, describeOutcome, formatDuration } from '../journeyModel';

const t = (key: string, vars?: Record<string, unknown>) =>
  Object.entries(vars || {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), key);

describe('journey model', () => {
  it('formats durations in years, months and days', () => {
    expect(formatDuration(0, t as any)).toBe('0 d');
    expect(formatDuration(35, t as any)).toBe('1 mo 5 d');
    expect(formatDuration(365 + 60, t as any)).toBe('1 y 2 mo');
  });

  it('works out attendance only from marked lessons', () => {
    expect(attendanceRate(0, 0)).toBeNull();
    expect(attendanceRate(9, 1)).toBe(90);
  });

  it('describes how a stretch with a teacher ended', () => {
    expect(describeOutcome('left: Boshqa markazga ketdi', t as any)).toBe('Left the center: Boshqa markazga ketdi');
    expect(describeOutcome('transferred', t as any)).toBe('Transferred');
    expect(describeOutcome('active', t as any)).toBe('Still studying');
  });
});
