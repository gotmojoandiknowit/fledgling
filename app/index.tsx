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
import { Search, MapPin, Filter, Map } from 'lucide-react-native';
import { FilterSettings } from '@/components/FilterSettings';
import { RadiusSettings } from '@/components/RadiusSettings';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function BirdsScreen() {
  const router = useRouter();
  const { 
    birds, 
    filteredBirds,
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
        setIsLoading(false);
        setIsFullyLoaded(true);
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setLocation(currentLocation);

      // Pass the resultsLimit to the API call
      // If resultsLimit is null (All), don't pass a limit
      const apiLimit = resultsLimit === null ? null : resultsLimit;
      const birdsData = await fetchNearbyBirds(currentLocation, radius, apiLimit);
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
  }, [searchRadius, hasAutoExpanded, birdImages, resultsLimit]);

  useEffect(() => {
    loadBirds();
  }, [loadBirds]);

  // Reset auto-expand flag when search radius changes manually
  useEffect(() => {
    setHasAutoExpanded(false);
  }, [searchRadius]);

  // Apply sorting and limiting to the birds list
  const displayedBirds = useMemo(() => {
    if (!filteredBirds.length) return [];
    
    // First sort the birds
    const sorted = [...filteredBirds].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'likelihood') {
        // Ensure we're comparing valid numbers
        const aLikelihood = isNaN(a.likelihood) ? 0 : a.likelihood;
        const bLikelihood = isNaN(b.likelihood) ? 0 : b.likelihood;
        comparison = aLikelihood - bLikelihood;
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
  }, [filteredBirds, sortBy, sortDirection, resultsLimit]);

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

  // Navigate to hotspots page
  const navigateToHotspots = () => {
    // Use push to navigate to the hotspots page
    router.push('/hotspots');
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  // Open app settings to allow location permissions
  const openLocationSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else if (Platform.OS === 'android') {
      Linking.openSettings();
    } else {
      // For web, just retry the location request
      loadBirds();
    }
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
                  <View style={styles.footerButtonContent}>
                    <MapPin size={20} color="#FFFFFF" />
                    <Text style={styles.footerButtonText}>
                      {searchRadius} mi
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
                  <View style={styles.footerButtonContent}>
                    <Filter size={20} color="#FFFFFF" />
                    <Text style={styles.footerButtonText}>
                      Filter
                    </Text>
                  </View>
                </Pressable>
                
                <Pressable 
                  style={({ pressed }) => [
                    styles.footerButton,
                    pressed && styles.footerButtonPressed
                  ]}
                  onPress={navigateToHotspots}
                >
                  <View style={styles.footerButtonContent}>
                    <Map size={20} color="#FFFFFF" />
                    <Text style={styles.footerButtonText}>
                      Hotspots
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
    const isLocationError = error.includes('location') || error.includes('Location');
    
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          
          {isLocationError ? (
            <>
              <Pressable 
                style={styles.refreshButton}
                onPress={() => loadBirds()}
              >
                <Text style={styles.refreshButtonText}>
                  Try Again
                </Text>
              </Pressable>
              
              <Pressable 
                style={[styles.refreshButton, styles.settingsButton]}
                onPress={openLocationSettings}
              >
                <Text style={styles.refreshButtonText}>
                  Open Settings
                </Text>
              </Pressable>
              
              <Text style={styles.permissionHelpText}>
                Fledgling needs location access to find birds near you
              </Text>
            </>
          ) : (
            <Pressable 
              style={styles.refreshButton}
              onPress={() => loadBirds()}
            >
              <Text style={styles.refreshButtonText}>
                Try Again
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const isStillLoading = isLoading || isLoadingImages || !isFullyLoaded;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top info bar - matching the style in hotspots page */}
      {!isStillLoading && displayedBirds.length > 0 && (
        <View style={styles.topInfoBar}>
          <Text style={styles.topInfoText}>
            Top {displayedBirds.length} Birds within {searchRadius} miles
          </Text>
        </View>
      )}
      
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

      {/* Modals */}
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
  topInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F6F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E2DE',
  },
  topInfoText: {
    fontSize: 14,
    color: '#2D3F1F',
    fontWeight: '500',
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
  settingsButton: {
    backgroundColor: '#4A6741',
    marginTop: 12,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  permissionHelpText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
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
    marginBottom: 20,
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
    paddingHorizontal: 8,
  },
  footerButton: {
    padding: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  footerButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  footerButtonContent: {
    alignItems: 'center',
    gap: 4,
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
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