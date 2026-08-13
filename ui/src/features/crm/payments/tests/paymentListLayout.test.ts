import { describe, expect, it } from 'vitest';
import { GROUP_PAYMENT_TABLE_CLASS } from '../paymentListLayout';

describe('selected group payment table layout', () => {
  it('fills the available width without a centered max-width constraint', () => {
    expect(GROUP_PAYMENT_TABLE_CLASS).toContain('w-full');
    expect(GROUP_PAYMENT_TABLE_CLASS).toContain('min-w-[720px]');
    expect(GROUP_PAYMENT_TABLE_CLASS).not.toContain('max-w-');
    expect(GROUP_PAYMENT_TABLE_CLASS).not.toContain('mx-auto');
  });
});
