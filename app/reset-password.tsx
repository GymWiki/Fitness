import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme/colors';

const MIN_PASSWORD_LENGTH = 6;

/**
 * Shown instead of the normal app when a password-recovery link's session is active (see
 * `isPasswordRecovery` in `src/lib/auth.tsx` and the root layout's guard ordering). Reached only
 * via that link — there's no other way to navigate here, so no back button, just "set a new
 * password" or bail out via sign-out.
 */
export default function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidPassword = password.length >= MIN_PASSWORD_LENGTH;
  const doPasswordsMatch = password === confirmPassword;
  const canSubmit = isValidPassword && doPasswordsMatch && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    const { error: submitError } = await updatePassword(password);
    setIsSubmitting(false);
    if (submitError) {
      setError(submitError);
    }
    // On success there's nothing left to do here: `updatePassword` clears `isPasswordRecovery`
    // and the root layout's gate swaps to onboarding/tabs on its own.
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Nieuw wachtwoord</Text>
      <Text style={styles.body}>Kies een nieuw wachtwoord voor je account.</Text>

      <TextInput
        style={styles.input}
        placeholder="Nieuw wachtwoord"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      {password.length > 0 && !isValidPassword && <Text style={styles.hint}>Minimaal {MIN_PASSWORD_LENGTH} tekens.</Text>}

      <TextInput
        style={styles.input}
        placeholder="Bevestig wachtwoord"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        onSubmitEditing={handleSubmit}
      />
      {confirmPassword.length > 0 && !doPasswordsMatch && <Text style={styles.hint}>Wachtwoorden komen niet overeen.</Text>}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]} disabled={!canSubmit} onPress={handleSubmit}>
        {isSubmitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryButtonText}>Wachtwoord instellen</Text>}
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => signOut()}>
        <Text style={styles.secondaryButtonText}>Annuleren</Text>
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
