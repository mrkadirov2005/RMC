import { describe, expect, it } from 'vitest';
import { getListRowBackground } from '../listAppearance';

describe('list row appearance', () => {
  it('alternates the shared primary and gray row colors', () => {
    expect(getListRowBackground(0)).toBe('var(--list-row-primary)');
    expect(getListRowBackground(1)).toBe('var(--list-row-alternate)');
    expect(getListRowBackground(2)).toBe('var(--list-row-primary)');
  });
});
