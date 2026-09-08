const normalize = (value: any) => String(value ?? '').trim().toLowerCase();

const isAnswerCorrect = (studentAnswer: any, translations: string[]) => {
  const normalizedAnswer = normalize(studentAnswer);
  if (!normalizedAnswer) return false;
  return (translations || []).some((translation) => normalize(translation) === normalizedAnswer);
};

module.exports = {
  isAnswerCorrect,
};

export {};
