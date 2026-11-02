import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../api/client';
import { sendLinkRequest, useLinkRequests } from '../../api/queries';
import { Button, Card, Empty, QueryView, Screen, SectionHeader, Tag, Title, text } from '../../components/ui';
import { useT } from '../../i18n/LanguageContext';
import { shortDate, fullName } from '../../lib/format';
import { useParentChild } from '../../screens/ParentChild';
import { colors, font, radius, space } from '../../theme/tokens';

const statusTone = { Pending: 'warn', Approved: 'ok', Rejected: 'bad' } as const;

// @MOB-032 Ask to follow another child by their phone or login; an admin approves it in RMC.
function AddChild() {
  const { t } = useT();
  const requests = useLinkRequests();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    setBusy(true);
    setReply(null);
    try {
      const result = await sendLinkRequest(value.trim());
      setReply({ ok: true, text: result.message });
      setValue('');
      void requests.refetch();
    } catch (e) {
      setReply({ ok: false, text: e instanceof ApiError && e.status !== 0 ? e.message : t.networkError });
    } finally {
      setBusy(false);
    }
  };

  const items = requests.data?.items ?? [];
  return (
    <>
      <SectionHeader title={t.addChild} />
      <Card>
        <Text style={[text.muted, { marginBottom: space.sm }]}>{t.addChildIntro}</Text>
        <TextInput
          style={styles.input}
          placeholder={t.childPhoneOrLogin}
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={setValue}
          accessibilityLabel={t.childPhoneOrLogin}
        />
        {reply ? <Text style={{ color: reply.ok ? colors.success : colors.danger, marginBottom: space.sm }}>{reply.text}</Text> : null}
        <Button title={t.sendRequest} onPress={submit} loading={busy} disabled={!value.trim()} />
      </Card>
      {items.length ? (
        <>
          <SectionHeader title={t.linkRequests} />
          {items.map((r) => (
            <Card key={r.request_id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={text.bold}>{r.child_query}</Text>
                  <Text style={text.muted}>{shortDate(r.created_at)}</Text>
                </View>
                <Tag label={t.requestStatus[r.status] || r.status} tone={statusTone[r.status] || 'blue'} />
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </>
  );
}

// @MOB-131 The parent's children with their groups and teachers, and a request to add another.
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
            </>
          ) : (
            <Empty text={t.linkChildHint} />
          )
        }
      </QueryView>
      <AddChild />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, fontSize: font.body, color: colors.text, backgroundColor: colors.white, marginBottom: space.sm },
});
