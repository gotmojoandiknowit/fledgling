import { useEffect, useCallback, useState, useMemo } from 'react';
import { StyleSheet, View, Text, RefreshControl, ScrollView } from 'react-native';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { useFilterStore } from '@/hooks/use-filter-store';
import { fetchNearbyBirds } from '@/utils/api';
import { fetchBirdImages } from '@/utils/image-api';
import { calculateBirdLikelihood } from '@/utils/bird-scoring';
import * as Location from 'expo-location';
import { BirdCard } from '@/components/BirdCard';
import { RotatingLoadingImage } from '@/components/RotatingLoadingImage';

export default function BirdsScreen() {
  const { 
    birds, 
    isLoading, 
    error, 
    location, 
    searchRadius,
    birdImages,
    setLocation, 
    setBirds, 
    setIsLoading, 
    setError,
    setSearchRadius,
    addBirdImages
  } = useBirdsStore();
  
  const { sortBy, sortDirection } = useFilterStore();
  
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);

  const loadBirds = useCallback(async (radius = searchRadius, shouldAutoExpand = true) => {
    try {
      setIsLoading(true);
      setIsFullyLoaded(false);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(currentLocation);

      const birdsData = await fetchNearbyBirds(currentLocation, radius);
      const scoredBirds = calculateBirdLikelihood(birdsData);
      setBirds(scoredBirds);
      
      // If no birds found and radius is 5 miles, auto-expand to 10 miles
      if (scoredBirds.length === 0 && radius === 5 && shouldAutoExpand && !hasAutoExpanded) {
        setHasAutoExpanded(true);
        setSearchRadius(10);
        await loadBirds(10, false); // Prevent recursive auto-expansion
      } else {
        // Load images for birds we don't already have
        const birdsNeedingImages = scoredBirds.filter(
          bird => !birdImages[bird.speciesCode]
        );
        
        if (birdsNeedingImages.length > 0) {
          setIsLoadingImages(true);
          try {
            const newImages = await fetchBirdImages(birdsNeedingImages);
            if (Object.keys(newImages).length > 0) {
              addBirdImages(newImages);
            }
          } catch (imageError) {
            console.error('Error loading bird images:', imageError);
          } finally {
            setIsLoadingImages(false);
            setIsFullyLoaded(true);
          }
        } else {
          setIsFullyLoaded(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsFullyLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [searchRadius, hasAutoExpanded, birdImages]);

  useEffect(() => {
    loadBirds();
  }, [loadBirds]);

  // Reset auto-expand flag when search radius changes manually
  useEffect(() => {
    setHasAutoExpanded(false);
  }, [searchRadius]);

  // Apply sorting to the birds list
  const sortedBirds = useMemo(() => {
    if (!birds.length) return [];
    
    return [...birds].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'likelihood') {
        comparison = a.likelihood - b.likelihood;
      } else if (sortBy === 'name') {
        comparison = a.comName.localeCompare(b.comName);
      } else if (sortBy === 'date') {
        comparison = new Date(a.obsDt).getTime() - new Date(b.obsDt).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [birds, sortBy, sortDirection]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const isStillLoading = isLoading || isLoadingImages || !isFullyLoaded;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={() => loadBirds()} />
      }
    >
      {isStillLoading ? (
        <View style={styles.loadingContainer}>
          <RotatingLoadingImage 
            imageUrl='https://i.ibb.co/Pv5xKZdq/fledgy.png'
            size={120}
          />
          <Text style={styles.loadingText}>Finding nearby birds...</Text>
        </View>
      ) : sortedBirds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No birds found in your area.</Text>
          <Text style={styles.emptySubtext}>Try increasing your search radius.</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {sortedBirds.map((bird) => (
            <BirdCard key={bird.speciesCode} bird={bird} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  loadingText: {
    fontSize: 16,
    color: '#2D3F1F',
    marginTop: 16,
  },
  errorText: {
    color: '#E63946',
    textAlign: 'center',
    margin: 20,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    paddingVertical: 8,
  },
});