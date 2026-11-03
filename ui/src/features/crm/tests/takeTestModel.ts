// What the test-taking screen works out: which section a question is in, whether it is answered,
// where its reading text is, and how the clock reads.

export interface TakeSection {
  title: string;
  /** Question positions in this section, 0-based and in order. */
  indexes: number[];
}

export const isAnswered = (value: any) => {
  if (value === null || value === undefined) return false;
  if (typeof value.text === 'string') return value.text.trim() !== '';
  if (value.matches) return Object.keys(value.matches).length > 0;
  return value.index !== undefined || value.value !== undefined;
};

/**
 * The test's sections in question order. Level tests list them in test_data.sections (grammar,
 * vocabulary, reading with how many questions each); other tests have one section, or a reading
 * part made of the questions that belong to a text.
 */
export const buildSections = (test: any, questions: any[]): TakeSection[] => {
  const declared = Array.isArray(test?.test_data?.sections) ? test.test_data.sections : null;
  if (declared && declared.reduce((sum: number, section: any) => sum + Number(section.questions || 0), 0) === questions.length) {
    let start = 0;
    return declared
      .filter((section: any) => Number(section.questions) > 0)
      .map((section: any) => {
        const indexes = Array.from({ length: Number(section.questions) }, (_, offset) => start + offset);
        start += Number(section.questions);
        return { title: String(section.title || section.section), indexes };
      });
  }
  const reading = questions.map((question, index) => (question.passage_id ? index : -1)).filter((index) => index >= 0);
  if (reading.length === 0 || reading.length === questions.length) return [{ title: '', indexes: questions.map((_, index) => index) }];
  const other = questions.map((_, index) => index).filter((index) => !reading.includes(index));
  return [
    { title: 'Questions', indexes: other },
    { title: 'Reading', indexes: reading },
  ];
};

export const sectionOf = (sections: TakeSection[], index: number) => sections.find((section) => section.indexes.includes(index)) || null;

/** The reading text a question is about: its own passage, or the one it points to. */
export const passageFor = (test: any, question: any) => {
  if (!question) return null;
  if (question.passage) return question.passage;
  if (!question.passage_id) return null;
  return (test?.passages || []).find((passage: any) => Number(passage.passage_id) === Number(question.passage_id)) || null;
};

export const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

/** Calm, then amber in the last 5 minutes, red and pulsing in the last minute. */
export const clockTone = (seconds: number | null) =>
  seconds === null || seconds >= 300 ? 'calm' : seconds >= 60 ? 'warning' : 'danger';
