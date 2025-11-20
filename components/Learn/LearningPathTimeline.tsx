import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated } from 'react-native';
import { Svg, Line, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { CheckCircle2, Circle as CircleIcon, Sparkles } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '@/components/common/ThemeProvider';
import type { LearningGraphStage } from '@/constants/learningGraph';

type TimelineProps = {
  stages: LearningGraphStage[];
  completedLessons: Set<string>;
  onOpenLesson: (lessonId: string) => void;
  onToggleLessonCompletion: (lessonId: string) => void;
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
  onToggleLessonCompletion: (lessonId: string) => void;
};

type NodeDotProps = {
  x: number;
  y: number;
  completed: boolean;
  active?: boolean;
  colors: ThemeColors;
};

const TIMELINE_WIDTH = 140;
const MAIN_CARD_HEIGHT = 72;
const BRANCH_CARD_HEIGHT = 60;
const BASE_SPACING = 20;
const BRANCH_OFFSET = 48;
const BRANCH_DROP = 28;
const BRANCH_END_GAP = 12;
const BRANCH_NODE_EXTRA_OFFSET = 16; // extra vertical offset to place branch dots lower

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function LearningPathTimeline({
  stages,
  completedLessons,
  onOpenLesson,
  onToggleLessonCompletion,
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
          onToggleLessonCompletion={onToggleLessonCompletion}
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
  onToggleLessonCompletion,
}: TimelineRowProps) {
  const branches = stage.branches ?? [];
  const branchCount = branches.length;
  const containerHeight =
    BASE_SPACING +
    MAIN_CARD_HEIGHT +
    branchCount * (BRANCH_CARD_HEIGHT + BASE_SPACING) +
    BASE_SPACING;

  const mainY = BASE_SPACING + MAIN_CARD_HEIGHT / 2;
  const branchPositions = branches.map((branch, idx) => {
    const baseY =
      BASE_SPACING + MAIN_CARD_HEIGHT + BASE_SPACING * (idx + 1) + BRANCH_CARD_HEIGHT * idx + BRANCH_CARD_HEIGHT / 2;
    return {
      branch,
      y: baseY + BRANCH_DROP + BRANCH_NODE_EXTRA_OFFSET,
      baseY,
    };
  });

  const centerX = TIMELINE_WIDTH / 2;
  const lineStart = 0;
  const lineEnd = containerHeight;
  const mainCompleted = completedLessons.has(stage.lessonId);
  const isActive = activeStageId === stage.id && !mainCompleted;
  const lineColor = mainCompleted ? colors.accent : isActive ? '#5B8DF6' : colors.border;
  const branchLineColor = isActive ? '#5B8DF6' : colors.border;

  return (
    <View style={[styles.rowContainer, { height: containerHeight }]}>
      <Svg
        height={containerHeight}
        width={TIMELINE_WIDTH}
        style={styles.timelineCanvas}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={`main-line-${stage.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={lineColor} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={lineColor} stopOpacity="0.4" />
          </LinearGradient>
        </Defs>
        <Line
          x1={centerX}
          y1={lineStart}
          x2={centerX}
          y2={lineEnd}
          stroke={`url(#main-line-${stage.id})`}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {branchPositions.map(({ branch, y, baseY }) => {
          const branchX = branch.side === 'left'
            ? centerX - BRANCH_OFFSET
            : centerX + BRANCH_OFFSET;
          const sign = branch.side === 'left' ? -1 : 1;

          const startY = baseY;
          // Aumentiamo la lunghezza della sezione retta orizzontale
          const straightLength = BRANCH_END_GAP * 2; // prima era 1×, ora 2×

          const midX = centerX + sign * straightLength;
          const midY = startY;
          
          
          // sezione verticale più lunga
          const verticalLength = BRANCH_DROP * 1.5;  // ad esempio 1.5×
          const vertX = midX;
          const vertY = startY + verticalLength;

          // Aumentiamo la “tuffata” verticale prima della curva, rendendo il drop più lungo
          const drop = BRANCH_DROP * 0.0; // 1.5× rispetto a prima

          const c1x = midX + sign * (BRANCH_OFFSET * 0.7);   // leggermente più spinto verso il ramo
          const c1y = startY + drop * 0.4;                   // più in basso
          const c2x = branchX - sign * (BRANCH_END_GAP * 0.2);
          const c2y = y - drop * 0.3;

          const completed = completedLessons.has(branch.lessonId);

          return (
            <React.Fragment key={branch.lessonId}>
              <Path
                d={`
                  M ${centerX} ${startY}
                  L ${midX} ${midY}
                  C ${c1x} ${c1y} ${c2x} ${c2y} ${branchX} ${y}
                `}
                stroke={completed || mainCompleted ? colors.accent : branchLineColor}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
              <NodeDot x={branchX} y={y} completed={completed} active={false} colors={colors} />
            </React.Fragment>
          );
        })}

        <NodeDot x={centerX} y={mainY} completed={mainCompleted} active={isActive} colors={colors} />
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
          <TouchableOpacity
            onPress={() => onToggleLessonCompletion(stage.lessonId)}
            hitSlop={12}
            style={[styles.toggleButton, { borderColor: mainCompleted ? colors.accent : colors.border }]}
            activeOpacity={0.85}
          >
            {mainCompleted ? (
              <CheckCircle2 size={18} color={colors.accent} />
            ) : (
              <CircleIcon size={18} color={colors.secondaryText} />
            )}
          </TouchableOpacity>
        </View>

        {branchPositions.map(({ branch }) => {
          const completed = completedLessons.has(branch.lessonId);
          return (
            <View key={branch.lessonId} style={styles.branchRowWrap}>
              <TouchableOpacity
                style={styles.branchRow}
                activeOpacity={0.85}
                onPress={() => onOpenLesson(branch.lessonId)}
              >
                <Text style={[styles.branchSide, { color: colors.secondaryText }]}>
                  {branch.side === 'left' ? 'Side branch' : 'Quick focus'}
                </Text>
                <Text style={[styles.branchTitle, { color: colors.text }]}>{branch.title}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onToggleLessonCompletion(branch.lessonId)}
                hitSlop={12}
                activeOpacity={0.85}
                style={[styles.toggleButton, { borderColor: completed ? colors.accent : colors.border }]}
              >
                {completed ? (
                  <CheckCircle2 size={17} color={colors.accent} />
                ) : (
                  <CircleIcon size={17} color={colors.secondaryText} />
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NodeDot({ x, y, completed, active, colors }: NodeDotProps) {
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
    outputRange: [0.1, 0.45],
  }) as unknown as number;

  return (
    <>
      {active && (
        <Circle
          cx={x}
          cy={y}
          r={14}
          fill={colors.accent}
          opacity={0.12}
        />
      )}
      <Circle
        cx={x}
        cy={y}
        r={11}
        stroke={completed ? colors.accent : colors.border}
        strokeWidth={2.5}
        fill={completed ? colors.accent : colors.card}
        opacity={completed ? 1 : 0.15}
      />
      <AnimatedCircle
        cx={x}
        cy={y}
        r={innerRadius}
        fill={colors.accent}
        opacity={glowOpacity}
      />
      <Circle
        cx={x}
        cy={y}
        r={6}
        fill={completed ? '#0B1220' : colors.background}
        stroke={completed ? colors.accent : colors.border}
        strokeWidth={completed ? 0 : 2}
      />
    </>
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
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  branchRowWrap: {
    minHeight: BRANCH_CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    marginTop: BASE_SPACING,
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
});
