import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Screen, Tag, Title, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { space } from '../../theme/tokens';

// @MOB-104 Practice tab. Flashcards work now (MOB-145); the rest ship in R2/R3 (MOB-301, MOB-305,
// MOB-306) and show what is coming instead of an empty tab.
export default function Practice() {
  const { t } = useT();
  const tiles: [string, string, (() => void) | null][] = [
    ['🗂', t.flashcards, () => router.push('/flashcards')],
    ['🤖', t.aiPractice, null],
    ['⚔️', t.battle, null],
    ['🎙', t.speakingPartner, null],
  ];
  return (
    <Screen>
      <Title>{t.practice}</Title>
      <View style={styles.grid}>
        {tiles.map(([icon, label, open]) => (
          <Card key={label} style={styles.tile} onPress={open ?? undefined}>
            <Text style={{ fontSize: 26 }}>{icon}</Text>
            <Text style={[text.bold, { marginVertical: 6 }]}>{label}</Text>
            {open ? <Tag label={t.startReview} tone="ok" /> : <Tag label={t.comingSoon} />}
          </Card>
        ))}
      </View>
      <Text style={text.muted}>{t.comingSoonText}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { width: '47%', marginBottom: 0 },
});
