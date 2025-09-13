import React from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@/components/common/ThemeProvider';

export type GeographicArea = {
  area_geografica: string;
  id_area_geografica: number;
};

type Props = {
  areas: GeographicArea[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  loading?: boolean;
};

const AreaChips: React.FC<Props> = ({ areas, selectedId, onSelect, loading }) => {
  // Aggiungo una "Tutti" per deselezionare
  const data = [{ area_geografica: 'Tutte', id_area_geografica: -1 }, ...areas];

  const { colors, isDark } = useTheme();
  return (
    <View style={styles.container}>
  <Text style={[styles.label, { color: colors.text }]}>Aree geografiche</Text>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id_area_geografica)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isSelected =
            (selectedId === null && item.id_area_geografica === -1) ||
            selectedId === item.id_area_geografica;

          return (
            <Pressable
              onPress={() =>
                onSelect(item.id_area_geografica === -1 ? null : item.id_area_geografica)
              }
              style={({ pressed }) => [
                [styles.chip, { borderColor: colors.border, backgroundColor: colors.card }],
                isSelected && { backgroundColor: colors.accent, borderColor: colors.accent, elevation: 2 },
                pressed && styles.chipPressed,
              ]}
              android_ripple={{ color: isDark ? '#334155' : '#e5e7eb', borderless: false }}
            >
              <Text style={[styles.chipText, { color: colors.text }, isSelected && { color: '#FFFFFF' }]}>
                {item.area_geografica}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{loading ? 'Caricamento aree…' : 'Nessuna area'}</Text>
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