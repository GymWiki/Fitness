import { scaleNutrients, type NutrientsPer100g } from '@fitness/nutrition-engine';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { StarIcon } from '@/components/icons';
import { useAuth } from '@/lib/auth';
import { addFavorite } from '@/lib/foodFavorites';
import { logFood } from '@/lib/foodLogs';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function parsePositiveFloat(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeFloat(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export interface FoodLogFormDraft {
  barcode: string | null;
  name: string;
  /** `null` when Open Food Facts had no data for this barcode — starts the form in manual-entry mode. */
  per100g: NutrientsPer100g | null;
}

interface FoodLogFormProps {
  draft: FoodLogFormDraft;
  onLogged: () => void;
  onCancel: () => void;
}

/**
 * Shared quantity + macro-preview + confirm step, used by both the barcode
 * scan and search flows (and their not-found fallback). Quantity always
 * drives the preview via `scaleNutrients` — nothing here recomputes macros
 * a different way.
 */
export function FoodLogForm({ draft, onLogged, onCancel }: FoodLogFormProps) {
  const { session } = useAuth();
  const [isManualMode, setIsManualMode] = useState(draft.per100g === null);
  const [name, setName] = useState(draft.name);
  const [caloriesPer100g, setCaloriesPer100g] = useState(draft.per100g ? String(draft.per100g.caloriesPer100g) : '');
  const [proteinPer100g, setProteinPer100g] = useState(draft.per100g ? String(draft.per100g.proteinPer100g) : '');
  const [carbsPer100g, setCarbsPer100g] = useState(draft.per100g ? String(draft.per100g.carbsPer100g) : '');
  const [fatPer100g, setFatPer100g] = useState(draft.per100g ? String(draft.per100g.fatPer100g) : '');
  const [quantityGrams, setQuantityGrams] = useState('100');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const per100g: NutrientsPer100g | null = isManualMode
    ? {
        caloriesPer100g: parseNonNegativeFloat(caloriesPer100g) ?? -1,
        proteinPer100g: parseNonNegativeFloat(proteinPer100g) ?? -1,
        carbsPer100g: parseNonNegativeFloat(carbsPer100g) ?? -1,
        fatPer100g: parseNonNegativeFloat(fatPer100g) ?? -1,
      }
    : draft.per100g;
  const per100gValid = per100g !== null && per100g.caloriesPer100g >= 0 && per100g.proteinPer100g >= 0 && per100g.carbsPer100g >= 0 && per100g.fatPer100g >= 0;

  const parsedQuantity = parsePositiveFloat(quantityGrams);
  const preview = per100gValid && parsedQuantity ? scaleNutrients(per100g!, parsedQuantity) : null;
  const canLog = name.trim() !== '' && preview !== null;

  async function handleLog() {
    if (!session || !canLog || !preview) return;
    setIsSaving(true);
    setError(null);
    try {
      await logFood(session.user.id, {
        barcode: draft.barcode ?? undefined,
        customName: draft.barcode ? undefined : name.trim(),
        quantityGrams: parsedQuantity!,
        calories: preview.calories,
        proteinGrams: preview.proteinGrams,
        carbsGrams: preview.carbsGrams,
        fatGrams: preview.fatGrams,
      });
      if (isFavorited && per100g) {
        await addFavorite(session.user.id, {
          barcode: draft.barcode,
          label: name.trim(),
          caloriesPer100g: per100g.caloriesPer100g,
          proteinPer100g: per100g.proteinPer100g,
          carbsPer100g: per100g.carbsPer100g,
          fatPer100g: per100g.fatPer100g,
        });
      }
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loggen mislukt.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      {isManualMode ? (
        <>
          <Text style={styles.fieldLabel}>Naam</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Productnaam" placeholderTextColor={colors.textTertiary} />
          <Text style={styles.hint}>Voedingswaarden per 100 g</Text>
          <View style={styles.macroInputRow}>
            <MacroInput label="Kcal" value={caloriesPer100g} onChangeText={setCaloriesPer100g} />
            <MacroInput label="Eiwit (g)" value={proteinPer100g} onChangeText={setProteinPer100g} />
            <MacroInput label="Koolh. (g)" value={carbsPer100g} onChangeText={setCarbsPer100g} />
            <MacroInput label="Vet (g)" value={fatPer100g} onChangeText={setFatPer100g} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.productName}>{name}</Text>
          {draft.per100g && (
            <Text style={styles.hint}>
              Per 100 g: {Math.round(draft.per100g.caloriesPer100g)} kcal · {Math.round(draft.per100g.proteinPer100g)}g eiwit ·{' '}
              {Math.round(draft.per100g.carbsPer100g)}g koolh. · {Math.round(draft.per100g.fatPer100g)}g vet
            </Text>
          )}
          <Pressable onPress={() => setIsManualMode(true)}>
            <Text style={styles.editLink}>Waarden niet correct? Handmatig aanpassen</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.fieldLabel}>Hoeveelheid (gram)</Text>
      <TextInput style={styles.input} keyboardType="decimal-pad" value={quantityGrams} onChangeText={setQuantityGrams} placeholderTextColor={colors.textTertiary} />

      {preview && (
        <View style={styles.previewCard}>
          <Text style={styles.previewCalories}>{preview.calories} kcal</Text>
          <Text style={styles.previewMacros}>
            {preview.proteinGrams}g eiwit · {preview.carbsGrams}g koolhydraten · {preview.fatGrams}g vet
          </Text>
        </View>
      )}

      <Pressable style={styles.favoriteRow} onPress={() => setIsFavorited((v) => !v)}>
        <StarIcon size={18} color={isFavorited ? colors.warning : colors.textTertiary} filled={isFavorited} />
        <Text style={styles.favoriteText}>Opslaan als favoriet</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        <Pressable style={styles.cancelButton} onPress={onCancel} disabled={isSaving}>
          <Text style={styles.cancelButtonText}>Annuleren</Text>
        </Pressable>
        <View style={styles.logButtonWrap}>
          <Button onPress={handleLog} disabled={!canLog} loading={isSaving}>
            Loggen
          </Button>
        </View>
      </View>
    </Card>
  );
}

function MacroInput({ label, value, onChangeText }: { label: string; value: string; onChangeText: (v: string) => void }) {
  return (
    <View style={styles.macroInputWrap}>
      <Text style={styles.macroInputLabel}>{label}</Text>
      <TextInput style={styles.macroInput} keyboardType="decimal-pad" value={value} onChangeText={onChangeText} placeholderTextColor={colors.textTertiary} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  productName: {
    ...typography.heading,
  },
  fieldLabel: {
    ...typography.label,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  editLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
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
  macroInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroInputWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  macroInputLabel: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  macroInput: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
  },
  previewCard: {
    backgroundColor: colors.accentMuted,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: 2,
  },
  previewCalories: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  previewMacros: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  favoriteText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
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
  logButtonWrap: {
    minWidth: 120,
  },
});
