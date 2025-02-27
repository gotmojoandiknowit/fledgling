import React from 'react';
import { Modal, View, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

interface BirdImageModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function BirdImageModal({ visible, imageUrl, onClose }: BirdImageModalProps) {
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
        
        <Pressable style={styles.imageContainer} onPress={onClose}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullImage}
            contentFit="contain"
            transition={300}
          />
        </Pressable>
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
});