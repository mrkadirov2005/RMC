import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFlashcards } from '../../api/queries';
import { Card, Screen, SectionHeader, Tag, Title, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { colors, radius, space } from '../../theme/tokens';

function HeroStat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// @MOB-104 Practice tab: flashcards (MOB-145) as one full-width card with today's numbers, then
// what is coming in R2/R3 (MOB-301, MOB-305, MOB-306) as a quiet list, so nothing is squeezed.
export default function Practice() {
  const { t } = useT();
  const flashcards = useFlashcards();
  const stats = flashcards.data?.stats;
  const todayCount = flashcards.data?.cards.length ?? 0;
  const noWords = stats ? stats.total === 0 : false;
  const open = () => router.push('/flashcards');

  const comingSoon: [string, string, string][] = [
    ['🤖', t.aiPractice, t.aiPracticeText],
    ['⚔️', t.battle, t.battleText],
    ['🎙', t.speakingPartner, t.speakingPartnerText],
  ];

  return (
    <Screen refreshing={flashcards.isRefetching} onRefresh={() => void flashcards.refetch()}>
      <Title>{t.practice}</Title>

      <Pressable onPress={open} accessibilityRole="button" style={({ pressed }) => [styles.hero, pressed && { opacity: 0.92 }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Text style={{ fontSize: 26 }}>🗂</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroTitle}>{t.flashcards}</Text>
            <Text style={styles.heroText}>{t.flashcardsShort}</Text>
          </View>
        </View>

        {noWords ? (
          <Text style={styles.heroNote}>{t.noWords}</Text>
        ) : (
          <>
            <View style={styles.heroStats}>
              <HeroStat value={stats ? stats.due : '–'} label={t.dueNow} />
              <HeroStat value={stats ? stats.new : '–'} label={t.newWords} />
              <HeroStat value={stats ? stats.learned : '–'} label={t.learned} />
            </View>
            <View style={styles.heroButton}>
              <Text style={styles.heroButtonText}>
                {stats && todayCount === 0 ? t.sessionDone : todayCount > 0 ? `${t.startReview} · ${todayCount}` : t.startReview}
              </Text>
            </View>
          </>
        )}
      </Pressable>

      <SectionHeader title={t.comingSoon} />
      {comingSoon.map(([icon, title, description]) => (
        <Card key={title} style={styles.soonRow}>
          <View style={styles.soonIcon}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={text.bold} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[text.muted, { fontSize: 13 }]} numberOfLines={2}>
              {description}
            </Text>
          </View>
          <Tag label={t.comingSoon} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    marginBottom: space.lg,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: colors.white, fontSize: 19, fontWeight: '800' },
  heroText: { color: 'rgba(255,255,255,0.85)', fontSize: 13.5, marginTop: 2 },
  heroNote: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  heroStats: { flexDirection: 'row', gap: space.sm },
  heroStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.md,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  heroStatValue: { color: colors.white, fontSize: 22, fontWeight: '800' },
  heroStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, marginTop: 2 },
  heroButton: { backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  heroButtonText: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  soonRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: 0.8 },
  soonIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
