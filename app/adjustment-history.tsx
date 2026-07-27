import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adjustmentTitle } from '@/lib/adjustmentLabels';
import { fetchAdjustmentHistory, type AdjustmentHistoryEntry } from '@/lib/adjustmentHistory';
import { useAuth } from '@/lib/auth';
import { formatShortDate } from '@/lib/dates';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ModalHeader } from '@/components/ModalHeader';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useEffect, useState } from 'react';

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
      <ModalHeader title="Aanpassingsgeschiedenis" subtitle="Alles wat je schema automatisch heeft laten meegroeien, en waarom." />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {!isLoading && error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && entries.length === 0 && (
          <EmptyState
            title="Nog geen aanpassingen"
            body="Zodra je een trainingsweek afrondt, verschijnt hier wat er is veranderd en waarom."
          />
        )}

        {!isLoading &&
          !error &&
          groupByWeek(entries).map(([weekNumber, weekEntries]) => (
            <View key={weekNumber} style={styles.weekGroup}>
              <Text style={typography.label}>Week {weekNumber}</Text>
              {weekEntries.map((entry) => (
                <Card key={entry.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[typography.bodyStrong, styles.cardTitle]}>{adjustmentTitle(entry.type, entry.exerciseName)}</Text>
                    <Text style={[typography.caption, styles.cardDate]}>{formatShortDate(entry.createdAt)}</Text>
                  </View>
                  {entry.previousValue !== null && entry.newValue !== null && (
                    <Text style={styles.cardValues}>
                      {entry.previousValue} → {entry.newValue}
                    </Text>
                  )}
                  <Text style={[typography.bodySecondary, styles.cardExplanation]}>{entry.explanation}</Text>
                </Card>
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
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 15,
  },
  weekGroup: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  card: {
    gap: spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    flexShrink: 1,
  },
  cardDate: {
    marginLeft: spacing.md,
  },
  cardValues: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  cardExplanation: {
    fontSize: 14,
    lineHeight: 20,
  },
});
