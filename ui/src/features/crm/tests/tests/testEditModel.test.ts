import { describe, expect, it } from 'vitest';
import { canEditTest, planSave, toEditablePassages, toEditableQuestions } from '../testEditModel';

describe('loading a saved test into the editor', () => {
  it('keeps each question id and orders questions as saved', () => {
    const questions = toEditableQuestions([
      { question_id: 12, question_order: 2, question_text: 'Second', question_type: 'essay', marks: 5 },
      { question_id: 11, question_order: 1, question_text: 'First', question_type: 'multiple_choice', marks: 2 },
    ]);

    expect(questions.map((question) => question.question_id)).toEqual([11, 12]);
    expect(questions[0].question_text).toBe('First');
  });

  it('parses options and answers that arrive as JSON text', () => {
    const [question] = toEditableQuestions([
      { question_id: 1, options: '["A","B"]', correct_answer: '{"index":1}', question_type: 'multiple_choice' },
    ]);

    expect(question.options).toEqual(['A', 'B']);
    expect(question.correct_answer).toEqual({ index: 1 });
  });

  it('keeps each passage id and orders passages as saved', () => {
    const passages = toEditablePassages([
      { passage_id: 2, passage_order: 2, title: 'B', content: 'b' },
      { passage_id: 1, passage_order: 1, title: 'A', content: 'a' },
    ]);

    expect(passages.map((passage) => passage.passage_id)).toEqual([1, 2]);
  });

  it('copes with a test that has no questions or passages yet', () => {
    expect(toEditableQuestions(undefined)).toEqual([]);
    expect(toEditablePassages(undefined)).toEqual([]);
  });
});

describe('working out what a save changes', () => {
  it('updates kept questions, adds new ones and deletes removed ones', () => {
    const plan = planSave(
      [
        { question_id: 11, question_text: 'kept and edited' },
        { question_id: undefined, question_text: 'brand new' },
      ],
      [11, 12, 13],
      'question_id'
    );

    expect(plan.update.map((row) => row.question_id)).toEqual([11]);
    expect(plan.create).toHaveLength(1);
    expect(plan.remove).toEqual([12, 13]);
  });

  it('does nothing destructive when the teacher changed only the test settings', () => {
    const plan = planSave([{ question_id: 11 }, { question_id: 12 }], [11, 12], 'question_id');

    expect(plan.remove).toEqual([]);
    expect(plan.create).toEqual([]);
  });

  it('works the same way for passages', () => {
    const plan = planSave([{ passage_id: 5 }], [5, 6], 'passage_id');

    expect(plan.remove).toEqual([6]);
  });
});

describe('who may open the editor', () => {
  const test = { created_by: 4, created_by_type: 'teacher' };

  it('lets the author edit', () => {
    expect(canEditTest(test, { userType: 'teacher', id: 4 })).toBe(true);
  });

  it('blocks a colleague', () => {
    expect(canEditTest(test, { userType: 'teacher', id: 9 })).toBe(false);
  });

  it('lets a superuser edit any test', () => {
    expect(canEditTest(test, { userType: 'superuser', id: 1 })).toBe(true);
  });

  it('blocks when nobody is signed in', () => {
    expect(canEditTest(test, null)).toBe(false);
  });
});
