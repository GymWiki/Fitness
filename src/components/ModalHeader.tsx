import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  /** Extra content on the header's second row, e.g. a "bekijk geschiedenis"-style link. */
  right?: ReactNode;
  /** Defaults to `router.back()` — pass this only when a screen needs different close behavior. */
  onClose?: () => void;
}

/**
 * The one "title + Sluiten" header every modal/stack screen shares (workout,
 * history, week-review, adjustment-history, switch-goal, faq, food-scan,
 * food-search, readiness all had their own hand-copied version of this
 * before — nine slightly different paddingTop/fontSize numbers for the same
 * pattern). The close button gets a real `layout.minTapTarget` hit area via
 * `hitSlop`, which the copy-pasted versions didn't consistently have.
 */
export function ModalHeader({ title, subtitle, right, onClose }: ModalHeaderProps) {
  const router = useRouter();
  const handleClose = onClose ?? (() => router.back());

  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={typography.title}>{title}</Text>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Sluiten</Text>
        </Pressable>
      </View>
      {subtitle && <Text style={[typography.bodySecondary, styles.subtitle]}>{subtitle}</Text>}
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: layout.modalHeaderPaddingTop,
    paddingHorizontal: spacing.xxl,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    minHeight: layout.minTapTarget,
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 0,
  },
});
