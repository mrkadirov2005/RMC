import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useHomework } from '../api/queries';
import type { HomeworkAnswers, HomeworkItem, HomeworkQuestion, HomeworkStatus, MediaFile } from '../api/types';
import { Empty, ListRow, QueryView, Tag, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { shortDate } from '../lib/format';
import { colors, radius, space } from '../theme/tokens';
import { AudioAnswer, FileAnswer } from './mediaAnswers';

const ICONS: Record<string, string> = { vocabulary: '🔤', grammar: '🧩', reading: '📖', listening: '🎧', writing: '✍️', speaking: '🎤', other: '📝' };
const TONE: Record<HomeworkStatus, 'blue' | 'ok' | 'warn' | 'bad'> = { new: 'blue', in_progress: 'warn', overdue: 'bad', submitted: 'warn', reviewed: 'ok' };

const detailHref = (id: number, childId?: number | null) => (childId ? `/homework/${id}?child=${childId}` : `/homework/${id}`);

// @MOB-140 One homework row: skill, group, due date and status or score.
export function HomeworkRow({ item, childId }: { item: HomeworkItem; childId?: number | null }) {
  const { t } = useT();
  const label = item.status === 'reviewed' && item.score != null ? `${item.score}/${item.max_score}` : t.homeworkStatuses[item.status];
  return (
    <ListRow
      icon={ICONS[item.skill] || '📝'}
      title={item.title}
      subtitle={[t.skills[item.skill], item.class_name, item.due_at ? `${t.due}: ${shortDate(item.due_at)}` : null].filter(Boolean).join(' · ')}
      right={<Tag label={label} tone={TONE[item.status]} />}
      onPress={() => router.push(detailHref(item.assignment_id, childId) as never)}
    />
  );
}

// @MOB-140 Homework list, to-do first. `limit` shows only the first few (home screen).
export function HomeworkList({ childId, limit }: { childId?: number | null; limit?: number }) {
  const { t } = useT();
  const query = useHomework(childId);
  return (
    <QueryView query={query}>
      {(data) => {
        const order: HomeworkStatus[] = ['overdue', 'new', 'in_progress', 'submitted', 'reviewed'];
        const items = [...data.items].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
        const shown = limit ? items.filter((i) => i.status !== 'reviewed' && i.status !== 'submitted').slice(0, limit) : items;
        if (!shown.length) return <Empty text={t.noHomework} />;
        return (
          <>
            {shown.map((item) => (
              <HomeworkRow key={item.assignment_id} item={item} childId={childId} />
            ))}
          </>
        );
      }}
    </QueryView>
  );
}

type QuestionProps = {
  q: HomeworkQuestion;
  index: number;
  value: HomeworkAnswers[string] | undefined;
  onChange: (value: HomeworkAnswers[string]) => void;
  readOnly: boolean;
  mark: number | null | undefined;
  // @MOB-143 Files the answers point to, and whether this viewer (the student) may open them.
  media?: MediaFile[];
  canOpenMedia?: boolean;
};

// @MOB-141 @MOB-142 Renders one question of any type. After submitting, marks show right/wrong.
export function QuestionView({ q, index, value, onChange, readOnly, mark, media = [], canOpenMedia = false }: QuestionProps) {
  const { t } = useT();
  const marked = mark !== undefined && mark !== null && q.type !== 'text';
  return (
    <View style={styles.question}>
      <View style={styles.qHead}>
        <Text style={[text.bold, { flex: 1 }]}>
          {index + 1}. {q.prompt}
        </Text>
        {marked ? <Tag label={mark && mark > 0 ? `✓ ${mark}/${q.points}` : `✗ 0/${q.points}`} tone={mark && mark >= q.points ? 'ok' : mark ? 'warn' : 'bad'} /> : null}
      </View>

      {q.type === 'choice'
        ? q.options.map((option, i) => {
            const selected = value === i;
            return (
              <Pressable
                key={i}
                disabled={readOnly}
                onPress={() => onChange(i)}
                style={[styles.option, selected && styles.optionOn]}
                accessibilityRole="radio"
                testID={`choice-${index}-${i}`}
                accessibilityState={{ selected }}
              >
                <Text style={{ color: colors.text }}>{option}</Text>
              </Pressable>
            );
          })
        : null}

      {q.type === 'gap' ? (
        <TextInput
          editable={!readOnly}
          value={typeof value === 'string' ? value : ''}
          onChangeText={onChange}
          placeholder={t.yourAnswer}
          autoCapitalize="none"
          style={styles.input}
          accessibilityLabel={q.prompt}
        />
      ) : null}

      {q.type === 'match'
        ? q.left.map((left, i) => {
            const current = Array.isArray(value) ? (value as string[]) : [];
            return (
              <View key={i} style={{ marginBottom: space.sm }}>
                <Text style={[text.muted, { marginBottom: 4 }]}>{left} →</Text>
                <View style={styles.chips}>
                  {q.options.map((option) => {
                    const on = current[i] === option;
                    return (
                      <Pressable
                        key={option}
                        disabled={readOnly}
                        onPress={() => {
                          const next = [...current];
                          next[i] = option;
                          onChange(next);
                        }}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <Text style={{ color: on ? colors.white : colors.text, fontSize: 13 }}>{option}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })
        : null}

      {q.type === 'text' ? (
        <>
          <TextInput
            editable={!readOnly}
            value={typeof value === 'string' ? value : ''}
            onChangeText={onChange}
            placeholder={t.yourAnswer}
            multiline
            style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]}
            accessibilityLabel={q.prompt}
          />
          <Text style={text.muted}>
            {String(typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0)}
            {q.min_words ? ` / ${q.min_words}` : ''} {t.words}
          </Text>
        </>
      ) : null}

      {q.type === 'audio' ? (
        <AudioAnswer
          value={typeof value === 'number' ? value : undefined}
          onChange={(id) => onChange(id ?? '')}
          readOnly={readOnly}
          maxSeconds={q.max_seconds}
          media={media}
          canOpen={canOpenMedia}
        />
      ) : null}

      {q.type === 'file' ? (
        <FileAnswer
          value={Array.isArray(value) ? (value as number[]) : undefined}
          onChange={onChange}
          readOnly={readOnly}
          maxFiles={q.max_files}
          media={media}
          canOpen={canOpenMedia}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  question: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md + 2, marginBottom: space.md, gap: space.sm },
  qHead: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  option: { borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.md, padding: 11 },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 11, fontSize: 14.5, color: colors.text, backgroundColor: colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
