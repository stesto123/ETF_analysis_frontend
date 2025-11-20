import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated } from 'react-native';
import { Svg, Line, Path, Circle, G } from 'react-native-svg';
import { Sparkles } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/components/common/ThemeProvider';
import type { LearningGraphStage } from '@/constants/learningGraph';

type TimelineProps = {
  stages: LearningGraphStage[];
  completedLessons: Set<string>;
  onOpenLesson: (lessonId: string) => void;
  onToggleLessonCompletion?: (lessonId: string) => void;
  ListHeaderComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
};

type TimelineRowProps = {
  stage: LearningGraphStage;
  index: number;
  total: number;
  colors: ThemeColors;
  completedLessons: Set<string>;
  activeStageId?: string;
  onOpenLesson: (lessonId: string) => void;
};

type NodeDotProps = {
  x: number;
  y: number;
  completed: boolean;
  active?: boolean;
  colors: ThemeColors;
  onPress?: () => void;
  color?: string;
};

const TIMELINE_WIDTH = 140;
const MAIN_CARD_HEIGHT = 90;
const BRANCH_CARD_HEIGHT = 60;
const BRANCH_EXTRA_NODE_HEIGHT = 32;
const BASE_SPACING = 50;
const BRANCH_OFFSET = 48;
const BRANCH_DROP = 28;
const BRANCH_END_GAP = 12;
const BRANCH_NODE_GAP = 0;
const BRANCH_NODE_VERTICAL_GAP = BRANCH_EXTRA_NODE_HEIGHT;
const BRANCH_NODE_EXTRA_OFFSET = 0;
const CONNECTOR_COLOR = '#42f55aff'; // yellow for main-to-branch connectors

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function LearningPathTimeline({
  stages,
  completedLessons,
  onOpenLesson,
  ListHeaderComponent,
  ListFooterComponent,
}: TimelineProps) {
  const { colors } = useTheme();

  const activeStageId = useMemo(() => {
    const firstIncomplete = stages.find((stage) => !completedLessons.has(stage.lessonId));
    return firstIncomplete?.id ?? stages[stages.length - 1]?.id;
  }, [completedLessons, stages]);

  return (
    <FlatList
      data={stages}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <TimelineRow
          stage={item}
          index={index}
          total={stages.length}
          colors={colors}
          completedLessons={completedLessons}
          activeStageId={activeStageId}
          onOpenLesson={onOpenLesson}
        />
      )}
      contentContainerStyle={[styles.listContent, { paddingBottom: 36 }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent ?? null}
      ListFooterComponent={ListFooterComponent ?? null}
    />
  );
}

function TimelineRow({
  stage,
  index,
  total,
  colors,
  completedLessons,
  activeStageId,
  onOpenLesson,
}: TimelineRowProps) {
  const branches = stage.branches ?? [];
  const branchLayouts = branches.map((branch) => {
    const nodeList = branch.nodes?.length ? branch.nodes : [branch];
    const extraRows = Math.max(0, nodeList.length - 1);
    const height = BRANCH_CARD_HEIGHT + extraRows * BRANCH_EXTRA_NODE_HEIGHT;
    return { branch, nodeList, height };
  });

  const branchesHeight = branchLayouts.reduce((sum, { height }) => sum + height + BASE_SPACING, 0);
  const containerHeight = BASE_SPACING + MAIN_CARD_HEIGHT + BASE_SPACING + branchesHeight;

  const mainY = BASE_SPACING + MAIN_CARD_HEIGHT / 2;
  let branchCursorY = BASE_SPACING + MAIN_CARD_HEIGHT + BASE_SPACING;
  const branchPositions = branchLayouts.map(({ branch, nodeList, height }) => {
    const baseY = branchCursorY + BRANCH_CARD_HEIGHT / 2;
    branchCursorY += height + BASE_SPACING;
    const nodeYBase = baseY + BRANCH_DROP + BRANCH_NODE_EXTRA_OFFSET;
    const nodeYs = nodeList.map((_, idx) => nodeYBase + idx * BRANCH_NODE_VERTICAL_GAP);
    return {
      branch,
      nodes: nodeList,
      nodeYs,
      baseY,
    };
  });

  const centerX = TIMELINE_WIDTH / 2;
  // On the first row start the vertical line at the main node, so the track begins at the dot.
  const lineStart = index === 0 ? mainY : 0;
  const lineEnd = containerHeight;
  const mainCompleted = completedLessons.has(stage.lessonId);
  const isActive = activeStageId === stage.id && !mainCompleted;
  const lineColor = colors.accent;
  const branchLineColor = CONNECTOR_COLOR;

  return (
    <View style={[styles.rowContainer, { height: containerHeight }]}>
      <Svg
        height={containerHeight}
        width={TIMELINE_WIDTH}
        style={styles.timelineCanvas}
        pointerEvents="box-none"
      >
        <Line
          x1={centerX}
          y1={lineStart}
          x2={centerX}
          y2={lineEnd}
          stroke={lineColor}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {branchPositions.map(({ branch, nodes, nodeYs, baseY }) => {
          const branchX = branch.side === 'left'
            ? centerX - BRANCH_OFFSET
            : centerX + BRANCH_OFFSET;
          const sign = branch.side === 'left' ? -1 : 1;

          const nodePositions = nodeYs.map(() => branchX);
          const branchEndX = branchX;
          const firstNodeY = nodeYs[0];

          const startY = baseY;
          const straightLength = BRANCH_END_GAP * 2;
          const drop = BRANCH_DROP * 0.0;

          const buildOutgoingCurve = (
            startX: number,
            startYValue: number,
            endX: number,
            endY: number,
            direction: number,
          ) => {
            const midX = startX + direction * straightLength;
            const midY = startYValue;
            const c1x = midX + direction * (BRANCH_OFFSET * 0.7);
            const c1y = startYValue + drop * 0.4;
            const c2x = endX - direction * (BRANCH_END_GAP * 0.2);
            const c2y = endY - drop * 0.3;
            return `
              M ${startX} ${startYValue}
              L ${midX} ${midY}
              C ${c1x} ${c1y} ${c2x} ${c2y} ${endX} ${endY}
            `;
          };

          const returnStartY = nodeYs[nodeYs.length - 1];
          const returnVerticalGap = BRANCH_END_GAP;
          const returnRadius = BRANCH_END_GAP + 6;
          const returnDownY = returnStartY + returnVerticalGap;

          const buildReturnPath = () => {
            const direction = -sign;
            const curveEndX = branchEndX + direction * returnRadius;
            const curveEndY = returnDownY + returnRadius;
            const c1x = branchEndX;
            const c1y = returnDownY + returnRadius * 0.6;
            const c2x = branchEndX + direction * returnRadius * 0.6;
            const c2y = curveEndY;
            return `
              M ${branchEndX} ${returnStartY}
              L ${branchEndX} ${returnDownY}
              C ${c1x} ${c1y} ${c2x} ${c2y} ${curveEndX} ${curveEndY}
              L ${centerX} ${curveEndY}
            `;
          };

          return (
            <React.Fragment key={branch.lessonId}>
              <Path
                d={`${buildOutgoingCurve(centerX, startY, branchEndX, firstNodeY, sign)}
                  ${nodeYs.slice(1).map((nodeY) => `L ${branchEndX} ${nodeY}`).join(' ')}`}
                stroke={branchLineColor}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={buildReturnPath()}
                stroke={branchLineColor}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
              {nodePositions.map((nodeX, nodeIdx) => {
                const node = nodes[nodeIdx];
                const nodeY = nodeYs[nodeIdx];
                const completed = completedLessons.has(node.lessonId);
                return (
                  <NodeDot
                    key={node.lessonId}
                    x={nodeX}
                    y={nodeY}
                    completed={completed}
                    active={false}
                    colors={colors}
                    color={CONNECTOR_COLOR}
                    onPress={() => onOpenLesson(node.lessonId)}
                  />
                );
              })}
            </React.Fragment>
          );
        })}

        <NodeDot
          x={centerX}
          y={mainY}
          completed={mainCompleted}
          active={isActive}
          colors={colors}
          onPress={() => onOpenLesson(stage.lessonId)}
        />
      </Svg>

      <View style={[styles.cardsColumn, { paddingLeft: TIMELINE_WIDTH + 12 }]}>
        <View style={styles.mainRowWrap}>
          <TouchableOpacity
            style={styles.mainRow}
            activeOpacity={0.85}
            onPress={() => onOpenLesson(stage.lessonId)}
          >
            <Sparkles size={14} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.trackPrefix, { color: colors.secondaryText }]}>Track 0</Text>
              <Text style={[styles.stageTitle, { color: colors.text }]}>{stage.title}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {branchPositions.map(({ branch, nodes }) => {
          const primaryNode = nodes[0];
          const extraNodes = nodes.slice(1);
          return (
            <View key={branch.lessonId} style={styles.branchRowWrap}>
              <View style={styles.branchRowTop}>
                <TouchableOpacity
                  style={styles.branchRow}
                  activeOpacity={0.85}
                  onPress={() => onOpenLesson(primaryNode.lessonId)}
                >
                  <Text style={[styles.branchSide, { color: colors.secondaryText }]}>
                    {branch.side === 'left' ? 'Side branch' : 'Quick focus'}
                  </Text>
                  <Text style={[styles.branchTitle, { color: colors.text }]}>{primaryNode.title}</Text>
                </TouchableOpacity>
              </View>

              {extraNodes.length > 0 && (
                <View style={styles.extraNodesList}>
                  {extraNodes.map((node) => {
                    return (
                      <View key={node.lessonId} style={styles.extraNodeRow}>
                        <TouchableOpacity
                          style={styles.extraNodeText}
                          activeOpacity={0.85}
                          onPress={() => onOpenLesson(node.lessonId)}
                        >
                          <Text style={[styles.extraNodeLabel, { color: colors.secondaryText }]}>Extra step</Text>
                          <Text style={[styles.extraNodeTitle, { color: colors.text }]} numberOfLines={1}>
                            {node.title}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NodeDot({ x, y, completed, active, colors, onPress, color }: NodeDotProps) {
  const progress = useRef(new Animated.Value(completed ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: completed ? 1 : 0,
      duration: 240,
      useNativeDriver: false,
    }).start();
  }, [completed, progress]);

  const innerRadius = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 10],
  });

  const glowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  }) as unknown as number;

  const accentColor = color ?? colors.accent;

  return (
    <G onPress={onPress}>
      {/* invisible hit area to make tap easier */}
      <Circle cx={x} cy={y} r={18} fill="transparent" />
      {active && (
        <Circle
          cx={x}
          cy={y}
          r={14}
          fill={accentColor}
          opacity={0.12}
        />
      )}
      <Circle
        cx={x}
        cy={y}
        r={11}
        stroke={accentColor}
        strokeWidth={2.5}
        fill={completed ? accentColor : colors.background}
      />
      <AnimatedCircle
        cx={x}
        cy={y}
        r={innerRadius}
        fill={accentColor}
        opacity={glowOpacity}
      />
      {completed && (
        <Circle
          cx={x}
          cy={y}
          r={6}
          fill={accentColor}
        />
      )}
    </G>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
  },
  rowContainer: {
    position: 'relative',
  },
  timelineCanvas: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  cardsColumn: {
    flex: 1,
    paddingRight: 6,
  },
  mainRowWrap: {
    minHeight: MAIN_CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 10,
  },
  trackPrefix: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  branchRowWrap: {
    minHeight: BRANCH_CARD_HEIGHT,
    gap: 10,
    paddingVertical: 8,
    marginTop: BASE_SPACING,
  },
  branchRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  branchRow: {
    flex: 1,
    gap: 4,
  },
  branchSide: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  branchTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  extraNodesList: {
    gap: 8,
    marginLeft: 6,
  },
  extraNodeRow: {
    minHeight: BRANCH_EXTRA_NODE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  extraNodeText: {
    flex: 1,
    gap: 2,
  },
  extraNodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  extraNodeTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});
