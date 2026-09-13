import { describe, expect, it } from 'vitest';
import { buildTypeSlices } from '../TestTypeChart';
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

describe('type slices', () => {
  it('orders the types largest first', () => {
    const slices = buildTypeSlices([
      { test_type: 'essay', tests: 16 },
      { test_type: 'multiple_choice', tests: 33 },
    ]);

    expect(slices.map((slice) => slice.key)).toEqual(['multiple_choice', 'essay']);
  });

  it('leaves a short list alone rather than folding it', () => {
    const slices = buildTypeSlices([
      { test_type: 'multiple_choice', tests: 5 },
      { test_type: 'essay', tests: 4 },
      { test_type: 'short_answer', tests: 3 },
      { test_type: 'true_false', tests: 2 },
      { test_type: 'writing', tests: 1 },
    ]);

    expect(slices).toHaveLength(5);
    expect(slices.some((slice) => slice.key === '__other__')).toBe(false);
  });

  it('folds everything past the fourth type into one slice', () => {
    const slices = buildTypeSlices([
      { test_type: 'multiple_choice', tests: 33 },
      { test_type: 'essay', tests: 16 },
      { test_type: 'short_answer', tests: 13 },
      { test_type: 'true_false', tests: 9 },
      { test_type: 'writing', tests: 4 },
      { test_type: 'matching', tests: 3 },
    ]);

    expect(slices).toHaveLength(5);
    const other = slices[4];
    expect(other.key).toBe('__other__');
    expect(other.tests).toBe(7);
    expect(other.types).toEqual(['writing', 'matching']);
  });

  it('names how many types the folded slice covers', () => {
    const slices = buildTypeSlices([
      { test_type: 'multiple_choice', tests: 10 },
      { test_type: 'essay', tests: 9 },
      { test_type: 'short_answer', tests: 8 },
      { test_type: 'true_false', tests: 7 },
      { test_type: 'writing', tests: 3 },
      { test_type: 'matching', tests: 2 },
      { test_type: 'reading_passage', tests: 1 },
    ]);

    expect(slices[4].label).toBe('Other 3 types');
  });

  it('drops a type nobody has used', () => {
    const slices = buildTypeSlices([
      { test_type: 'multiple_choice', tests: 5 },
      { test_type: 'matching', tests: 0 },
    ]);

    expect(slices.map((slice) => slice.key)).toEqual(['multiple_choice']);
  });

  it('breaks a tie on the type name so the ring does not reshuffle', () => {
    const slices = buildTypeSlices([
      { test_type: 'essay', tests: 4 },
      { test_type: 'true_false', tests: 4 },
      { test_type: 'writing', tests: 4 },
    ]);

    expect(slices.map((slice) => slice.key)).toEqual(['essay', 'true_false', 'writing']);
  });

  it('answers with nothing when the centre has no tests', () => {
    expect(buildTypeSlices([])).toEqual([]);
  });

  it('labels each slice with the readable type name', () => {
    const slices = buildTypeSlices([{ test_type: 'multiple_choice', tests: 5 }]);

    expect(slices[0].label).toBe('Multiple Choice');
  });
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
