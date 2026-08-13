import { describe, expect, it } from 'vitest';
import reducer, { fetchTeachers } from '../teachersSlice';

const result = (name: string) => ({
  items: [{ teacher_id: 1, first_name: name }] as never[],
  meta: { total: 1, page: 1, limit: 24 },
});

describe('teachers list request ordering', () => {
  it('does not let an older response replace newer search results', () => {
    let state = reducer(undefined, fetchTeachers.pending('old-request', { page: 1, limit: 24 }));
    state = reducer(state, fetchTeachers.pending('search-request', { q: 'Ali', page: 1, limit: 24 }));
    state = reducer(state, fetchTeachers.fulfilled(result('Unfiltered'), 'old-request', { page: 1, limit: 24 }));

    expect(state.loading).toBe(true);
    expect(state.items).toEqual([]);

    state = reducer(state, fetchTeachers.fulfilled(result('Ali'), 'search-request', { q: 'Ali', page: 1, limit: 24 }));
    expect(state.loading).toBe(false);
    expect(state.items[0].first_name).toBe('Ali');
  });
});
