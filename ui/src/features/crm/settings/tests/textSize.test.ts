import { afterEach, describe, expect, it } from 'vitest';
import { applyTextSize, getTextSizeRole, normalizeTextSizes } from '../textSize';

describe('text size', () => {
  afterEach(() => applyTextSize('normal'));

  it('maps each signed-in account to its type', () => {
    expect(getTextSizeRole({ userType: 'superuser', role: 'owner' })).toBe('owner');
    expect(getTextSizeRole({ userType: 'superuser', role: 'admin' })).toBe('admin');
    expect(getTextSizeRole({ userType: 'teacher' })).toBe('teacher');
    expect(getTextSizeRole({ userType: 'student' })).toBe('student');
    expect(getTextSizeRole(null)).toBeNull();
  });

  it('keeps valid sizes and defaults the rest to normal', () => {
    expect(normalizeTextSizes({ teacher: 'xlarge', student: 'giant' })).toEqual({ owner: 'normal', admin: 'normal', teacher: 'xlarge', student: 'normal' });
  });

  it('scales the root font size, and normal clears it', () => {
    applyTextSize('large');
    expect(document.documentElement.style.fontSize).toBe('18.4px');
    applyTextSize('xlarge');
    expect(document.documentElement.style.fontSize).toBe('20.8px');
    applyTextSize('normal');
    expect(document.documentElement.style.fontSize).toBe('');
  });
});
