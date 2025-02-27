import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { BirdObservation } from '@/types/birds';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { BirdImageModal } from './BirdImageModal';

interface BirdCardProps {
  bird: BirdObservation;
}

export function BirdCard({ bird }: BirdCardProps) {
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const { birdImages } = useBirdsStore();
  const birdImage = birdImages[bird.speciesCode];
  
  // Placeholder image URL
  const placeholderImageUrl = 'https://i.ibb.co/Pv5xKZdq/fledgy.png';
  
  const openImageModal = () => {
    if (birdImage) {
      setImageModalVisible(true);
    }
  };

  return (
    <>
      <View style={styles.card}>
        <Pressable 
          style={styles.imageContainer}
          onPress={openImageModal}
        >
          <Image
            source={{ uri: birdImage || placeholderImageUrl }}
            style={styles.birdImage}
            contentFit="cover"
            transition={200}
            placeholder={Platform.OS === 'web' ? undefined : { color: '#E1E2DE' }}
          />
        </Pressable>
        
        <View style={styles.textContent}>
          <Text style={styles.commonName}>{bird.comName}</Text>
          <Text style={styles.scientificName}>{bird.sciName}</Text>
          <Text style={styles.lastReported}>
            Last reported: {new Date(bird.obsDt).toLocaleDateString()}
          </Text>
          <View style={styles.statsContainer}>
            <Text style={styles.likelihood}>
              {bird.likelihood}% likely to see
            </Text>
          </View>
        </View>
      </View>

      {birdImage && (
        <BirdImageModal
          visible={imageModalVisible}
          imageUrl={birdImage}
          onClose={() => setImageModalVisible(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
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
    aspectRatio: 1,
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
    justifyContent: 'center',
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
    marginBottom: 4,
  },
  lastReported: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likelihood: {
    fontSize: 14,
    color: '#2D3F1F',
    fontWeight: '500',
  }
});