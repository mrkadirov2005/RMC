import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Card, Empty, QueryView, Screen, Tag, Title, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { fullName } from '../../lib/format';
import { useParentChild } from '../../screens/ParentChild';

// @MOB-131 The parent's children with their groups and teachers. Linking another child is done
// by the center for now (the in-app link request is MOB-032).
export default function Children() {
  const { t } = useT();
  const { query, childId, setChildId } = useParentChild();
  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <Title>{t.myChildren}</Title>
      <QueryView query={query}>
        {(data) =>
          data.items.length ? (
            <>
              {data.items.map((child) => (
                <Card
                  key={child.student_id}
                  onPress={() => {
                    setChildId(child.student_id);
                    router.navigate('/parent');
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[text.bold, { fontSize: 16 }]}>{fullName(child.first_name, child.last_name)}</Text>
                    {child.student_id === childId ? <Tag label="✓" tone="ok" /> : null}
                  </View>
                  {child.groups.map((g) => (
                    <Text key={g.student_id} style={[text.muted, { marginTop: 4 }]}>
                      {g.class_name}
                      {g.teacher_name ? ` · ${t.teacher}: ${g.teacher_name}` : ''}
                    </Text>
                  ))}
                </Card>
              ))}
              <Text style={text.muted}>{t.linkChildHint}</Text>
            </>
          ) : (
            <Empty text={t.linkChildHint} />
          )
        }
      </QueryView>
    </Screen>
  );
}
