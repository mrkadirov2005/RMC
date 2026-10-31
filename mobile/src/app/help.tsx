import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { sendHelpRequest, useHelpRequests } from '../api/queries';
import type { HelpKind } from '../api/types';
import { Button, Card, Chips, Empty, QueryView, SectionHeader, Tag, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { shortDate } from '../lib/format';
import { DetailScreen, useChildParam } from '../screens/DetailScreen';
import { colors, radius } from '../theme/tokens';

const KINDS: HelpKind[] = ['help', 'complaint', 'thanks', 'suggestion'];

// @MOB-153 Help and feedback: send a request and follow its status and the center's answer.
// Parents pass ?child= so the request is about that child.
export default function HelpScreen() {
  const { t } = useT();
  const childId = useChildParam();
  const query = useHelpRequests();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<HelpKind>('help');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await sendHelpRequest(kind, message.trim(), childId);
      setMessage('');
      setStatus(t.sent);
      await queryClient.invalidateQueries({ queryKey: ['help-requests'] });
    } catch {
      setStatus(t.genericError);
    } finally {
      setBusy(false);
    }
  };

  const tone = { submitted: 'blue', in_review: 'warn', resolved: 'ok' } as const;

  return (
    <DetailScreen title={t.helpTitle}>
      <Card>
        <Chips<HelpKind> options={KINDS.map((k) => ({ value: k, label: t.helpKinds[k] }))} value={kind} onChange={setKind} />
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={t.messagePlaceholder}
          multiline
          maxLength={4000}
          style={{ minHeight: 110, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 12, textAlignVertical: 'top', fontSize: 14.5, marginBottom: 12 }}
          accessibilityLabel={t.messagePlaceholder}
        />
        {status ? <Text style={[text.muted, { marginBottom: 8 }]}>{status}</Text> : null}
        <Button title={t.send} onPress={() => void send()} loading={busy} disabled={message.trim().length < 3} />
      </Card>

      <SectionHeader title={t.myRequests} />
      <QueryView query={query}>
        {(data) =>
          data.items.length ? (
            <>
              {data.items.map((r) => (
                <Card key={r.request_id}>
                  <Text style={text.bold}>{t.helpKinds[r.kind]}</Text>
                  <Text style={[text.muted, { marginBottom: 6 }]}>{shortDate(r.created_at)}</Text>
                  <Text style={{ color: colors.text, marginBottom: 8 }}>{r.message}</Text>
                  <Tag label={t.helpStatuses[r.status]} tone={tone[r.status]} />
                  {r.response ? (
                    <Text style={{ color: colors.text, marginTop: 8 }}>
                      <Text style={text.bold}>{t.answer}: </Text>
                      {r.response}
                    </Text>
                  ) : null}
                </Card>
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
