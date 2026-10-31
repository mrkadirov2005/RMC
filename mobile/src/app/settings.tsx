import { router } from 'expo-router';
import { APP_VERSION } from '../config';
import { APP_ENV, crashReportingEnabled, sendTestCrash } from '../lib/crash';
import { Switch, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { revokeDevice, sendHelpRequest, setNotificationPreference, useDevices, useNotificationPreferences } from '../api/queries';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Chips, ListRow, QueryView, SectionHeader, Tag, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { shortDate } from '../lib/format';
import { DetailScreen } from '../screens/DetailScreen';
import { colors } from '../theme/tokens';
import { useState } from 'react';

// @MOB-114 Language, signed-in devices and sign-out.
export default function SettingsScreen() {
  const { t, lang, setLang } = useT();
  const { signOut } = useAuth();
  // @MOB-171 Accounts are made by the center, so deleting one is a request the admins carry out.
  const [deletion, setDeletion] = useState<'idle' | 'confirm' | 'busy' | 'sent' | 'failed'>('idle');
  const requestDeletion = async () => {
    setDeletion('busy');
    try {
      await sendHelpRequest('help', t.deleteAccountMessage);
      setDeletion('sent');
    } catch {
      setDeletion('failed');
    }
  };
  const devices = useDevices();
  const prefs = useNotificationPreferences();
  const queryClient = useQueryClient();

  const togglePreference = async (category: string, enabled: boolean) => {
    const next = await setNotificationPreference(category, enabled);
    queryClient.setQueryData(['notification-preferences'], next);
  };

  const signOutDevice = async (sessionId: number) => {
    await revokeDevice(sessionId);
    await queryClient.invalidateQueries({ queryKey: ['devices'] });
  };

  return (
    <DetailScreen title={t.settings}>
      <SectionHeader title={t.language} />
      <Card>
        <Chips
          options={[
            { value: 'uz', label: "O'zbekcha" },
            { value: 'en', label: 'English' },
          ]}
          value={lang}
          onChange={setLang}
        />
      </Card>

      {/* @MOB-112 Onboarding again: Telegram, Instagram and video consent can be changed later. */}
      <ListRow icon="🤝" title={t.socialAndConsent} onPress={() => router.push('/onboarding')} />

      {/* @MOB-114 @MOB-043 Turn each kind of notification on or off. */}
      <SectionHeader title={t.notifications} />
      <QueryView query={prefs}>
        {(data) => (
          <Card>
            {data.items.map((p) => (
              <View key={p.category} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={text.bold}>{t.categories[p.category] || p.category}</Text>
                <Switch value={p.enabled} onValueChange={(value) => void togglePreference(p.category, value)} />
              </View>
            ))}
          </Card>
        )}
      </QueryView>

      <SectionHeader title={t.devices} />
      <QueryView query={devices}>
        {(data) => (
          <>
            {data.items.map((device) => (
              <ListRow
                key={device.session_id}
                icon={device.platform === 'ios' ? '📱' : device.platform === 'android' ? '🤖' : '💻'}
                title={device.device_name || device.platform || '—'}
                subtitle={shortDate(device.last_used_at)}
                right={
                  device.is_current ? (
                    <Tag label={t.thisDevice} tone="ok" />
                  ) : (
                    <Text style={[text.bold, { color: '#C0392B' }]} onPress={() => void signOutDevice(device.session_id)}>
                      {t.signOutDevice}
                    </Text>
                  )
                }
              />
            ))}
          </>
        )}
      </QueryView>

      <Card style={{ marginTop: 16 }}>
        <Button title={t.signOut} variant="danger" onPress={() => void signOut()} />
      </Card>
      <Card>
        <Text style={[text.bold, { marginBottom: 4 }]}>{t.deleteAccount}</Text>
        <Text style={[text.muted, { marginBottom: 8 }]}>{deletion === 'sent' ? t.deleteAccountSent : t.deleteAccountText}</Text>
        {deletion === 'failed' ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{t.genericError}</Text> : null}
        {deletion === 'confirm' || deletion === 'busy' ? (
          <Button title={t.deleteAccountConfirm} variant="danger" loading={deletion === 'busy'} onPress={() => void requestDeletion()} />
        ) : deletion !== 'sent' ? (
          <Button title={t.deleteAccount} variant="secondary" onPress={() => setDeletion('confirm')} />
        ) : null}
      </Card>
      <Text style={[text.muted, { textAlign: 'center', fontSize: 12 }]}>
        {t.appName} {APP_VERSION}
        {APP_ENV !== 'production' ? ` · ${APP_ENV}` : ''}
      </Text>
      {/* @MOB-107 Test builds only: sends a test error to check crash reporting and source maps. */}
      {crashReportingEnabled && APP_ENV !== 'production' ? (
        <Button title="Sentry test" variant="secondary" onPress={sendTestCrash} />
      ) : null}
    </DetailScreen>
  );
}
