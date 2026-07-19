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

export default function LoginScreen() {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const isValidEmail = EMAIL_PATTERN.test(email.trim());

  async function handleSendLink() {
    if (!isValidEmail || isSending) return;
    setIsSending(true);
    setError(null);
    const { error: signInError } = await signInWithMagicLink(email.trim());
    setIsSending(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Check je e-mail</Text>
        <Text style={styles.body}>
          We hebben een inloglink gestuurd naar {'\n'}
          <Text style={styles.emphasis}>{sentTo}</Text>.{'\n\n'}
          Open de link op dit toestel om in te loggen.
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => setSentTo(null)}>
          <Text style={styles.secondaryButtonText}>Ander e-mailadres gebruiken</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Adaptive Fitness</Text>
      <Text style={styles.body}>Log in met een magische link. Geen wachtwoord nodig.</Text>

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
        onSubmitEditing={handleSendLink}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.primaryButton, !isValidEmail && styles.primaryButtonDisabled]}
        disabled={!isValidEmail || isSending}
        onPress={handleSendLink}
      >
        {isSending ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.primaryButtonText}>Stuur magische link</Text>
        )}
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
  emphasis: {
    color: colors.textPrimary,
    fontWeight: '600',
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
