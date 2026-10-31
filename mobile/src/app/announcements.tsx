import { Text } from 'react-native';
import { useAnnouncements } from '../api/queries';
import { Card, Empty, QueryView, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { shortDate } from '../lib/format';
import { DetailScreen } from '../screens/DetailScreen';

// @MOB-151 Announcements for the user's center, role and groups.
export default function AnnouncementsScreen() {
  const { t } = useT();
  const query = useAnnouncements();
  return (
    <DetailScreen title={t.announcements}>
      <QueryView query={query}>
        {(data) =>
          data.items.length ? (
            <>
              {data.items.map((a) => (
                <Card key={a.announcement_id}>
                  <Text style={[text.bold, { fontSize: 16 }]}>{a.title}</Text>
                  <Text style={[text.muted, { marginBottom: 6 }]}>{shortDate(a.published_at)}</Text>
                  <Text style={{ color: '#17202E', lineHeight: 21 }}>{a.body}</Text>
                </Card>
              ))}
            </>
          ) : (
            <Empty text={t.noAnnouncements} />
          )
        }
      </QueryView>
    </DetailScreen>
  );
}
