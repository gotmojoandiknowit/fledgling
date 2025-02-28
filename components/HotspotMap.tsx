import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { X, MapPin, ExternalLink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { fetchHotspots, fetchHotspotDetails } from '@/utils/api';
import { Hotspot } from '@/types/birds';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

interface HotspotMapProps {
  visible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function HotspotMap({ visible, onClose }: HotspotMapProps) {
  const { location, searchRadius, hotspots, setHotspots, isLoadingHotspots, setIsLoadingHotspots } = useBirdsStore();
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [hotspotDetails, setHotspotDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load hotspots when the map becomes visible
  useEffect(() => {
    if (visible && location) {
      loadHotspots();
    }
  }, [visible, location, searchRadius]);
  
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
  
  // For web, we'll use an embedded Google Maps iframe
  // For native, we'd use react-native-maps, but since we can't install custom packages,
  // we'll show a static map image with pins
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <StatusBar style="light" />
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nearby Birding Hotspots</Text>
            <Pressable 
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <X size={24} color="#2D3F1F" />
            </Pressable>
          </View>
          
          <View style={styles.mapContainer}>
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
              <>
                {Platform.OS === 'web' ? (
                  // Web implementation with iframe
                  <View style={styles.webMapContainer}>
                    <iframe
                      src={`https://www.google.com/maps/embed/v1/search?key=AIzaSyBdsft_C-IXRYLVHAMOgbRkAXwGm4NRcNs&q=birding+hotspots+near+${location?.latitude},${location?.longitude}&zoom=10`}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </View>
                ) : (
                  // Native implementation with static map and pins
                  <View style={styles.staticMapContainer}>
                    <Image
                      source={{ uri: `https://maps.googleapis.com/maps/api/staticmap?center=${location?.latitude},${location?.longitude}&zoom=10&size=600x400&maptype=roadmap&key=AIzaSyBdsft_C-IXRYLVHAMOgbRkAXwGm4NRcNs` }}
                      style={styles.staticMap}
                    />
                    
                    {/* Hotspot pins would be positioned absolutely here */}
                    {/* Since we can't calculate exact positions without the map SDK, we'll show a list instead */}
                  </View>
                )}
                
                <View style={styles.hotspotListContainer}>
                  <Text style={styles.hotspotListTitle}>
                    {hotspots.length} Hotspots within {searchRadius} miles
                  </Text>
                  
                  <View style={styles.hotspotList}>
                    {hotspots.slice(0, 10).map((hotspot) => (
                      <Pressable
                        key={hotspot.locId}
                        style={({ pressed }) => [
                          styles.hotspotItem,
                          pressed && styles.hotspotItemPressed
                        ]}
                        onPress={() => handleHotspotPress(hotspot)}
                      >
                        <View style={styles.hotspotItemContent}>
                          <View style={styles.hotspotIconContainer}>
                            <MapPin size={20} color="#2D3F1F" />
                          </View>
                          <View style={styles.hotspotInfo}>
                            <Text style={styles.hotspotName}>{hotspot.locName}</Text>
                            <Text style={styles.hotspotLocation}>
                              {hotspot.subnational1Code.split('-')[1]}, {hotspot.countryCode}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    ))}
                    
                    {hotspots.length > 10 && (
                      <Text style={styles.moreHotspotsText}>
                        + {hotspots.length - 10} more hotspots
                      </Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
          
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
                        <Text style={styles.detailsInfoText}>
                          {selectedHotspot.subnational1Code.split('-')[1]}, {selectedHotspot.countryCode}
                        </Text>
                        
                        {selectedHotspot.numSpeciesAllTime && (
                          <Text style={styles.detailsInfoText}>
                            {selectedHotspot.numSpeciesAllTime} species recorded
                          </Text>
                        )}
                        
                        {selectedHotspot.latestObsDt && (
                          <Text style={styles.detailsInfoText}>
                            Last observation: {new Date(selectedHotspot.latestObsDt).toLocaleDateString()}
                          </Text>
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
                      
                      {hotspotDetails && hotspotDetails.length > 0 && (
                        <View style={styles.recentSightingsContainer}>
                          <Text style={styles.recentSightingsTitle}>Recent Sightings</Text>
                          
                          <View style={styles.sightingsList}>
                            {hotspotDetails.slice(0, 5).map((sighting: any, index: number) => (
                              <View key={index} style={styles.sightingItem}>
                                <Text style={styles.sightingName}>{sighting.comName}</Text>
                                <Text style={styles.sightingDate}>
                                  {new Date(sighting.obsDt).toLocaleDateString()}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    ...Platform.select({
      web: {
        maxHeight: 700,
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
        borderRadius: 20,
        marginBottom: 20,
        maxHeight: '90%',
      }
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E2DE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3F1F',
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
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
  webMapContainer: {
    flex: 1,
    height: '60%',
  },
  staticMapContainer: {
    height: '60%',
    width: '100%',
  },
  staticMap: {
    width: '100%',
    height: '100%',
  },
  hotspotListContainer: {
    padding: 16,
    backgroundColor: '#F5F6F3',
    borderTopWidth: 1,
    borderTopColor: '#E1E2DE',
    maxHeight: '40%',
  },
  hotspotListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 12,
  },
  hotspotList: {
    gap: 8,
  },
  hotspotItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E1E2DE',
  },
  hotspotItemPressed: {
    backgroundColor: '#F0F0F0',
  },
  hotspotItemContent: {
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
    fontWeight: '500',
    color: '#2D3F1F',
    marginBottom: 4,
  },
  hotspotLocation: {
    fontSize: 14,
    color: '#666',
  },
  moreHotspotsText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  detailsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  detailsContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
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
  detailsInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
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
  recentSightingsContainer: {
    marginTop: 8,
  },
  recentSightingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 12,
  },
  sightingsList: {
    gap: 8,
  },
  sightingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E2DE',
  },
  sightingName: {
    fontSize: 14,
    color: '#2D3F1F',
  },
  sightingDate: {
    fontSize: 12,
    color: '#666',
  },
});