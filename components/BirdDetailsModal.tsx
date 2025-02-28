import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform, ScrollView, Linking, ActivityIndicator, Share } from 'react-native';
import { Image } from 'expo-image';
import { X, ExternalLink, MapPin, Calendar, Info, Eye, Volume2, Share2, ChevronLeft, ChevronRight, Feather, Ruler, AlertTriangle } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { BirdObservation } from '@/types/birds';
import { fetchBirdInfo } from '@/utils/bird-info';
import { fetchBirdAudio } from '@/utils/bird-audio';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { AudioPlayer } from './AudioPlayer';
import { getBirdIdentificationInfo } from '@/data/bird-identification';

interface BirdDetailsModalProps {
  visible: boolean;
  bird: BirdObservation;
  imageUrl: string;
  onClose: () => void;
}

export function BirdDetailsModal({ visible, bird, imageUrl, onClose }: BirdDetailsModalProps) {
  const [birdInfo, setBirdInfo] = useState<any>(null);
  const [birdAudio, setBirdAudio] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { birdImages } = useBirdsStore();
  
  // Get identification info for this bird
  const identificationInfo = getBirdIdentificationInfo(bird.speciesCode);
  
  // Get all images for this bird
  const allBirdImages = birdImages[bird.speciesCode] || [];
  
  // Use the current image from the array or fallback to the provided imageUrl
  const currentImage = allBirdImages.length > 0 
    ? allBirdImages[currentImageIndex] 
    : imageUrl;

  // Calculate likelihood color based on percentage
  const getLikelihoodColor = (likelihood: number) => {
    if (likelihood >= 80) return '#2D8B4F'; // High likelihood - green
    if (likelihood >= 50) return '#F9A825'; // Medium likelihood - amber
    return '#E67C73'; // Low likelihood - red
  };

  // Get likelihood label based on percentage
  const getLikelihoodLabel = (likelihood: number) => {
    if (likelihood >= 80) return 'Very likely';
    if (likelihood >= 50) return 'Likely';
    if (likelihood >= 30) return 'Possible';
    return 'Uncommon';
  };

  useEffect(() => {
    if (visible) {
      loadBirdInfo();
      loadBirdAudio();
      setCurrentImageIndex(0);
      
      // Trigger haptic feedback when modal opens
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [visible, bird.speciesCode]);

  const loadBirdInfo = async () => {
    if (!bird) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const info = await fetchBirdInfo(bird.sciName, bird.comName);
      setBirdInfo(info);
    } catch (err) {
      console.error('Error loading bird info:', err);
      setError('Could not load additional information');
    } finally {
      setLoading(false);
    }
  };
  
  const loadBirdAudio = async () => {
    if (!bird) return;
    
    setLoadingAudio(true);
    
    try {
      const audioData = await fetchBirdAudio(bird.sciName);
      setBirdAudio(audioData);
    } catch (err) {
      console.error('Error loading bird audio:', err);
      // Don't set error state for audio - we'll just show no audio available
    } finally {
      setLoadingAudio(false);
    }
  };

  const openEBirdSpeciesPage = () => {
    const url = `https://ebird.org/species/${bird.speciesCode}`;
    Linking.openURL(url);
    
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  const openWikipediaPage = () => {
    if (birdInfo?.wikipediaUrl) {
      Linking.openURL(birdInfo.wikipediaUrl);
      
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };

  const openMapLocation = () => {
    const { lat, lng } = bird;
    
    if (Platform.OS === 'web') {
      const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(googleMapsUrl, '_blank');
      return;
    }
    
    const label = bird.locName || "Bird Sighting Location";
    let url;
    
    if (Platform.OS === 'ios') {
      url = `maps:?ll=${lat},${lng}&q=${label}`;
    } else {
      // Android
      url = `geo:${lat},${lng}?q=${lat},${lng}(${label})`;
    }

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
        Haptics.selectionAsync();
      } else {
        // Fallback to Google Maps as web URL
        const webUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        Linking.openURL(webUrl);
      }
    });
  };
  
  const openAudioPage = () => {
    if (birdInfo?.audioUrl) {
      Linking.openURL(birdInfo.audioUrl);
      
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };
  
  const shareBird = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const message = `Check out this ${bird.comName} (${bird.sciName}) I spotted using Fledgling!`;
      const url = `https://ebird.org/species/${bird.speciesCode}`;
      
      if (Platform.OS === 'web') {
        // Web implementation using navigator.share if available
        if (navigator.share) {
          await navigator.share({
            title: `Fledgling: ${bird.comName}`,
            text: message,
            url: url
          });
        } else {
          // Fallback for browsers without Web Share API
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`, '_blank');
        }
      } else {
        // Native implementation
        await Share.share({
          message: `${message}
${url}`,
          url: url,
          title: `Fledgling: ${bird.comName}`
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };
  
  const goToNextImage = () => {
    if (currentImageIndex < allBirdImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };

  // Ensure likelihood is a valid number
  const likelihood = isNaN(bird.likelihood) ? 0 : bird.likelihood;
  const likelihoodColor = getLikelihoodColor(likelihood);
  const likelihoodLabel = getLikelihoodLabel(likelihood);

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
            <Pressable 
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <X size={24} color="#2D3F1F" />
            </Pressable>
            
            <Text style={styles.headerTitle}>Bird Details</Text>
            
            <Pressable 
              style={styles.externalLinkButton}
              onPress={openEBirdSpeciesPage}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <ExternalLink size={20} color="#2D3F1F" />
            </Pressable>
          </View>
          
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
            <View style={styles.imageSection}>
              <Image
                source={{ uri: currentImage }}
                style={styles.birdImage}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
              />
              
              {allBirdImages.length > 1 && (
                <View style={styles.imageNavigation}>
                  <Pressable 
                    style={[
                      styles.imageNavButton,
                      currentImageIndex === 0 && styles.imageNavButtonDisabled
                    ]}
                    onPress={goToPreviousImage}
                    disabled={currentImageIndex === 0}
                  >
                    <ChevronLeft size={20} color={currentImageIndex === 0 ? "#AAAAAA" : "#FFFFFF"} />
                  </Pressable>
                  
                  <View style={styles.imageCountBadge}>
                    <Text style={styles.imageCountText}>{currentImageIndex + 1} / {allBirdImages.length}</Text>
                  </View>
                  
                  <Pressable 
                    style={[
                      styles.imageNavButton,
                      currentImageIndex === allBirdImages.length - 1 && styles.imageNavButtonDisabled
                    ]}
                    onPress={goToNextImage}
                    disabled={currentImageIndex === allBirdImages.length - 1}
                  >
                    <ChevronRight size={20} color={currentImageIndex === allBirdImages.length - 1 ? "#AAAAAA" : "#FFFFFF"} />
                  </Pressable>
                </View>
              )}
            </View>
            
            <View style={styles.infoSection}>
              <Text style={styles.commonName}>{bird.comName}</Text>
              <Text style={styles.scientificName}>{bird.sciName}</Text>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Calendar size={16} color="#2D3F1F" />
                  <Text style={styles.statText}>
                    {new Date(bird.obsDt).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.likelihoodContainer}>
                  <View style={[styles.likelihoodBadge, { backgroundColor: likelihoodColor }]}>
                    <Eye size={14} color="#FFFFFF" />
                    <View style={styles.likelihoodTextContainer}>
                      <Text style={styles.likelihoodLabel}>{likelihoodLabel}</Text>
                      <Text style={styles.likelihoodPercentage}>{likelihood}%</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Identification Guide Section */}
              {identificationInfo && (
                <View style={styles.identificationSection}>
                  <Text style={styles.sectionTitle}>Identification Guide</Text>
                  
                  {/* Field Marks */}
                  {identificationInfo.fieldMarks && (
                    <View style={styles.fieldMarksContainer}>
                      <View style={styles.fieldMarkHeader}>
                        <Feather size={18} color="#2D3F1F" />
                        <Text style={styles.fieldMarkTitle}>Key Field Marks</Text>
                      </View>
                      
                      <View style={styles.fieldMarksList}>
                        {identificationInfo.fieldMarks.bill && (
                          <View style={styles.fieldMarkItem}>
                            <Text style={styles.fieldMarkLabel}>Bill:</Text>
                            <Text style={styles.fieldMarkValue}>{identificationInfo.fieldMarks.bill}</Text>
                          </View>
                        )}
                        
                        {identificationInfo.fieldMarks.color && (
                          <View style={styles.fieldMarkItem}>
                            <Text style={styles.fieldMarkLabel}>Colors:</Text>
                            <Text style={styles.fieldMarkValue}>
                              {identificationInfo.fieldMarks.color.join(', ')}
                            </Text>
                          </View>
                        )}
                        
                        {identificationInfo.fieldMarks.wings && (
                          <View style={styles.fieldMarkItem}>
                            <Text style={styles.fieldMarkLabel}>Wings:</Text>
                            <Text style={styles.fieldMarkValue}>{identificationInfo.fieldMarks.wings}</Text>
                          </View>
                        )}
                        
                        {identificationInfo.fieldMarks.tail && (
                          <View style={styles.fieldMarkItem}>
                            <Text style={styles.fieldMarkLabel}>Tail:</Text>
                            <Text style={styles.fieldMarkValue}>{identificationInfo.fieldMarks.tail}</Text>
                          </View>
                        )}
                        
                        {identificationInfo.fieldMarks.behavior && (
                          <View style={styles.fieldMarkItem}>
                            <Text style={styles.fieldMarkLabel}>Behavior:</Text>
                            <Text style={styles.fieldMarkValue}>{identificationInfo.fieldMarks.behavior}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  
                  {/* Size Comparison */}
                  {identificationInfo.sizeComparison && (
                    <View style={styles.sizeComparisonContainer}>
                      <View style={styles.fieldMarkHeader}>
                        <Ruler size={18} color="#2D3F1F" />
                        <Text style={styles.fieldMarkTitle}>Size</Text>
                      </View>
                      
                      <View style={styles.sizeComparisonContent}>
                        {identificationInfo.sizeComparison.length && (
                          <Text style={styles.sizeText}>
                            Length: {identificationInfo.sizeComparison.length}
                          </Text>
                        )}
                        
                        {identificationInfo.sizeComparison.wingspan && (
                          <Text style={styles.sizeText}>
                            Wingspan: {identificationInfo.sizeComparison.wingspan}
                          </Text>
                        )}
                        
                        {identificationInfo.sizeComparison.comparedTo && (
                          <Text style={styles.sizeComparedTo}>
                            {identificationInfo.sizeComparison.comparedTo}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                  
                  {/* Similar Species */}
                  {identificationInfo.similarSpecies && identificationInfo.similarSpecies.length > 0 && (
                    <View style={styles.similarSpeciesContainer}>
                      <View style={styles.fieldMarkHeader}>
                        <AlertTriangle size={18} color="#2D3F1F" />
                        <Text style={styles.fieldMarkTitle}>Similar Species</Text>
                      </View>
                      
                      {identificationInfo.similarSpecies.map((similar, index) => (
                        <View key={index} style={styles.similarSpeciesItem}>
                          <Text style={styles.similarSpeciesName}>{similar.comName}</Text>
                          <View style={styles.differencesList}>
                            {similar.differences.map((diff, i) => (
                              <Text key={i} style={styles.differenceItem}>• {diff}</Text>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Sexual Dimorphism */}
                  {identificationInfo.sexualDimorphism && identificationInfo.sexualDimorphism.hasDimorphism && (
                    <View style={styles.dimorphismContainer}>
                      <View style={styles.fieldMarkHeader}>
                        <Text style={styles.fieldMarkTitle}>Male vs Female</Text>
                      </View>
                      
                      <View style={styles.dimorphismContent}>
                        {identificationInfo.sexualDimorphism.differences && (
                          <View style={styles.differencesList}>
                            {identificationInfo.sexualDimorphism.differences.map((diff, i) => (
                              <Text key={i} style={styles.differenceItem}>• {diff}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                  
                  {/* Seasonal Plumage */}
                  {identificationInfo.seasonalPlumage && identificationInfo.seasonalPlumage.seasonal && (
                    <View style={styles.seasonalPlumageContainer}>
                      <View style={styles.fieldMarkHeader}>
                        <Text style={styles.fieldMarkTitle}>Seasonal Appearance</Text>
                      </View>
                      
                      <View style={styles.seasonalPlumageContent}>
                        {identificationInfo.seasonalPlumage.breeding && (
                          <View style={styles.seasonItem}>
                            <Text style={styles.seasonLabel}>Breeding:</Text>
                            <Text style={styles.seasonValue}>{identificationInfo.seasonalPlumage.breeding}</Text>
                          </View>
                        )}
                        
                        {identificationInfo.seasonalPlumage.nonBreeding && (
                          <View style={styles.seasonItem}>
                            <Text style={styles.seasonLabel}>Non-breeding:</Text>
                            <Text style={styles.seasonValue}>{identificationInfo.seasonalPlumage.nonBreeding}</Text>
                          </View>
                        )}
                        
                        {identificationInfo.seasonalPlumage.juvenile && (
                          <View style={styles.seasonItem}>
                            <Text style={styles.seasonLabel}>Juvenile:</Text>
                            <Text style={styles.seasonValue}>{identificationInfo.seasonalPlumage.juvenile}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              )}
              
              <View style={styles.actionButtonsRow}>
                <Pressable style={styles.actionButton} onPress={openMapLocation}>
                  <MapPin size={16} color="#2D3F1F" />
                  <Text style={styles.actionButtonText}>View on Map</Text>
                </Pressable>
                
                <Pressable style={styles.actionButton} onPress={shareBird}>
                  <Share2 size={16} color="#2D3F1F" />
                  <Text style={styles.actionButtonText}>Share</Text>
                </Pressable>
              </View>
              
              {/* Bird Calls Section */}
              <View style={styles.callsSection}>
                <Text style={styles.sectionTitle}>Bird Calls</Text>
                
                {loadingAudio ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#2D3F1F" />
                    <Text style={styles.loadingText}>Loading bird calls...</Text>
                  </View>
                ) : birdAudio.length > 0 ? (
                  <View style={styles.audioList}>
                    {birdAudio.map((audio, index) => (
                      <AudioPlayer 
                        key={index}
                        audioUrl={audio.url}
                        recordist={audio.recordist}
                        type={audio.type}
                        country={audio.country}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={styles.noAudioContainer}>
                    <Volume2 size={20} color="#666" />
                    <Text style={styles.noAudioText}>No bird calls available</Text>
                  </View>
                )}
              </View>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#2D3F1F" />
                  <Text style={styles.loadingText}>Loading additional information...</Text>
                </View>
              ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : birdInfo ? (
                <View style={styles.additionalInfo}>
                  <Text style={styles.sectionTitle}>About this bird</Text>
                  
                  {birdInfo.description && (
                    <Text style={styles.descriptionText}>{birdInfo.description}</Text>
                  )}
                  
                  {birdInfo.habitat && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Habitat:</Text>
                      <Text style={styles.infoValue}>{birdInfo.habitat}</Text>
                    </View>
                  )}
                  
                  {birdInfo.diet && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Diet:</Text>
                      <Text style={styles.infoValue}>{birdInfo.diet}</Text>
                    </View>
                  )}
                  
                  {birdInfo.behavior && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Behavior:</Text>
                      <Text style={styles.infoValue}>{birdInfo.behavior}</Text>
                    </View>
                  )}
                  
                  <View style={styles.externalLinksContainer}>
                    {birdInfo.wikipediaUrl && (
                      <Pressable style={styles.externalLinkItem} onPress={openWikipediaPage}>
                        <Info size={16} color="#2D3F1F" />
                        <Text style={styles.externalLinkText}>Read more on Wikipedia</Text>
                      </Pressable>
                    )}
                    
                    {birdInfo.audioUrl && (
                      <Pressable style={styles.externalLinkItem} onPress={openAudioPage}>
                        <Volume2 size={16} color="#2D3F1F" />
                        <Text style={styles.externalLinkText}>More bird calls on Xeno-Canto</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.noInfoContainer}>
                  <Text style={styles.noInfoText}>
                    Visit eBird for more information about this species.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
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
        maxWidth: 500,
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
  externalLinkButton: {
    padding: 4,
    borderRadius: 20,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 30,
  },
  imageSection: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  birdImage: {
    width: '100%',
    height: '100%',
  },
  imageNavigation: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  imageNavButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
  },
  imageNavButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  imageCountBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  imageCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    padding: 20,
  },
  commonName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3F1F',
    marginBottom: 4,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#2D3F1F',
  },
  likelihoodContainer: {
    alignItems: 'flex-end',
  },
  likelihoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  likelihoodTextContainer: {
    flexDirection: 'column',
  },
  likelihoodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  likelihoodPercentage: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  // Identification Guide Styles
  identificationSection: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#F5F6F3',
    borderRadius: 12,
    padding: 16,
  },
  fieldMarksContainer: {
    marginBottom: 16,
  },
  fieldMarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  fieldMarkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3F1F',
  },
  fieldMarksList: {
    gap: 6,
  },
  fieldMarkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  fieldMarkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3F1F',
    width: 70,
  },
  fieldMarkValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  sizeComparisonContainer: {
    marginBottom: 16,
  },
  sizeComparisonContent: {
    gap: 4,
  },
  sizeText: {
    fontSize: 14,
    color: '#333',
  },
  sizeComparedTo: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    marginTop: 4,
  },
  similarSpeciesContainer: {
    marginBottom: 16,
  },
  similarSpeciesItem: {
    marginTop: 8,
  },
  similarSpeciesName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 4,
  },
  differencesList: {
    paddingLeft: 4,
  },
  differenceItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  dimorphismContainer: {
    marginBottom: 16,
  },
  dimorphismContent: {
    marginTop: 4,
  },
  seasonalPlumageContainer: {
    marginBottom: 16,
  },
  seasonalPlumageContent: {
    gap: 8,
  },
  seasonItem: {
    marginBottom: 4,
  },
  seasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 2,
  },
  seasonValue: {
    fontSize: 14,
    color: '#333',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F6F3',
    padding: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#2D3F1F',
    fontWeight: '500',
  },
  callsSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 12,
  },
  audioList: {
    gap: 8,
  },
  noAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F3',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  noAudioText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#E63946',
    textAlign: 'center',
    marginTop: 10,
  },
  additionalInfo: {
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3F1F',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  externalLinksContainer: {
    marginTop: 16,
    gap: 12,
  },
  externalLinkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F6F3',
    padding: 12,
    borderRadius: 8,
  },
  externalLinkText: {
    fontSize: 14,
    color: '#2D3F1F',
    fontWeight: '500',
  },
  noInfoContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noInfoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});