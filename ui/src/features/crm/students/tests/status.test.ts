import { describe, expect, it } from 'vitest';
import { getStatusVariant, isTransferredStudentStatus } from '../status';

describe('student status presentation', () => {
  it('recognizes transferred status regardless of casing and whitespace', () => {
    expect(isTransferredStudentStatus('Transferred')).toBe(true);
    expect(isTransferredStudentStatus(' transferred ')).toBe(true);
    expect(isTransferredStudentStatus('Active')).toBe(false);
    expect(isTransferredStudentStatus(undefined)).toBe(false);
  });

  it('uses a visible light and dark theme treatment for transferred students', () => {
    const classes = getStatusVariant('Transferred');

    expect(classes).toContain('bg-amber-100');
    expect(classes).toContain('text-amber-900');
    expect(classes).toContain('dark:bg-amber-950/60');
    expect(classes).toContain('dark:text-amber-200');
  });
});
