// @MOB-163 Builds a task's questions in the one format every skill uses (choice, gap, match, text).
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/i18n/LanguageContext';
import type { Question, QuestionType, Task } from './api';

const SKILLS = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking', 'other'] as const;
const selectClass = 'h-9 rounded-md border border-input bg-background px-2 text-sm';

// Editable form of a question: list fields as text, turned back into the stored shape on save.
type Draft = {
  id: string;
  type: QuestionType;
  prompt: string;
  points: string;
  options: string;
  answer: string;
  answers: string;
  pairs: string;
  min_words: string;
  max_seconds: string;
  max_files: string;
};

const toDraft = (q: Question): Draft => ({
  id: q.id,
  type: q.type,
  prompt: q.prompt,
  points: String(q.points ?? 1),
  options: (q.options || []).join('\n'),
  answer: q.answer != null ? String(q.answer + 1) : '1',
  answers: (q.answers || []).join(', '),
  pairs: (q.pairs || []).map(([l, r]) => `${l} = ${r}`).join('\n'),
  min_words: q.min_words ? String(q.min_words) : '',
  max_seconds: String(q.max_seconds ?? 120),
  max_files: String(q.max_files ?? 3),
});

const lines = (value: string) => value.split('\n').map((s) => s.trim()).filter(Boolean);

const fromDraft = (d: Draft): Question => {
  const base = { id: d.id, type: d.type, prompt: d.prompt.trim(), points: Math.max(1, Number(d.points) || 1) };
  if (d.type === 'choice') return { ...base, options: lines(d.options), answer: Math.max(0, (Number(d.answer) || 1) - 1) };
  if (d.type === 'gap') return { ...base, answers: d.answers.split(',').map((s) => s.trim()).filter(Boolean) };
  if (d.type === 'match')
    return {
      ...base,
      pairs: lines(d.pairs).map((line) => {
        const [left, ...rest] = line.split('=');
        return [left.trim(), rest.join('=').trim()] as [string, string];
      }),
    };
  // @MOB-143
  if (d.type === 'audio') return { ...base, max_seconds: Math.min(600, Math.max(10, Math.round(Number(d.max_seconds) || 120))) };
  if (d.type === 'file') return { ...base, max_files: Math.min(5, Math.max(1, Math.round(Number(d.max_files) || 3))) };
  return { ...base, ...(Number(d.min_words) > 0 ? { min_words: Number(d.min_words) } : {}) };
};

const newDraft = (type: QuestionType, n: number): Draft => toDraft({ id: `q${Date.now().toString(36)}${n}`, type, prompt: '' });

type Props = {
  lessonId: number;
  task?: Task | null;
  onSave: (data: { lesson_id: number; title: string; skill: string; instructions: string | null; content: { questions: Question[] } }) => Promise<void>;
  onCancel: () => void;
};

export function TaskEditor({ lessonId, task, onSave, onCancel }: Props) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(task?.title ?? '');
  const [skill, setSkill] = useState(task?.skill ?? 'vocabulary');
  const [instructions, setInstructions] = useState(task?.instructions ?? '');
  const [drafts, setDrafts] = useState<Draft[]>(task ? task.content.questions.map(toDraft) : [newDraft('choice', 0)]);
  const [saving, setSaving] = useState(false);

  const typeLabel: Record<QuestionType, string> = {
    choice: t('Multiple choice'),
    gap: t('Fill the gap'),
    match: t('Matching'),
    text: t('Written answer'),
    audio: t('Spoken answer'),
    file: t('Photo or PDF'),
  };
  const update = (i: number, patch: Partial<Draft>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ lesson_id: lessonId, title: title.trim(), skill, instructions: instructions.trim() || null, content: { questions: drafts.map(fromDraft) } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="grid gap-3 pt-5">
        <h3 className="font-semibold">{task ? t('Edit task') : t('New task')}</h3>
        {task && <p className="text-xs text-muted-foreground">{t('Editing sends the task back to draft.')}</p>}
        <div className="grid gap-2 md:grid-cols-[1fr_180px]">
          <Input placeholder={t('Title')} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          <select className={selectClass} value={skill} onChange={(e) => setSkill(e.target.value)} aria-label={t('Skill')}>
            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Textarea rows={2} placeholder={t('Instructions')} value={instructions} onChange={(e) => setInstructions(e.target.value)} />

        <h4 className="text-sm font-semibold">{t('Questions')}</h4>
        {drafts.map((d, i) => (
          <div key={d.id} className="grid gap-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{i + 1}.</span>
              <select className={selectClass} value={d.type} onChange={(e) => update(i, { type: e.target.value as QuestionType })}>
                {(Object.keys(typeLabel) as QuestionType[]).map((type) => (
                  <option key={type} value={type}>
                    {typeLabel[type]}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-sm">
                {t('Points')}
                <Input className="h-9 w-16" type="number" min={1} max={100} value={d.points} onChange={(e) => update(i, { points: e.target.value })} />
              </label>
              <Button size="sm" variant="ghost" className="ml-auto" disabled={drafts.length < 2} onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}>
                {t('Remove question')}
              </Button>
            </div>
            <Textarea rows={2} placeholder={t('Question text')} value={d.prompt} onChange={(e) => update(i, { prompt: e.target.value })} />
            {d.type === 'choice' && (
              <div className="grid gap-2 md:grid-cols-[1fr_180px]">
                <Textarea rows={3} placeholder={t('Options, one per line')} value={d.options} onChange={(e) => update(i, { options: e.target.value })} />
                <label className="grid gap-1 text-sm">
                  {t('Correct option number')}
                  <Input type="number" min={1} value={d.answer} onChange={(e) => update(i, { answer: e.target.value })} />
                </label>
              </div>
            )}
            {d.type === 'gap' && <Input placeholder={t('Accepted answers, comma separated')} value={d.answers} onChange={(e) => update(i, { answers: e.target.value })} />}
            {d.type === 'match' && <Textarea rows={3} placeholder={t('Pairs, one per line: left = right')} value={d.pairs} onChange={(e) => update(i, { pairs: e.target.value })} />}
            {d.type === 'text' && (
              <label className="flex items-center gap-2 text-sm">
                {t('Minimum words')}
                <Input className="h-9 w-24" type="number" min={0} value={d.min_words} onChange={(e) => update(i, { min_words: e.target.value })} />
              </label>
            )}
            {d.type === 'audio' && (
              <label className="flex items-center gap-2 text-sm">
                {t('Longest recording, seconds')}
                <Input className="h-9 w-24" type="number" min={10} max={600} value={d.max_seconds} onChange={(e) => update(i, { max_seconds: e.target.value })} />
              </label>
            )}
            {d.type === 'file' && (
              <label className="flex items-center gap-2 text-sm">
                {t('Files at most')}
                <Input className="h-9 w-24" type="number" min={1} max={5} value={d.max_files} onChange={(e) => update(i, { max_files: e.target.value })} />
              </label>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(typeLabel) as QuestionType[]).map((type) => (
            <Button key={type} size="sm" variant="outline" onClick={() => setDrafts([...drafts, newDraft(type, drafts.length)])}>
              + {typeLabel[type]}
            </Button>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('Cancel')}
          </Button>
          <Button disabled={saving || !title.trim()} onClick={() => void save()}>
            {t('Save task')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
