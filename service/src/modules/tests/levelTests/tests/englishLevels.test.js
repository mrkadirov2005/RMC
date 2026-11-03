jest.mock('../../../../db/pool', () => ({ query: jest.fn(), connect: jest.fn() }));
const { ENGLISH_LEVEL_TESTS, PASS_SHARE } = require('../englishLevels');

// The built-in level tests are hand-written content: check every question is well formed, so a
// typo never makes an unanswerable or wrongly graded question.
describe('English level tests content', () => {
  test('one test per level of the English ladder, in order, each key once', () => {
    expect(ENGLISH_LEVEL_TESTS.map((test) => test.level)).toEqual(['Beginner', 'A1', 'A2', 'A2+', 'B1', 'B2', 'C1']);
    expect(new Set(ENGLISH_LEVEL_TESTS.map((test) => test.key)).size).toBe(ENGLISH_LEVEL_TESTS.length);
    expect(PASS_SHARE).toBe(0.7);
  });

  test.each(ENGLISH_LEVEL_TESTS.map((test) => [test.level, test]))('%s: 12 grammar, 10 vocabulary, 8 reading; a reading text', (_level, test) => {
    const count = (section) => test.questions.filter((question) => question.section === section).length;
    expect([count('grammar'), count('vocabulary'), count('reading')]).toEqual([12, 10, 8]);
    expect(test.passage.content.split(/\s+/).length).toBeGreaterThan(60);
    expect(test.durationMinutes).toBeGreaterThanOrEqual(25);
  });

  test.each(ENGLISH_LEVEL_TESTS.map((test) => [test.level, test]))('%s: every question can be answered and graded', (_level, test) => {
    test.questions.forEach((question) => {
      expect(question.text.trim().length).toBeGreaterThan(3);
      if (question.type === 'multiple_choice') {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((option) => option.trim().toLowerCase())).size).toBe(4);
        expect(Number.isInteger(question.answer)).toBe(true);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(4);
      } else {
        expect(question.type).toBe('true_false');
        expect(typeof question.answer).toBe('boolean');
      }
    });
    // Gap questions show where the answer goes.
    test.questions
      .filter((question) => question.section === 'grammar')
      .forEach((question) => expect(question.text).toMatch(/___/));
  });

  test('the right answer is spread over A-D, so always picking one letter fails', () => {
    ENGLISH_LEVEL_TESTS.forEach((test) => {
      const counts = [0, 0, 0, 0];
      test.questions.filter((question) => question.type === 'multiple_choice').forEach((question) => { counts[question.answer] += 1; });
      // 27 multiple-choice questions: no letter is right more than 11 times (pass needs 21 of 30).
      counts.forEach((count) => expect(count).toBeLessThanOrEqual(11));
      counts.forEach((count) => expect(count).toBeGreaterThanOrEqual(3));
    });
  });

  test('moving the answer keeps the same right option', () => {
    const { BASIC_LEVEL_TESTS } = require('../englishLevelsBasic');
    const original = BASIC_LEVEL_TESTS[0].questions[0];
    const spread = ENGLISH_LEVEL_TESTS[0].questions[0];
    expect(spread.options[spread.answer]).toBe(original.options[original.answer]);
  });
});
