// @MOB-051 One task format for every skill: a list of questions of four kinds.
//   choice: { id, type: 'choice', prompt, options: string[], answer: number }
//   gap:    { id, type: 'gap', prompt, answers: string[] }            (any listed answer is right)
//   match:  { id, type: 'match', prompt, pairs: [left, right][] }     (student answers right side per left)
//   text:   { id, type: 'text', prompt, min_words? }                  (teacher grades)
//   audio:  { id, type: 'audio', prompt, max_seconds? }               (recorded answer; teacher grades)
//   file:   { id, type: 'file', prompt, max_files? }                  (photos or PDFs; teacher grades)
// Audio and file answers are media ids (one for audio, a list for files) of the student's uploads.
// Each question has `points` (default 1). The app never receives the answer keys.

type Question = {
  id: string;
  type: 'choice' | 'gap' | 'match' | 'text' | 'audio' | 'file';
  prompt: string;
  points?: number;
  options?: string[];
  answer?: number;
  answers?: string[];
  pairs?: [string, string][];
  min_words?: number;
  max_seconds?: number;
  max_files?: number;
};

export type TaskContent = { questions: Question[] };

const nonEmpty = (value: unknown, max = 2000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;

// Returns a list of problems; an empty list means the content is valid.
const validateContent = (content: any): string[] => {
  const errors: string[] = [];
  const questions = content?.questions;
  if (!Array.isArray(questions) || questions.length === 0) return ['questions must be a non-empty list'];
  if (questions.length > 100) errors.push('at most 100 questions');
  const ids = new Set<string>();
  questions.forEach((q: any, i: number) => {
    const at = `question ${i + 1}`;
    if (!nonEmpty(q?.id, 50)) errors.push(`${at}: id is required`);
    else if (ids.has(q.id)) errors.push(`${at}: duplicate id ${q.id}`);
    else ids.add(q.id);
    if (!nonEmpty(q?.prompt)) errors.push(`${at}: prompt is required`);
    if (q?.points != null && !(Number(q.points) > 0 && Number(q.points) <= 100)) errors.push(`${at}: points must be 1–100`);
    if (q?.type === 'choice') {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 8 || !q.options.every((o: any) => nonEmpty(o, 500))) {
        errors.push(`${at}: 2–8 options are required`);
      } else if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
        errors.push(`${at}: answer must point at an option`);
      }
    } else if (q?.type === 'gap') {
      if (!Array.isArray(q.answers) || q.answers.length === 0 || !q.answers.every((a: any) => nonEmpty(a, 200))) errors.push(`${at}: at least one accepted answer`);
    } else if (q?.type === 'match') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2 || !q.pairs.every((p: any) => Array.isArray(p) && p.length === 2 && nonEmpty(p[0], 300) && nonEmpty(p[1], 300))) {
        errors.push(`${at}: at least two [left, right] pairs`);
      }
    } else if (q?.type === 'audio') {
      // @MOB-143
      if (q.max_seconds != null && !(Number.isInteger(q.max_seconds) && q.max_seconds >= 10 && q.max_seconds <= 600)) errors.push(`${at}: max_seconds must be 10–600`);
    } else if (q?.type === 'file') {
      if (q.max_files != null && !(Number.isInteger(q.max_files) && q.max_files >= 1 && q.max_files <= 5)) errors.push(`${at}: max_files must be 1–5`);
    } else if (q?.type !== 'text') {
      errors.push(`${at}: type must be choice, gap, match, text, audio or file`);
    }
  });
  return errors;
};

const pointsOf = (q: Question) => Number(q.points || 1);
const maxScore = (content: TaskContent) => content.questions.reduce((sum, q) => sum + pointsOf(q), 0);
const norm = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// The task as students see it: answer keys removed, matching options shuffled deterministically.
const forStudent = (content: TaskContent) => ({
  questions: content.questions.map((q) => {
    const base = { id: q.id, type: q.type, prompt: q.prompt, points: pointsOf(q) };
    if (q.type === 'choice') return { ...base, options: q.options };
    if (q.type === 'match') {
      const rights = (q.pairs || []).map((p) => p[1]);
      const shuffled = rights.map((r, i) => ({ r, k: (i * 7 + 3) % rights.length })).sort((a, b) => a.k - b.k).map((x) => x.r);
      return { ...base, left: (q.pairs || []).map((p) => p[0]), options: shuffled };
    }
    if (q.type === 'text') return { ...base, min_words: q.min_words ?? null };
    if (q.type === 'audio') return { ...base, max_seconds: q.max_seconds ?? 120 };
    if (q.type === 'file') return { ...base, max_files: q.max_files ?? 3 };
    return base;
  }),
});

// @MOB-054 Scores the questions a computer can check. Text questions need a teacher.
const autoScore = (content: TaskContent, answers: Record<string, any>) => {
  let score = 0;
  let needsReview = false;
  const perQuestion: Record<string, number | null> = {};
  content.questions.forEach((q) => {
    const given = answers?.[q.id];
    let earned: number | null = 0;
    if (q.type === 'choice') earned = Number(given) === q.answer && given !== null && given !== '' ? pointsOf(q) : 0;
    else if (q.type === 'gap') earned = (q.answers || []).some((a) => norm(a) === norm(given)) ? pointsOf(q) : 0;
    else if (q.type === 'match') {
      const pairs = q.pairs || [];
      const right = pairs.filter((p, i) => norm(Array.isArray(given) ? given[i] : undefined) === norm(p[1])).length;
      earned = pairs.length ? Math.round((pointsOf(q) * right * 100) / pairs.length) / 100 : 0;
    } else {
      earned = null;
      needsReview = true;
    }
    perQuestion[q.id] = earned;
    if (earned) score += earned;
  });
  return { score: Math.round(score * 100) / 100, needsReview, perQuestion };
};

// @MOB-143 Media ids an answer set points to, from audio and file questions only, with the
// problems found (a list where one id was expected, too many files).
const mediaIn = (content: TaskContent, answers: Record<string, any>) => {
  const ids: number[] = [];
  const problems: string[] = [];
  content.questions.forEach((q) => {
    const given = answers?.[q.id];
    if (given == null || given === '') return;
    if (q.type === 'audio') {
      if (!Number.isInteger(given)) problems.push(q.id);
      else ids.push(given);
    } else if (q.type === 'file') {
      const list = Array.isArray(given) ? given : [];
      if (!Array.isArray(given) || list.length > (q.max_files ?? 3) || !list.every((id: any) => Number.isInteger(id))) problems.push(q.id);
      else ids.push(...list);
    }
  });
  return { ids: Array.from(new Set(ids)), problems };
};

module.exports = { validateContent, maxScore, forStudent, autoScore, mediaIn };
