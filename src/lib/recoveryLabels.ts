import type { RecoveryStatus } from '@fitness/progression-engine';
import { colors } from '@/theme/colors';

/**
 * Single source of truth for recovery-status wording/color, shared by
 * `RecoveryIndicator` (the small dot on Vandaag's exercise rows) and the
 * readiness rings' legend/tap card (app/readiness.tsx). Deliberately plain TypeScript (no
 * react-native imports) so pure `src/lib` modules can depend on it too —
 * importing straight from a `.tsx` component would pull react-native's
 * untranspiled internals into places that need to stay framework-free
 * (Vitest can't parse those).
 */
export const STATUS_LABEL: Record<RecoveryStatus, string> = {
  recovering: 'Herstellend',
  ready: 'Hersteld',
  window_closing: 'Venster sluit',
  window_passed: 'Venster voorbij',
  no_data: 'Klaar om te starten',
};

export const STATUS_COLOR: Record<RecoveryStatus, string> = {
  recovering: colors.danger,
  ready: colors.accent,
  window_closing: colors.warning,
  window_passed: colors.textTertiary,
  no_data: colors.accent,
};
