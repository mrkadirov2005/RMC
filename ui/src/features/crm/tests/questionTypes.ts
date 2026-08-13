export const QUESTION_TYPES = [
  'multiple_choice',
  'form_filling',
  'essay',
  'short_answer',
  'true_false',
  'matching',
  'reading_passage',
  'writing',
] as const;

export const TEST_TYPES = QUESTION_TYPES;

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type TestType = QuestionType;

export interface QuestionTypeMeta {
  label: string;
  hasOptions: boolean;
  autoGradable: boolean;
  manualGraded: boolean;
  answerShape: 'index' | 'value' | 'text' | 'matches' | 'none';
  correctAnswerShape: 'index' | 'value' | 'answers' | 'deferred' | 'none';
  supportsWordLimit: boolean;
  supportsPassage: boolean;
}

export const QUESTION_TYPE_META: Record<QuestionType, QuestionTypeMeta> = {
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

const humanize = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const isQuestionType = (value: unknown): value is QuestionType =>
  typeof value === 'string' && (QUESTION_TYPES as readonly string[]).includes(value);

export const getQuestionTypeMeta = (value?: string): QuestionTypeMeta =>
  isQuestionType(value)
    ? QUESTION_TYPE_META[value]
    : {
      label: humanize(value || ''),
      hasOptions: false,
      autoGradable: false,
      manualGraded: true,
      answerShape: 'text',
      correctAnswerShape: 'none',
      supportsWordLimit: false,
      supportsPassage: false,
    };
