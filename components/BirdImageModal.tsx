import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Pressable, Platform, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

interface BirdImageModalProps {
  visible: boolean;
  imageUrls: string[];
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function BirdImageModal({ visible, imageUrls, onClose }: BirdImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Reset to first image when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      
      // Trigger haptic feedback when modal opens
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [visible]);
  
  // Safety check to ensure we have valid images
  if (!imageUrls || imageUrls.length === 0) {
    return null;
  }
  
  const currentImage = imageUrls[currentIndex];
  
  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };
  
  const goToNext = () => {
    if (currentIndex < imageUrls.length - 1) {
      setCurrentIndex(currentIndex + 1);
      
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <View style={styles.modalContainer}>
        <Pressable 
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <X size={24} color="#FFFFFF" />
        </Pressable>
        
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: currentImage }}
            style={styles.fullImage}
            contentFit="contain"
            transition={300}
            cachePolicy="memory-disk"
          />
          
          {imageUrls.length > 1 && (
            <View style={styles.navigationContainer}>
              <Pressable 
                style={[
                  styles.navButton, 
                  currentIndex === 0 && styles.navButtonDisabled
                ]}
                onPress={goToPrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft size={24} color={currentIndex === 0 ? "#666666" : "#FFFFFF"} />
              </Pressable>
              
              <Text style={styles.imageCounter}>
                {currentIndex + 1} / {imageUrls.length}
              </Text>
              
              <Pressable 
                style={[
                  styles.navButton, 
                  currentIndex === imageUrls.length - 1 && styles.navButtonDisabled
                ]}
                onPress={goToNext}
                disabled={currentIndex === imageUrls.length - 1}
              >
                <ChevronRight size={24} color={currentIndex === imageUrls.length - 1 ? "#666666" : "#FFFFFF"} />
              </Pressable>
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 8,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: height * 0.1,
    width: width * 0.8,
  },
  navButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 10,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  imageCounter: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});