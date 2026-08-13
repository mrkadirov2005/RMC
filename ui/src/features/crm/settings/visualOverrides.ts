import { getReadableTextColor } from './ownerPalette';

export type VisualOverride = {
  key: string;
  color?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: '400' | '500' | '600' | '700';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
};

export const VISUAL_STYLE_SELECTOR = '.owner-primary-card,.owner-secondary-tag,.owner-tertiary-card,[data-owner-color-target],[data-owner-style-target],button,a,label,h1,h2,h3,h4,h5,h6,p,span,th,td,[role="button"]';

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 120);

export const findColorSurface = (target: EventTarget | null) => target instanceof HTMLElement
  ? target.closest('.owner-primary-card,.owner-secondary-tag,.owner-tertiary-card,[data-owner-color-target]') as HTMLElement | null
  : null;

export const markVisualStyleTarget = (element: HTMLElement | null) => {
  if (element) element.dataset.ownerStyleTarget = 'true';
  return element;
};

export const getVisualOverrideKey = (element: HTMLElement, pathname = window.location.hash.replace(/^#/, '') || window.location.pathname) => {
  const semantic = element.classList.contains('owner-primary-card') ? 'primary'
    : element.classList.contains('owner-secondary-tag') ? 'secondary'
      : element.classList.contains('owner-tertiary-card') ? 'tertiary'
        : element.matches('[data-owner-color-target]') ? 'card' : 'text';
  const explicit = element.dataset.ownerColorTarget;
  return `${pathname.split('?')[0]}|${semantic}|${explicit || normalize(element.textContent || element.getAttribute('aria-label') || '')}`;
};

export const applyVisualOverrides = (overrides: VisualOverride[], root: ParentNode = document) => {
  const styles = new Map(overrides.map((item) => [item.key, item]));
  root.querySelectorAll<HTMLElement>(VISUAL_STYLE_SELECTOR).forEach((element) => {
    const style = styles.get(getVisualOverrideKey(element));
    if (!style) return;
    if (style.color) element.style.setProperty('background', style.color, 'important');
    const textColor = style.textColor || (style.color ? getReadableTextColor(style.color) : undefined);
    if (textColor) element.style.setProperty('color', textColor, 'important');
    if (style.fontSize) element.style.setProperty('font-size', `${style.fontSize}px`, 'important');
    if (style.fontWeight) element.style.setProperty('font-weight', style.fontWeight, 'important');
    if (style.fontStyle) element.style.setProperty('font-style', style.fontStyle, 'important');
    if (style.textDecoration) element.style.setProperty('text-decoration', style.textDecoration, 'important');
  });
};
