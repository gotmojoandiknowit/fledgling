import { useState, memo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { BirdObservation } from '@/types/birds';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { BirdDetailsModal } from './BirdDetailsModal';
import { Calendar, Eye } from 'lucide-react-native';

interface BirdCardProps {
  bird: BirdObservation;
}

// Memoized component to prevent unnecessary re-renders
export const BirdCard = memo(({ bird }: BirdCardProps) => {
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const { birdImages } = useBirdsStore();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Get the bird images array or use an empty array if none exist
  const birdImageUrls = birdImages[bird.speciesCode] || [];
  
  // Use the first image as the main display image, or placeholder if none
  const mainImageUrl = birdImageUrls.length > 0 ? birdImageUrls[0] : 'https://i.ibb.co/Pv5xKZdq/fledgy.png';
  
  const openDetailsModal = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setDetailsModalVisible(true);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Calculate likelihood color based on percentage
  const getLikelihoodColor = (likelihood: number) => {
    if (likelihood >= 80) return '#2D8B4F'; // High likelihood - green
    if (likelihood >= 50) return '#F9A825'; // Medium likelihood - amber
    return '#E67C73'; // Low likelihood - red
  };

  // Ensure likelihood is a valid number
  const likelihood = isNaN(bird.likelihood) ? 0 : bird.likelihood;
  const likelihoodColor = getLikelihoodColor(likelihood);

  return (
    <>
      <Animated.View style={[
        styles.cardContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        <Pressable 
          style={styles.card}
          onPress={openDetailsModal}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.05)' }}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: mainImageUrl }}
              style={styles.birdImage}
              contentFit="cover"
              transition={200}
              placeholder={Platform.OS === 'web' ? undefined : { color: '#E1E2DE' }}
              cachePolicy="memory-disk"
            />
          </View>
          
          <View style={styles.textContent}>
            <Text style={styles.commonName} numberOfLines={1} ellipsizeMode="tail">
              {bird.comName}
            </Text>
            <Text style={styles.scientificName} numberOfLines={1} ellipsizeMode="tail">
              {bird.sciName}
            </Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Calendar size={14} color="#666" />
                <Text style={styles.statText}>
                  {new Date(bird.obsDt).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.likelihoodContainer}>
                <View style={[styles.likelihoodBadge, { backgroundColor: likelihoodColor }]}>
                  <Eye size={12} color="#FFFFFF" />
                  <Text style={styles.likelihoodText}>
                    {likelihood}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      <BirdDetailsModal
        visible={detailsModalVisible}
        bird={bird}
        imageUrl={mainImageUrl}
        onClose={() => setDetailsModalVisible(false)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: 'row',
  },
  imageContainer: {
    width: 110,
    height: 110,
    overflow: 'hidden',
  },
  birdImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F6F3',
  },
  textContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  commonName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  likelihoodContainer: {
    alignItems: 'flex-end',
  },
  likelihoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  likelihoodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  }
});