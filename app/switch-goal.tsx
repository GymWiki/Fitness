import { CARDIO_BASELINE_BY_GOAL } from '@fitness/program-generator';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PhysiquePicker } from '@/components/PhysiquePicker';
import { useAuth } from '@/lib/auth';
import { describeError } from '@/lib/describeError';
import { GOAL_LABELS, goalForPhysique, type Physique } from '@/lib/physique';
import { useProfile } from '@/lib/profile';
import { switchGoal } from '@/lib/switchGoal';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function SwitchGoalScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { profile, refresh } = useProfile();
  const currentPhysique = profile?.targetPhysique ?? null;

  const [selected, setSelected] = useState<Physique | null>(currentPhysique);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanged = selected !== null && selected !== currentPhysique;

  function handleSelect(physique: Physique) {
    setSelected(physique);
    setError(null);
  }

  async function handleConfirm() {
    if (!session || !profile || !selected || !hasChanged) return;
    setIsSwitching(true);
    setError(null);
    try {
      await switchGoal(session.user.id, profile, selected);
      await refresh();
      router.back();
    } catch (err) {
      setError(describeError(err, 'Kon niet wisselen van schema.'));
      setIsSwitching(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.closeButton}>Sluiten</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Ander doel kiezen</Text>
        <Text style={styles.body}>
          Je huidige streeffysiek is gemarkeerd. Kies een nieuw doel om over te stappen naar een ander schema.
        </Text>

        <PhysiquePicker selected={selected} onSelect={handleSelect} />

        {hasChanged && selected && (
          <Card elevated style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>We maken een nieuw {GOAL_LABELS[goalForPhysique(selected)]}-schema.</Text>
            <Text style={styles.confirmBody}>
              Je trainingshistorie, grafieken en lichaamsmetingen blijven gewoon bewaard. Je huidige schema wordt
              gearchiveerd, niet verwijderd.
            </Text>
            <Text style={styles.confirmBody}>
              Het schema bevat ook {CARDIO_BASELINE_BY_GOAL[goalForPhysique(selected)].sessionsPerWeek}{' '}
              cardiosessie{CARDIO_BASELINE_BY_GOAL[goalForPhysique(selected)].sessionsPerWeek === 1 ? '' : 's'} per
              week voor je hart- en vaatgezondheid.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.confirmButtonWrap}>
              <Button onPress={handleConfirm} loading={isSwitching}>
                Bevestigen
              </Button>
            </View>
          </Card>
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
    paddingTop: 32,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  closeButton: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    ...typography.title,
  },
  body: {
    ...typography.bodySecondary,
    marginBottom: spacing.lg,
  },
  confirmCard: {
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
    gap: spacing.sm,
    borderColor: colors.accent,
  },
  confirmTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  confirmBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  confirmButtonWrap: {
    marginTop: spacing.sm,
  },
});
