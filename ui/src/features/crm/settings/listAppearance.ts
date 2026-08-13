export const LIST_ROW_PRIMARY_KEY = 'list_row_primary_color';
export const LIST_ROW_ALTERNATE_KEY = 'list_row_alternate_color';

export const DEFAULT_LIST_ROW_PRIMARY = '#ffffff';
export const DEFAULT_LIST_ROW_ALTERNATE = '#f1f5f9';

export const getListRowBackground = (index: number) =>
  `var(${index % 2 === 0 ? '--list-row-primary' : '--list-row-alternate'})`;

export const readListRowColors = () => {
  try {
    return {
      primary: localStorage.getItem(LIST_ROW_PRIMARY_KEY) || DEFAULT_LIST_ROW_PRIMARY,
      alternate: (() => {
        const stored = localStorage.getItem(LIST_ROW_ALTERNATE_KEY);
        return !stored || stored.toLowerCase() === '#e5e7eb' ? DEFAULT_LIST_ROW_ALTERNATE : stored;
      })(),
    };
  } catch {
    return { primary: DEFAULT_LIST_ROW_PRIMARY, alternate: DEFAULT_LIST_ROW_ALTERNATE };
  }
};

export const applyListRowColors = (primary: string, alternate: string) => {
  document.documentElement.style.setProperty('--list-row-primary', primary);
  document.documentElement.style.setProperty('--list-row-alternate', alternate);
};

export const initializeListRowColors = () => {
  const colors = readListRowColors();
  applyListRowColors(colors.primary, colors.alternate);
};
