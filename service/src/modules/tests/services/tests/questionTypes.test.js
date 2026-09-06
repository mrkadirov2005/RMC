// RMC-065: questionTypes.ts is the sole source of scoring rules for the exam
// engine (modules/tests, not to be confused with the general "tests" concept).
// A regression here would silently change every student's result. This file
// has zero prior coverage, so we cover grading correctness for every question
// type it handles, plus boundary cases per type.
const {
  QUESTION_TYPES,
  getQuestionTypeMeta,
  isAutoGradable,
  gradeObjectiveAnswer,
} = require('../../questionTypes');

describe('questionTypes — exam engine grading rules (RMC-065)', () => {
  it('enumerates the exact 8 question types the exam engine understands', () => {
    expect(QUESTION_TYPES).toEqual([
      'multiple_choice',
      'form_filling',
      'essay',
      'short_answer',
      'true_false',
      'matching',
      'reading_passage',
      'writing',
    ]);
  });

  describe('multiple_choice (index shape, auto-gradable)', () => {
    const base = { question_type: 'multiple_choice', marks: 5 };

    it('marks a matching option index as correct and awards full marks', () => {
      const result = gradeObjectiveAnswer({ ...base, correct_answer: 2 }, 2);
      expect(result).toEqual({ is_correct: true, marks_obtained: 5 });
    });

    it('marks a non-matching option index as incorrect and awards zero', () => {
      const result = gradeObjectiveAnswer({ ...base, correct_answer: 2 }, 1);
      expect(result).toEqual({ is_correct: false, marks_obtained: 0 });
    });

    it('boundary: option index 0 is graded correctly, not treated as a missing answer', () => {
      const correct = gradeObjectiveAnswer({ ...base, correct_answer: 0 }, 0);
      expect(correct).toEqual({ is_correct: true, marks_obtained: 5 });
      const incorrect = gradeObjectiveAnswer({ ...base, correct_answer: 0 }, 1);
      expect(incorrect).toEqual({ is_correct: false, marks_obtained: 0 });
    });
  });

  describe('true_false (value shape, auto-gradable)', () => {
    const base = { question_type: 'true_false', marks: 2 };

    it('marks a matching boolean as correct', () => {
      expect(gradeObjectiveAnswer({ ...base, correct_answer: true }, true)).toEqual({ is_correct: true, marks_obtained: 2 });
    });

    it('marks a non-matching boolean as incorrect', () => {
      expect(gradeObjectiveAnswer({ ...base, correct_answer: true }, false)).toEqual({ is_correct: false, marks_obtained: 0 });
    });

    it('boundary: an explicit false correct answer matched by an explicit false student answer is correct (false is not treated as "no answer")', () => {
      expect(gradeObjectiveAnswer({ ...base, correct_answer: false }, false)).toEqual({ is_correct: true, marks_obtained: 2 });
    });

    it('boundary: a stringified "true"/"false" student answer is normalized to boolean before grading', () => {
      expect(gradeObjectiveAnswer({ ...base, correct_answer: true }, 'true')).toEqual({ is_correct: true, marks_obtained: 2 });
      expect(gradeObjectiveAnswer({ ...base, correct_answer: true }, 'false')).toEqual({ is_correct: false, marks_obtained: 0 });
    });
  });

  describe('short_answer (text shape, auto-gradable)', () => {
    const base = { question_type: 'short_answer', marks: 3 };

    it('matches case-insensitively by default', () => {
      const result = gradeObjectiveAnswer({ ...base, correct_answer: { answers: ['Paris'] } }, { text: 'paris' });
      expect(result).toEqual({ is_correct: true, marks_obtained: 3 });
    });

    it('marks a non-matching answer as incorrect', () => {
      const result = gradeObjectiveAnswer({ ...base, correct_answer: { answers: ['Paris'] } }, { text: 'London' });
      expect(result).toEqual({ is_correct: false, marks_obtained: 0 });
    });

    it('boundary: case_sensitive:true rejects a differently-cased exact word', () => {
      const result = gradeObjectiveAnswer(
        { ...base, correct_answer: { answers: ['Paris'], case_sensitive: true } },
        { text: 'paris' }
      );
      expect(result).toEqual({ is_correct: false, marks_obtained: 0 });
    });

    it('boundary: surrounding whitespace is trimmed even under case_sensitive matching', () => {
      const result = gradeObjectiveAnswer(
        { ...base, correct_answer: { answers: ['Paris'], case_sensitive: true } },
        { text: '  Paris  ' }
      );
      expect(result).toEqual({ is_correct: true, marks_obtained: 3 });
    });
  });

  describe('form_filling (text shape, auto-gradable)', () => {
    it('accepts any of several keyword-style correct answers', () => {
      const base = { question_type: 'form_filling', marks: 1, correct_answer: { keywords: ['cat', 'dog'] } };
      expect(gradeObjectiveAnswer(base, { text: 'dog' })).toEqual({ is_correct: true, marks_obtained: 1 });
      expect(gradeObjectiveAnswer(base, { text: 'fish' })).toEqual({ is_correct: false, marks_obtained: 0 });
    });

    it('treats a missing student answer as ungraded/incorrect rather than throwing', () => {
      const base = { question_type: 'form_filling', marks: 1, correct_answer: { answers: ['x'] } };
      expect(gradeObjectiveAnswer(base, null)).toEqual({ is_correct: false, marks_obtained: 0 });
    });
  });

  describe.each([
    ['essay', 'answerShape text'],
    ['writing', 'answerShape text'],
    ['matching', 'answerShape matches'],
    ['reading_passage', 'answerShape none'],
  ])('%s (manual-graded, never auto-gradable) — %s', (type) => {
    it('is never auto-graded, regardless of the answer supplied', () => {
      expect(isAutoGradable(type)).toBe(false);
      const result = gradeObjectiveAnswer({ question_type: type, marks: 10, correct_answer: 'anything' }, 'anything');
      expect(result).toEqual({ is_correct: null, marks_obtained: 0 });
    });
  });

  describe('getQuestionTypeMeta fallback for unrecognized types', () => {
    it('falls back to a safe, manually-graded default and humanizes the label', () => {
      const meta = getQuestionTypeMeta('mystery_type');
      expect(meta).toMatchObject({ label: 'Mystery Type', autoGradable: false, manualGraded: true });
    });
  });
});
