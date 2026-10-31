import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { saveHomeworkAnswers, submitHomework, useHomeworkDetail } from '../../api/queries';
import type { HomeworkAnswers } from '../../api/types';
import { Button, Card, QueryView, Tag, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { shortDate } from '../../lib/format';
import { DetailScreen, useChildParam } from '../../screens/DetailScreen';
import { QuestionView } from '../../screens/homework';
import { colors } from '../../theme/tokens';

const AUTOSAVE_MS = 1500;

// @MOB-141 @MOB-142 @MOB-144 Do a homework: answers autosave while typing, one submit, then the
// score, right/wrong per question and the teacher's comment. Parents see it read only.
export default function HomeworkDetailScreen() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const assignmentId = Number(id);
  const childId = useChildParam();
  const query = useHomeworkDetail(assignmentId, childId);
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<HomeworkAnswers>({});
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<number | null>(null);

  const data = query.data;
  const done = data?.status === 'submitted' || data?.status === 'reviewed';
  const readOnly = Boolean(childId) || done;

  useEffect(() => {
    if (data && loadedFor.current !== data.assignment_id) {
      loadedFor.current = data.assignment_id;
      setAnswers(data.answers || {});
    }
  }, [data]);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const change = (questionId: string, value: HomeworkAnswers[string]) => {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    if (timer.current) clearTimeout(timer.current);
    setSaveState('saving');
    timer.current = setTimeout(() => {
      saveHomeworkAnswers(assignmentId, next)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('idle'));
    }, AUTOSAVE_MS);
  };

  const submit = async () => {
    if (timer.current) clearTimeout(timer.current);
    setSubmitting(true);
    setError(null);
    try {
      await submitHomework(assignmentId, answers);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['homework'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    } catch {
      setError(t.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DetailScreen title={data?.title || t.homework}>
      <QueryView query={query}>
        {(hw) => (
          <>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text style={[text.bold, { fontSize: 16, flex: 1 }]}>{hw.title}</Text>
                <Tag label={t.homeworkStatuses[hw.status]} tone={hw.status === 'reviewed' ? 'ok' : hw.status === 'overdue' ? 'bad' : 'blue'} />
              </View>
              <Text style={text.muted}>
                {[t.skills[hw.skill], hw.class_name, hw.due_at ? `${t.due}: ${shortDate(hw.due_at)}` : null].filter(Boolean).join(' · ')}
              </Text>
              {hw.instructions ? <Text style={{ color: colors.text, marginTop: 8 }}>{hw.instructions}</Text> : null}
            </Card>

            {done ? (
              <Card tone="blue">
                <Text style={[text.white, { opacity: 0.85 }]}>{t.score}</Text>
                <Text style={[text.white, { fontSize: 28, fontWeight: '800' }]}>
                  {hw.score != null ? `${hw.score} / ${hw.max_score}` : '…'}
                </Text>
                {hw.status === 'submitted' ? <Text style={[text.white, { opacity: 0.9 }]}>{t.waitingReview}</Text> : null}
                {hw.feedback ? (
                  <Text style={[text.white, { marginTop: 8 }]}>
                    {t.feedback}: {hw.feedback}
                  </Text>
                ) : null}
              </Card>
            ) : null}

            {hw.task.questions.map((q, i) => (
              <QuestionView
                key={q.id}
                q={q}
                index={i}
                value={answers[q.id]}
                onChange={(value) => change(q.id, value)}
                readOnly={readOnly}
                mark={hw.per_question ? hw.per_question[q.id] : undefined}
              />
            ))}

            {childId ? <Text style={text.muted}>{t.homeworkReadOnly}</Text> : null}
            {!readOnly ? (
              <>
                <Text style={[text.muted, { marginBottom: 8 }]}>
                  {saveState === 'saving' ? t.saving : saveState === 'saved' ? `✓ ${t.saved}` : t.submitConfirm}
                </Text>
                {error ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{error}</Text> : null}
                <Button title={t.submit} onPress={() => void submit()} loading={submitting} />
              </>
            ) : null}
          </>
        )}
      </QueryView>
    </DetailScreen>
  );
}
