// @MOB-163 @MOB-165 Homework Bank (levels to tasks), assigning tasks to groups, and grading answers.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppSelector } from '@/features/crm/hooks';
import { useLanguage } from '@/i18n/LanguageContext';
import { getApiPayload, unwrapApiRows } from '@/shared/api/response';
import { showToast } from '@/utils/toast';
import { classAPI, homeworkAPI, type Assignment, type BankLevel, type MediaFile, type Question, type Submission, type Task } from './api';
import { TaskEditor } from './TaskEditor';

const selectClass = 'h-9 rounded-md border border-input bg-background px-2 text-sm';
const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB') : '');
const errorOf = (error: unknown) => (error as { response?: { data?: { error?: string; details?: string[] } } })?.response?.data;

type ClassRow = { class_id: number; class_name: string };

function useClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  useEffect(() => {
    classAPI.getAll().then((response) => setClasses(unwrapApiRows<ClassRow>(response))).catch(() => setClasses([]));
  }, []);
  return classes;
}

// One "add" input under a bank node.
function AddNode({ label, onAdd }: { label: string; onAdd: (title: string) => Promise<void> }) {
  const [title, setTitle] = useState('');
  return (
    <div className="flex gap-1">
      <Input className="h-8 text-xs" placeholder={label} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button
        size="sm"
        variant="outline"
        disabled={!title.trim()}
        onClick={() => void onAdd(title.trim()).then(() => setTitle(''))}
      >
        +
      </Button>
    </div>
  );
}

// @MOB-053 Assign one approved task to a group.
function AssignForm({ task, classes, onDone }: { task: Task; classes: ClassRow[]; onDone: () => void }) {
  const { t } = useLanguage();
  const [classId, setClassId] = useState('');
  const [due, setDue] = useState('');
  const [afterLesson, setAfterLesson] = useState(true);
  const assign = async () => {
    try {
      await homeworkAPI.assign({ task_id: task.task_id, class_id: Number(classId), due_at: due ? `${due}T23:59:00` : null, open_after_lesson: afterLesson });
      showToast.success(t('Assigned'));
      onDone();
    } catch (error) {
      showToast.error(errorOf(error)?.error || t('Could not save.'));
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2">
      <select className={selectClass} value={classId} onChange={(e) => setClassId(e.target.value)} aria-label={t('Assign to a group')}>
        <option value="">{t('Assign to a group')}</option>
        {classes.map((c) => (
          <option key={c.class_id} value={c.class_id}>
            {c.class_name}
          </option>
        ))}
      </select>
      <Input className="h-9 w-40" type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label={t('Due date')} />
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={afterLesson} onChange={(e) => setAfterLesson(e.target.checked)} />
        {t('Open after the next lesson')}
      </label>
      <Button size="sm" disabled={!classId} onClick={() => void assign()}>
        {t('Give to group')}
      </Button>
    </div>
  );
}

function BankTab({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const classes = useClasses();
  const [levels, setLevels] = useState<BankLevel[]>([]);
  const [lessonId, setLessonId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editing, setEditing] = useState<Task | 'new' | null>(null);

  const loadBank = useCallback(async () => {
    try {
      setLevels(getApiPayload<{ levels: BankLevel[] }>(await homeworkAPI.bank())?.levels ?? []);
    } catch {
      showToast.error(t('Could not load homework.'));
    }
  }, [t]);
  const loadTasks = useCallback(async () => {
    if (!lessonId) return;
    setTasks(unwrapApiRows<Task>(await homeworkAPI.tasks(lessonId)));
  }, [lessonId]);
  useEffect(() => {
    void loadBank();
  }, [loadBank]);
  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const add = (kind: 'level' | 'book' | 'unit' | 'lesson', parentId?: number) => async (title: string) => {
    try {
      await homeworkAPI.addNode(kind, title, parentId);
      await loadBank();
    } catch (error) {
      showToast.error(errorOf(error)?.error || t('Could not save.'));
    }
  };

  const saveTask = async (data: { lesson_id: number; title: string; skill: string; instructions: string | null; content: { questions: Question[] } }) => {
    try {
      if (editing && editing !== 'new') await homeworkAPI.updateTask(editing.task_id, data);
      else await homeworkAPI.createTask(data);
      setEditing(null);
      await Promise.all([loadTasks(), loadBank()]);
      showToast.success(t('Saved'));
    } catch (error) {
      const body = errorOf(error);
      showToast.error([body?.error || t('Could not save the task.'), ...(body?.details || [])].join(' — '));
    }
  };

  const approve = async (taskId: number) => {
    await homeworkAPI.approveTask(taskId).catch(() => showToast.error(t('Could not save.')));
    await Promise.all([loadTasks(), loadBank()]);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardContent className="grid gap-2 pt-5 text-sm">
          {levels.map((level) => (
            <details key={level.level_id} open>
              <summary className="cursor-pointer font-semibold">{level.name}</summary>
              <div className="ml-3 grid gap-1">
                {level.books.map((book) => (
                  <details key={book.book_id} open>
                    <summary className="cursor-pointer">{book.title}</summary>
                    <div className="ml-3 grid gap-1">
                      {book.units.map((unit) => (
                        <details key={unit.unit_id} open>
                          <summary className="cursor-pointer">{unit.title}</summary>
                          <div className="ml-3 grid gap-1">
                            {unit.lessons.map((lesson) => (
                              <button
                                key={lesson.lesson_id}
                                type="button"
                                onClick={() => {
                                  setLessonId(lesson.lesson_id);
                                  setEditing(null);
                                }}
                                className={`flex justify-between rounded px-2 py-1 text-left ${lessonId === lesson.lesson_id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                              >
                                <span>{lesson.title}</span>
                                <span className="text-xs opacity-80">
                                  {lesson.approved_count}/{lesson.task_count}
                                </span>
                              </button>
                            ))}
                            {isAdmin && <AddNode label={t('New lesson')} onAdd={add('lesson', unit.unit_id)} />}
                          </div>
                        </details>
                      ))}
                      {isAdmin && <AddNode label={t('New unit')} onAdd={add('unit', book.book_id)} />}
                    </div>
                  </details>
                ))}
                {isAdmin && <AddNode label={t('New book')} onAdd={add('book', level.level_id)} />}
              </div>
            </details>
          ))}
          {isAdmin && <AddNode label={t('New level')} onAdd={add('level')} />}
        </CardContent>
      </Card>

      <div className="grid content-start gap-3">
        {!lessonId && <p className="py-6 text-center text-sm text-muted-foreground">{t('Pick a lesson to see its tasks.')}</p>}
        {lessonId && !editing && (
          <div>
            <Button onClick={() => setEditing('new')}>+ {t('New task')}</Button>
          </div>
        )}
        {lessonId && editing && <TaskEditor lessonId={lessonId} task={editing === 'new' ? null : editing} onSave={saveTask} onCancel={() => setEditing(null)} />}
        {lessonId &&
          !editing &&
          tasks.map((task) => (
            <Card key={task.task_id}>
              <CardContent className="grid gap-2 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">{task.title}</h4>
                  <Badge variant="secondary">{task.skill}</Badge>
                  <Badge variant={task.status === 'approved' ? 'success' : 'warning'}>{task.status === 'approved' ? t('Approved') : t('Draft')}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {task.content.questions.length} {t('Questions').toLowerCase()} · {Number(task.max_score)} {t('Points').toLowerCase()}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(task)}>
                      {t('Edit')}
                    </Button>
                    {isAdmin && task.status !== 'approved' && (
                      <Button size="sm" onClick={() => void approve(task.task_id)}>
                        {t('Approve')}
                      </Button>
                    )}
                  </div>
                </div>
                {task.status === 'approved' ? (
                  <AssignForm task={task} classes={classes} onDone={() => undefined} />
                ) : (
                  <p className="text-xs text-muted-foreground">{t('Only approved tasks can be assigned.')}</p>
                )}
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}

const answerText = (q: Question, value: unknown) => {
  if (value == null || value === '') return null;
  if (q.type === 'choice') return q.options?.[Number(value)] ?? String(value);
  if (q.type === 'match' && Array.isArray(value)) return (q.pairs || []).map((p, i) => `${p[0]} → ${value[i] ?? '—'}`).join('; ');
  return String(value);
};

// @MOB-143 A recorded or attached answer. The signed link is fetched on click (it lasts 5 minutes):
// audio plays in place, photos and PDFs open in a new tab.
function MediaAnswer({ mediaId, media }: { mediaId: number; media?: MediaFile }) {
  const { t } = useLanguage();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const open = async () => {
    try {
      const { url } = getApiPayload<{ url: string }>(await homeworkAPI.media(mediaId));
      if (media?.kind === 'audio') setAudioUrl(url);
      else window.open(url, '_blank', 'noopener');
    } catch {
      showToast.error(t('Could not open the file.'));
    }
  };
  if (audioUrl) return <audio controls autoPlay src={audioUrl} className="mt-1 h-9 w-full max-w-sm" />;
  const label = media?.kind === 'audio' ? `🎤 ${t('Listen')}` : `${media?.kind === 'pdf' ? '📄' : '🖼️'} ${media?.file_name || t('Open file')}`;
  return (
    <Button size="sm" variant="outline" className="mr-1 mt-1 h-7" onClick={() => void open()}>
      {label}
    </Button>
  );
}

const mediaIdsOf = (q: Question, value: unknown): number[] =>
  q.type === 'audio' && typeof value === 'number' ? [value] : q.type === 'file' && Array.isArray(value) ? value.filter((v): v is number => typeof v === 'number') : [];

// @MOB-165 Answers of one assignment, with grading.
function SubmissionsPanel({ assignment }: { assignment: Assignment }) {
  const { t } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [items, setItems] = useState<Submission[]>([]);
  const [grades, setGrades] = useState<Record<number, { score: string; feedback: string }>>({});

  const load = useCallback(async () => {
    const [detail, subs] = await Promise.all([homeworkAPI.assignment(assignment.assignment_id), homeworkAPI.submissions(assignment.assignment_id)]);
    setQuestions(getApiPayload<{ task: Task }>(detail)?.task?.content?.questions ?? []);
    setItems(unwrapApiRows<Submission>(subs));
  }, [assignment.assignment_id]);
  useEffect(() => {
    void load().catch(() => showToast.error(t('Could not load homework.')));
  }, [load, t]);

  const grade = async (s: Submission) => {
    const g = grades[s.submission_id] || { score: '', feedback: '' };
    try {
      await homeworkAPI.review(s.submission_id, Number(g.score), g.feedback);
      showToast.success(t('Graded. Coins and notifications sent.'));
      await load();
    } catch (error) {
      showToast.error(errorOf(error)?.error || t('Could not save.'));
    }
  };

  if (!items.length) return <p className="text-sm text-muted-foreground">{t('No submissions yet.')}</p>;
  return (
    <div className="grid gap-3">
      {items.map((s) => {
        const g = grades[s.submission_id] || { score: s.score ?? s.auto_score ?? '', feedback: s.feedback ?? '' };
        return (
          <div key={s.submission_id} className="grid gap-2 rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">
                {s.first_name} {s.last_name}
              </span>
              <Badge variant={s.status === 'reviewed' ? 'success' : s.status === 'submitted' ? 'warning' : 'secondary'}>{s.status}</Badge>
              <span className="text-xs text-muted-foreground">{date(s.submitted_at)}</span>
              <span className="ml-auto text-sm">
                {t('Auto score')}: {s.auto_score ?? '—'} · {s.score != null ? `${s.score}/${s.max_score}` : ''}
              </span>
            </div>
            <ol className="ml-4 list-decimal text-sm">
              {questions.map((q) => (
                <li key={q.id}>
                  <span className="text-muted-foreground">{q.prompt}</span> —{' '}
                  {q.type === 'audio' || q.type === 'file' ? (
                    mediaIdsOf(q, s.answers?.[q.id]).length ? (
                      <span className="inline-flex flex-wrap items-center">
                        {mediaIdsOf(q, s.answers?.[q.id]).map((id) => (
                          <MediaAnswer key={id} mediaId={id} media={s.media?.find((m) => m.media_id === id)} />
                        ))}
                      </span>
                    ) : (
                      <b>{t('Not answered')}</b>
                    )
                  ) : (
                    <b>{answerText(q, s.answers?.[q.id]) ?? t('Not answered')}</b>
                  )}
                </li>
              ))}
            </ol>
            {s.status !== 'in_progress' && (
              <div className="grid gap-2 md:grid-cols-[120px_1fr_auto]">
                <Input
                  type="number"
                  min={0}
                  max={Number(s.max_score) || undefined}
                  value={g.score}
                  onChange={(e) => setGrades({ ...grades, [s.submission_id]: { ...g, score: e.target.value } })}
                  aria-label={t('Points')}
                />
                <Textarea rows={1} placeholder={t('Comment for the student')} value={g.feedback} onChange={(e) => setGrades({ ...grades, [s.submission_id]: { ...g, feedback: e.target.value } })} />
                <Button disabled={g.score === ''} onClick={() => void grade(s)}>
                  {t('Save grade')}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AssignmentsTab() {
  const { t } = useLanguage();
  const classes = useClasses();
  const [classId, setClassId] = useState('');
  const [items, setItems] = useState<Assignment[]>([]);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(unwrapApiRows<Assignment>(await homeworkAPI.assignments(classId ? Number(classId) : undefined)));
    } catch {
      showToast.error(t('Could not load homework.'));
    }
  }, [classId, t]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="grid gap-3">
      <div>
        <select className={selectClass} value={classId} onChange={(e) => setClassId(e.target.value)} aria-label={t('Classes')}>
          <option value="">{t('All groups')}</option>
          {classes.map((c) => (
            <option key={c.class_id} value={c.class_id}>
              {c.class_name}
            </option>
          ))}
        </select>
      </div>
      {!items.length && <p className="py-6 text-center text-sm text-muted-foreground">{t('Nothing here yet.')}</p>}
      {items.map((a) => (
        <Card key={a.assignment_id}>
          <CardContent className="grid gap-2 pt-5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{a.task_title}</h4>
              <Badge variant="outline">{a.class_name}</Badge>
              <Badge variant={a.is_open ? 'success' : 'secondary'}>{a.is_open ? t('Open now') : t('Waiting for the lesson')}</Badge>
              {a.due_at && (
                <span className="text-xs text-muted-foreground">
                  {t('Due date')}: {date(a.due_at)}
                </span>
              )}
              <span className="ml-auto text-sm">{t('Submitted: {count}', { count: a.submitted_count })}</span>
              {a.to_review_count > 0 && <Badge variant="warning">{t('To grade: {count}', { count: a.to_review_count })}</Badge>}
              <Button size="sm" variant="outline" onClick={() => setOpen(open === a.assignment_id ? null : a.assignment_id)}>
                {t('Answers and grading')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void homeworkAPI.removeAssignment(a.assignment_id).then(load)}>
                {t('Delete')}
              </Button>
            </div>
            {open === a.assignment_id && <SubmissionsPanel assignment={a} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const HomeworkPage = () => {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'given' ? 'given' : 'bank';
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = user?.userType === 'superuser';
  const tabs = [
    { id: 'bank', label: t('Bank') },
    { id: 'given', label: t('Given homework') },
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div>
        <h1 className="text-2xl font-bold">{t('Homework Bank')}</h1>
        <p className="text-sm text-muted-foreground">{t('Level → Book → Unit → Lesson → Task. Students see approved tasks you assign to a group.')}</p>
      </div>
      <div className="inline-flex rounded-lg border bg-muted/40 p-1" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setParams({ tab: item.id })}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${tab === item.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'bank' ? <BankTab isAdmin={isAdmin} /> : <AssignmentsTab />}
    </div>
  );
};

export default HomeworkPage;
