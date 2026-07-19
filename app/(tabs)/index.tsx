import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme/colors';

export default function TodayScreen() {
  const { session, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welkom terug</Text>
      <Text style={styles.body}>Ingelogd als {session?.user.email}</Text>
      <Text style={styles.note}>
        De intake, schemagenerator en workout-invoer komen in de volgende bouwstap. Deze
        stap toont dat authenticatie werkt.
      </Text>
      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Uitloggen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 48,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  note: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  signOutButton: {
    marginTop: 'auto',
    marginBottom: 24,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
