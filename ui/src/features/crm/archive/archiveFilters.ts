// Search and filters for the archive tabs. The archive is small and loaded whole, so filtering
// runs in the browser. Each tab names the text it searches and the fields it can filter by; the
// choices for a filter come from the rows themselves, so only values that occur are offered.

export type FilterOption = { value: string; label: string; count: number };

export type SelectFilter<Row> = {
  key: string;
  label: string;
  /** The row's value for this filter; '' or null means "not set". */
  value: (row: Row) => string | number | null | undefined;
  /** Shown for a value; defaults to the value. */
  optionLabel?: (row: Row) => string;
  /** Label for rows with no value (offered only when some row has none). */
  emptyLabel?: string;
};

export type ArchiveTabConfig<Row> = {
  /** Text the search box looks in. */
  searchText: (row: Row) => Array<string | number | null | undefined>;
  selects: SelectFilter<Row>[];
  /** The date the From/To range applies to (e.g. when the record was archived). */
  date: (row: Row) => string | null | undefined;
};

export type ArchiveFilterState = { q: string; from: string; to: string; selects: Record<string, string> };

export const ALL = 'all';
export const NONE = '__none__';
export const emptyFilters = (): ArchiveFilterState => ({ q: '', from: '', to: '', selects: {} });

export const isFiltered = (filters: ArchiveFilterState) =>
  Boolean(filters.q.trim() || filters.from || filters.to || Object.values(filters.selects).some((value) => value && value !== ALL));

// Lower case without the apostrophe variants Uzbek names are typed with (o'/o‘/oʻ), so "Gulruh"
// and "gulruh", "Bo'ri" and "Bo‘ri" match.
const normalize = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[‘’ʻʼ`']/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** A timestamp's calendar day in Tashkent, YYYY-MM-DD (a plain YYYY-MM-DD date stays as it is). */
export const tashkentDay = (value: string | null | undefined) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
};

const keyOf = (value: unknown) => (value === null || value === undefined || value === '' ? NONE : String(value));

/** The choices for each filter, most used first, with how many rows have each. */
export const buildOptions = <Row>(rows: Row[], filter: SelectFilter<Row>): FilterOption[] => {
  const options = new Map<string, FilterOption>();
  rows.forEach((row) => {
    const value = keyOf(filter.value(row));
    const existing = options.get(value);
    if (existing) {
      existing.count += 1;
      return;
    }
    const label = value === NONE ? filter.emptyLabel || '—' : (filter.optionLabel?.(row) || String(filter.value(row)));
    options.set(value, { value, label, count: 1 });
  });
  return [...options.values()].sort((a, b) => {
    if (a.value === NONE) return 1;
    if (b.value === NONE) return -1;
    return b.count - a.count || a.label.localeCompare(b.label);
  });
};

/** Rows matching every word of the search, each chosen filter and the date range. */
export const applyFilters = <Row>(rows: Row[], config: ArchiveTabConfig<Row>, filters: ArchiveFilterState) => {
  const words = normalize(filters.q).split(' ').filter(Boolean);
  return rows.filter((row) => {
    if (words.length) {
      const text = normalize(config.searchText(row).filter((part) => part !== null && part !== undefined).join(' '));
      if (!words.every((word) => text.includes(word))) return false;
    }
    for (const filter of config.selects) {
      const chosen = filters.selects[filter.key];
      if (chosen && chosen !== ALL && keyOf(filter.value(row)) !== chosen) return false;
    }
    if (filters.from || filters.to) {
      const day = tashkentDay(config.date(row));
      if (!day) return false;
      if (filters.from && day < filters.from) return false;
      if (filters.to && day > filters.to) return false;
    }
    return true;
  });
};
