import { describe, expect, it } from 'vitest';
import { handleApiError } from '../toast';

describe('handleApiError', () => {
  it('formats validation details before generic errors', () => {
    const message = handleApiError({
      response: {
        data: {
          error: 'Validation failed',
          details: [
            { field: 'first_name', message: 'first_name should not be empty' },
            { field: 'email', message: 'email must be an email' },
          ],
        },
      },
    });

    expect(message).toBe('first_name: first_name should not be empty\nemail: email must be an email');
  });

  it('falls back to backend error text', () => {
    expect(handleApiError({ response: { data: { error: 'Username already exists' } } })).toBe('Username already exists');
  });
});
