import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '../api/client';
import { confirmPasswordReset, requestPasswordReset } from '../api/queries';
import type { Role } from '../api/types';
import { Button, Chips } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { colors, font, radius, space } from '../theme/tokens';

// @MOB-111 Forgot password: login → SMS code → new password. The server's messages are shown as
// they come (they are already in Uzbek); a network failure gets the app's own text.
export default function ForgotPassword() {
  const { t } = useT();
  const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role | undefined>();
  const [askRole, setAskRole] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ROLE_REQUIRED') {
        setAskRole(true);
        setRole('student');
      }
      setError(e instanceof ApiError && e.status !== 0 ? e.message : t.networkError);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      const result = await requestPasswordReset(username.trim(), role);
      setInfo(t.codeSentTo(result.phone_hint));
      setStep('confirm');
    });

  const confirm = () =>
    run(async () => {
      await confirmPasswordReset(username.trim(), code.trim(), password, role);
      setStep('done');
    });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.form}>
          <Text style={styles.heading}>{t.resetTitle}</Text>
          {step === 'request' ? (
            <>
              <Text style={styles.muted}>{t.resetIntro}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.username}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                accessibilityLabel={t.username}
              />
              {askRole ? (
                <Chips<Role>
                  options={[
                    { value: 'student', label: t.asStudent },
                    { value: 'parent', label: t.asParent },
                  ]}
                  value={role ?? 'student'}
                  onChange={setRole}
                />
              ) : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button title={t.sendCode} onPress={sendCode} loading={busy} disabled={!username.trim()} />
            </>
          ) : null}

          {step === 'confirm' ? (
            <>
              {info ? <Text style={styles.muted}>{info}</Text> : null}
              <TextInput
                style={styles.input}
                placeholder={t.smsCode}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                textContentType="oneTimeCode"
                accessibilityLabel={t.smsCode}
              />
              <TextInput
                style={styles.input}
                placeholder={t.newPassword}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                textContentType="newPassword"
                accessibilityLabel={t.newPassword}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button title={t.setPassword} onPress={confirm} loading={busy} disabled={code.length !== 6 || password.length < 6} />
              <Button title={t.resendCode} variant="secondary" onPress={sendCode} disabled={busy} />
            </>
          ) : null}

          {step === 'done' ? (
            <>
              <Text style={[styles.muted, { color: colors.success }]}>✅ {t.resetDone}</Text>
              <Button title={t.backToLogin} onPress={() => router.replace('/login')} />
            </>
          ) : null}
        </View>
        {step !== 'done' ? (
          <Pressable onPress={() => router.replace('/login')} style={styles.back} accessibilityRole="link">
            <Text style={styles.link}>{t.backToLogin}</Text>
          </Pressable>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  wrap: { flex: 1, padding: space.xl, justifyContent: 'center' },
  form: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  heading: { fontSize: font.title, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13.5, color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, fontSize: font.body, color: colors.text, backgroundColor: colors.white },
  error: { color: colors.danger, fontSize: 13 },
  back: { alignItems: 'center', marginTop: space.lg, padding: space.sm },
  link: { color: colors.primary, fontWeight: '600' },
});
