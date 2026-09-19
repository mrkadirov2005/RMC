// Turning a saved test into the editor's form state, and working out what changed
// when it is saved again. Kept apart from the page so the diff can be tested.

export interface EditableQuestion {
  id: string;
  question_id?: number;
  question_text: string;
  question_type: string;
  marks: number;
  options?: string[];
  correct_answer?: any;
  explanation?: string;
  word_limit?: number;
  rubric?: string;
}

export interface EditablePassage {
  id: string;
  passage_id?: number;
  title: string;
  content: string;
  difficulty_level: string;
}

const parseJson = (value: unknown) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const toEditableQuestions = (questions: any[] = []): EditableQuestion[] =>
  [...questions]
    .sort((a, b) => Number(a.question_order ?? 0) - Number(b.question_order ?? 0))
    .map((question) => ({
      id: `saved-${question.question_id}`,
      question_id: Number(question.question_id),
      question_text: question.question_text ?? '',
      question_type: question.question_type ?? 'multiple_choice',
      marks: Number(question.marks ?? 1),
      options: (parseJson(question.options) as string[] | null) ?? undefined,
      correct_answer: parseJson(question.correct_answer) ?? undefined,
      explanation: question.explanation ?? undefined,
      word_limit: question.word_limit ?? undefined,
      rubric: question.rubric ?? undefined,
    }));

export const toEditablePassages = (passages: any[] = []): EditablePassage[] =>
  [...passages]
    .sort((a, b) => Number(a.passage_order ?? 0) - Number(b.passage_order ?? 0))
    .map((passage) => ({
      id: `saved-${passage.passage_id}`,
      passage_id: Number(passage.passage_id),
      title: passage.title ?? '',
      content: passage.content ?? '',
      difficulty_level: passage.difficulty_level ?? 'medium',
    }));

export interface SaveOperations<T> {
  create: T[];
  update: T[];
  remove: number[];
}

// Rows with a saved id are updated, rows without one are new, and saved ids that
// are no longer in the form were deleted by the teacher.
export const planSave = <T extends { question_id?: number; passage_id?: number }>(
  current: T[],
  originalIds: number[],
  idKey: 'question_id' | 'passage_id'
): SaveOperations<T> => {
  const keptIds = new Set(current.map((row) => row[idKey]).filter((id): id is number => id != null));
  return {
    create: current.filter((row) => row[idKey] == null),
    update: current.filter((row) => row[idKey] != null),
    remove: originalIds.filter((id) => !keptIds.has(id)),
  };
};

// Teachers can change only tests they wrote; superusers can change any.
export const canEditTest = (test: any, user: { userType?: string; id?: number } | null | undefined) => {
  if (!test || !user) return false;
  if (user.userType === 'superuser') return true;
  return user.userType === 'teacher'
    && String(test.created_by_type || 'teacher') === 'teacher'
    && Number(test.created_by) === Number(user.id);
};
