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

  it('keeps valid sizes and starts the rest at large', () => {
    expect(normalizeTextSizes({ teacher: 'xlarge', student: 'giant', admin: 'xxlarge', owner: 'normal' })).toEqual({ owner: 'normal', admin: 'xxlarge', teacher: 'xlarge', student: 'large' });
    expect(normalizeTextSizes(null)).toEqual({ owner: 'large', admin: 'large', teacher: 'large', student: 'large' });
  });

  it('scales the root font size, and normal clears it', () => {
    applyTextSize('large');
    expect(document.documentElement.style.fontSize).toBe('18.4px');
    applyTextSize('xlarge');
    expect(document.documentElement.style.fontSize).toBe('20.8px');
    applyTextSize('xxlarge');
    expect(document.documentElement.style.fontSize).toBe('23.2px');
    applyTextSize('normal');
    expect(document.documentElement.style.fontSize).toBe('');
  });
});
