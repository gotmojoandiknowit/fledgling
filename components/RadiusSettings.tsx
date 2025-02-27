import { View, Text, StyleSheet, Pressable, Image, Linking, Platform } from 'react-native';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { X } from 'lucide-react-native';

const RADIUS_OPTIONS = [
  { label: '5 miles', value: 5 },
  { label: '10 miles', value: 10 },
  { label: '25 miles', value: 25 },
  { label: 'Max (30 miles)', value: 30 }, // ~50 km is about 30 miles
];

interface RadiusSettingsProps {
  onSelect?: () => void;
  onClose?: () => void;
}

export function RadiusSettings({ onSelect, onClose }: RadiusSettingsProps) {
  const { searchRadius, setSearchRadius } = useBirdsStore();

  const handleSelect = (radius: number) => {
    setSearchRadius(radius);
    onSelect?.();
  };

  const openEBirdWebsite = async () => {
    const url = 'https://ebird.org';
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Radius</Text>
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
            <Text
              style={[
                styles.optionText,
                searchRadius === option.value && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      
      <View style={styles.attributionContainer}>
        <Text style={styles.poweredByText}>Powered by</Text>
        <Pressable onPress={openEBirdWebsite}>
          <Image 
            source={{ uri: 'https://clo-brand-static-prod.s3.amazonaws.com/logos/ebird/clo_ebird_stacked_web.svg' }}
            style={styles.ebirdLogo}
            resizeMode="contain"
          />
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
  optionsContainer: {
    gap: 16,
    width: '100%',
  },
  option: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F6F3',
    borderWidth: 1,
    borderColor: '#E1E2DE',
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
    textAlign: 'center',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  attributionContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  poweredByText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  ebirdLogo: {
    width: 100,
    height: 40,
  }
});