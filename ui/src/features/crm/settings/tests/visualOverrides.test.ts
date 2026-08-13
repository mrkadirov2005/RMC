import { beforeEach, describe, expect, it } from 'vitest';
import { applyVisualOverrides, getVisualOverrideKey, markVisualStyleTarget } from '../visualOverrides';

describe('visual overrides', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/students');
  });

  it('applies editable text color, size, weight, italic, and underline styles', () => {
    const element = markVisualStyleTarget(document.createElement('span'))!;
    element.textContent = 'Active';
    document.body.appendChild(element);
    const key = getVisualOverrideKey(element, '/students');

    applyVisualOverrides([{ key, textColor: '#112233', fontSize: 18, fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline' }]);

    expect(element.style.getPropertyValue('color')).toBe('rgb(17, 34, 51)');
    expect(element.style.getPropertyValue('font-size')).toBe('18px');
    expect(element.style.getPropertyValue('font-weight')).toBe('700');
    expect(element.style.getPropertyValue('font-style')).toBe('italic');
    expect(element.style.getPropertyValue('text-decoration')).toBe('underline');
  });

  it('keeps legacy background-only overrides readable', () => {
    const element = document.createElement('span');
    element.className = 'owner-secondary-tag';
    element.textContent = 'Active';
    document.body.appendChild(element);
    const key = getVisualOverrideKey(element, '/students');

    applyVisualOverrides([{ key, color: '#ffffff' }]);

    expect(element.style.getPropertyValue('background')).toBe('rgb(255, 255, 255)');
    expect(element.style.getPropertyValue('color')).toBe('rgb(17, 24, 39)');
  });
});
