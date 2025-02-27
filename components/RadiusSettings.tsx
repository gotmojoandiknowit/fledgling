import { View, Text, StyleSheet, Pressable, Image, Linking, Platform, ScrollView } from 'react-native';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const RADIUS_OPTIONS = [
  { label: '5 miles', value: 5 },
  { label: '10 miles', value: 10 },
  { label: '15 miles', value: 15 },
  { label: '25 miles', value: 25 },
];

interface RadiusSettingsProps {
  onSelect?: () => void;
  onClose?: () => void;
}

export function RadiusSettings({ onSelect, onClose }: RadiusSettingsProps) {
  const { searchRadius, setSearchRadius } = useBirdsStore();

  const handleSelect = (radius: number) => {
    setSearchRadius(radius);
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    
    onSelect?.();
  };

  const openEBirdWebsite = async () => {
    const url = 'https://ebird.org';
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
      
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Radius</Text>
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
        <Text style={styles.description}>
          Select how far to search for bird sightings from your current location.
        </Text>
        
        <View style={styles.optionsContainer}>
          {RADIUS_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.option,
                searchRadius === option.value && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
              onPress={() => handleSelect(option.value)}
            >
              {searchRadius === option.value ? (
                <LinearGradient
                  colors={['#2D3F1F', '#3A5129']}
                  style={styles.selectedGradient}
                >
                  <Text style={styles.optionTextSelected}>{option.label}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.optionText}>{option.label}</Text>
              )}
            </Pressable>
          ))}
        </View>
        
        <View style={styles.attributionContainer}>
          <Text style={styles.poweredByText}>Powered by</Text>
          <Pressable 
            onPress={openEBirdWebsite}
            style={({ pressed }) => [
              styles.ebirdLogoContainer,
              pressed && styles.ebirdLogoContainerPressed
            ]}
          >
            <Image 
              source={{ uri: 'https://clo-brand-static-prod.s3.amazonaws.com/logos/ebird/clo_ebird_stacked_web.svg' }}
              style={styles.ebirdLogo}
              resizeMode="contain"
            />
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
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
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
    width: '100%',
    overflow: 'hidden',
  },
  selectedGradient: {
    padding: 16,
    width: '100%',
    alignItems: 'center',
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
    textAlign: 'center',
    fontWeight: '500',
    padding: 16,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  attributionContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  poweredByText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  ebirdLogoContainer: {
    padding: 8,
    borderRadius: 8,
  },
  ebirdLogoContainerPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  ebirdLogo: {
    width: 100,
    height: 40,
  }
});