/**
 * Named text presets so every screen picks from the same type scale instead
 * of one-off font sizes — Tailwind className strings here, ported from the
 * Expo app's `TextStyle` preset objects (src/theme/typography.ts) which
 * carried the same names/scale for React Native's inline style API.
 */
export const typography = {
  display: 'text-[28px] font-bold text-text-primary',
  title: 'text-[22px] font-bold text-text-primary',
  heading: 'text-[17px] font-bold text-text-primary',
  body: 'text-[15px] leading-[21px] text-text-primary',
  bodyStrong: 'text-[15px] font-semibold text-text-primary',
  bodySecondary: 'text-[15px] leading-[21px] text-text-secondary',
  label: 'text-[13px] font-semibold text-text-secondary uppercase tracking-[0.6px]',
  caption: 'text-[12px] text-text-tertiary',
  captionStrong: 'text-[12px] font-bold text-text-secondary',
  micro: 'text-[11px] font-semibold text-text-secondary',
} as const;
