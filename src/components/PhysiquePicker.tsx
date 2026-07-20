import { StyleSheet, Text, View } from 'react-native';
import { PhysiqueSilhouette } from '@/components/icons';
import { SelectableCard } from '@/components/SelectableCard';
import { StatBars } from '@/components/StatBars';
import { PHYSIQUE_OPTIONS, type Physique } from '@/lib/physique';
import { PHYSIQUE_STATS } from '@/lib/physiqueStats';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const PHYSIQUE_ICON_VARIANT: Record<Physique, 'muscular' | 'lean' | 'strong' | 'endurance' | 'balanced'> = {
  muscular_athletic: 'muscular',
  lean_defined: 'lean',
  strong_powerful: 'strong',
  fit_enduring: 'endurance',
  balanced_general: 'balanced',
};

/**
 * The one streeffysiek-keuzescherm — game-style stat-bar cards — shared by
 * onboarding, the profile edit form, and the schema "ander doel kiezen"
 * flow, so all three always look and behave identically.
 */
export function PhysiquePicker({ selected, onSelect }: { selected: Physique | null; onSelect: (physique: Physique) => void }) {
  return (
    <View>
      {PHYSIQUE_OPTIONS.map((option) => (
        <SelectableCard
          key={option.value}
          label={option.label}
          description={option.description}
          selected={selected === option.value}
          onPress={() => onSelect(option.value)}
          icon={<PhysiqueSilhouette color={selected === option.value ? colors.accent : colors.textSecondary} variant={PHYSIQUE_ICON_VARIANT[option.value]} />}
        >
          <StatBars stats={PHYSIQUE_STATS[option.value]} selected={selected === option.value} />
        </SelectableCard>
      ))}
      <Text style={styles.disclaimer}>
        De balken tonen waar het schema op traint, niet een belofte over hoe je eruit komt te zien.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
});
