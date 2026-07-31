import { describe, expect, it } from 'vitest';
import { buildPageNumbers, clampPage, getPaginatedRowNumber, paginateItems } from '../pagination';

describe('pagination helpers', () => {
  it('clamps pages into a valid range', () => {
    expect(clampPage(-5, 10)).toBe(1);
    expect(clampPage(99, 10)).toBe(10);
    expect(clampPage(3, 10)).toBe(3);
    expect(clampPage(3, 0)).toBe(1);
  });

  it('paginates items and returns display boundaries', () => {
    const result = paginateItems(['a', 'b', 'c', 'd', 'e'], 2, 2);

    expect(result).toEqual({
      currentPage: 2,
      totalPages: 3,
      start: 2,
      end: 4,
      items: ['c', 'd'],
    });
  });

  it('builds compact page number windows', () => {
    expect(buildPageNumbers(5, 10)).toEqual([1, 4, 5, 6, 10]);
    expect(buildPageNumbers(1, 3)).toEqual([1, 2, 3]);
  });
});

describe('getPaginatedRowNumber', () => {
  it('continues numbering across server-paginated pages', () => {
    expect(getPaginatedRowNumber(0, 1, 10)).toBe(1);
    expect(getPaginatedRowNumber(0, 2, 10)).toBe(11);
    expect(getPaginatedRowNumber(9, 3, 10)).toBe(30);
  });
});
