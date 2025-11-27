import React from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/components/common/ThemeProvider';

export type GeographyOption = {
  geography_name: string;
  geography_id: number;
  continent?: string | null;
  country?: string | null;
  iso_code?: string | null;
};

type Props = {
  areas: GeographyOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  loading?: boolean;
};

const AreaChips: React.FC<Props> = ({ areas, selectedId, onSelect, loading }) => {
  // Add an "All" entry to clear the selection
  const data = [{ geography_name: 'All', geography_id: -1 }, ...areas];

  const { colors, isDark } = useTheme();
  const selectedGradient = isDark ? ['#1D4ED8', '#1E3A8A'] as const : ['#2563EB', '#1E3A8A'] as const;
  return (
    <View style={styles.container}>
  <Text style={[styles.label, { color: colors.text }]}>Geographies</Text>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.geography_id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected =
            (selectedId === null && item.geography_id === -1) ||
            selectedId === item.geography_id;
          const secondary = item.geography_id === -1 ? null : item.iso_code || item.country || item.continent || null;
          const primary = item.geography_name;

          return (
            <Pressable
              onPress={() =>
                onSelect(item.geography_id === -1 ? null : item.geography_id)
              }
              style={({ pressed }) => [
                styles.chipWrapper,
                isSelected && styles.chipWrapperElevated,
                pressed && styles.chipWrapperPressed,
              ]}
              android_ripple={{ color: isDark ? 'rgba(59,130,246,0.16)' : 'rgba(37,99,235,0.18)', borderless: false }}
            >
              {isSelected ? (
                <LinearGradient
                  colors={selectedGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.chipSelected}
                >
                  <Text style={styles.chipTitleActive}>{primary}</Text>
                  {secondary ? <Text style={styles.chipSubtitleActive}>{secondary}</Text> : null}
                </LinearGradient>
              ) : (
                <View style={[styles.chipDefault, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.chipTitle, { color: colors.text }]}>{primary}</Text>
                  {secondary ? <Text style={[styles.chipSubtitle, { color: colors.secondaryText }]}>{secondary}</Text> : null}
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{loading ? 'Loading geographies…' : 'No geographies available'}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingRight: 8,
  },
  chipWrapper: {
    marginRight: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  chipWrapperPressed: {
    transform: [{ scale: 0.97 }],
  },
  chipWrapperElevated: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  chipDefault: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  chipSelected: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 52,
    justifyContent: 'center',
  },
  chipTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chipTitleActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chipSubtitleActive: {
    fontSize: 12,
    marginTop: 2,
    color: 'rgba(255,255,255,0.78)',
  },
  empty: { paddingVertical: 8, paddingHorizontal: 20 },
  emptyText: { color: '#6B7280' },
});

export default AreaChips;
