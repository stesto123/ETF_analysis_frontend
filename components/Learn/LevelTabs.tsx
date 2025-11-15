import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/components/common/ThemeProvider';
import type { LearningLevelId, LearningLevelMeta } from '@/constants/learningPaths';

type LevelStats = {
  total: number;
  completed: number;
  percent: number;
};

type Props = {
  levels: LearningLevelMeta[];
  selectedLevel: LearningLevelId;
  onSelect: (level: LearningLevelId) => void;
  stats: Record<LearningLevelId, LevelStats>;
};

export default function LevelTabs({ levels, selectedLevel, onSelect, stats }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {levels.map((level) => {
        const active = level.id === selectedLevel;
        const levelStats = stats[level.id];
        return (
          <TouchableOpacity
            key={level.id}
            style={[
              styles.tab,
              {
                backgroundColor: active ? colors.accent : colors.card,
                borderColor: active ? colors.accent : colors.border,
                shadowColor: active ? colors.accent : '#000000',
              },
            ]}
            onPress={() => onSelect(level.id)}
            activeOpacity={0.9}
          >
            <View style={styles.tabHeader}>
              <Text
                style={[
                  styles.label,
                  { color: active ? '#FFFFFF' : colors.text },
                ]}
              >
                {level.label}
              </Text>
              <Text style={[styles.countText, { color: active ? 'rgba(255,255,255,0.85)' : colors.secondaryText }]}>
                {levelStats?.completed ?? 0}/{levelStats?.total ?? 0}
              </Text>
            </View>
            <Text
              style={[
                styles.description,
                { color: active ? 'rgba(255,255,255,0.86)' : colors.secondaryText },
              ]}
              numberOfLines={2}
            >
              {level.description}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    columnGap: 12,
  },
  tab: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});
