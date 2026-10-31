import { StyleSheet, Text, View } from 'react-native';
import { Card, Screen, Tag, Title, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { space } from '../../theme/tokens';

// @MOB-104 Practice tab. Its features ship in R2/R3 (MOB-145, MOB-301, MOB-305, MOB-306);
// R1 shows what is coming instead of an empty tab.
export default function Practice() {
  const { t } = useT();
  const tiles = [
    ['🤖', t.aiPractice],
    ['🗂', t.flashcards],
    ['⚔️', t.battle],
    ['🎙', t.speakingPartner],
  ];
  return (
    <Screen>
      <Title>{t.practice}</Title>
      <View style={styles.grid}>
        {tiles.map(([icon, label]) => (
          <Card key={label} style={styles.tile}>
            <Text style={{ fontSize: 26 }}>{icon}</Text>
            <Text style={[text.bold, { marginVertical: 6 }]}>{label}</Text>
            <Tag label={t.comingSoon} />
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
