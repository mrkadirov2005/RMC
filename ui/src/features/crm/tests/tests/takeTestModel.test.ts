import { describe, expect, it } from 'vitest';
import { buildSections, clockTone, formatClock, isAnswered, passageFor, sectionOf } from '../takeTestModel';

const questions = (count: number, passageFrom = Infinity) =>
  Array.from({ length: count }, (_, index) => ({ question_id: index + 1, passage_id: index >= passageFrom ? 9 : null }));

describe('test-taking sections', () => {
  it('uses the sections a level test declares, in order', () => {
    const test = { test_data: { sections: [{ title: 'Grammar', questions: 2 }, { title: 'Vocabulary', questions: 1 }, { title: 'Reading', questions: 2 }] } };
    const sections = buildSections(test, questions(5));
    expect(sections.map((section) => [section.title, section.indexes])).toEqual([
      ['Grammar', [0, 1]],
      ['Vocabulary', [2]],
      ['Reading', [3, 4]],
    ]);
    expect(sectionOf(sections, 3)?.title).toBe('Reading');
  });

  it('ignores declared sections that do not add up to the questions', () => {
    const test = { test_data: { sections: [{ title: 'Grammar', questions: 10 }] } };
    expect(buildSections(test, questions(3))).toEqual([{ title: '', indexes: [0, 1, 2] }]);
  });

  it('splits other tests into questions and the reading part', () => {
    expect(buildSections({}, questions(4, 2)).map((section) => [section.title, section.indexes])).toEqual([
      ['Questions', [0, 1]],
      ['Reading', [2, 3]],
    ]);
  });
});

describe('test-taking helpers', () => {
  it('knows an answered question', () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered({ index: 0 })).toBe(true);
    expect(isAnswered({ value: false })).toBe(true);
    expect(isAnswered({ text: '  ' })).toBe(false);
    expect(isAnswered({ matches: {} })).toBe(false);
  });

  it('finds the reading text of a question', () => {
    const test = { passages: [{ passage_id: 9, title: 'Text' }] };
    expect(passageFor(test, { passage_id: 9 })?.title).toBe('Text');
    expect(passageFor(test, { passage_id: null })).toBeNull();
    expect(passageFor(test, { passage: { title: 'Own' } })?.title).toBe('Own');
  });

  it('reads the clock and its colour', () => {
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(clockTone(600)).toBe('calm');
    expect(clockTone(120)).toBe('warning');
    expect(clockTone(30)).toBe('danger');
  });
});
