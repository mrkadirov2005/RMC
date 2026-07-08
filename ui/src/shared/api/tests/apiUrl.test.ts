import { describe, expect, it } from 'vitest';
import { API_BASE_URL, buildApiUrl } from '../api';

describe('API URL helpers', () => {
  it('normalizes the base URL trailing slash', () => {
    expect(API_BASE_URL.endsWith('/')).toBe(false);
  });

  it('joins API paths without double slashes', () => {
    expect(buildApiUrl('/health')).toBe(`${API_BASE_URL}/health`);
    expect(buildApiUrl('students')).toBe(`${API_BASE_URL}/students`);
  });
});
