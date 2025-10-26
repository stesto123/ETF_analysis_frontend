import React from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
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
  // Aggiungo una "Tutti" per deselezionare
  const data = [{ geography_name: 'Tutte', geography_id: -1 }, ...areas];

  const { colors, isDark } = useTheme();
  return (
    <View style={styles.container}>
  <Text style={[styles.label, { color: colors.text }]}>Aree geografiche</Text>

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
          const secondary = item.iso_code || item.country || item.continent || '';
          const label = secondary ? `${item.geography_name} (${secondary})` : item.geography_name;

          return (
            <Pressable
              onPress={() =>
                onSelect(item.geography_id === -1 ? null : item.geography_id)
              }
              style={({ pressed }) => [
                [styles.chip, { borderColor: colors.border, backgroundColor: colors.card }],
                isSelected && { backgroundColor: colors.accent, borderColor: colors.accent, elevation: 2 },
                pressed && styles.chipPressed,
              ]}
              android_ripple={{ color: isDark ? '#334155' : '#e5e7eb', borderless: false }}
            >
              <Text style={[styles.chipText, { color: colors.text }, isSelected && { color: '#FFFFFF' }]}>
                {label}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{loading ? 'Caricamento geografie…' : 'Nessuna geografia'}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  listContent: { paddingRight: 8 },
  chip: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: { color: '#111827', fontSize: 13, fontWeight: '500' },
  empty: { paddingVertical: 8, paddingHorizontal: 12 },
  emptyText: { color: '#6B7280' },
});

export default AreaChips;