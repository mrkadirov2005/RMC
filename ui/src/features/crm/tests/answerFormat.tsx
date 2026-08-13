import type { ReactNode } from 'react';
import type { TestAnswer } from '@/types';
import { getQuestionTypeMeta } from './questionTypes';

export const countWords = (text?: string | null) => (text || '').trim().split(/\s+/).filter(Boolean).length;

const optionAt = (options: string[] | null | undefined, index: unknown) => {
  const position = Number(index);
  if (!Array.isArray(options) || !Number.isInteger(position)) return null;
  return options[position] ?? null;
};

export const formatStudentAnswer = (question: TestAnswer, answer: any): ReactNode => {
  if (answer === null || answer === undefined || answer === '') {
    return <em className="text-gray-400">No answer provided</em>;
  }

  switch (getQuestionTypeMeta(question.question_type).answerShape) {
    case 'index':
      return optionAt(question.options, answer.index) ?? 'Invalid selection';
    case 'value':
      return answer.value ? 'True' : 'False';
    case 'text':
      return answer.text ?? '';
    case 'matches':
      return answer.matches
        ? Object.entries(answer.matches).map(([key, value]) => (
          <div key={key}>Match {Number(key) + 1}: {String(value)}</div>
        ))
        : JSON.stringify(answer);
    default:
      return JSON.stringify(answer);
  }
};

export const formatCorrectAnswer = (question: TestAnswer): ReactNode => {
  const correct = question.correct_answer;
  if (correct === null || correct === undefined || correct === '') {
    return <em className="text-gray-400">Not specified</em>;
  }

  switch (getQuestionTypeMeta(question.question_type).correctAnswerShape) {
    case 'index':
      return optionAt(question.options, typeof correct === 'object' ? correct.index : correct) ?? 'Invalid selection';
    case 'value':
      return (typeof correct === 'object' ? correct.value : correct) ? 'True' : 'False';
    case 'answers': {
      if (typeof correct === 'string') return correct;
      const answers = Array.isArray(correct) ? correct : correct.answers;
      return Array.isArray(answers) ? answers.join(', ') : JSON.stringify(correct);
    }
    case 'none':
      return <em className="text-gray-400">Not specified</em>;
    default:
      return JSON.stringify(correct);
  }
};
