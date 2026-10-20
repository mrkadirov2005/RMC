import { describe, expect, it } from 'vitest';
import { applyFilters, buildOptions, emptyFilters, isFiltered, NONE, tashkentDay, type ArchiveTabConfig } from '../archiveFilters';

type Row = { id: number; name: string; phone?: string; reason_id: number | null; reason_name?: string; deleted_at: string };
const rows: Row[] = [
  { id: 1, name: "Gulruh Mamatova", phone: '901112233', reason_id: 33, reason_name: 'Finished', deleted_at: '2026-10-03T08:00:00Z' },
  { id: 2, name: "Bo'ri Karimov", reason_id: 35, reason_name: 'Disliked teacher', deleted_at: '2026-10-16T20:30:00Z' },
  { id: 3, name: 'Ali Valiyev', reason_id: 33, reason_name: 'Finished', deleted_at: '2026-09-30T10:00:00Z' },
  { id: 4, name: 'Sardor Aliyev', reason_id: null, deleted_at: '2026-10-10T10:00:00Z' },
];
const config: ArchiveTabConfig<Row> = {
  searchText: (row) => [row.name, row.phone, row.reason_name],
  selects: [{ key: 'reason', label: 'Reason', value: (row) => row.reason_id, optionLabel: (row) => row.reason_name || '', emptyLabel: 'No reason' }],
  date: (row) => row.deleted_at,
};
const ids = (list: Row[]) => list.map((row) => row.id);

describe('archive filters', () => {
  it('nothing chosen shows everything', () => {
    expect(ids(applyFilters(rows, config, emptyFilters()))).toEqual([1, 2, 3, 4]);
    expect(isFiltered(emptyFilters())).toBe(false);
  });

  it('search matches every word, any case, ignoring apostrophes', () => {
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), q: 'ali' }))).toEqual([3, 4]);
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), q: 'ALI valiyev' }))).toEqual([3]);
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), q: 'bo‘ri' }))).toEqual([2]);
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), q: '1112233' }))).toEqual([1]);
  });

  it('filters by a chosen value, or by "not set"', () => {
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), selects: { reason: '33' } }))).toEqual([1, 3]);
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), selects: { reason: NONE } }))).toEqual([4]);
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), selects: { reason: 'all' } }))).toEqual([1, 2, 3, 4]);
  });

  it('the date range uses the Tashkent day and includes both ends', () => {
    // 16 Oct 20:30 UTC is already 17 Oct in Tashkent.
    expect(tashkentDay('2026-10-16T20:30:00Z')).toBe('2026-10-17');
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), from: '2026-10-01', to: '2026-10-16' }))).toEqual([1, 4]);
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), from: '2026-10-17' }))).toEqual([2]);
    expect(ids(applyFilters(rows, config, { ...emptyFilters(), to: '2026-09-30' }))).toEqual([3]);
  });

  it('filters combine', () => {
    expect(ids(applyFilters(rows, config, { q: 'ali', from: '2026-10-01', to: '', selects: { reason: NONE } }))).toEqual([4]);
  });

  it('offers only the values that occur, most used first, "not set" last, with counts', () => {
    expect(buildOptions(rows, config.selects[0])).toEqual([
      { value: '33', label: 'Finished', count: 2 },
      { value: '35', label: 'Disliked teacher', count: 1 },
      { value: NONE, label: 'No reason', count: 1 },
    ]);
  });
});
