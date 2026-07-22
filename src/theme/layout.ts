import { spacing } from './spacing';

/**
 * Shared screen-chrome constants so every screen clears the status bar and
 * sizes its tap targets the same way, instead of each screen picking its
 * own top-padding/hit-area numbers. `minTapTarget` follows the common
 * ~44px comfortable-touch guideline — doubly relevant here since this is a
 * gym-use app (sweaty, slightly imprecise fingers, often glanced at
 * mid-set rather than looked at carefully).
 */
export const layout = {
  /** Top padding for a tab screen's scrollable content (no header, status bar only). */
  tabScreenPaddingTop: spacing.xxxl + spacing.lg,
  /** Top padding for a modal/stack screen's header row (close button + title). */
  modalHeaderPaddingTop: spacing.xxl,
  /** Minimum comfortable width/height for any tappable element. */
  minTapTarget: 44,
} as const;
