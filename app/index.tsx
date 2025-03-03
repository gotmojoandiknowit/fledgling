import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { StyleSheet, View, Text, RefreshControl, ScrollView, Animated, Dimensions, Linking, Platform, Pressable, Modal, SafeAreaView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { useFilterStore } from '@/hooks/use-filter-store';
import { fetchNearbyBirds, fetchHotspots } from '@/utils/api';
import { fetchBirdImages } from '@/utils/image-api';
import { calculateBirdLikelihood } from '@/utils/bird-scoring';
import * as Location from 'expo-location';
import { BirdCard } from '@/components/BirdCard';
import { RotatingLoadingImage } from '@/components/RotatingLoadingImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MapPin, Filter, Map, Bird, AlertCircle, ChevronRight, Info, X } from 'lucide-react-native';
import { FilterSettings } from '@/components/FilterSettings';
import { RadiusSettings } from '@/components/RadiusSettings';
import { Hotspot } from '@/types/birds';

const { width, height } = Dimensions.get('window');

export default function MainScreen() {
  const { 
    birds, 
    filteredBirds,
    isLoading, 
    error, 
    location, 
    searchRadius,
    resultsLimit,
    hotspotsLimit,
    birdImages,
    hotspots,
    isLoadingHotspots,
    setLocation, 
    setBirds, 
    setFilteredBirds,
    setIsLoading, 
    setError,
    setSearchRadius,
    addBirdImages,
    setHotspots,
    setIsLoadingHotspots
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

  // View state - birds or hotspots
  const [viewMode, setViewMode] = useState<'birds' | 'hotspots'>('birds');
  
  // Hotspot details state
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [hotspotDetails, setHotspotDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  
  // Filter state for hotspots
  // Set default quality filter to All (show all results)
  const QUALITY_LEVELS = [
    { label: 'All', minSpecies: 0 },
    { label: 'Moderate', minSpecies: 25 },
    { label: 'Good', minSpecies: 50 },
    { label: 'Very Good', minSpecies: 100 },
    { label: 'Excellent', minSpecies: 200 }
  ];
  const allQualityFilter = QUALITY_LEVELS[0]; // "All" is the first option
  const [qualityFilter, setQualityFilter] = useState(allQualityFilter);
  
  // Set default sort to Quality (highest first)
  const SORT_OPTIONS = [
    { label: 'Quality (highest first)', value: 'quality', direction: 'desc' },
    { label: 'Quality (lowest first)', value: 'quality', direction: 'asc' },
    { label: 'Distance (nearest first)', value: 'distance', direction: 'asc' },
    { label: 'Distance (farthest first)', value: 'distance', direction: 'desc' },
    { label: 'Name (A to Z)', value: 'name', direction: 'asc' },
    { label: 'Name (Z to A)', value: 'name', direction: 'desc' }
  ];
  const qualityHighestSort = SORT_OPTIONS.find(s => s.value === 'quality' && s.direction === 'desc') || SORT_OPTIONS[0];
  const [sortOption, setSortOption] = useState(qualityHighestSort);
  const [filteredHotspots, setFilteredHotspots] = useState<Hotspot[]>([]);

  // Load birds when the component mounts or search radius changes
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

  // Load hotspots
  const loadHotspots = useCallback(async () => {
    if (!location) return;
    
    setIsLoadingHotspots(true);
    setError(null);
    
    try {
      const hotspotsData = await fetchHotspots(location, searchRadius);
      setHotspots(hotspotsData);
    } catch (err) {
      console.error('Error loading hotspots:', err);
      setError('Failed to load birding hotspots');
    } finally {
      setIsLoadingHotspots(false);
    }
  }, [location, searchRadius]);

  // Apply filters for hotspots
  const applyHotspotFilters = useCallback(() => {
    if (!hotspots.length || !location) {
      setFilteredHotspots([]);
      return;
    }
    
    // Step 1: Filter by quality
    let filtered = [...hotspots].filter(hotspot => {
      const speciesCount = hotspot.numSpeciesAllTime || 0;
      return speciesCount >= qualityFilter.minSpecies;
    });
    
    // Step 2: Sort the results
    filtered.sort((a, b) => {
      if (sortOption.value === 'quality') {
        const aQuality = a.numSpeciesAllTime || 0;
        const bQuality = b.numSpeciesAllTime || 0;
        
        // For quality, higher numbers are better
        return sortOption.direction === 'desc' 
          ? bQuality - aQuality  // Highest first
          : aQuality - bQuality; // Lowest first
      }
      
      if (sortOption.value === 'distance') {
        const aDist = calculateDistance(location.latitude, location.longitude, a.latitude, a.longitude);
        const bDist = calculateDistance(location.latitude, location.longitude, b.latitude, b.longitude);
        
        const aValue = aDist ? parseFloat(aDist) : 9999;
        const bValue = bDist ? parseFloat(bDist) : 9999;
        
        return sortOption.direction === 'asc'
          ? aValue - bValue  // Nearest first
          : bValue - aValue; // Farthest first
      }
      
      if (sortOption.value === 'name') {
        // For names, alphabetical order
        return sortOption.direction === 'asc'
          ? a.locName.localeCompare(b.locName)  // A to Z
          : b.locName.localeCompare(a.locName); // Z to A
      }
      
      return 0;
    });
    
    // Step 3: Apply limit if set
    if (hotspotsLimit !== null) {
      filtered = filtered.slice(0, hotspotsLimit);
    }
    
    setFilteredHotspots(filtered);
  }, [hotspots, qualityFilter, sortOption, location, hotspotsLimit]);

  // Calculate distance between two coordinates in miles
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance.toFixed(1);
  };
  
  // Get a quality indicator based on species count
  const getHotspotQuality = (speciesCount?: number) => {
    if (!speciesCount) return null;
    
    if (speciesCount > 200) return { label: 'Exceptional', color: '#2D8B4F' };
    if (speciesCount > 100) return { label: 'Excellent', color: '#4CAF50' };
    if (speciesCount > 50) return { label: 'Very Good', color: '#8BC34A' };
    if (speciesCount > 25) return { label: 'Good', color: '#CDDC39' };
    return { label: 'Moderate', color: '#FFC107' };
  };

  // Initial load
  useEffect(() => {
    loadBirds();
  }, [loadBirds]);

  // Reset auto-expand flag when search radius changes manually
  useEffect(() => {
    setHasAutoExpanded(false);
  }, [searchRadius]);

  // Load hotspots when location or search radius changes
  useEffect(() => {
    if (location) {
      loadHotspots();
    }
  }, [location, searchRadius, loadHotspots]);

  // Apply hotspot filters when hotspots or filter settings change
  useEffect(() => {
    applyHotspotFilters();
  }, [hotspots, qualityFilter, sortOption, location, hotspotsLimit, applyHotspotFilters]);

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
    if (viewMode === 'birds') {
      setIsLoading(true);
      loadBirds(searchRadius, false);
    } else {
      setIsLoadingHotspots(true);
      loadHotspots();
    }
  };

  // Toggle between birds and hotspots view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'birds' ? 'hotspots' : 'birds');
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  // Handle hotspot press
  const handleHotspotPress = (hotspot: Hotspot) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    
    setSelectedHotspot(hotspot);
  };
  
  // Handle close hotspot details
  const handleCloseHotspotDetails = () => {
    setSelectedHotspot(null);
  };
  
  // Open in maps
  const openInMaps = (lat: number, lng: number, name: string) => {
    if (Platform.OS === 'web') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
      return;
    }
    
    let url;
    if (Platform.OS === 'ios') {
      url = `maps:?ll=${lat},${lng}&q=${encodeURIComponent(name)}`;
    } else {
      url = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`;
    }
    
    Linking.openURL(url);
  };
  
  // Open eBird hotspot
  const openEBirdHotspot = (locId: string) => {
    const url = `https://ebird.org/hotspot/${locId}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };
  
  // Reset hotspot filters
  const resetHotspotFilters = () => {
    setQualityFilter(QUALITY_LEVELS[0]);
    setSortOption(qualityHighestSort); // Keep the default sort
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  // Toggle info tooltip
  const toggleInfoTooltip = () => {
    setShowInfoTooltip(!showInfoTooltip);
    
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
    if (location && !isLoading && !error && (viewMode === 'birds' ? displayedBirds.length > 0 : filteredHotspots.length > 0)) {
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
                  onPress={toggleViewMode}
                >
                  <View style={styles.footerButtonContent}>
                    {viewMode === 'birds' ? (
                      <>
                        <Map size={20} color="#FFFFFF" />
                        <Text style={styles.footerButtonText}>
                          Hotspots
                        </Text>
                      </>
                    ) : (
                      <>
                        <Bird size={20} color="#FFFFFF" />
                        <Text style={styles.footerButtonText}>
                          Birds
                        </Text>
                      </>
                    )}
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

  const isStillLoading = viewMode === 'birds' 
    ? (isLoading || isLoadingImages || !isFullyLoaded)
    : isLoadingHotspots;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top info bar */}
      {!isStillLoading && (
        <View style={styles.topInfoBar}>
          {viewMode === 'birds' && displayedBirds.length > 0 && (
            <Text style={styles.topInfoText}>
              Top {displayedBirds.length} Birds within {searchRadius} miles
            </Text>
          )}
          {viewMode === 'hotspots' && filteredHotspots.length > 0 && (
            <View style={styles.topInfoBarHotspots}>
              <Text style={styles.topInfoText}>
                Top {filteredHotspots.length} Hotspots within {searchRadius} miles
              </Text>
              <Pressable 
                style={styles.infoButton}
                onPress={toggleInfoTooltip}
              >
                <Info size={16} color="#2D3F1F" />
              </Pressable>
            </View>
          )}
        </View>
      )}
      
      {/* Info tooltip for hotspots */}
      {viewMode === 'hotspots' && showInfoTooltip && (
        <View style={styles.infoTooltipContainer}>
          <View style={styles.infoTooltip}>
            <Text style={styles.infoTooltipText}>
              Hotspots are locations where birders frequently report sightings
            </Text>
            <Pressable 
              style={styles.closeTooltipButton}
              onPress={toggleInfoTooltip}
            >
              <X size={14} color="#666" />
            </Pressable>
          </View>
        </View>
      )}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          // Add extra padding at the bottom for the footer
          location && !isStillLoading && !error && 
          (viewMode === 'birds' ? displayedBirds.length > 0 : filteredHotspots.length > 0) && 
          styles.scrollContentWithFooter
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => viewMode === 'birds' ? loadBirds() : loadHotspots()} 
            colors={['#2D3F1F']}
            tintColor="#2D3F1F"
          />
        }
      >
        {/* Birds View */}
        {viewMode === 'birds' && (
          isStillLoading ? (
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
          )
        )}
        
        {/* Hotspots View */}
        {viewMode === 'hotspots' && (
          isLoadingHotspots ? (
            <View style={styles.loadingContainer}>
              <RotatingLoadingImage 
                imageUrl='https://i.ibb.co/Pv5xKZdq/fledgy.png'
                size={120}
              />
              <Text style={styles.loadingText}>Finding nearby hotspots...</Text>
            </View>
          ) : filteredHotspots.length === 0 ? (
            <View style={styles.noHotspotsContainer}>
              <AlertCircle size={40} color="#666" />
              <Text style={styles.noHotspotsText}>No hotspots match your filters</Text>
              <Text style={styles.noHotspotsSubtext}>Try adjusting your filters or search radius</Text>
              
              <Pressable 
                style={styles.resetFiltersButton}
                onPress={resetHotspotFilters}
              >
                <Text style={styles.resetFiltersText}>Reset Filters</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.hotspotListContainer}>
              {filteredHotspots.map((hotspot) => {
                const distance = location ? 
                  calculateDistance(
                    location.latitude, 
                    location.longitude, 
                    hotspot.latitude, 
                    hotspot.longitude
                  ) : null;
                
                const quality = getHotspotQuality(hotspot.numSpeciesAllTime);
                
                return (
                  <Pressable
                    key={hotspot.locId}
                    style={({ pressed }) => [
                      styles.hotspotItem,
                      pressed && styles.hotspotItemPressed
                    ]}
                    onPress={() => handleHotspotPress(hotspot)}
                  >
                    <View style={styles.hotspotItemContent}>
                      <View style={styles.hotspotHeader}>
                        <View style={styles.hotspotIconContainer}>
                          <MapPin size={20} color="#2D3F1F" />
                        </View>
                        <View style={styles.hotspotInfo}>
                          <Text style={styles.hotspotName}>{hotspot.locName}</Text>
                        </View>
                        <ChevronRight size={18} color="#666" />
                      </View>
                      
                      <View style={styles.hotspotDetails}>
                        <View style={styles.hotspotDetailRow}>
                          {hotspot.numSpeciesAllTime && (
                            <View style={styles.hotspotDetailItem}>
                              <Bird size={14} color="#666" />
                              <Text style={styles.hotspotDetailText}>
                                {hotspot.numSpeciesAllTime} species
                              </Text>
                            </View>
                          )}
                          
                          {hotspot.latestObsDt && (
                            <View style={styles.hotspotDetailItem}>
                              <Calendar size={14} color="#666" />
                              <Text style={styles.hotspotDetailText}>
                                Last: {new Date(hotspot.latestObsDt).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                          
                          {distance && (
                            <View style={styles.hotspotDetailItem}>
                              <MapPin size={14} color="#666" />
                              <Text style={styles.hotspotDetailText}>
                                {distance} miles away
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        {quality && (
                          <View style={[styles.qualityBadge, { backgroundColor: quality.color }]}>
                            <Text style={styles.qualityText}>{quality.label}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )
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
                viewMode === 'birds' ? (
                  <FilterSettings onClose={closeModal} showResultsLimit={true} />
                ) : (
                  <View style={styles.filterModalContent}>
                    <View style={styles.filterModalHeader}>
                      <Text style={styles.filterModalTitle}>Filter Hotspots</Text>
                      <Pressable 
                        style={styles.filterModalCloseButton}
                        onPress={closeModal}
                      >
                        <X size={24} color="#2D3F1F" />
                      </Pressable>
                    </View>
                    
                    <ScrollView 
                      style={styles.filterModalScroll}
                      contentContainerStyle={styles.filterModalScrollContent}
                      showsVerticalScrollIndicator={false}
                    >
                      {/* Sort Options - Moved to the top */}
                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Sort By</Text>
                        <Text style={styles.filterSectionDescription}>
                          Choose how to order the hotspots
                        </Text>
                        
                        <View style={styles.filterOptions}>
                          {SORT_OPTIONS.map((option, index) => (
                            <Pressable
                              key={index}
                              style={({ pressed }) => [
                                styles.filterOption,
                                sortOption === option && styles.filterOptionSelected,
                                pressed && styles.filterOptionPressed
                              ]}
                              onPress={() => setSortOption(option)}
                            >
                              {sortOption === option ? (
                                <LinearGradient
                                  colors={['#2D3F1F', '#3A5129']}
                                  style={styles.filterOptionGradient}
                                >
                                  <View style={styles.filterOptionContent}>
                                    <Text style={styles.filterOptionTextSelected}>
                                      {option.label}
                                    </Text>
                                    <Check size={16} color="#FFFFFF" style={styles.filterOptionCheck} />
                                  </View>
                                </LinearGradient>
                              ) : (
                                <View style={styles.filterOptionContent}>
                                  <Text style={styles.filterOptionText}>
                                    {option.label}
                                  </Text>
                                </View>
                              )}
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      
                      {/* Show Limit */}
                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Show</Text>
                        <Text style={styles.filterSectionDescription}>
                          Limit the number of hotspots displayed in the list
                        </Text>
                        
                        <View style={styles.filterOptions}>
                          {[
                            { label: '5 hotspots', value: 5 },
                            { label: '10 hotspots', value: 10 },
                            { label: '25 hotspots', value: 25 },
                            { label: 'All hotspots', value: null }
                          ].map((option, index) => (
                            <Pressable
                              key={index}
                              style={({ pressed }) => [
                                styles.filterOption,
                                hotspotsLimit === option.value && styles.filterOptionSelected,
                                pressed && styles.filterOptionPressed
                              ]}
                              onPress={() => useBirdsStore.setState({ hotspotsLimit: option.value })}
                            >
                              {hotspotsLimit === option.value ? (
                                <LinearGradient
                                  colors={['#2D3F1F', '#3A5129']}
                                  style={styles.filterOptionGradient}
                                >
                                  <View style={styles.filterOptionContent}>
                                    <Text style={styles.filterOptionTextSelected}>
                                      {option.label}
                                    </Text>
                                    <Check size={16} color="#FFFFFF" style={styles.filterOptionCheck} />
                                  </View>
                                </LinearGradient>
                              ) : (
                                <View style={styles.filterOptionContent}>
                                  <Text style={styles.filterOptionText}>
                                    {option.label}
                                  </Text>
                                </View>
                              )}
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      
                      {/* Quality Filter */}
                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Quality</Text>
                        <Text style={styles.filterSectionDescription}>
                          Filter by the number of species recorded at the hotspot
                        </Text>
                        
                        <View style={styles.filterOptions}>
                          {QUALITY_LEVELS.map((option, index) => (
                            <Pressable
                              key={index}
                              style={({ pressed }) => [
                                styles.filterOption,
                                qualityFilter === option && styles.filterOptionSelected,
                                pressed && styles.filterOptionPressed
                              ]}
                              onPress={() => setQualityFilter(option)}
                            >
                              {qualityFilter === option ? (
                                <LinearGradient
                                  colors={['#2D3F1F', '#3A5129']}
                                  style={styles.filterOptionGradient}
                                >
                                  <View style={styles.filterOptionContent}>
                                    <Text style={styles.filterOptionTextSelected}>
                                      {option.label}
                                    </Text>
                                    {option.minSpecies > 0 && (
                                      <Text style={styles.filterOptionDescriptionSelected}>
                                        {option.minSpecies}+ species
                                      </Text>
                                    )}
                                    <Check size={16} color="#FFFFFF" style={styles.filterOptionCheck} />
                                  </View>
                                </LinearGradient>
                              ) : (
                                <View style={styles.filterOptionContent}>
                                  <Text style={styles.filterOptionText}>
                                    {option.label}
                                  </Text>
                                  {option.minSpecies > 0 && (
                                    <Text style={styles.filterOptionDescription}>
                                      {option.minSpecies}+ species
                                    </Text>
                                  )}
                                </View>
                              )}
                            </Pressable>
                          ))}
                        </View>
                      </View>
                      
                      {/* Reset Button */}
                      <View style={styles.resetButtonContainer}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.resetButton,
                            pressed && styles.resetButtonPressed
                          ]}
                          onPress={resetHotspotFilters}
                        >
                          <Text style={styles.resetButtonText}>Reset All Filters</Text>
                        </Pressable>
                      </View>
                    </ScrollView>
                  </View>
                )
              )}
            </Animated.View>
          </Animated.View>
        </SafeAreaView>
      </Modal>

      {/* Hotspot Details Modal */}
      {selectedHotspot && (
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsContainer}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>{selectedHotspot.locName}</Text>
              <Pressable 
                style={styles.detailsCloseButton}
                onPress={handleCloseHotspotDetails}
              >
                <X size={20} color="#2D3F1F" />
              </Pressable>
            </View>
            
            <View style={styles.detailsContent}>
              <View style={styles.detailsInfo}>
                {selectedHotspot.numSpeciesAllTime && (
                  <View style={styles.detailsInfoItem}>
                    <Bird size={16} color="#2D3F1F" />
                    <Text style={styles.detailsInfoItemText}>
                      {selectedHotspot.numSpeciesAllTime} species recorded
                    </Text>
                  </View>
                )}
                
                {selectedHotspot.latestObsDt && (
                  <View style={styles.detailsInfoItem}>
                    <Calendar size={16} color="#2D3F1F" />
                    <Text style={styles.detailsInfoItemText}>
                      Last observation: {new Date(selectedHotspot.latestObsDt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.detailsActions}>
                <Pressable 
                  style={styles.detailsActionButton}
                  onPress={() => openInMaps(
                    selectedHotspot.latitude, 
                    selectedHotspot.longitude, 
                    selectedHotspot.locName
                  )}
                >
                  <MapPin size={18} color="#2D3F1F" />
                  <Text style={styles.detailsActionText}>Directions</Text>
                </Pressable>
                
                <Pressable 
                  style={styles.detailsActionButton}
                  onPress={() => openEBirdHotspot(selectedHotspot.locId)}
                >
                  <ExternalLink size={18} color="#2D3F1F" />
                  <Text style={styles.detailsActionText}>View on eBird</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      )}
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
  topInfoBarHotspots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  topInfoText: {
    fontSize: 14,
    color: '#2D3F1F',
    fontWeight: '500',
  },
  infoButton: {
    padding: 4,
  },
  // Tooltip container positioned absolutely over the entire screen
  infoTooltipContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000, // Very high z-index to ensure it's above everything
    pointerEvents: 'none', // Allow touches to pass through except for the tooltip itself
  },
  infoTooltip: {
    position: 'absolute',
    top: 50, // Position below the top bar
    right: 16,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'flex-start',
    pointerEvents: 'auto', // Make the tooltip itself interactive
  },
  infoTooltipText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  closeTooltipButton: {
    padding: 4,
    marginLeft: 8,
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
  // Hotspot styles
  hotspotListContainer: {
    padding: 16,
    paddingTop: 8,
  },
  hotspotItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E2DE',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  hotspotItemPressed: {
    backgroundColor: '#F0F0F0',
  },
  hotspotItemContent: {
    gap: 12,
  },
  hotspotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotspotIconContainer: {
    marginRight: 12,
  },
  hotspotInfo: {
    flex: 1,
  },
  hotspotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3F1F',
  },
  hotspotDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E1E2DE',
  },
  hotspotDetailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    flex: 1,
  },
  hotspotDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hotspotDetailText: {
    fontSize: 12,
    color: '#666',
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  noHotspotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  noHotspotsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3F1F',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noHotspotsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetFiltersButton: {
    backgroundColor: '#2D3F1F',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  resetFiltersText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  // Hotspot details modal
  detailsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 20, // Higher than footer
  },
  detailsContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3F1F',
    flex: 1,
  },
  detailsCloseButton: {
    padding: 4,
  },
  detailsContent: {
    flex: 1,
  },
  detailsInfo: {
    marginBottom: 16,
  },
  detailsInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailsInfoItemText: {
    fontSize: 14,
    color: '#333',
  },
  detailsActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailsActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F6F3',
    padding: 12,
    borderRadius: 8,
  },
  detailsActionText: {
    fontSize: 14,
    color: '#2D3F1F',
    fontWeight: '500',
  },
  // Filter modal styles
  filterModalContent: {
    flex: 1,
    width: '100%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3F1F',
  },
  filterModalCloseButton: {
    padding: 8,
    borderRadius: 20,
  },
  filterModalScroll: {
    flex: 1,
  },
  filterModalScrollContent: {
    paddingBottom: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 8,
  },
  filterSectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    borderRadius: 12,
    backgroundColor: '#F5F6F3',
    borderWidth: 1,
    borderColor: '#E1E2DE',
    overflow: 'hidden',
  },
  filterOptionSelected: {
    borderColor: '#2D3F1F',
  },
  filterOptionPressed: {
    opacity: 0.8,
  },
  filterOptionGradient: {
    width: '100%',
    padding: 16,
  },
  filterOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#2D3F1F',
    fontWeight: '500',
    flex: 1,
  },
  filterOptionTextSelected: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  filterOptionDescription: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  filterOptionDescriptionSelected: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 8,
  },
  filterOptionCheck: {
    marginLeft: 'auto',
  },
  resetButtonContainer: {
    alignItems: 'center',
    marginTop: 16,
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
  resetButtonText: {
    fontSize: 16,
    color: '#2D3F1F',
    fontWeight: '500',
  },
});