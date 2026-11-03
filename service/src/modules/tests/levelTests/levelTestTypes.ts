// The format of the built-in level tests: a reading text and questions in three sections, each one a
// multiple-choice (answer = index of the right option) or a true/false (answer = true/false).

export type LevelSection = 'grammar' | 'vocabulary' | 'reading';

export interface LevelQuestion {
  section: LevelSection;
  type: 'multiple_choice' | 'true_false';
  text: string;
  options?: string[];
  answer: number | boolean;
  explanation?: string;
}

export interface LevelTest {
  /** Stable id: a test is installed once per center under this key. */
  key: string;
  /** The level on the English ladder (achievements): Beginner, A1, A2, A2+, B1, B2, C1. */
  level: string;
  title: string;
  durationMinutes: number;
  passage: { title: string; content: string };
  questions: LevelQuestion[];
}

const mc = (section: LevelSection, text: string, options: string[], answer: number, explanation?: string): LevelQuestion => ({
  section,
  type: 'multiple_choice',
  text,
  options,
  answer,
  explanation,
});

const tf = (section: LevelSection, text: string, answer: boolean, explanation?: string): LevelQuestion => ({
  section,
  type: 'true_false',
  text,
  answer,
  explanation,
});

module.exports = { mc, tf };
