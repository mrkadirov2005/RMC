export type VisualOverride = { key: string; color: string };

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 120);

export const findColorSurface = (target: EventTarget | null) => target instanceof HTMLElement
  ? target.closest('.owner-primary-card,.owner-secondary-tag,.owner-tertiary-card,[data-owner-color-target]') as HTMLElement | null
  : null;

export const getVisualOverrideKey = (element: HTMLElement, pathname = window.location.hash.replace(/^#/, '') || window.location.pathname) => {
  const semantic = element.classList.contains('owner-primary-card') ? 'primary'
    : element.classList.contains('owner-secondary-tag') ? 'secondary'
      : element.classList.contains('owner-tertiary-card') ? 'tertiary' : 'card';
  const explicit = element.dataset.ownerColorTarget;
  return `${pathname.split('?')[0]}|${semantic}|${explicit || normalize(element.textContent || element.getAttribute('aria-label') || '')}`;
};

export const applyVisualOverrides = (overrides: VisualOverride[], root: ParentNode = document) => {
  const colors = new Map(overrides.map((item) => [item.key, item.color]));
  root.querySelectorAll<HTMLElement>('.owner-primary-card,.owner-secondary-tag,.owner-tertiary-card,[data-owner-color-target]').forEach((element) => {
    const color = colors.get(getVisualOverrideKey(element));
    if (color) element.style.setProperty('background', color, 'important');
  });
};
