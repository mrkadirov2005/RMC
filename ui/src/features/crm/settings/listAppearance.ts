export const LIST_ROW_PRIMARY_KEY = 'list_row_primary_color';
export const LIST_ROW_ALTERNATE_KEY = 'list_row_alternate_color';

export const DEFAULT_LIST_ROW_PRIMARY = '#ffffff';
export const DEFAULT_LIST_ROW_ALTERNATE = '#e5e7eb';

export const readListRowColors = () => {
  try {
    return {
      primary: localStorage.getItem(LIST_ROW_PRIMARY_KEY) || DEFAULT_LIST_ROW_PRIMARY,
      alternate: localStorage.getItem(LIST_ROW_ALTERNATE_KEY) || DEFAULT_LIST_ROW_ALTERNATE,
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
