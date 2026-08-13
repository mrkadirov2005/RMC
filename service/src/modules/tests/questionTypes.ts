// Must stay in sync with ui/src/features/crm/tests/questionTypes.ts.

const QUESTION_TYPES = [
  'multiple_choice',
  'form_filling',
  'essay',
  'short_answer',
  'true_false',
  'matching',
  'reading_passage',
  'writing',
] as const;

const TEST_TYPES = QUESTION_TYPES;

const QUESTION_TYPE_META: Record<string, any> = {
  multiple_choice: {
    label: 'Multiple Choice',
    hasOptions: true,
    autoGradable: true,
    manualGraded: false,
    answerShape: 'index',
    correctAnswerShape: 'index',
    supportsWordLimit: false,
    supportsPassage: true,
  },
  form_filling: {
    label: 'Form Filling',
    hasOptions: false,
    autoGradable: true,
    manualGraded: false,
    answerShape: 'text',
    correctAnswerShape: 'answers',
    supportsWordLimit: false,
    supportsPassage: true,
  },
  essay: {
    label: 'Essay',
    hasOptions: false,
    autoGradable: false,
    manualGraded: true,
    answerShape: 'text',
    correctAnswerShape: 'none',
    supportsWordLimit: true,
    supportsPassage: true,
  },
  short_answer: {
    label: 'Short Answer',
    hasOptions: false,
    autoGradable: true,
    manualGraded: false,
    answerShape: 'text',
    correctAnswerShape: 'answers',
    supportsWordLimit: false,
    supportsPassage: true,
  },
  true_false: {
    label: 'True/False',
    hasOptions: false,
    autoGradable: true,
    manualGraded: false,
    answerShape: 'value',
    correctAnswerShape: 'value',
    supportsWordLimit: false,
    supportsPassage: true,
  },
  matching: {
    label: 'Matching',
    hasOptions: false,
    autoGradable: false,
    manualGraded: true,
    answerShape: 'matches',
    correctAnswerShape: 'deferred',
    supportsWordLimit: false,
    supportsPassage: false,
  },
  reading_passage: {
    label: 'Reading Passage',
    hasOptions: false,
    autoGradable: false,
    manualGraded: true,
    answerShape: 'none',
    correctAnswerShape: 'none',
    supportsWordLimit: false,
    supportsPassage: true,
  },
  writing: {
    label: 'Writing',
    hasOptions: false,
    autoGradable: false,
    manualGraded: true,
    answerShape: 'text',
    correctAnswerShape: 'none',
    supportsWordLimit: true,
    supportsPassage: true,
  },
};

const humanize = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase());

const isQuestionType = (value: any) => typeof value === 'string' && (QUESTION_TYPES as readonly string[]).includes(value);

const getQuestionTypeMeta = (value: any) =>
  isQuestionType(value)
    ? QUESTION_TYPE_META[value]
    : {
      label: humanize(String(value || '')),
      hasOptions: false,
      autoGradable: false,
      manualGraded: true,
      answerShape: 'text',
      correctAnswerShape: 'none',
      supportsWordLimit: false,
      supportsPassage: false,
    };

const isAutoGradable = (type: any) => Boolean(getQuestionTypeMeta(type).autoGradable);

const isTextShape = (type: any) => getQuestionTypeMeta(type).answerShape === 'text';

const normalizeCorrectAnswer = (question: any) => {
  const raw = question?.correct_answer;
  if (raw === null || raw === undefined) return null;
  const type = question?.question_type;
  if (typeof raw === 'boolean') return { value: raw };
  if (typeof raw === 'number') return isTextShape(type) ? { answers: [String(raw)] } : { index: raw };
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!isTextShape(type) && trimmed !== '' && Number.isFinite(Number(trimmed))) return { index: Number(trimmed) };
    return { answers: [raw] };
  }
  if (Array.isArray(raw)) return { answers: raw.map((entry: any) => String(entry)) };
  if (typeof raw !== 'object') return null;
  if (Array.isArray(raw.answers)) return { answers: raw.answers.map((entry: any) => String(entry)), case_sensitive: raw.case_sensitive };
  if (typeof raw.text === 'string') return { answers: [raw.text], case_sensitive: raw.case_sensitive };
  if (Array.isArray(raw.keywords)) return { answers: raw.keywords.map((entry: any) => String(entry)), case_sensitive: raw.case_sensitive };
  return raw;
};

const normalizeStudentAnswer = (type: any, raw: any) => {
  if (raw === null || raw === undefined) return null;
  const shape = getQuestionTypeMeta(type).answerShape;
  if (shape === 'index') {
    if (typeof raw === 'number') return { index: raw };
    if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return { index: Number(raw) };
    if (typeof raw === 'object' && raw.index !== undefined) return { index: Number(raw.index) };
    return null;
  }
  if (shape === 'value') {
    if (typeof raw === 'boolean') return { value: raw };
    if (typeof raw === 'string') return { value: raw.toLowerCase() === 'true' };
    if (typeof raw === 'object' && raw.value !== undefined) return { value: Boolean(raw.value) };
    return null;
  }
  if (shape === 'text') {
    if (typeof raw === 'string') return { text: raw };
    if (typeof raw === 'object' && raw.text !== undefined) return { text: String(raw.text ?? '') };
    return null;
  }
  return raw;
};

const gradeObjectiveAnswer = (question: any, studentAnswer: any) => {
  const marks = Number(question?.marks ?? 0);
  if (!isAutoGradable(question?.question_type)) return { is_correct: null, marks_obtained: 0 };

  const correct = normalizeCorrectAnswer(question);
  const answer = normalizeStudentAnswer(question?.question_type, studentAnswer);
  if (!correct || !answer) return { is_correct: false, marks_obtained: 0 };

  const shape = getQuestionTypeMeta(question.question_type).answerShape;
  let isCorrect = false;
  if (shape === 'index') {
    isCorrect = Number(answer.index) === Number(correct.index);
  } else if (shape === 'value') {
    isCorrect = Boolean(answer.value) === Boolean(correct.value);
  } else if (shape === 'text') {
    const accepted = Array.isArray(correct.answers) ? correct.answers : [];
    const given = String(answer.text ?? '').trim();
    isCorrect = correct.case_sensitive
      ? accepted.some((entry: any) => String(entry).trim() === given)
      : accepted.some((entry: any) => String(entry).trim().toLowerCase() === given.toLowerCase());
  }

  return { is_correct: isCorrect, marks_obtained: isCorrect ? marks : 0 };
};

module.exports = {
  QUESTION_TYPES,
  TEST_TYPES,
  QUESTION_TYPE_META,
  isQuestionType,
  getQuestionTypeMeta,
  isAutoGradable,
  normalizeCorrectAnswer,
  normalizeStudentAnswer,
  gradeObjectiveAnswer,
};

export {};
