import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Role } from '../api/types';
import { useAuth, type SignInResult } from '../auth/AuthContext';
import { Button, Chips } from '../components/ui';
import { useT } from '../i18n/LanguageContext';
import { colors, font, radius, space } from '../theme/tokens';

// @MOB-110 Sign in with login and password. The role is detected; only when the same login
// exists for a student and a parent does the screen ask which one.
export default function Login() {
  const { status, user, signIn } = useAuth();
  const { t, lang, setLang } = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | undefined>();
  const [askRole, setAskRole] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'signedIn' && user) return <Redirect href={user.role === 'parent' ? '/parent' : '/student'} />;

  const messages: Record<Exclude<SignInResult, 'ok' | 'role_required'>, string> = {
    invalid: t.invalidCredentials,
    inactive: t.accountInactive,
    network: t.networkError,
    error: t.genericError,
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await signIn(username, password, role);
    setBusy(false);
    if (result === 'role_required') {
      setAskRole(true);
      setRole('student');
      setError(t.chooseRole);
      return;
    }
    if (result !== 'ok') setError(messages[result]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>TS</Text>
          </View>
          <Text style={styles.name}>{t.appName}</Text>
          <Text style={styles.slogan}>{t.slogan}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.heading}>{t.loginTitle}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.username}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            textContentType="username"
            accessibilityLabel={t.username}
          />
          <TextInput
            style={styles.input}
            placeholder={t.password}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            textContentType="password"
            onSubmitEditing={submit}
            accessibilityLabel={t.password}
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
          <Button title={busy ? t.signingIn : t.signIn} onPress={submit} loading={busy} disabled={!username.trim() || !password} />
        </View>

        <View style={styles.langRow}>
          <Chips
            options={[
              { value: 'uz', label: "O'zbekcha" },
              { value: 'en', label: 'English' },
            ]}
            value={lang}
            onChange={setLang}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  wrap: { flex: 1, padding: space.xl, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: space.xl },
  logo: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  logoText: { color: colors.white, fontWeight: '800', fontSize: 22 },
  name: { fontSize: font.heading, fontWeight: '800', color: colors.text },
  slogan: { fontSize: 11, letterSpacing: 1.5, fontWeight: '700', color: colors.primary, marginTop: 2 },
  form: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  heading: { fontSize: font.title, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 11, fontSize: font.body, color: colors.text, backgroundColor: colors.white },
  error: { color: colors.danger, fontSize: 13 },
  langRow: { alignItems: 'center', marginTop: space.lg },
});
