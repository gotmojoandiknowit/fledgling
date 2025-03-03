import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Dimensions, ActivityIndicator, ScrollView, Linking, SafeAreaView, Modal, Animated } from 'react-native';
import { X, MapPin, ExternalLink, Calendar, Bird, Info, ChevronRight, AlertCircle, Eye, Filter, SortAsc, SortDesc, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { fetchHotspots, fetchHotspotDetails } from '@/utils/api';
import { Hotspot } from '@/types/birds';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useNavigation } from 'expo-router';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { RadiusSettings } from '@/components/RadiusSettings';

const { width, height } = Dimensions.get('window');

// Quality levels for filtering
const QUALITY_LEVELS = [
  { label: 'All', minSpecies: 0 },
  { label: 'Moderate', minSpecies: 25 },
  { label: 'Good', minSpecies: 50 },
  { label: 'Very Good', minSpecies: 100 },
  { label: 'Excellent', minSpecies: 200 }
];

// Sort options
const SORT_OPTIONS = [
  { label: 'Quality (highest first)', value: 'quality', direction: 'desc' },
  { label: 'Quality (lowest first)', value: 'quality', direction: 'asc' },
  { label: 'Distance (nearest first)', value: 'distance', direction: 'asc' },
  { label: 'Distance (farthest first)', value: 'distance', direction: 'desc' },
  { label: 'Name (A to Z)', value: 'name', direction: 'asc' },
  { label: 'Name (Z to A)', value: 'name', direction: 'desc' }
];

// Results limit options
const HOTSPOTS_LIMIT_OPTIONS = [
  { label: '5 hotspots', value: 5 },
  { label: '10 hotspots', value: 10 },
  { label: '25 hotspots', value: 25 },
  { label: 'All hotspots', value: null }
];

export default function HotspotsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { 
    location, 
    searchRadius, 
    setSearchRadius, 
    hotspots, 
    setHotspots, 
    isLoadingHotspots, 
    setIsLoadingHotspots,
    hotspotsLimit,
    setHotspotsLimit
  } = useBirdsStore();
  
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [hotspotDetails, setHotspotDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  
  // Filter state
  // Set default quality filter to All (show all results)
  const allQualityFilter = QUALITY_LEVELS[0]; // "All" is the first option
  const [qualityFilter, setQualityFilter] = useState(allQualityFilter);
  // Set default sort to Quality (highest first)
  const qualityHighestSort = SORT_OPTIONS.find(s => s.value === 'quality' && s.direction === 'desc') || SORT_OPTIONS[0];
  const [sortOption, setSortOption] = useState(qualityHighestSort);
  const [filteredHotspots, setFilteredHotspots] = useState<Hotspot[]>([]);
  
  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [activeModal, setActiveModal] = useState<'radius' | 'filter' | null>(null);
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(height)).current;
  
  // Load hotspots when the page loads or search radius changes
  useEffect(() => {
    if (location) {
      loadHotspots();
    }
  }, [location, searchRadius]);
  
  // Apply filters whenever hotspots or filter settings change
  useEffect(() => {
    applyFilters();
  }, [hotspots, qualityFilter, sortOption, location, hotspotsLimit]);
  
  const loadHotspots = async () => {
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
  };
  
  const applyFilters = () => {
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
  };
  
  const loadHotspotDetails = async (hotspot: Hotspot) => {
    setSelectedHotspot(hotspot);
    setIsLoadingDetails(true);
    setHotspotDetails(null);
    
    try {
      const details = await fetchHotspotDetails(hotspot.locId);
      setHotspotDetails(details);
    } catch (err) {
      console.error('Error loading hotspot details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  const handleHotspotPress = (hotspot: Hotspot) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    
    loadHotspotDetails(hotspot);
  };
  
  const handleCloseDetails = () => {
    setSelectedHotspot(null);
    setHotspotDetails(null);
  };
  
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
  
  const openEBirdHotspot = (locId: string) => {
    const url = `https://ebird.org/hotspot/${locId}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

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
    loadHotspots();
  };
  
  const resetFilters = () => {
    setQualityFilter(QUALITY_LEVELS[0]);
    setSortOption(qualityHighestSort); // Keep the default sort
    setHotspotsLimit(10); // Reset to default of 10 hotspots (changed from 5)
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };
  
  // Navigate back to main birds page
  const navigateToMainPage = () => {
    // Use replace instead of push to avoid stacking navigation history
    router.replace('/');
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  // Toggle info tooltip
  const toggleInfoTooltip = () => {
    setShowInfoTooltip(!showInfoTooltip);
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        {/* Top info bar */}
        <View style={styles.topInfoBar}>
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
        
        {/* Info tooltip - moved outside of the topInfoBar to ensure it's above all content */}
        {showInfoTooltip && (
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
        
        {isLoadingHotspots ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2D3F1F" />
            <Text style={styles.loadingText}>Loading hotspots...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable 
              style={styles.retryButton}
              onPress={loadHotspots}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.hotspotListContainer}>
            <ScrollView 
              style={styles.hotspotList}
              contentContainerStyle={[
                styles.hotspotListContent,
                // Add extra padding at the bottom for the footer
                location && !isLoadingHotspots && !error && styles.hotspotListContentWithFooter
              ]}
              showsVerticalScrollIndicator={false}
            >
              {filteredHotspots.length > 0 ? (
                filteredHotspots.map((hotspot) => {
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
                })
              ) : (
                <View style={styles.noHotspotsContainer}>
                  <AlertCircle size={40} color="#666" />
                  <Text style={styles.noHotspotsText}>No hotspots match your filters</Text>
                  <Text style={styles.noHotspotsSubtext}>Try adjusting your filters or search radius</Text>
                  
                  <Pressable 
                    style={styles.resetFiltersButton}
                    onPress={resetFilters}
                  >
                    <Text style={styles.resetFiltersText}>Reset Filters</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        )}
        
        {/* Footer Bar */}
        {location && !isLoadingHotspots && !error && (
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
                    onPress={navigateToMainPage}
                  >
                    <View style={styles.footerButtonContent}>
                      <Bird size={20} color="#FFFFFF" />
                      <Text style={styles.footerButtonText}>
                        Birds
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </SafeAreaView>
            </LinearGradient>
          </View>
        )}
        
        {/* Hotspot Details Modal */}
        {selectedHotspot && (
          <View style={styles.detailsOverlay}>
            <View style={styles.detailsContainer}>
              <View style={styles.detailsHeader}>
                <Text style={styles.detailsTitle}>{selectedHotspot.locName}</Text>
                <Pressable 
                  style={styles.detailsCloseButton}
                  onPress={handleCloseDetails}
                >
                  <X size={20} color="#2D3F1F" />
                </Pressable>
              </View>
              
              <View style={styles.detailsContent}>
                {isLoadingDetails ? (
                  <View style={styles.detailsLoadingContainer}>
                    <ActivityIndicator size="small" color="#2D3F1F" />
                    <Text style={styles.detailsLoadingText}>Loading hotspot details...</Text>
                  </View>
                ) : (
                  <>
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
                  </>
                )}
              </View>
            </View>
          </View>
        )}
        
        {/* Filter and Radius Modals */}
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
                          {HOTSPOTS_LIMIT_OPTIONS.map((option, index) => (
                            <Pressable
                              key={index}
                              style={({ pressed }) => [
                                styles.filterOption,
                                hotspotsLimit === option.value && styles.filterOptionSelected,
                                pressed && styles.filterOptionPressed
                              ]}
                              onPress={() => setHotspotsLimit(option.value)}
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
                          onPress={resetFilters}
                        >
                          <Text style={styles.resetButtonText}>Reset All Filters</Text>
                        </Pressable>
                      </View>
                    </ScrollView>
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F3',
  },
  content: {
    flex: 1,
    position: 'relative',
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
    fontSize: 14, // Exactly matching the birds page
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#E63946',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2D3F1F',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  hotspotListContainer: {
    flex: 1,
  },
  hotspotList: {
    flex: 1,
  },
  hotspotListContent: {
    padding: 16,
    paddingTop: 8,
  },
  hotspotListContentWithFooter: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80, // Extra padding for footer
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
  detailsLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  detailsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
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