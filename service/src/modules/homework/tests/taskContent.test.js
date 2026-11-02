const { validateContent, maxScore, forStudent, autoScore, mediaIn } = require('../taskContent');

const content = {
  questions: [
    { id: 'q1', type: 'choice', prompt: 'reliable = ?', options: ['fast', 'can be trusted', 'big'], answer: 1 },
    { id: 'q2', type: 'gap', prompt: 'Past of go: ___', answers: ['went'], points: 2 },
    { id: 'q3', type: 'match', prompt: 'Match', pairs: [['cat', 'mushuk'], ['dog', 'it'], ['bird', 'qush']], points: 3 },
    { id: 'q4', type: 'text', prompt: 'Write about your weekend', min_words: 20, points: 4 },
  ],
};

// @MOB-051
describe('task content', () => {
  it('accepts a valid task and totals its points', () => {
    expect(validateContent(content)).toEqual([]);
    expect(maxScore(content)).toBe(10);
  });

  it.each([
    [null, 'questions must be a non-empty list'],
    [{ questions: [] }, 'questions must be a non-empty list'],
    [{ questions: [{ id: 'a', type: 'choice', prompt: 'p', options: ['x'], answer: 0 }] }, 'question 1: 2–8 options are required'],
    [{ questions: [{ id: 'a', type: 'choice', prompt: 'p', options: ['x', 'y'], answer: 5 }] }, 'question 1: answer must point at an option'],
    [{ questions: [{ id: 'a', type: 'gap', prompt: 'p', answers: [] }] }, 'question 1: at least one accepted answer'],
    [{ questions: [{ id: 'a', type: 'match', prompt: 'p', pairs: [['x', 'y']] }] }, 'question 1: at least two [left, right] pairs'],
    [{ questions: [{ id: 'a', type: 'essay', prompt: 'p' }] }, 'question 1: type must be choice, gap, match, text, audio or file'],
    [{ questions: [{ id: '', type: 'text', prompt: '' }] }, 'question 1: id is required'],
    [{ questions: [{ id: 'a', type: 'text', prompt: 'p' }, { id: 'a', type: 'text', prompt: 'p' }] }, 'question 2: duplicate id a'],
    [{ questions: [{ id: 'a', type: 'text', prompt: 'p', points: 0 }] }, 'question 1: points must be 1–100'],
  ])('rejects %j', (bad, message) => {
    expect(validateContent(bad)).toContain(message);
  });

  it('caps the number of questions', () => {
    const many = { questions: Array.from({ length: 101 }, (_, i) => ({ id: `q${i}`, type: 'text', prompt: 'p' })) };
    expect(validateContent(many)).toContain('at most 100 questions');
  });

  it('hides every answer key from students', () => {
    const view = forStudent(content);
    const text = JSON.stringify(view);
    expect(text).not.toContain('"answer"');
    expect(text).not.toContain('went');
    expect(view.questions[0]).toEqual({ id: 'q1', type: 'choice', prompt: 'reliable = ?', points: 1, options: ['fast', 'can be trusted', 'big'] });
    expect(view.questions[2].left).toEqual(['cat', 'dog', 'bird']);
    expect([...view.questions[2].options].sort()).toEqual(['it', 'mushuk', 'qush']);
    expect(view.questions[3]).toMatchObject({ type: 'text', min_words: 20 });
  });

  // @MOB-054
  it('scores objective questions and leaves text for the teacher', () => {
    const result = autoScore(content, { q1: 1, q2: '  WENT ', q3: ['mushuk', 'qush', 'qush'], q4: 'Some text' });
    expect(result.perQuestion).toEqual({ q1: 1, q2: 2, q3: 2, q4: null });
    expect(result.score).toBe(5);
    expect(result.needsReview).toBe(true);
  });

  it('gives nothing for missing or wrong answers', () => {
    const result = autoScore({ questions: content.questions.slice(0, 3) }, { q1: '', q2: 'goed' });
    expect(result).toEqual({ score: 0, needsReview: false, perQuestion: { q1: 0, q2: 0, q3: 0 } });
    expect(autoScore({ questions: [{ id: 'm', type: 'match', prompt: 'p', pairs: [] }] }, {}).score).toBe(0);
  });

  // @MOB-143
  it('accepts audio and file questions, leaves them to the teacher and lists their media', () => {
    const task = {
      questions: [
        { id: 'a', type: 'audio', prompt: 'Read aloud', max_seconds: 90, points: 5 },
        { id: 'f', type: 'file', prompt: 'Photo of your notebook', max_files: 2 },
        { id: 'c', type: 'choice', prompt: '?', options: ['x', 'y'], answer: 0 },
      ],
    };
    expect(validateContent(task)).toEqual([]);
    expect(validateContent({ questions: [{ id: 'a', type: 'audio', prompt: 'p', max_seconds: 5 }] })).toEqual(['question 1: max_seconds must be 10–600']);
    expect(validateContent({ questions: [{ id: 'f', type: 'file', prompt: 'p', max_files: 9 }] })).toEqual(['question 1: max_files must be 1–5']);
    expect(forStudent(task).questions.slice(0, 2)).toEqual([
      { id: 'a', type: 'audio', prompt: 'Read aloud', points: 5, max_seconds: 90 },
      { id: 'f', type: 'file', prompt: 'Photo of your notebook', points: 1, max_files: 2 },
    ]);
    expect(autoScore(task, { a: 11, f: [12], c: 0 })).toEqual({ score: 1, needsReview: true, perQuestion: { a: null, f: null, c: 1 } });
    expect(mediaIn(task, { a: 11, f: [12, 11], c: 0 })).toEqual({ ids: [11, 12], problems: [] });
    expect(mediaIn(task, { a: [11], f: [1, 2, 3] })).toEqual({ ids: [], problems: ['a', 'f'] });
    expect(mediaIn(task, {})).toEqual({ ids: [], problems: [] });
  });
});
