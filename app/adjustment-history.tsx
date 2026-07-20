import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adjustmentTitle } from '@/lib/adjustmentLabels';
import { fetchAdjustmentHistory, type AdjustmentHistoryEntry } from '@/lib/adjustmentHistory';
import { useAuth } from '@/lib/auth';
import { formatShortDate } from '@/lib/dates';
import { colors } from '@/theme/colors';

function groupByWeek(entries: AdjustmentHistoryEntry[]): Array<[number, AdjustmentHistoryEntry[]]> {
  const groups = new Map<number, AdjustmentHistoryEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.weekNumber) ?? [];
    group.push(entry);
    groups.set(entry.weekNumber, group);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

export default function AdjustmentHistoryScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [entries, setEntries] = useState<AdjustmentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchAdjustmentHistory(session.user.id)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon geschiedenis niet laden.'))
      .finally(() => setIsLoading(false));
  }, [session]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.closeButton}>Sluiten</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Aanpassingsgeschiedenis</Text>
        <Text style={styles.subtitle}>Alles wat je schema automatisch heeft laten meegroeien, en waarom.</Text>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {!isLoading && error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && entries.length === 0 && (
          <Text style={styles.body}>Nog geen aanpassingen gemaakt. Zodra je een trainingsweek afrondt, verschijnt hier wat er is veranderd en waarom.</Text>
        )}

        {!isLoading &&
          !error &&
          groupByWeek(entries).map(([weekNumber, weekEntries]) => (
            <View key={weekNumber} style={styles.weekGroup}>
              <Text style={styles.weekLabel}>Week {weekNumber}</Text>
              {weekEntries.map((entry) => (
                <View key={entry.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>{adjustmentTitle(entry.type, entry.exerciseName)}</Text>
                    <Text style={styles.cardDate}>{formatShortDate(entry.createdAt)}</Text>
                  </View>
                  {entry.previousValue !== null && entry.newValue !== null && (
                    <Text style={styles.cardValues}>
                      {entry.previousValue} → {entry.newValue}
                    </Text>
                  )}
                  <Text style={styles.cardExplanation}>{entry.explanation}</Text>
                </View>
              ))}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 32,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  loadingRow: {
    marginTop: 24,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 15,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  weekGroup: {
    marginBottom: 20,
  },
  weekLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  cardDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: 12,
  },
  cardValues: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  cardExplanation: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
