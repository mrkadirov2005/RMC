import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { acceptPolicy, usePolicies } from '../api/queries';
import { Button, Card, Empty, QueryView, Tag, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { shortDate } from '../lib/format';
import { DetailScreen } from '../screens/DetailScreen';

// @MOB-152 School rules: read the current version and accept it. A new version needs a new
// acceptance.
export default function RulesScreen() {
  const { t } = useT();
  const query = usePolicies();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const accept = async (policyId: number) => {
    setBusy(policyId);
    try {
      await acceptPolicy(policyId);
      await queryClient.invalidateQueries({ queryKey: ['policies'] });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DetailScreen title={t.rules}>
      <QueryView query={query}>
        {(data) =>
          data.items.length ? (
            <>
              {data.items.map((p) => {
                const pending = p.requires_acceptance && !p.accepted;
                const expanded = open === p.policy_id || pending;
                return (
                  // A rule waiting for acceptance is always open and holds the Accept button, so it is not
                  // itself pressable (a button inside a button is invalid on the web build).
                  <Card key={p.policy_id} onPress={pending ? undefined : () => setOpen(open === p.policy_id ? null : p.policy_id)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <Text style={[text.bold, { flex: 1, fontSize: 15.5 }]}>{p.title}</Text>
                      {p.requires_acceptance ? <Tag label={p.accepted ? t.accepted : t.needsAcceptance} tone={p.accepted ? 'ok' : 'warn'} /> : null}
                    </View>
                    <Text style={text.muted}>
                      {t.version} {p.version} · {shortDate(p.published_at)}
                    </Text>
                    {expanded ? <Text style={{ color: '#17202E', lineHeight: 21, marginTop: 8 }}>{p.body}</Text> : null}
                    {pending ? (
                      <View style={{ marginTop: 12 }}>
                        <Button title={t.accept} onPress={() => void accept(p.policy_id)} loading={busy === p.policy_id} />
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </>
          ) : (
            <Empty />
          )
        }
      </QueryView>
    </DetailScreen>
  );
}
