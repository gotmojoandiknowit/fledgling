import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { X, ArrowDown, ArrowUp, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useFilterStore, SortOption, SortDirection } from '@/hooks/use-filter-store';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { LinearGradient } from 'expo-linear-gradient';

interface FilterSettingsProps {
  onClose?: () => void;
  showResultsLimit?: boolean;
}

interface SortOptionItem {
  value: SortOption;
  label: string;
  description: string;
}

interface ResultsLimitItem {
  value: number | null;
  label: string;
}

const SORT_OPTIONS: SortOptionItem[] = [
  { 
    value: 'likelihood', 
    label: 'Likelihood to see',
    description: 'Sort by chance of spotting the bird'
  },
  { 
    value: 'name', 
    label: 'Bird name',
    description: 'Sort alphabetically by common name'
  },
  { 
    value: 'date', 
    label: 'Report date',
    description: 'Sort by most recent sightings'
  },
];

const RESULTS_LIMIT_OPTIONS: ResultsLimitItem[] = [
  { value: 10, label: '10 birds' },
  { value: 25, label: '25 birds' },
  { value: 50, label: '50 birds' },
  { value: null, label: 'All birds' },
];

export function FilterSettings({ onClose, showResultsLimit = false }: FilterSettingsProps) {
  const { sortBy, sortDirection, setSortBy, setSortDirection, resetFilters } = useFilterStore();
  const { resultsLimit, setResultsLimit } = useBirdsStore();

  const handleSortOptionSelect = (option: SortOption) => {
    setSortBy(option);
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleResultsLimitSelect = (limit: number | null) => {
    setResultsLimit(limit);
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  const handleReset = () => {
    resetFilters();
    setResultsLimit(25); // Reset to default
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filter Birds</Text>
        {onClose && (
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
        )}
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {showResultsLimit && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Show</Text>
            <Text style={styles.sectionDescription}>
              Limit the number of birds displayed in the list.
            </Text>
            <View style={styles.optionsContainer}>
              {RESULTS_LIMIT_OPTIONS.map((option) => (
                <Pressable
                  key={option.label}
                  style={({ pressed }) => [
                    styles.option,
                    resultsLimit === option.value && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                  onPress={() => handleResultsLimitSelect(option.value)}
                >
                  {resultsLimit === option.value ? (
                    <LinearGradient
                      colors={['#2D3F1F', '#3A5129']}
                      style={styles.selectedGradient}
                    >
                      <View style={styles.optionContent}>
                        <View style={styles.optionHeader}>
                          <Text style={styles.optionTextSelected}>{option.label}</Text>
                          <Check size={18} color="#FFFFFF" />
                        </View>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.optionContent}>
                      <Text style={styles.optionText}>{option.label}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sort by</Text>
          <Text style={styles.sectionDescription}>
            Choose how to order the birds in the list.
          </Text>
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
                {sortBy === option.value ? (
                  <LinearGradient
                    colors={['#2D3F1F', '#3A5129']}
                    style={styles.selectedGradient}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.optionHeader}>
                        <Text style={styles.optionTextSelected}>{option.label}</Text>
                        <Check size={18} color="#FFFFFF" />
                      </View>
                      <Text style={styles.optionDescriptionSelected}>{option.description}</Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.optionContent}>
                    <Text style={styles.optionText}>{option.label}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Direction</Text>
          <Text style={styles.sectionDescription}>
            Choose the sort order direction.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.directionButton,
              pressed && styles.optionPressed,
            ]}
            onPress={toggleSortDirection}
          >
            <View style={styles.directionContent}>
              <Text style={styles.directionText}>
                {sortDirection === 'asc' ? 'Ascending order' : 'Descending order'}
              </Text>
              <Text style={styles.directionDescription}>
                {sortDirection === 'asc' 
                  ? 'Lowest to highest, A to Z' 
                  : 'Highest to lowest, Z to A'}
              </Text>
            </View>
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
            <Text style={styles.resetText}>Reset All Filters</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3F1F',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 28,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
    width: '100%',
  },
  option: {
    borderRadius: 12,
    backgroundColor: '#F5F6F3',
    borderWidth: 1,
    borderColor: '#E1E2DE',
    overflow: 'hidden',
    width: '100%',
  },
  selectedGradient: {
    width: '100%',
  },
  optionContent: {
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionSelected: {
    borderColor: '#2D3F1F',
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionText: {
    fontSize: 16,
    color: '#2D3F1F',
    fontWeight: '500',
    marginBottom: 4,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  optionDescriptionSelected: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
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
  directionContent: {
    flex: 1,
  },
  directionText: {
    fontSize: 16,
    color: '#2D3F1F',
    fontWeight: '500',
    marginBottom: 4,
  },
  directionDescription: {
    fontSize: 14,
    color: '#666',
  },
  resetContainer: {
    marginTop: 16,
    alignItems: 'center',
    marginBottom: 20,
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