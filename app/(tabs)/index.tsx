import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { fetchActiveProgram, type ActiveProgram } from '@/lib/programs';
import { colors } from '@/theme/colors';

export default function TodayScreen() {
  const { session, signOut } = useAuth();
  const [program, setProgram] = useState<ActiveProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      setProgram(await fetchActiveProgram(session.user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon je programma niet laden.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const todayDay = program?.days.find((day) => day.dayOrder === program.nextDayOrder) ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vandaag</Text>
      <Text style={styles.body}>Ingelogd als {session?.user.email}</Text>

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!isLoading && error && <Text style={styles.error}>{error}</Text>}

      {!isLoading && !error && program && todayDay && (
        <View style={styles.card}>
          <Text style={styles.programName}>{program.name}</Text>
          <Text style={styles.dayName}>
            Dag {todayDay.dayOrder}: {todayDay.name}
          </Text>
          {todayDay.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
              <Text style={styles.exerciseDetail}>
                {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps · RIR {exercise.targetRIR}
              </Text>
            </View>
          ))}
          <Text style={styles.note}>
            Workout-invoer met gewichten en herhalingen komt in de volgende bouwstap.
          </Text>
        </View>
      )}

      {!isLoading && !error && !program && (
        <Text style={styles.note}>Nog geen actief programma gevonden.</Text>
      )}

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Uitloggen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 48,
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  loadingRow: {
    marginTop: 24,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 4,
  },
  programName: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  exerciseRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  note: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  signOutButton: {
    marginTop: 24,
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
