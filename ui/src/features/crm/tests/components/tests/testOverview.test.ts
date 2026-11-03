import { describe, expect, it } from 'vitest';
import { buildTestStatTiles } from '../TestStatTiles';

const totals = (overrides = {}) => ({
  tests: 78,
  active: 61,
  submissions: 1284,
  awaiting_grading: 94,
  average_score: 72.4,
  pass_rate: 68,
  ...overrides,
});

describe('headline tiles', () => {
  it('shows four figures, with inactive folded into a caption', () => {
    const tiles = buildTestStatTiles(totals());

    expect(tiles.map((tile) => tile.label)).toEqual([
      'Total tests',
      'Submissions',
      'Average score',
      'Pass rate',
    ]);
    expect(tiles[0].caption).toBe('61 active');
  });

  it('formats the score measures as percentages', () => {
    const tiles = buildTestStatTiles(totals());

    expect(tiles[2].value).toBe('72.4%');
    expect(tiles[3].value).toBe('68%');
  });

  it('shows a dash rather than a zero when nothing has been graded', () => {
    const tiles = buildTestStatTiles(totals({ average_score: null, pass_rate: null }));

    expect(tiles[2].value).toBe('—');
    expect(tiles[3].value).toBe('—');
  });

  it('says so plainly when the grading queue is empty', () => {
    const tiles = buildTestStatTiles(totals({ awaiting_grading: 0 }));

    expect(tiles[1].caption).toBe('nothing awaiting grading');
  });

  it('counts the grading queue when there is one', () => {
    const tiles = buildTestStatTiles(totals({ awaiting_grading: 3 }));

    expect(tiles[1].caption).toBe('3 awaiting grading');
  });
});
