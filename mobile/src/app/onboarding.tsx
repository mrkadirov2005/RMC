import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { answerConsent, checkTelegram, finishOnboarding, markInstagramOpened, useOnboarding } from '../api/queries';
import type { Onboarding, TelegramCheck } from '../api/types';
import { Button, Card, Chips, QueryView, SectionHeader, Tag, text } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { fullName } from '../lib/format';
import { registerForPush } from '../lib/push';
import { DetailScreen } from '../screens/DetailScreen';
import { colors, space } from '../theme/tokens';

const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

// @MOB-113 Telegram step: verified only when the bot confirms channel membership.
function TelegramStep({ initial }: { initial: TelegramCheck }) {
  const { t } = useT();
  const [check, setCheck] = useState(initial);
  const [busy, setBusy] = useState(false);
  const recheck = async () => {
    setBusy(true);
    try {
      setCheck(await checkTelegram());
    } catch {
      setCheck({ ...check, status: 'unavailable' });
    } finally {
      setBusy(false);
    }
  };
  if (check.status === 'not_configured') return null;
  const verified = check.status === 'verified';
  return (
    <>
      <SectionHeader title={t.telegramStep} />
      <Card>
        <Text style={[verified ? text.bold : text.muted, { marginBottom: space.sm }]}>{t.telegramText[check.status]}</Text>
        {!verified ? (
          <View style={{ gap: space.sm }}>
            {check.status === 'not_linked' && check.bot_url ? (
              <Button title={t.openBot} variant="secondary" onPress={() => void Linking.openURL(check.bot_url as string)} />
            ) : null}
            {check.channel_url ? <Button title={t.openChannel} variant="secondary" onPress={() => void Linking.openURL(check.channel_url as string)} /> : null}
            <Button title={t.checkAgain} onPress={recheck} loading={busy} />
          </View>
        ) : null}
      </Card>
    </>
  );
}

// @MOB-112 Instagram can't be checked: the step only records that the page was opened.
function InstagramStep({ data }: { data: Onboarding['instagram'] }) {
  const { t } = useT();
  const [opened, setOpened] = useState(data.opened);
  if (!data.url) return null;
  const open = () => {
    void Linking.openURL(data.url as string);
    setOpened(true);
    void markInstagramOpened().catch(() => {});
  };
  return (
    <>
      <SectionHeader title={t.instagramStep} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
          <Text style={[text.muted, { flex: 1 }]}>{t.instagramText}</Text>
          {opened ? <Tag label={t.opened} tone="blue" /> : null}
        </View>
        <Button title={t.openInstagram} variant="secondary" onPress={open} />
      </Card>
    </>
  );
}

// @MOB-112 Video consent, one answer per child; a minor's answer comes from a parent.
function ConsentStep({ items }: { items: Onboarding['consents'] }) {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, boolean | null>>(() => Object.fromEntries(items.map((c) => [c.student_id, c.granted])));
  const [error, setError] = useState(false);
  if (!items.length) return null;
  const answer = async (studentId: number, granted: boolean) => {
    const before = answers[studentId];
    setAnswers({ ...answers, [studentId]: granted });
    setError(false);
    try {
      await answerConsent(studentId, granted);
      void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    } catch {
      setAnswers({ ...answers, [studentId]: before });
      setError(true);
    }
  };
  return (
    <>
      <SectionHeader title={t.consentStep} />
      <Card>
        <Text style={[text.muted, { marginBottom: space.sm }]}>{t.consentText}</Text>
        {items.map((c) => (
          <View key={c.student_id} style={{ marginBottom: space.sm, gap: 6 }}>
            {items.length > 1 || c.can_answer ? <Text style={text.bold}>{fullName(c.first_name, c.last_name)}</Text> : null}
            {c.can_answer ? (
              <Chips<'yes' | 'no' | ''>
                options={[
                  { value: 'yes', label: t.yes },
                  { value: 'no', label: t.no },
                ]}
                value={answers[c.student_id] == null ? '' : answers[c.student_id] ? 'yes' : 'no'}
                onChange={(v) => void answer(c.student_id, v === 'yes')}
              />
            ) : (
              <Text style={text.muted}>{t.consentParentOnly}</Text>
            )}
          </View>
        ))}
        {error ? <Text style={{ color: colors.danger }}>{t.genericError}</Text> : null}
      </Card>
    </>
  );
}

// @MOB-112 Asks the phone for notification permission (native only).
function NotificationsStep() {
  const { t } = useT();
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  return (
    <>
      <SectionHeader title={t.notificationsStep} />
      <Card>
        <Text style={[text.muted, { marginBottom: space.sm }]}>{Platform.OS === 'web' ? t.notificationsWebNote : t.notificationsText}</Text>
        {Platform.OS !== 'web' ? (
          <Button
            title={state === 'done' ? '✓' : t.allowNotifications}
            variant="secondary"
            loading={state === 'busy'}
            disabled={state === 'done'}
            onPress={async () => {
              setState('busy');
              await registerForPush();
              setState('done');
            }}
          />
        ) : null}
      </Card>
    </>
  );
}

// @MOB-112 Optional first-run onboarding. Nothing here blocks lessons: Skip and Done both just
// close it and stop it from opening again. Settings opens it again later.
export default function OnboardingScreen() {
  const { t } = useT();
  const query = useOnboarding();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const close = async (skipped: boolean) => {
    setBusy(true);
    try {
      await finishOnboarding(skipped);
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    } catch {
      // Not saved: it will be offered again next time, which is harmless.
    } finally {
      setBusy(false);
      leave();
    }
  };

  return (
    <DetailScreen title={t.onboardingTitle}>
      <Text style={[text.muted, { marginBottom: space.sm }]}>{t.onboardingIntro}</Text>
      <QueryView query={query}>
        {(data) => (
          <>
            <TelegramStep initial={data.telegram} />
            <InstagramStep data={data.instagram} />
            <ConsentStep items={data.consents} />
            <NotificationsStep />
            <View style={{ gap: space.sm, marginTop: space.md }}>
              <Button title={t.done} onPress={() => void close(false)} loading={busy} />
              {data.show ? <Button title={t.skip} variant="secondary" onPress={() => void close(true)} disabled={busy} /> : null}
            </View>
          </>
        )}
      </QueryView>
    </DetailScreen>
  );
}
