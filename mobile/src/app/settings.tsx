import { Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { revokeDevice, useDevices } from '../api/queries';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Chips, ListRow, QueryView, SectionHeader, Tag, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { shortDate } from '../lib/format';
import { DetailScreen } from '../screens/DetailScreen';

// @MOB-114 Language, signed-in devices and sign-out.
export default function SettingsScreen() {
  const { t, lang, setLang } = useT();
  const { signOut } = useAuth();
  const devices = useDevices();
  const queryClient = useQueryClient();

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
    </DetailScreen>
  );
}
