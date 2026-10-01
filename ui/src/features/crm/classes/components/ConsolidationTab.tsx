import { Fragment, useEffect, useRef, useState } from 'react';
import { Copy, Link2, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showToast } from '@/utils/toast';
import {
  consolidationApi,
  type ConsolidationResultsDashboard,
  type ConsolidationSet,
  type ConsolidationTrialDetailWord,
  type ConsolidationTrial,
  type ConsolidationWord,
} from '../api/consolidationApi';
import { useLanguage } from '@/i18n/LanguageContext';

interface DraftWord {
  id: string;
  // Present only for a word that already exists server-side; absent means "add this one".
  wordId?: number;
  main_word: string;
  translations: string[];
}

const MAX_WORDS = 10;
const MAX_TRANSLATIONS = 5;

const newDraftWord = (): DraftWord => ({ id: Date.now().toString() + Math.random().toString(36).slice(2), main_word: '', translations: [''] });

const toDraftWords = (words: ConsolidationWord[]): DraftWord[] =>
  words.map((word) => ({
    id: `saved-${word.consolidation_word_id}`,
    wordId: word.consolidation_word_id,
    main_word: word.main_word,
    translations: word.translations.length > 0 ? [...word.translations] : [''],
  }));

// Trims and drops blank translations; returns null when the draft isn't submittable yet
// so create and edit can share one validation rule.
const cleanDraftWords = (draftWords: DraftWord[]) => {
  const cleaned = draftWords.map((word) => ({
    consolidation_word_id: word.wordId,
    main_word: word.main_word.trim(),
    translations: word.translations.map((translation) => translation.trim()).filter(Boolean),
  }));
  if (cleaned.length === 0) return { error: 'Add at least one word with at least one accepted translation.' as const };
  if (cleaned.some((word) => !word.main_word || word.translations.length === 0)) {
    return { error: 'Complete every word with a main word and at least one accepted translation, or remove the empty row.' as const };
  }
  return { words: cleaned };
};

const buildShareUrl = (shareToken: string) => `${window.location.origin}/#/consolidate/${shareToken}`;

const formatScore = (trial: ConsolidationTrial | null) => {
  if (!trial || trial.total_words == null) return '—';
  return `${trial.correct_count ?? 0}/${trial.total_words}${trial.is_passed ? ' ✓' : ''}`;
};

const ViolationsCell = ({ trial }: { trial: ConsolidationTrial | null }) => {
  if (!trial) return <span className="text-muted-foreground">—</span>;
  const count = trial.violation_count ?? 0;
  if (count === 0) return <span className="text-muted-foreground">0</span>;
  return (
    <span className="font-medium text-red-600">
      {count}
      {trial.status === 'auto_submitted' ? ' (auto-submitted)' : ''}
    </span>
  );
};

interface WordDraftEditorProps {
  draftWords: DraftWord[];
  violationLimit: number;
  onUpdateWord: (id: string, updates: Partial<DraftWord>) => void;
  onDeleteWord: (id: string) => void;
  onAddWord: () => void;
  onAddTranslation: (id: string) => void;
  onUpdateTranslation: (id: string, index: number, value: string) => void;
  onDeleteTranslation: (id: string, index: number) => void;
  onViolationLimitChange: (value: number) => void;
}

// Shared by the "create" and "edit" flows so both always offer the same rules
// (max words, max translations, required fields).
const WordDraftEditor = ({
  draftWords,
  violationLimit,
  onUpdateWord,
  onDeleteWord,
  onAddWord,
  onAddTranslation,
  onUpdateTranslation,
  onDeleteTranslation,
  onViolationLimitChange,
}: WordDraftEditorProps) => (
  <>
    <div className="space-y-3">
      {draftWords.map((word, index) => (
        <Card key={word.id}>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Label>Word {index + 1} — Main word</Label>
                <Input
                  value={word.main_word}
                  onChange={(e) => onUpdateWord(word.id, { main_word: e.target.value })}
                  placeholder="e.g. salom"
                  className="mt-1"
                />
              </div>
              {draftWords.length > 1 && (
                <button
                  className="mt-6 rounded p-2 text-red-500 hover:bg-red-50"
                  type="button"
                  onClick={() => onDeleteWord(word.id)}
                  aria-label="Remove word"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div>
              <Label className="mb-1 block">Accepted translations</Label>
              <div className="space-y-2">
                {word.translations.map((translation, tIndex) => (
                  <div key={tIndex} className="flex items-center gap-2">
                    <Input
                      value={translation}
                      onChange={(e) => onUpdateTranslation(word.id, tIndex, e.target.value)}
                      placeholder="e.g. hello"
                    />
                    {word.translations.length > 1 && (
                      <button
                        className="rounded p-2 text-red-500 hover:bg-red-50"
                        type="button"
                        onClick={() => onDeleteTranslation(word.id, tIndex)}
                        aria-label="Remove translation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {word.translations.length < MAX_TRANSLATIONS && (
                <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => onAddTranslation(word.id)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add another accepted translation
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {draftWords.length < MAX_WORDS && (
      <Button type="button" variant="outline" onClick={onAddWord}>
        <Plus className="mr-2 h-4 w-4" />
        Add word
      </Button>
    )}

    <div className="w-40">
      <Label htmlFor="violation_limit">Violation limit</Label>
      <Input
        id="violation_limit"
        type="number"
        min={1}
        value={violationLimit}
        onChange={(e) => onViolationLimitChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
        className="mt-1"
      />
      <p className="mt-1 text-xs text-muted-foreground">Lockdown violations allowed before auto-submit.</p>
    </div>
  </>
);

interface ConsolidationTabProps {
  sessionId: number;
  // Fires after a set is created — lets a page embedding this tab elsewhere
  // (e.g. the superuser overview page) refresh its own summary stats.
  onChanged?: () => void;
}

export default function ConsolidationTab({ sessionId, onChanged }: ConsolidationTabProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [set, setSet] = useState<ConsolidationSet | null>(null);
  const [words, setWords] = useState<ConsolidationWord[]>([]);

  // Creation form state
  const [draftWords, setDraftWords] = useState<DraftWord[]>([newDraftWord()]);
  const [violationLimit, setViolationLimit] = useState(3);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Results dashboard state
  const [results, setResults] = useState<ConsolidationResultsDashboard | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
  const [trialDetail, setTrialDetail] = useState<{ trial: ConsolidationTrial; words: ConsolidationTrialDetailWord[] } | null>(null);
  const [trialDetailLoading, setTrialDetailLoading] = useState(false);
  // Re-expanding a row already viewed this session shouldn't re-fetch identical data.
  const trialDetailCache = useRef(new Map<number, { trial: ConsolidationTrial; words: ConsolidationTrialDetailWord[] }>());

  const loadResults = async () => {
    setResultsLoading(true);
    try {
      const data = await consolidationApi.getResults(sessionId);
      setResults(data);
    } catch {
      showToast.error('Failed to load consolidation results.');
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      setCreateError('');
      setEditing(false);
      setDraftWords([newDraftWord()]);
      setViolationLimit(3);
      try {
        const data = await consolidationApi.getForSession(sessionId);
        if (cancelled) return;
        if (data) {
          setSet(data.set);
          setWords(data.words);
          await loadResults();
        } else {
          setSet(null);
          setWords([]);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.error || 'Failed to load consolidation exercise.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const addWord = () => {
    if (draftWords.length >= MAX_WORDS) return;
    setDraftWords((current) => [...current, newDraftWord()]);
  };

  const updateWord = (id: string, updates: Partial<DraftWord>) => {
    setDraftWords((current) => current.map((word) => (word.id === id ? { ...word, ...updates } : word)));
  };

  const deleteWord = (id: string) => {
    setDraftWords((current) => current.filter((word) => word.id !== id));
  };

  const addTranslation = (id: string) => {
    setDraftWords((current) => current.map((word) => (
      word.id === id && word.translations.length < MAX_TRANSLATIONS
        ? { ...word, translations: [...word.translations, ''] }
        : word
    )));
  };

  const updateTranslation = (id: string, index: number, value: string) => {
    setDraftWords((current) => current.map((word) => {
      if (word.id !== id) return word;
      const nextTranslations = [...word.translations];
      nextTranslations[index] = value;
      return { ...word, translations: nextTranslations };
    }));
  };

  const deleteTranslation = (id: string, index: number) => {
    setDraftWords((current) => current.map((word) => {
      if (word.id !== id || word.translations.length <= 1) return word;
      return { ...word, translations: word.translations.filter((_, i) => i !== index) };
    }));
  };

  const startEditing = () => {
    if (!set) return;
    setDraftWords(words.length > 0 ? toDraftWords(words) : [newDraftWord()]);
    setViolationLimit(set.violation_limit);
    setCreateError('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setCreateError('');
  };

  const handleSaveEdit = async () => {
    if (!set) return;
    setCreateError('');
    const cleaned = cleanDraftWords(draftWords);
    if ('error' in cleaned) {
      setCreateError(cleaned.error);
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await consolidationApi.updateSet(set.consolidation_set_id, {
        violation_limit: violationLimit,
        words: cleaned.words,
      });
      setSet(updated.set);
      setWords(updated.words);
      setEditing(false);
      trialDetailCache.current.clear();
      setExpandedStudentId(null);
      setTrialDetail(null);
      await loadResults();
      showToast.success(
        updated.regraded > 0
          ? `Exercise updated — ${updated.regraded} submitted attempt${updated.regraded === 1 ? '' : 's'} re-graded.`
          : 'Exercise updated.'
      );
      onChanged?.();
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || 'Failed to update the exercise.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreate = async () => {
    setCreateError('');
    const cleaned = cleanDraftWords(draftWords);
    if ('error' in cleaned) {
      setCreateError(cleaned.error);
      return;
    }

    setCreating(true);
    try {
      const created = await consolidationApi.create({
        session_id: sessionId,
        violation_limit: violationLimit,
        words: cleaned.words.map(({ main_word, translations }) => ({ main_word, translations })),
      });
      setSet(created.set);
      setWords(created.words);
      await loadResults();
      showToast.success('Consolidation exercise created.');
      onChanged?.();
    } catch (err: any) {
      setCreateError(err?.response?.data?.error || 'Failed to create consolidation exercise.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!set) return;
    try {
      await navigator.clipboard.writeText(buildShareUrl(set.share_token));
      showToast.success('Link copied to clipboard.');
    } catch {
      showToast.error('Could not copy link — copy it manually.');
    }
  };

  const handleRegenerateLink = async () => {
    if (!set) return;
    if (!window.confirm('Regenerate the share link? Students using the old link will no longer be able to access it.')) return;
    setRegenerating(true);
    try {
      const { set: updated } = await consolidationApi.regenerateLink(set.consolidation_set_id);
      setSet(updated);
      showToast.success('Link regenerated.');
    } catch {
      showToast.error('Failed to regenerate link.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteSet = async () => {
    if (!set) return;
    if (!window.confirm('Delete this exercise and start over? The share link stops working immediately. Only possible while no student has attempted it yet.')) return;
    setDeleting(true);
    try {
      await consolidationApi.deleteSet(set.consolidation_set_id);
      // Back to a clean creation form for this same session.
      setSet(null);
      setWords([]);
      setResults(null);
      setExpandedStudentId(null);
      setTrialDetail(null);
      trialDetailCache.current.clear();
      setDraftWords([newDraftWord()]);
      setViolationLimit(3);
      setCreateError('');
      showToast.success('Exercise deleted — you can enter new words now.');
      onChanged?.();
    } catch (err: any) {
      showToast.error(err?.response?.data?.error || 'Failed to delete the exercise.');
    } finally {
      setDeleting(false);
    }
  };

  const toggleStudentRow = async (studentId: number, trial: ConsolidationTrial | null) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null);
      setTrialDetail(null);
      return;
    }
    setExpandedStudentId(studentId);
    if (!trial) {
      setTrialDetail(null);
      return;
    }
    const cached = trialDetailCache.current.get(trial.trial_id);
    if (cached) {
      setTrialDetail(cached);
      return;
    }
    setTrialDetail(null);
    setTrialDetailLoading(true);
    try {
      const detail = await consolidationApi.getTrialDetail(trial.trial_id);
      trialDetailCache.current.set(trial.trial_id, detail);
      setTrialDetail(detail);
    } catch {
      showToast.error('Failed to load trial detail.');
    } finally {
      setTrialDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t(error)}</AlertDescription>
      </Alert>
    );
  }

  if (!set) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            No vocabulary consolidation exercise has been created for this session yet. Add up to 10 words below, each with up to 5 accepted translations, then share the link with your students.
          </AlertDescription>
        </Alert>

        {createError && (
          <Alert variant="destructive">
            <AlertDescription>{t(createError)}</AlertDescription>
          </Alert>
        )}

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
        <WordDraftEditor
          draftWords={draftWords}
          violationLimit={violationLimit}
          onUpdateWord={updateWord}
          onDeleteWord={deleteWord}
          onAddWord={addWord}
          onAddTranslation={addTranslation}
          onUpdateTranslation={updateTranslation}
          onDeleteTranslation={deleteTranslation}
          onViolationLimitChange={setViolationLimit}
        />

        <div>
          <Button type="submit" disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Consolidation Exercise
          </Button>
        </div>
        </form>
      </div>
    );
  }

  if (editing) {
    const attempts = results?.summary.submitted ?? 0;
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            {attempts > 0
              ? `Editing the words re-grades the ${attempts} attempt${attempts === 1 ? '' : 's'} already submitted. Removing a word also removes the answers students gave for it.`
              : 'Change the words, their accepted translations, or the violation limit. The share link stays the same.'}
          </AlertDescription>
        </Alert>

        {createError && (
          <Alert variant="destructive">
            <AlertDescription>{t(createError)}</AlertDescription>
          </Alert>
        )}

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveEdit();
          }}
        >
          <WordDraftEditor
            draftWords={draftWords}
            violationLimit={violationLimit}
            onUpdateWord={updateWord}
            onDeleteWord={deleteWord}
            onAddWord={addWord}
            onAddTranslation={addTranslation}
            onUpdateTranslation={updateTranslation}
            onDeleteTranslation={deleteTranslation}
            onViolationLimitChange={setViolationLimit}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('Save changes')}
            </Button>
            <Button type="button" variant="outline" onClick={cancelEditing} disabled={savingEdit}>
              {t('Cancel')}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const shareUrl = buildShareUrl(set.share_token);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-foreground">
            <Link2 className="h-4 w-4 text-violet-600" />
            Shareable link
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input readOnly value={shareUrl} className="font-mono text-xs" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy link
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerateLink} disabled={regenerating}>
                {regenerating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                Regenerate link
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link in the class group chat. Students pick their name — no login required. Anyone holding the link
            can submit under any enrolled student&apos;s name, so treat submissions from this link as a soft signal, not a
            verified identity (rows below flag exactly which trials came through the link).
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="text-xs text-muted-foreground">{words.length} word{words.length === 1 ? '' : 's'} · violation limit {set.violation_limit}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit words
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteSet} disabled={deleting}>
                {deleting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                {t('Delete')}
              </Button>
            </div>
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">Words in this exercise</summary>
            <ul className="mt-2 space-y-1 pl-4">
              {words.map((word) => (
                <li key={word.consolidation_word_id} className="list-disc">
                  <span className="font-medium text-foreground">{word.main_word}</span> — {word.translations.join(', ')}
                </li>
              ))}
            </ul>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {resultsLoading || !results ? (
            <div className="flex min-h-[100px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm font-semibold text-slate-700 dark:text-foreground">
                {results.summary.submitted} {t('of')} {results.summary.total} students submitted
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-3">{t('Student')}</th>
                      <th className="py-2 pr-3">{t('Submitted')}</th>
                      <th className="py-2 pr-3">{t('Trials')}</th>
                      <th className="py-2 pr-3">Best</th>
                      <th className="py-2 pr-3">Latest violations</th>
                      <th className="py-2 pr-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {results.rows.map((row) => (
                      <Fragment key={row.student_id}>
                        <tr
                          className="cursor-pointer border-b last:border-0 hover:bg-slate-50 dark:hover:bg-muted/40"
                          onClick={() => toggleStudentRow(row.student_id, row.latest_trial)}
                        >
                          <td className="py-2 pr-3 font-medium">{row.first_name} {row.last_name}</td>
                          <td className="py-2 pr-3">{row.submitted ? t('Yes') : t('No')}</td>
                          <td className="py-2 pr-3">{row.trial_count}</td>
                          <td className="py-2 pr-3">{formatScore(row.best_trial)}</td>
                          <td className="py-2 pr-3"><ViolationsCell trial={row.latest_trial} /></td>
                          <td className="py-2 pr-3">
                            {row.latest_trial?.via_share_link && <Badge variant="outline">via link</Badge>}
                          </td>
                        </tr>
                        {expandedStudentId === row.student_id && (
                          <tr>
                            <td colSpan={6} className="bg-slate-50 p-3 dark:bg-muted/20">
                              {trialDetailLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                              ) : !row.latest_trial ? (
                                <p className="text-xs text-muted-foreground">No trial yet.</p>
                              ) : !trialDetail ? (
                                <p className="text-xs text-muted-foreground">Failed to load detail.</p>
                              ) : (
                                <div className="space-y-2">
                                  {trialDetail.trial.violation_count > 0 && (
                                    <Alert variant="destructive" className="border-red-200 bg-red-50 py-2">
                                      <AlertDescription className="text-xs">
                                        {trialDetail.trial.violation_count} lockdown violation{trialDetail.trial.violation_count === 1 ? '' : 's'} —
                                        the student left the exercise screen, switched tabs, or exited fullscreen during this attempt
                                        {trialDetail.trial.status === 'auto_submitted' ? ', which auto-submitted the trial.' : '.'}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                  <ul className="space-y-1 text-xs">
                                    {trialDetail.words.map((word) => (
                                      <li key={word.consolidation_word_id} className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{word.main_word}:</span>
                                        <span className={word.is_correct ? 'text-emerald-600' : 'text-red-500'}>
                                          {word.student_answer || '(blank)'}
                                        </span>
                                        {!word.is_correct && (
                                          <span className="text-muted-foreground">accepted: {word.translations.join(', ')}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                  {trialDetail.trial.via_share_link && (
                                    <p className="text-xs text-muted-foreground">
                                      Started via share link — IP {trialDetail.trial.ip_address || 'unknown'}, device {trialDetail.trial.user_agent || 'unknown'}.
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
