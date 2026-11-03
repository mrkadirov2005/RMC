import { describe, expect, it } from 'vitest';
import { questionProblems } from '../testEditModel';

describe('question problems', () => {
  it('a finished choice question has none', () => {
    expect(questionProblems({ question_text: 'Pick', question_type: 'multiple_choice', options: ['a', 'b', '', ''], correct_answer: { index: 1 } })).toEqual([]);
  });

  it('names what is missing', () => {
    expect(questionProblems({ question_text: ' ', question_type: 'multiple_choice', options: ['a', '', '', ''], correct_answer: undefined })).toEqual([
      'Write the question',
      'Fill at least two options',
      'Mark the right option',
    ]);
    expect(questionProblems({ question_text: 'Q', question_type: 'multiple_choice', options: ['a', 'b', '', ''], correct_answer: { index: 3 } })).toEqual(['Mark the right option']);
    expect(questionProblems({ question_text: 'Q', question_type: 'true_false', correct_answer: undefined })).toEqual(['Choose True or False']);
    expect(questionProblems({ question_text: 'Q', question_type: 'true_false', correct_answer: { value: false } })).toEqual([]);
    expect(questionProblems({ question_text: 'Q', question_type: 'short_answer', correct_answer: { answers: [''] } })).toEqual(['Write the right answer']);
    expect(questionProblems({ question_text: 'Q', question_type: 'essay' })).toEqual([]);
  });
});
