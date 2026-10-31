import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { markNotificationsRead, useNotifications } from '../api/queries';
import { Empty, ListRow, QueryView, Tag } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { shortDate } from '../lib/format';
import { DetailScreen } from '../screens/DetailScreen';

const ICONS: Record<string, string> = { attendance: '📅', grades: '📘', coins: '🪙', payments: '💳', announcements: '📣' };

// @MOB-126 Notification inbox. Opening it marks everything read; a row opens its screen.
export default function NotificationsScreen() {
  const { t } = useT();
  const query = useNotifications();
  const queryClient = useQueryClient();
  const unread = query.data?.unread ?? 0;

  useEffect(() => {
    if (unread > 0) {
      void markNotificationsRead().then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }));
    }
  }, [unread, queryClient]);

  return (
    <DetailScreen title={t.notifications}>
      <QueryView query={query}>
        {(data) =>
          data.items.length ? (
            <>
              {data.items.map((n) => (
                <ListRow
                  key={n.notification_id}
                  icon={ICONS[n.category] || '🔔'}
                  title={n.title}
                  subtitle={`${n.body} · ${shortDate(n.created_at)}`}
                  right={n.read_at ? undefined : <Tag label={t.new} />}
                  onPress={n.data?.url ? () => router.push(n.data!.url as never) : undefined}
                />
              ))}
            </>
          ) : (
            <Empty text={t.noNotifications} />
          )
        }
      </QueryView>
    </DetailScreen>
  );
}
