import React from 'react';
import { Image, StyleSheet, View, Platform } from 'react-native';

export function LogoImage() {
  // Using the direct image URL provided by the user
  const logoUrl = 'https://i.ibb.co/zvjb4xh/fledgelogo.png';
  
  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: logoUrl }} 
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  logo: {
    width: 180,
    height: 40,
  },
});