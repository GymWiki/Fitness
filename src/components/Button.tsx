import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends PropsWithChildren {
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}

/** Large tap targets by default — this is used mid-workout with sweaty fingers. */
export function Button({ children, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, variantStyles[variant], isDisabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.background : colors.textPrimary} />
      ) : (
        <Text style={[styles.text, variantTextStyles[variant]]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderStrong },
  danger: { backgroundColor: colors.dangerMuted, borderWidth: 1, borderColor: colors.danger },
  ghost: { backgroundColor: 'transparent' },
});

const variantTextStyles = StyleSheet.create({
  primary: { color: colors.background },
  secondary: { color: colors.textPrimary },
  danger: { color: colors.danger },
  ghost: { color: colors.textSecondary },
});
