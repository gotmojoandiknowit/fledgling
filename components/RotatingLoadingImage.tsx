import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Easing, View } from 'react-native';
import { Image } from 'expo-image';

interface RotatingLoadingImageProps {
  imageUrl: string;
  size?: number;
}

export function RotatingLoadingImage({ imageUrl, size = 120 }: RotatingLoadingImageProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Rotation animation
    const rotationAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    // Pulsing animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    );
    
    rotationAnimation.start();
    pulseAnimation.start();
    
    return () => {
      rotationAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[
        { 
          transform: [
            { rotate },
            { scale: scaleAnim }
          ] 
        }
      ]}>
        <Image 
          source={{ uri: imageUrl }}
          style={[styles.image, { width: size, height: size }]}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    borderRadius: 8,
  },
});