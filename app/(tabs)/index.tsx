import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { fetchActiveProgram, type ActiveProgram } from '@/lib/programs';
import { colors } from '@/theme/colors';
import { fetchWeekReview, type WeekReview } from '@/lib/weekReview';

export default function TodayScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const [program, setProgram] = useState<ActiveProgram | null>(null);
  const [weekReview, setWeekReview] = useState<WeekReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const [activeProgram, review] = await Promise.all([
        fetchActiveProgram(session.user.id),
        fetchWeekReview(session.user.id),
      ]);
      setProgram(activeProgram);
      setWeekReview(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon je programma niet laden.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Herlaadt bij elke focus, zodat het net-gelogde workout meteen de volgende dag verschuift.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

      {!isLoading && !error && weekReview && (
        <Pressable style={styles.weekReviewBanner} onPress={() => router.push('/week-review')}>
          <Text style={styles.weekReviewBannerTitle}>Week {weekReview.weekNumber} voltooid</Text>
          <Text style={styles.weekReviewBannerBody}>
            {weekReview.adjustments.length > 0
              ? `${weekReview.adjustments.length} voorgestelde aanpassing${weekReview.adjustments.length === 1 ? '' : 'en'} — bekijk en bevestig`
              : 'Bekijk je week-overzicht'}
          </Text>
        </Pressable>
      )}

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
          <Pressable style={styles.startButton} onPress={() => router.push(`/workout/${todayDay.id}`)}>
            <Text style={styles.startButtonText}>Start workout</Text>
          </Pressable>
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
  weekReviewBanner: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  weekReviewBannerTitle: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  weekReviewBannerBody: {
    color: colors.background,
    fontSize: 14,
    marginTop: 2,
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
  startButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  startButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
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
