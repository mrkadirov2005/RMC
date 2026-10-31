import { Linking } from 'react-native';
import { useLinks } from '../api/queries';
import { Empty, ListRow, QueryView } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { DetailScreen } from '../screens/DetailScreen';

// @MOB-150 Official links, managed in the web panel; they open outside the app.
export default function LinksScreen() {
  const { t } = useT();
  const query = useLinks();
  return (
    <DetailScreen title={t.officialLinks}>
      <QueryView query={query}>
        {(data) =>
          data.items.length ? (
            <>
              {data.items.map((link) => (
                <ListRow key={link.link_id} icon={link.icon || '🔗'} title={link.title} subtitle={link.url} onPress={() => void Linking.openURL(link.url)} />
              ))}
            </>
          ) : (
            <Empty />
          )
        }
      </QueryView>
    </DetailScreen>
  );
}
