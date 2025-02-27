import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, RefreshControl, ScrollView, Animated, Dimensions, Linking, Platform, Pressable, Modal, SafeAreaView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { useFilterStore } from '@/hooks/use-filter-store';
import { fetchNearbyBirds } from '@/utils/api';
import { fetchBirdImages } from '@/utils/image-api';
import { calculateBirdLikelihood } from '@/utils/bird-scoring';
import * as Location from 'expo-location';
import { BirdCard } from '@/components/BirdCard';
import { RotatingLoadingImage } from '@/components/RotatingLoadingImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MapPin, Filter } from 'lucide-react-native';
import { FilterSettings } from '@/components/FilterSettings';
import { RadiusSettings } from '@/components/RadiusSettings';

const { width, height } = Dimensions.get('window');

export default function BirdsScreen() {
  const { 
    birds, 
    isLoading, 
    error, 
    location, 
    searchRadius,
    resultsLimit,
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
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [activeModal, setActiveModal] = useState<'radius' | 'filter' | null>(null);
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(height)).current;

  const loadBirds = useCallback(async (radius = searchRadius, shouldAutoExpand = true) => {
    try {
      setIsLoading(true);
      setIsFullyLoaded(false);
      setError(null);
      setRefreshing(true);

      // Fade out current content
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Provide haptic feedback when refresh starts
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        setRefreshing(false);
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
          bird => !birdImages[bird.speciesCode] || birdImages[bird.speciesCode].length === 0
        );
        
        if (birdsNeedingImages.length > 0) {
          setIsLoadingImages(true);
          try {
            // Limit to 5 images per bird
            const newImages = await fetchBirdImages(birdsNeedingImages, 5);
            if (Object.keys(newImages).length > 0) {
              addBirdImages(newImages);
            }
          } catch (imageError) {
            console.error('Error loading bird images:', imageError);
          } finally {
            setIsLoadingImages(false);
            setIsFullyLoaded(true);
            
            // Fade in new content
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }
        } else {
          setIsFullyLoaded(true);
          
          // Fade in new content
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }

      // Provide haptic feedback when refresh completes successfully
      if (Platform.OS !== 'web' && scoredBirds.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsFullyLoaded(true);
      
      // Provide haptic feedback for error
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [searchRadius, hasAutoExpanded, birdImages]);

  useEffect(() => {
    loadBirds();
  }, [loadBirds]);

  // Reset auto-expand flag when search radius changes manually
  useEffect(() => {
    setHasAutoExpanded(false);
  }, [searchRadius]);

  // Apply sorting and limiting to the birds list
  const displayedBirds = useMemo(() => {
    if (!birds.length) return [];
    
    // First sort the birds
    const sorted = [...birds].sort((a, b) => {
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
    
    // Then limit the results if needed
    if (resultsLimit !== null) {
      return sorted.slice(0, resultsLimit);
    }
    
    return sorted;
  }, [birds, sortBy, sortDirection, resultsLimit]);

  // Modal functions
  const openModal = (type: 'radius' | 'filter') => {
    setActiveModal(type);
    setModalVisible(true);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Animate both fade and slide
    Animated.parallel([
      Animated.timing(modalFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(modalSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeModal = () => {
    // Animate both fade and slide
    Animated.parallel([
      Animated.timing(modalFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalSlideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setModalVisible(false);
      setActiveModal(null);
    });
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRadiusChange = () => {
    closeModal();
    setIsLoading(true);
    loadBirds(searchRadius, false);
  };

  const renderFooter = () => {
    if (location && !isLoading && !error && displayedBirds.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <LinearGradient
            colors={['rgba(45, 63, 31, 0.9)', 'rgba(45, 63, 31, 0.95)']}
            style={styles.footerGradient}
          >
            <SafeAreaView style={styles.footerSafeArea}>
              <View style={styles.footerContent}>
                <Pressable 
                  style={({ pressed }) => [
                    styles.footerButton,
                    pressed && styles.footerButtonPressed
                  ]}
                  onPress={() => openModal('radius')}
                >
                  <View style={styles.locationContainer}>
                    <MapPin size={18} color="#FFFFFF" />
                    <Text style={styles.locationText}>
                      {searchRadius} mile{searchRadius !== 1 ? 's' : ''} radius
                    </Text>
                  </View>
                </Pressable>
                
                <Pressable 
                  style={({ pressed }) => [
                    styles.footerButton,
                    pressed && styles.footerButtonPressed
                  ]}
                  onPress={() => openModal('filter')}
                >
                  <View style={styles.resultsContainer}>
                    <Filter size={18} color="#FFFFFF" />
                    <Text style={styles.resultsText}>
                      {displayedBirds.length} bird{displayedBirds.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </View>
      );
    }
    return null;
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.refreshButton}>
            <Text style={styles.refreshButtonText} onPress={() => loadBirds()}>
              Try Again
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const isStillLoading = isLoading || isLoadingImages || !isFullyLoaded;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          // Add extra padding at the bottom for the footer
          location && !isLoading && !error && displayedBirds.length > 0 && styles.scrollContentWithFooter
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => loadBirds()} 
            colors={['#2D3F1F']}
            tintColor="#2D3F1F"
          />
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
        ) : displayedBirds.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Search size={40} color="#2D3F1F" />
            </View>
            <Text style={styles.emptyText}>No birds found in your area.</Text>
            <Text style={styles.emptySubtext}>Try increasing your search radius.</Text>
          </View>
        ) : (
          <Animated.View 
            style={[
              styles.listContainer,
              { opacity: fadeAnim }
            ]}
          >
            {displayedBirds.map((bird) => (
              <BirdCard key={bird.speciesCode} bird={bird} />
            ))}
          </Animated.View>
        )}
      </ScrollView>

      {/* Footer Bar */}
      {renderFooter()}

      {/* Filter Modals */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <Animated.View 
            style={[
              styles.modalOverlay,
              { opacity: modalFadeAnim }
            ]}
          >
            <Pressable 
              style={styles.modalBackground}
              onPress={closeModal}
            />
            
            <Animated.View 
              style={[
                styles.modalContent,
                {
                  transform: [
                    { translateY: modalSlideAnim }
                  ],
                },
              ]}
            >
              {activeModal === 'radius' && (
                <RadiusSettings onSelect={handleRadiusChange} onClose={closeModal} />
              )}
              
              {activeModal === 'filter' && (
                <FilterSettings onClose={closeModal} showResultsLimit={true} />
              )}
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  scrollContentWithFooter: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Extra padding for footer
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3F1F',
    marginBottom: 8,
  },
  errorText: {
    color: '#E63946',
    textAlign: 'center',
    margin: 20,
    fontSize: 16,
  },
  refreshButton: {
    backgroundColor: '#2D3F1F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(45, 63, 31, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    paddingTop: 8,
  },
  // Footer styles
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  footerGradient: {
    width: '100%',
  },
  footerSafeArea: {
    width: '100%',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  footerButton: {
    padding: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  footerButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  resultsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  // Modal styles
  modalSafeArea: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 32,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
        borderRadius: 24,
        marginBottom: 40,
        maxHeight: '70%',
      }
    }),
  },
});