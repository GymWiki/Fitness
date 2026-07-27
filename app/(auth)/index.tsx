import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme/colors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = EMAIL_PATTERN.test(email.trim());
  const isValidPassword = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit = isValidEmail && isValidPassword && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    const submit = mode === 'login' ? signInWithPassword : signUpWithPassword;
    const { error: submitError } = await submit(email.trim(), password);
    setIsSubmitting(false);
    if (submitError) {
      setError(submitError);
    }
    // On success there's nothing left to do here: onAuthStateChange in AuthProvider
    // picks up the new session and the root layout's Stack.Protected gate swaps screens.
  }

  function toggleMode() {
    setMode((current) => (current === 'login' ? 'signup' : 'login'));
    setError(null);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Adaptive Fitness</Text>
      <Text style={styles.body}>
        {mode === 'login' ? 'Log in met je e-mail en wachtwoord.' : 'Maak een account aan met e-mail en wachtwoord.'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="jij@voorbeeld.nl"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Wachtwoord"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        textContentType={mode === 'login' ? 'password' : 'newPassword'}
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleSubmit}
      />
      {mode === 'signup' && password.length > 0 && !isValidPassword && (
        <Text style={styles.hint}>Minimaal {MIN_PASSWORD_LENGTH} tekens.</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]} disabled={!canSubmit} onPress={handleSubmit}>
        {isSubmitting ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Inloggen' : 'Account aanmaken'}</Text>
        )}
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={toggleMode}>
        <Text style={styles.secondaryButtonText}>
          {mode === 'login' ? 'Nog geen account? Registreren' : 'Al een account? Inloggen'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: -8,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
