import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { APP_VERSION } from '../config';
import { useT } from '../i18n/LanguageContext';
import { storage } from '../lib/storage';
import { updateState, type AppConfig } from '../lib/version';
import { colors, radius, space } from '../theme/tokens';
import { Button } from './ui';

const DISMISSED_KEY = 'ts.update.dismissed';

export const useAppConfig = () =>
  useQuery({
    queryKey: ['app-config'],
    queryFn: () => api.raw('/app-config') as Promise<AppConfig>,
    staleTime: 60 * 60_000,
    retry: false,
  });

// @MOB-175 The app is installed from the website, so it checks for new versions itself: below the
// minimum the app is blocked until updated; otherwise a newer version shows a reminder that can be
// put off until the next version. No internet: nothing is shown.
export function UpdateGate({ children }: { children: ReactNode }) {
  const { t } = useT();
  const config = useAppConfig();
  const [dismissed, setDismissed] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    storage.get(DISMISSED_KEY).then(setDismissed, () => setDismissed(null));
  }, []);

  const state = updateState(APP_VERSION, config.data, dismissed);
  const url = config.data?.download_url;
  const canDownload = Platform.OS !== 'ios' && Boolean(url);
  const download = () => {
    if (url) void Linking.openURL(url);
  };

  if (state === 'required') {
    return (
      <SafeAreaView style={styles.blocked}>
        <Text style={styles.icon}>⬇️</Text>
        <Text style={styles.title}>{t.updateRequired}</Text>
        <Text style={styles.body}>{t.updateRequiredText(APP_VERSION, config.data?.latest_version ?? config.data?.min_app_version ?? '')}</Text>
        {config.data?.release_notes ? <Text style={styles.notes}>{config.data.release_notes}</Text> : null}
        {canDownload ? <Button title={t.downloadUpdate} onPress={download} /> : <Text style={styles.body}>{t.updateAskCenter}</Text>}
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {state === 'available' && dismissed !== undefined && canDownload ? (
        <SafeAreaView edges={['bottom']} style={styles.bannerWrap} pointerEvents="box-none">
          <View style={styles.banner} accessibilityRole="alert">
            <Text style={styles.bannerText}>{t.updateAvailable(config.data?.latest_version ?? '')}</Text>
            <Pressable
              onPress={() => {
                const version = config.data?.latest_version ?? null;
                setDismissed(version);
                if (version) void storage.set(DISMISSED_KEY, version);
              }}
              accessibilityRole="button"
              style={styles.bannerButton}
            >
              <Text style={styles.later}>{t.later}</Text>
            </Pressable>
            <Pressable onPress={download} accessibilityRole="button" style={[styles.bannerButton, styles.update]}>
              <Text style={styles.updateText}>{t.update}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  blocked: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.md, backgroundColor: colors.background },
  icon: { fontSize: 48, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  notes: { fontSize: 14, color: colors.text, backgroundColor: colors.card, padding: space.md, borderRadius: radius.md },
  bannerWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  banner: {
    margin: space.md,
    marginBottom: 72,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  bannerText: { flex: 1, color: colors.card, fontWeight: '600' },
  bannerButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm },
  later: { color: colors.card, opacity: 0.8 },
  update: { backgroundColor: colors.primary },
  updateText: { color: '#fff', fontWeight: '700' },
});
