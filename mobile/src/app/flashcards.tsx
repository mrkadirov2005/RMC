import { useQueryClient } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reviewFlashcard, useFlashcards } from '../api/queries';
import type { Flashcard, FlashcardGrade, FlashcardSession } from '../api/types';
import { Button, Card, Empty, QueryView, Tag, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { DetailScreen } from '../screens/DetailScreen';
import { colors, radius, space } from '../theme/tokens';

const GRADES: { grade: FlashcardGrade; color: string }[] = [
  { grade: 'again', color: colors.danger },
  { grade: 'hard', color: colors.warning },
  { grade: 'good', color: colors.primary },
  { grade: 'easy', color: colors.success },
];

// Words are English; the device reads them aloud.
const say = (word: string) => {
  Speech.stop();
  Speech.speak(word, { language: 'en-US', rate: 0.9 });
};

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[text.muted, { fontSize: 12, textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

// @MOB-145 One pass through today's cards: word, pronunciation, answer, then how well it was
// remembered. "Again" puts the card back at the end of this session.
function Review({ session, onDone }: { session: FlashcardSession; onDone: () => void }) {
  const { t } = useT();
  const [queue, setQueue] = useState<Flashcard[]>(session.cards);
  const [done, setDone] = useState(0);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const card = queue[0];

  if (!card) {
    return (
      <Card>
        <Text style={[text.bold, { fontSize: 18, textAlign: 'center' }]}>{t.sessionDone}</Text>
        <Text style={[text.muted, { textAlign: 'center', marginVertical: space.sm }]}>{t.sessionDoneText}</Text>
        <Button title={t.done} onPress={onDone} />
      </Card>
    );
  }

  const answer = async (grade: FlashcardGrade) => {
    setBusy(true);
    setError(false);
    try {
      const result = await reviewFlashcard(card.word_id, grade);
      setLast(`${card.front}: ${t.grades[grade]} · ${t.nextIn(result.interval_days)}`);
      setQueue((q) => (grade === 'again' ? [...q.slice(1), q[0]] : q.slice(1)));
      if (grade !== 'again') setDone((n) => n + 1);
      setShown(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={[text.muted, { textAlign: 'center' }]}>{t.cardOf(done + 1, done + queue.length)}</Text>
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          {card.is_new ? <Tag label={t.newWord} tone="blue" /> : <View />}
          {card.set_title ? <Text style={[text.muted, { fontSize: 12 }]}>{card.set_title}</Text> : null}
        </View>
        <Text style={styles.front}>{card.front}</Text>
        <Pressable onPress={() => say(card.front)} style={styles.speak} accessibilityRole="button" accessibilityLabel={t.listenWord}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>🔊 {t.listenWord}</Text>
        </Pressable>
        {shown ? <Text style={styles.back}>{card.back}</Text> : null}
      </Card>

      {shown ? (
        <>
          <Text style={[text.muted, { textAlign: 'center', marginBottom: space.sm }]}>{t.howWell}</Text>
          <View style={styles.grades}>
            {GRADES.map(({ grade, color }) => (
              <Pressable
                key={grade}
                disabled={busy}
                onPress={() => void answer(grade)}
                style={[styles.grade, { borderColor: color, opacity: busy ? 0.5 : 1 }]}
                accessibilityRole="button"
              >
                <Text style={{ color, fontWeight: '700' }}>{t.grades[grade]}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Button title={t.showAnswer} onPress={() => setShown(true)} />
      )}
      {error ? <Text style={{ color: colors.danger, textAlign: 'center', marginTop: space.sm }}>{t.networkError}</Text> : null}
      {last ? <Text style={[text.muted, { textAlign: 'center', marginTop: space.md }]}>{last}</Text> : null}
    </>
  );
}

// @MOB-145 Vocabulary flashcards from the consolidation words of the student's groups.
export default function FlashcardsScreen() {
  const { t } = useT();
  const query = useFlashcards();
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState(false);
  const finish = () => {
    setReviewing(false);
    void queryClient.invalidateQueries({ queryKey: ['flashcards'] });
  };

  return (
    <DetailScreen title={t.flashcards}>
      <QueryView query={query}>
        {(data) =>
          data.stats.total === 0 ? (
            <Empty text={t.noWords} />
          ) : reviewing ? (
            <Review session={data} onDone={finish} />
          ) : (
            <>
              <Text style={[text.muted, { marginBottom: space.sm }]}>{t.flashcardsIntro}</Text>
              <Card>
                <View style={{ flexDirection: 'row' }}>
                  <Stat value={data.stats.due} label={t.dueNow} />
                  <Stat value={data.stats.new} label={t.newWords} />
                  <Stat value={data.stats.learned} label={t.learned} />
                </View>
              </Card>
              {data.cards.length ? (
                <Button title={`${t.startReview} · ${data.cards.length}`} onPress={() => setReviewing(true)} />
              ) : (
                <Card>
                  <Text style={[text.bold, { textAlign: 'center' }]}>{t.sessionDone}</Text>
                  <Text style={[text.muted, { textAlign: 'center' }]}>{t.sessionDoneText}</Text>
                </Card>
              )}
            </>
          )
        }
      </QueryView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  card: { alignItems: 'center', paddingVertical: space.xl, gap: space.sm },
  cardTop: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  front: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: space.md },
  speak: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.primaryLight },
  back: { fontSize: 20, color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: space.md },
  grades: { flexDirection: 'row', gap: space.sm },
  grade: { flex: 1, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', backgroundColor: colors.card },
});
