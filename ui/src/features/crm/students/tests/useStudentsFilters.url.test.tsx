import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useStudentsFilters } from '../hooks/useStudentsFilters';

const at = (url: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;

describe('students list state in the address', () => {
  it('comes back after a reload: search, filters, page and page size', () => {
    const { result } = renderHook(() => useStudentsFilters([]), { wrapper: at('/students?q=gul&status=Active&teacher_id=7&page=3&limit=50') });
    expect(result.current.studentParams).toMatchObject({ q: 'gul', status: 'Active', teacher_id: '7', page: 3, limit: 50 });
    expect(result.current.page).toBe(3);
    expect(result.current.showFilters).toBe(true);
  });

  it('a new search or filter goes back to page 1; clearing resets everything', () => {
    const { result } = renderHook(() => useStudentsFilters([]), { wrapper: at('/students?page=4') });
    expect(result.current.page).toBe(4);
    act(() => result.current.setFilterGender('Female'));
    expect(result.current.page).toBe(1);
    expect(result.current.filterGender).toBe('Female');
    act(() => result.current.setPage(2));
    act(() => result.current.clearFilters());
    expect(result.current.studentParams).toMatchObject({ q: undefined, gender: undefined, page: 1, limit: 20 });
    expect(result.current.hasActiveFilters).toBe(false);
  });
});
