import type { RecoveryEstimate, RecoveryStatus } from '@fitness/progression-engine';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import { describeRegionTap, regionsForView, type BodyDiagramView, type RegionShape } from '@/lib/bodyDiagramRegions';
import { recoveryColor } from '@/lib/recoveryColor';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/recoveryLabels';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { Card } from './Card';

const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 460;

// A muscle-chart illustration reads best on its own light "poster" backdrop
// with dark contour lines, independent of the app's own dark-first theme
// (see theme/colors.ts) — the surrounding Card stays dark, only the
// silhouette itself sits on this fixed backdrop, same as a printed anatomy
// chart would. Not derived from theme/colors.ts on purpose.
const BACKDROP_FILL = '#F2EFEA';
const BACKDROP_BORDER = '#E1DACB';
const INK = '#1C1C1E';
const OUTLINE_FILL = '#DAD4C8';
const NO_ESTIMATE_FILL = '#DAD4C8';

const LEGEND_STATUSES: RecoveryStatus[] = ['recovering', 'window_closing', 'ready', 'window_passed', 'no_data'];

function ShapeElement({ shape, fill, onPress, accessibilityLabel }: { shape: RegionShape; fill: string; onPress: () => void; accessibilityLabel: string }) {
  return (
    <Path
      d={shape.d}
      fill={fill}
      stroke={INK}
      strokeWidth={1.5}
      strokeLinejoin="round"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/** Front and back abs-line detail is purely decorative (not tied to any muscle group), so it lives outside the tappable region data entirely. */
function CoreDetailLines() {
  return <Path d="M100,113 L100,179 M87,130 L113,130 M87,150 L113,150" stroke={INK} strokeWidth={1.25} opacity={0.55} fill="none" />;
}

/**
 * Original, hand-authored anatomical silhouette (not a stock asset — see
 * PROJECT.md for the licensing reasoning behind that choice): head, torso,
 * legs and arms as clean line-art outline shapes shared by both views (the
 * outer body contour is the same seen from front or back; only the muscle
 * panels drawn on top of it differ). Non-interactive — recovery-colored
 * tapping happens on the muscle-group paths in `MUSCLE_GROUP_REGIONS`.
 */
function BodyOutline() {
  const outlineProps = { fill: OUTLINE_FILL, stroke: INK, strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  return (
    <>
      <Path
        d="M90,50 L110,50 L112,54 L144,66 C150,70 154,78 150,92 L134,96 L128,178 C130,190 132,198 132,206 C132,212 128,216 122,222 L122,306 C122,314 120,320 122,330 L113,398 L118,406 L122,418 L104,410 L103,398 L104,306 L96,306 L97,398 L96,410 L78,418 L82,406 L87,398 L78,330 C80,320 78,314 78,306 L78,222 C72,216 68,212 68,206 C68,198 70,190 72,178 L66,96 L50,92 C46,78 50,70 56,66 L88,54 Z"
        {...outlineProps}
      />
      <Ellipse cx={100} cy={30} rx={17} ry={19} {...outlineProps} />
      <Path
        d="M140,70 C147,68 152,70 152,78 L166,150 C168,158 168,166 166,174 L172,220 C173,226 172,232 168,236 L162,246 L150,246 L154,236 C150,232 148,226 149,220 L146,152 C138,150 134,146 134,138 L134,96 C134,84 136,76 140,70 Z"
        {...outlineProps}
      />
      <Path
        d="M60,70 C53,68 48,70 48,78 L34,150 C32,158 32,166 34,174 L28,220 C27,226 28,232 32,236 L38,246 L50,246 L46,236 C50,232 52,226 51,220 L54,152 C62,150 66,146 66,138 L66,96 C66,84 64,76 60,70 Z"
        {...outlineProps}
      />
      <Ellipse cx={156} cy={252} rx={8} ry={12} rotation={8} origin="156, 252" {...outlineProps} />
      <Ellipse cx={44} cy={252} rx={8} ry={12} rotation={-8} origin="44, 252" {...outlineProps} />
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
          <Rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} rx={16} fill={BACKDROP_FILL} stroke={BACKDROP_BORDER} strokeWidth={1} />
          <BodyOutline />
          {view === 'front' && <CoreDetailLines />}
          {regions.map((region) => {
            const estimate = estimatesByMuscleGroup.get(region.muscleGroup);
            const fill = estimate ? recoveryColor(estimate) : NO_ESTIMATE_FILL;
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
