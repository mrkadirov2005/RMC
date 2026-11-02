import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../api/client';
import { useT } from '../i18n/LanguageContext';
import { colors, font, radius, space } from '../theme/tokens';

// @MOB-101 Base components shared by every screen.

export function Screen({ children, refreshing, onRefresh }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Title({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.titleRow}>
      <Text style={styles.title}>{children}</Text>
      {right}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style, onPress, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; tone?: 'blue' }) {
  const content = <View style={[styles.card, tone === 'blue' && styles.cardBlue, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}>
      {content}
    </Pressable>
  );
}

export function Button({ title, onPress, variant = 'primary', disabled, loading }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; loading?: boolean }) {
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : colors.primaryLight;
  const fg = variant === 'secondary' ? colors.primary : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function ListRow({ icon, title, subtitle, right, onPress }: { icon?: string; title: string; subtitle?: string | null; right?: ReactNode; onPress?: () => void }) {
  return (
    <Card onPress={onPress} style={styles.rowCard}>
      {icon ? (
        <View style={styles.icon}>
          <Text style={{ fontSize: 19 }}>{icon}</Text>
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </Card>
  );
}

export function Tag({ label, tone = 'blue' }: { label: string; tone?: 'blue' | 'ok' | 'warn' | 'bad' }) {
  const map = {
    blue: [colors.primaryLight, colors.primary],
    ok: [colors.successLight, colors.success],
    warn: [colors.warningLight, colors.warning],
    bad: [colors.dangerLight, colors.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.tagText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Pill({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.pill} accessibilityRole={onPress ? 'button' : undefined}>
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

export function Chips<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.sm }}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable key={String(option.value)} onPress={() => onChange(option.value)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
            <Text style={[styles.chipText, on && { color: colors.white }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// @MOB-101 Percentage ring drawn with two half-borders, no SVG dependency.
export function Ring({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={[styles.ring, { borderColor: pct >= 75 ? colors.success : pct >= 50 ? colors.warning : colors.danger }]}>
        <Text style={styles.ringText}>{pct}%</Text>
      </View>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function Bar({ value }: { value: number }) {
  return (
    <View style={styles.bar}>
      <View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
    </View>
  );
}

export function Loading() {
  const { t } = useT();
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.muted}>{t.loading}</Text>
    </View>
  );
}

export function Empty({ text }: { text?: string }) {
  const { t } = useT();
  return (
    <View style={styles.state}>
      <Text style={styles.muted}>{text || t.empty}</Text>
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useT();
  const message = error instanceof ApiError && error.status === 0 ? t.networkError : t.genericError;
  return (
    <View style={styles.state}>
      <Text style={[styles.muted, { textAlign: 'center' }]}>{message}</Text>
      {onRetry ? <Button title={t.retry} variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

// Loading / error / content in one place, so every screen handles all three.
export function QueryView<T>({ query, children }: { query: { data?: T; isLoading: boolean; error: unknown; refetch: () => unknown }; children: (data: T) => ReactNode }) {
  if (query.isLoading) return <Loading />;
  if (query.error && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!query.data) return <Empty />;
  return <>{children(query.data)}</>;
}

export const text = StyleSheet.create({
  muted: { color: colors.muted, fontSize: font.small + 0.5 },
  bold: { fontWeight: '700', color: colors.text },
  big: { fontSize: font.display, fontWeight: '800', color: colors.text },
  white: { color: colors.white },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: space.lg, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md, marginTop: space.xs },
  title: { fontSize: font.heading, fontWeight: '700', color: colors.text },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.lg, marginBottom: space.sm },
  section: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionAction: { color: colors.primary, fontSize: font.small, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md + 2,
    marginBottom: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardBlue: { backgroundColor: colors.primary },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontWeight: '700', color: colors.text, fontSize: font.body },
  muted: { color: colors.muted, fontSize: font.small + 0.5 },
  chevron: { color: colors.muted, fontSize: 22 },
  button: { borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  buttonText: { fontWeight: '700', fontSize: font.body },
  tag: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '700' },
  pill: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5 },
  pillText: { fontWeight: '600', fontSize: 13, color: colors.text },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 6 },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  ring: { width: 64, height: 64, borderRadius: 32, borderWidth: 7, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontWeight: '700', color: colors.text },
  bar: { height: 8, backgroundColor: '#E6ECF5', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
  state: { alignItems: 'center', justifyContent: 'center', padding: space.xl, gap: space.md },
});
