import { describe, expect, it } from 'vitest';
import { getStatusVariant, isIncomingTransfer, isTransferredStudentStatus } from '../status';

describe('student status presentation', () => {
  it('recognizes transferred status regardless of casing and whitespace', () => {
    expect(isTransferredStudentStatus('Transferred')).toBe(true);
    expect(isTransferredStudentStatus(' transferred ')).toBe(true);
    expect(isTransferredStudentStatus('Active')).toBe(false);
    expect(isTransferredStudentStatus(undefined)).toBe(false);
  });

  it('uses a red/"left" theme treatment for a student transferred out of a class', () => {
    const classes = getStatusVariant('Transferred');

    expect(classes).toContain('bg-rose-100');
    expect(classes).toContain('text-rose-900');
    expect(classes).toContain('dark:bg-rose-950/60');
    expect(classes).toContain('dark:text-rose-200');
  });

  it('flags a student as an incoming transfer only when active with a previous class on record', () => {
    expect(isIncomingTransfer({ status: 'Active', previous_class_id: 12 })).toBe(true);
    expect(isIncomingTransfer({ status: 'Active', previous_class_id: null })).toBe(false);
    expect(isIncomingTransfer({ status: 'Transferred', previous_class_id: 12 })).toBe(false);
    expect(isIncomingTransfer(null)).toBe(false);
  });
});
