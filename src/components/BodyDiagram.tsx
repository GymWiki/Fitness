import type { RecoveryEstimate, RecoveryStatus } from '@fitness/progression-engine';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';
import { describeRegionTap, regionsForView, type BodyDiagramView, type RegionShape } from '@/lib/bodyDiagramRegions';
import { recoveryColor } from '@/lib/recoveryColor';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/recoveryLabels';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { Card } from './Card';

const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 420;

const LEGEND_STATUSES: RecoveryStatus[] = ['recovering', 'window_closing', 'ready', 'window_passed', 'no_data'];

function ShapeElement({ shape, fill, onPress, accessibilityLabel }: { shape: RegionShape; fill: string; onPress: () => void; accessibilityLabel: string }) {
  const commonProps = {
    fill,
    stroke: colors.background,
    strokeWidth: 1,
    onPress,
    accessibilityRole: 'button' as const,
    accessibilityLabel,
  };
  if (shape.type === 'circle') {
    return <Circle cx={shape.cx} cy={shape.cy} r={shape.r} {...commonProps} />;
  }
  return <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} {...commonProps} />;
}

/** Generic, non-interactive body outline shared by both views — a placeholder silhouette, not anatomically precise (swap for a nicer illustration later; see PROJECT.md). */
function BodyOutline() {
  const outlineProps = { fill: colors.surfaceElevated, stroke: colors.border, strokeWidth: 1 };
  return (
    <>
      <Circle cx={100} cy={28} r={20} {...outlineProps} />
      <Rect x={92} y={46} width={16} height={12} rx={4} {...outlineProps} />
      <Rect x={60} y={56} width={80} height={110} rx={18} {...outlineProps} />
      <Rect x={64} y={166} width={72} height={30} rx={10} {...outlineProps} />
      <Rect x={38} y={145} width={18} height={50} rx={8} {...outlineProps} />
      <Rect x={144} y={145} width={18} height={50} rx={8} {...outlineProps} />
      <Rect x={70} y={286} width={24} height={80} rx={10} {...outlineProps} />
      <Rect x={106} y={286} width={24} height={80} rx={10} {...outlineProps} />
      <Ellipse cx={82} cy={402} rx={14} ry={8} {...outlineProps} />
      <Ellipse cx={118} cy={402} rx={14} ry={8} {...outlineProps} />
    </>
  );
}

interface BodyDiagramProps {
  /** Recovery estimate per muscle group — a missing entry renders as neutral/loading, never a crash. */
  estimatesByMuscleGroup: Map<string, RecoveryEstimate>;
}

/**
 * Full-body "gym equipment muscle chart"-style dashboard: tappable regions
 * colored by current recovery status, front/back toggle, and a tap-to-open
 * info card. Purely a visual layer over `estimateRecoveryState` — computes
 * no recovery logic of its own.
 */
export function BodyDiagram({ estimatesByMuscleGroup }: BodyDiagramProps) {
  const router = useRouter();
  const [view, setView] = useState<BodyDiagramView>('front');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);

  const regions = regionsForView(view);
  const selectedEstimate = selectedMuscleGroup ? estimatesByMuscleGroup.get(selectedMuscleGroup) : undefined;
  const tapInfo = selectedMuscleGroup && selectedEstimate ? describeRegionTap(selectedMuscleGroup, selectedEstimate) : null;

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleButton, view === 'front' && styles.toggleButtonActive]} onPress={() => setView('front')}>
          <Text style={[styles.toggleText, view === 'front' && styles.toggleTextActive]}>Voorkant</Text>
        </Pressable>
        <Pressable style={[styles.toggleButton, view === 'back' && styles.toggleButtonActive]} onPress={() => setView('back')}>
          <Text style={[styles.toggleText, view === 'back' && styles.toggleTextActive]}>Achterkant</Text>
        </Pressable>
      </View>

      <View style={styles.diagramWrap}>
        <Svg width={VIEW_WIDTH} height={VIEW_HEIGHT} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
          <BodyOutline />
          {regions.map((region) => {
            const estimate = estimatesByMuscleGroup.get(region.muscleGroup);
            const fill = estimate ? recoveryColor(estimate) : colors.surfaceElevated;
            const label = `${region.muscleGroup}: ${estimate ? STATUS_LABEL[estimate.status] : 'Laden'}`;
            return region.shapes.map((shape, index) => (
              <ShapeElement
                key={`${region.muscleGroup}-${index}`}
                shape={shape}
                fill={fill}
                accessibilityLabel={label}
                onPress={() => setSelectedMuscleGroup(region.muscleGroup)}
              />
            ));
          })}
        </Svg>
      </View>

      <View style={styles.legendRow}>
        {LEGEND_STATUSES.map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLOR[status] }]} />
            <Text style={styles.legendLabel}>{STATUS_LABEL[status]}</Text>
          </View>
        ))}
      </View>

      {tapInfo && (
        <Card style={styles.tapCard} elevated>
          <View style={styles.tapCardHeaderRow}>
            <Text style={styles.tapCardTitle}>{tapInfo.muscleGroup}</Text>
            <Pressable onPress={() => setSelectedMuscleGroup(null)} hitSlop={8}>
              <Text style={styles.tapCardClose}>Sluiten</Text>
            </Pressable>
          </View>
          <Text style={[styles.tapCardStatus, { color: selectedEstimate ? STATUS_COLOR[selectedEstimate.status] : colors.textSecondary }]}>
            {tapInfo.statusLabel}
          </Text>
          <Text style={styles.tapCardExplanation}>{tapInfo.explanation}</Text>
          <Pressable
            onPress={() => {
              setSelectedMuscleGroup(null);
              router.push({ pathname: '/faq', params: { openId: 'supercompensatie' } });
            }}
          >
            <Text style={styles.tapCardLink}>Waarom laat de app dit zien? →</Text>
          </Pressable>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  toggleButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  toggleButtonActive: {
    backgroundColor: colors.accentMuted,
  },
  toggleText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.accent,
  },
  diagramWrap: {
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  legendLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  tapCard: {
    width: '100%',
    gap: spacing.xs,
  },
  tapCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tapCardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  tapCardClose: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tapCardStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  tapCardExplanation: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  tapCardLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
