import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

interface SelectableCardProps {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  icon?: ReactNode;
  /** Optional extra content rendered below the label/description, full card width (e.g. stat bars). */
  children?: ReactNode;
}

/** Tappable option card used by every picker screen (onboarding, profile edit). */
export function SelectableCard({ label, description, selected, onPress, icon, children }: SelectableCardProps) {
  return (
    <Pressable style={[styles.card, selected && styles.cardSelected]} onPress={onPress}>
      <View style={styles.headerRow}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <View style={styles.textColumn}>
          <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.accent,
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
});
