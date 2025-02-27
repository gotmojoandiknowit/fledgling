import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { X, ArrowDown, ArrowUp, Check } from 'lucide-react-native';
import { useFilterStore, SortOption, SortDirection } from '@/hooks/use-filter-store';

interface FilterSettingsProps {
  onClose?: () => void;
}

interface SortOptionItem {
  value: SortOption;
  label: string;
}

const SORT_OPTIONS: SortOptionItem[] = [
  { value: 'likelihood', label: 'Likelihood to see' },
  { value: 'name', label: 'Bird name' },
  { value: 'date', label: 'Report date' },
];

export function FilterSettings({ onClose }: FilterSettingsProps) {
  const { sortBy, sortDirection, setSortBy, setSortDirection, resetFilters } = useFilterStore();

  const handleSortOptionSelect = (option: SortOption) => {
    setSortBy(option);
  };

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleReset = () => {
    resetFilters();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filter Birds</Text>
        <Pressable 
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.closeButtonPressed
          ]}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <X size={24} color="#2D3F1F" />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sort by</Text>
        <View style={styles.optionsContainer}>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.option,
                sortBy === option.value && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
              onPress={() => handleSortOptionSelect(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  sortBy === option.value && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.value && (
                <Check size={18} color="#FFFFFF" />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Direction</Text>
        <Pressable
          style={({ pressed }) => [
            styles.directionButton,
            pressed && styles.optionPressed,
          ]}
          onPress={toggleSortDirection}
        >
          <Text style={styles.directionText}>
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </Text>
          {sortDirection === 'asc' ? (
            <ArrowUp size={18} color="#2D3F1F" />
          ) : (
            <ArrowDown size={18} color="#2D3F1F" />
          )}
        </Pressable>
      </View>

      <View style={styles.resetContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.resetButton,
            pressed && styles.resetButtonPressed,
          ]}
          onPress={handleReset}
        >
          <Text style={styles.resetText}>Reset Filters</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 350 : undefined,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingRight: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3F1F',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  section: {
    marginBottom: 24,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3F1F',
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 12,
    width: '100%',
  },
  option: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F6F3',
    borderWidth: 1,
    borderColor: '#E1E2DE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  optionSelected: {
    backgroundColor: '#2D3F1F',
    borderColor: '#2D3F1F',
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionText: {
    fontSize: 16,
    color: '#2D3F1F',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  directionButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F6F3',
    borderWidth: 1,
    borderColor: '#E1E2DE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  directionText: {
    fontSize: 16,
    color: '#2D3F1F',
    fontWeight: '500',
  },
  resetContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F5F6F3',
    borderWidth: 1,
    borderColor: '#E1E2DE',
  },
  resetButtonPressed: {
    backgroundColor: '#E1E2DE',
  },
  resetText: {
    fontSize: 16,
    color: '#2D3F1F',
    fontWeight: '500',
  },
});