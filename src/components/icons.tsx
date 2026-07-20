import Svg, { Circle, Line, Path } from 'react-native-svg';

/**
 * Small, dependency-free stroke-icon set (react-native-svg only, same approach
 * as the history chart) so the tab bar and UI chrome don't need an icon-font
 * package. Each icon takes `size` + `color` and is a simple, consistent
 * 24x24 stroke glyph.
 */
export interface IconProps {
  size?: number;
  color: string;
}

const STROKE_WIDTH = 2;

export function HomeIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11L12 4l9 7" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CalendarIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h16a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Line x1="8" y1="3" x2="8" y2="7" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Line x1="16" y1="3" x2="16" y2="7" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Svg>
  );
}

export function TrendingUpIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l6-6 4 4 8-8" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 7h6v6" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function UserIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12l5 5L20 6" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronUpIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 15l6-6 6 6" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Svg>
  );
}

export function TrashIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SwapIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8h13l-3-3" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 16H7l3 3" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function EditIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20l1-4 12-12a1.5 1.5 0 0 1 2 0l2 2a1.5 1.5 0 0 1 0 2L9 20H4Z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Abstract, respectful placeholder silhouette for the onboarding
 * streeffysiek picker — a stylized figure, not a photo of a real person.
 * `variant` picks a subtly different pose so the five options aren't
 * visually identical. See PROJECT.md for the note on replacing these with
 * final illustrations.
 */
export function PhysiqueSilhouette({ size = 56, color, variant = 'balanced' }: IconProps & { variant?: 'muscular' | 'lean' | 'strong' | 'endurance' | 'balanced' }) {
  const bodyPathByVariant: Record<string, string> = {
    muscular: 'M9 21v-3.5c0-1 .6-1.8 1.5-2.3l1.5-3.7c.6-1.4 1.8-2 3-2h.5v2h-.5c-.5 0-1 .3-1.2.8l-1.6 4c-.2.4-.5.7-.9.9l-1.3.7V21',
    lean: 'M10 21v-6.5c0-.9.4-1.7 1.1-2.2l.9-2.8c.3-1 1.1-1.6 2-1.6h.5v1.7h-.5c-.3 0-.6.2-.7.5l-.9 2.7c-.2.5-.5.9-1 1.1l-.9.5V21',
    strong: 'M9 21v-4c0-1.1.7-2 1.7-2.4l1-4.2c.3-1.2 1.3-2 2.6-2h.7v2.2h-.7c-.5 0-.9.3-1 .8l-1 4.2c-.1.6-.5 1.1-1 1.4l-1.3.8V21',
    endurance: 'M9 21v-5.5l3.3-4.8c.4-.6 1-.9 1.7-.9h.5v1.9h-.5c-.2 0-.4.1-.5.3L11.3 16v5H9Z',
    balanced: 'M10 21v-5c0-1 .6-1.8 1.5-2.2l.7-3.4c.2-1.1 1.2-1.9 2.3-1.9h.5v1.9h-.5c-.4 0-.8.3-.9.7l-.7 3.4c-.1.6-.5 1.1-1 1.4l-.9.5V21',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="2.2" stroke={color} strokeWidth={1.6} />
      <Path d={bodyPathByVariant[variant]} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 21h6" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
