import type { EquipmentType, ExperienceLevel } from '@fitness/program-generator';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LineChart } from '@/components/LineChart';
import { PhysiqueSilhouette } from '@/components/icons';
import { SelectableCard } from '@/components/SelectableCard';
import { useAuth } from '@/lib/auth';
import { BMI_CATEGORY_LABELS, bmiCategory, calculateBmi } from '@/lib/bmi';
import { fetchMeasurementHistory, saveMeasurement, type BodyMeasurement } from '@/lib/measurements';
import { PHYSIQUE_OPTIONS, physiqueOption, type Physique } from '@/lib/physique';
import { updateProfile, useProfile } from '@/lib/profile';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const EXPERIENCE_OPTIONS: Array<{ value: ExperienceLevel; label: string }> = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Gemiddeld' },
  { value: 'advanced', label: 'Gevorderd' },
];

const EQUIPMENT_OPTIONS: Array<{ value: EquipmentType; label: string }> = [
  { value: 'gym', label: 'Sportschool' },
  { value: 'home_dumbbells', label: 'Dumbbells thuis' },
  { value: 'bodyweight', label: 'Eigen lichaamsgewicht' },
];

const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6];

const PHYSIQUE_ICON_VARIANT: Record<Physique, 'muscular' | 'lean' | 'strong' | 'endurance' | 'balanced'> = {
  muscular_athletic: 'muscular',
  lean_defined: 'lean',
  strong_powerful: 'strong',
  fit_enduring: 'endurance',
  balanced_general: 'balanced',
};

function parsePositiveFloat(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function ProfileEditForm({ onClose }: { onClose: () => void }) {
  const { profile, refresh } = useProfile();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [physique, setPhysique] = useState<Physique | null>(profile?.targetPhysique ?? null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(profile?.experienceLevel ?? null);
  const [daysPerWeek, setDaysPerWeek] = useState<number | null>(profile?.daysPerWeek ?? null);
  const [equipment, setEquipment] = useState<EquipmentType | null>(profile?.equipment ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = physique !== null && experienceLevel !== null && daysPerWeek !== null && equipment !== null;

  async function handleSave() {
    if (!profile || !canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await updateProfile(profile.id, {
        displayName: displayName.trim() || null,
        targetPhysique: physique!,
        goal: physiqueOption(physique!).goal,
        experienceLevel: experienceLevel!,
        daysPerWeek: daysPerWeek!,
        equipment: equipment!,
      });
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card style={styles.editCard}>
      <Text style={styles.fieldLabel}>Naam</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Jouw naam" placeholderTextColor={colors.textTertiary} />

      <Text style={styles.fieldLabel}>Streeffysiek</Text>
      {PHYSIQUE_OPTIONS.map((option) => (
        <SelectableCard
          key={option.value}
          label={option.label}
          selected={physique === option.value}
          onPress={() => setPhysique(option.value)}
          icon={<PhysiqueSilhouette color={physique === option.value ? colors.accent : colors.textSecondary} variant={PHYSIQUE_ICON_VARIANT[option.value]} />}
        />
      ))}

      <Text style={styles.fieldLabel}>Ervaring</Text>
      <View style={styles.chipRow}>
        {EXPERIENCE_OPTIONS.map((option) => (
          <Pressable key={option.value} style={[styles.chip, experienceLevel === option.value && styles.chipSelected]} onPress={() => setExperienceLevel(option.value)}>
            <Text style={[styles.chipText, experienceLevel === option.value && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Dagen per week</Text>
      <View style={styles.chipRow}>
        {DAYS_PER_WEEK_OPTIONS.map((value) => (
          <Pressable key={value} style={[styles.dayButton, daysPerWeek === value && styles.dayButtonSelected]} onPress={() => setDaysPerWeek(value)}>
            <Text style={[styles.dayButtonText, daysPerWeek === value && styles.chipTextSelected]}>{value}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Materiaal</Text>
      <View style={styles.chipRow}>
        {EQUIPMENT_OPTIONS.map((option) => (
          <Pressable key={option.value} style={[styles.chip, equipment === option.value && styles.chipSelected]} onPress={() => setEquipment(option.value)}>
            <Text style={[styles.chipText, equipment === option.value && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.editButtonRow}>
        <Pressable style={styles.cancelButton} onPress={onClose} disabled={isSaving}>
          <Text style={styles.cancelButtonText}>Annuleren</Text>
        </Pressable>
        <View style={styles.saveButtonWrap}>
          <Button onPress={handleSave} disabled={!canSave} loading={isSaving}>
            Opslaan
          </Button>
        </View>
      </View>
    </Card>
  );
}

function AddMeasurementForm({ latestHeightCm, onSaved, onClose }: { latestHeightCm: number | null; onSaved: () => Promise<void>; onClose: () => void }) {
  const { session } = useAuth();
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState(latestHeightCm ? String(latestHeightCm) : '');
  const [bodyFatPercent, setBodyFatPercent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedWeightKg = parsePositiveFloat(weightKg);
  const parsedHeightCm = parsePositiveFloat(heightCm);
  const canSave = parsedWeightKg !== null && parsedHeightCm !== null;

  async function handleSave() {
    if (!session || !canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveMeasurement(session.user.id, {
        weightKg: parsedWeightKg!,
        heightCm: parsedHeightCm!,
        bodyFatPercent: bodyFatPercent.trim() === '' ? null : parsePositiveFloat(bodyFatPercent),
      });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan mislukt.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card style={styles.editCard}>
      <Text style={styles.fieldLabel}>Gewicht (kg)</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={weightKg} onChangeText={setWeightKg} placeholderTextColor={colors.textTertiary} />
      <Text style={styles.fieldLabel}>Lengte (cm)</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={heightCm} onChangeText={setHeightCm} placeholderTextColor={colors.textTertiary} />
      <Text style={styles.fieldLabel}>Vetpercentage (optioneel)</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={bodyFatPercent} onChangeText={setBodyFatPercent} placeholderTextColor={colors.textTertiary} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.editButtonRow}>
        <Pressable style={styles.cancelButton} onPress={onClose} disabled={isSaving}>
          <Text style={styles.cancelButtonText}>Annuleren</Text>
        </Pressable>
        <View style={styles.saveButtonWrap}>
          <Button onPress={handleSave} disabled={!canSave} loading={isSaving}>
            Opslaan
          </Button>
        </View>
      </View>
    </Card>
  );
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { width: windowWidth } = useWindowDimensions();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingMeasurement, setIsAddingMeasurement] = useState(false);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true);

  const loadMeasurements = useCallback(async () => {
    if (!session) return;
    setIsLoadingMeasurements(true);
    try {
      setMeasurements(await fetchMeasurementHistory(session.user.id));
    } finally {
      setIsLoadingMeasurements(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadMeasurements();
    }, [loadMeasurements]),
  );

  const latest = measurements[measurements.length - 1] ?? null;
  const bmi = latest ? calculateBmi(latest.weightKg, latest.heightCm) : null;
  const chartWidth = Math.min(windowWidth - 80, 480);
  const weightPoints = measurements.map((m) => ({ date: m.measuredAt, value: m.weightKg }));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profiel</Text>
        <Text style={styles.email}>{session?.user.email}</Text>

        {isProfileLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {!isProfileLoading && profile && !isEditingProfile && (
          <Card style={styles.viewCard}>
            <View style={styles.viewHeaderRow}>
              <Text style={styles.sectionTitle}>Jouw gegevens</Text>
              <Pressable onPress={() => setIsEditingProfile(true)}>
                <Text style={styles.editLink}>Bewerken</Text>
              </Pressable>
            </View>
            {profile.displayName && <InfoRow label="Naam" value={profile.displayName} />}
            <InfoRow label="Streeffysiek" value={profile.targetPhysique ? physiqueOption(profile.targetPhysique).label : '–'} />
            <InfoRow label="Ervaring" value={EXPERIENCE_OPTIONS.find((o) => o.value === profile.experienceLevel)?.label ?? '–'} />
            <InfoRow label="Dagen per week" value={String(profile.daysPerWeek)} />
            <InfoRow label="Materiaal" value={EQUIPMENT_OPTIONS.find((o) => o.value === profile.equipment)?.label ?? '–'} />
          </Card>
        )}

        {!isProfileLoading && profile && isEditingProfile && <ProfileEditForm onClose={() => setIsEditingProfile(false)} />}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Lichaamsmetingen</Text>
          {!isAddingMeasurement && (
            <Pressable onPress={() => setIsAddingMeasurement(true)}>
              <Text style={styles.editLink}>Nieuwe meting</Text>
            </Pressable>
          )}
        </View>

        {isAddingMeasurement && (
          <AddMeasurementForm latestHeightCm={latest?.heightCm ?? null} onSaved={loadMeasurements} onClose={() => setIsAddingMeasurement(false)} />
        )}

        {isLoadingMeasurements && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {!isLoadingMeasurements && latest && (
          <>
            <Card style={styles.viewCard}>
              <InfoRow label="Gewicht" value={`${latest.weightKg} kg`} />
              <InfoRow label="Lengte" value={`${latest.heightCm} cm`} />
              {latest.bodyFatPercent !== null && <InfoRow label="Vetpercentage" value={`${latest.bodyFatPercent}%`} />}
              {bmi !== null && <InfoRow label="BMI" value={`${bmi.toFixed(1)} · ${BMI_CATEGORY_LABELS[bmiCategory(bmi)]}`} />}
            </Card>
            {weightPoints.length > 1 && <LineChart points={weightPoints} width={chartWidth} unit=" kg" />}
          </>
        )}

        {!isLoadingMeasurements && !latest && !isAddingMeasurement && (
          <Text style={styles.body}>Nog geen metingen gelogd.</Text>
        )}

        <View style={styles.signOutButtonWrap}>
          <Button variant="danger" onPress={signOut}>
            Uitloggen
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
    paddingTop: 48,
    gap: spacing.md,
  },
  title: {
    ...typography.display,
  },
  email: {
    ...typography.bodySecondary,
    marginBottom: spacing.md,
  },
  loadingRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  viewCard: {
    gap: spacing.sm,
  },
  viewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
  },
  editLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  editCard: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.label,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.accent,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  dayButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  editButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonWrap: {
    minWidth: 120,
  },
  signOutButtonWrap: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
});
