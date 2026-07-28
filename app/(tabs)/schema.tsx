import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { PlusIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { addDays, startOfIsoWeek } from '@/lib/dateWeek';
import { todayLocalDateString, toLocalDateString } from '@/lib/dates';
import { useProfile } from '@/lib/profile';
import { ensureScheduledWindow, fetchScheduledSessions, type ScheduledSessionRow } from '@/lib/schedule';
import { ScheduleDayDetail } from '@/components/ScheduleDayDetail';
import { WeekCardRow } from '@/components/WeekCardRow';
import { addDay, fetchSchemaProgram, type SchemaProgram } from '@/lib/schemaEditor';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

/** Two full ISO weeks (current + next), matching what `WeekCardRow` renders. */
const WINDOW_DAYS = 14;

export default function SchemaScreen() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const [program, setProgram] = useState<SchemaProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [scheduleRows, setScheduleRows] = useState<ScheduledSessionRow[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayLocalDateString());

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      setProgram(await fetchSchemaProgram(session.user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon je schema niet laden.');
    } finally {
      setIsLoading(false);
    }

    try {
      await ensureScheduledWindow(session.user.id);
      const weekStart = startOfIsoWeek(new Date());
      const rangeStart = toLocalDateString(weekStart);
      const rangeEnd = toLocalDateString(addDays(weekStart, WINDOW_DAYS - 1));
      setScheduleRows(await fetchScheduledSessions(session.user.id, rangeStart, rangeEnd));
    } catch {
      setScheduleRows([]); // no calendar plan available (not set up yet, or offline) — the section just doesn't render
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activeDays = program?.days.filter((day) => day.isActive) ?? [];
  const selectedRow = scheduleRows.find((row) => row.date === selectedDate) ?? null;
  const selectedSchemaDay = (selectedRow?.programDayId && program?.days.find((day) => day.id === selectedRow.programDayId)) || null;

  async function handleAddDay() {
    if (!program || activeDays.length === 0) return;
    setIsAddingDay(true);
    try {
      await addDay(program, activeDays[0]!.id);
      await load();
    } catch (err) {
      Alert.alert('Toevoegen mislukt', err instanceof Error ? err.message : 'Onbekende fout.');
    } finally {
      setIsAddingDay(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Schema</Text>
            {program ? <Text style={styles.subtitle}>{program.name}</Text> : null}
          </View>
          <Pressable onPress={() => router.push('/switch-goal')}>
            <Text style={styles.switchGoalLink}>Ander doel kiezen</Text>
          </Pressable>
        </View>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {!isLoading && error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && !program && (
          <EmptyState title="Nog geen programma" body="Zodra je de intake afrondt, kun je hier je schema bekijken en aanpassen." />
        )}

        {!isLoading && !error && program && scheduleRows.length > 0 && (
          <>
            <WeekCardRow rows={scheduleRows} selectedDateIso={selectedDate} onSelectDay={setSelectedDate} />
            {session && (
              <ScheduleDayDetail
                userId={session.user.id}
                dateIso={selectedDate}
                row={selectedRow}
                goal={profile?.goal ?? 'mixed'}
                schemaDay={selectedSchemaDay}
                equipment={profile?.equipment ?? 'gym'}
                canRemove={activeDays.length > 1}
                onChanged={load}
              />
            )}
          </>
        )}

        {!isLoading && !error && program && scheduleRows.length === 0 && !profile?.preferredWeekdays && (
          <Pressable onPress={() => router.push('/(tabs)/profile')}>
            <Card style={styles.scheduleNudgeCard}>
              <Text style={styles.scheduleNudgeTitle}>Wanneer train je?</Text>
              <Text style={styles.scheduleNudgeBody}>
                Stel je voorkeursdagen in bij Profiel voor een concreet 2-wekenoverzicht — dan hoef je nooit meer te
                gokken of vandaag een trainingsdag is.
              </Text>
            </Card>
          </Pressable>
        )}

        {!isLoading && !error && program && (
          <Pressable style={styles.addDayButton} onPress={handleAddDay} disabled={isAddingDay}>
            <PlusIcon size={18} color={colors.accent} />
            <Text style={styles.addDayButtonText}>{isAddingDay ? 'Bezig...' : 'Dag toevoegen'}</Text>
          </Pressable>
        )}
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
    paddingTop: layout.tabScreenPaddingTop,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    ...typography.display,
  },
  subtitle: {
    ...typography.bodySecondary,
    marginBottom: spacing.sm,
  },
  scheduleNudgeCard: {
    gap: spacing.xs,
  },
  scheduleNudgeTitle: {
    ...typography.bodyStrong,
  },
  scheduleNudgeBody: {
    ...typography.bodySecondary,
  },
  switchGoalLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  addDayButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
