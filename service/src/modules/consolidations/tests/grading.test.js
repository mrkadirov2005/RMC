const { isAnswerCorrect } = require('../grading');

describe('consolidations grading — isAnswerCorrect', () => {
  it('matches case-insensitively', () => {
    expect(isAnswerCorrect('SALOM', ['salom'])).toBe(true);
  });

  it('matches after trimming leading/trailing whitespace', () => {
    expect(isAnswerCorrect('  salom  ', ['salom'])).toBe(true);
  });

  it('matches against any entry in the translations array, not just the first', () => {
    expect(isAnswerCorrect('assalomu aleykum', ['salom', 'assalom', 'assalomu aleykum'])).toBe(true);
  });

  it('rejects a wrong-but-close answer — no accidental fuzzy match', () => {
    expect(isAnswerCorrect('salo', ['salom'])).toBe(false);
    expect(isAnswerCorrect('salomm', ['salom'])).toBe(false);
  });

  it('rejects an empty or blank answer even against an empty-string translation', () => {
    expect(isAnswerCorrect('', ['salom'])).toBe(false);
    expect(isAnswerCorrect(null, ['salom'])).toBe(false);
    expect(isAnswerCorrect('   ', ['salom'])).toBe(false);
  });

  it('rejects when there are no translations to match against', () => {
    expect(isAnswerCorrect('salom', [])).toBe(false);
  });
});
