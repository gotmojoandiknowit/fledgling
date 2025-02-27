import { useCallback, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { Map, Settings, Filter } from 'lucide-react-native';
import { Pressable, View, StyleSheet, Animated, Dimensions, Platform, Linking } from 'react-native';
import { RadiusSettings } from '@/components/RadiusSettings';
import { FilterSettings } from '@/components/FilterSettings';
import { useBirdsStore } from '@/hooks/use-birds-store';
import { LogoImage } from '@/components/LogoImage';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.85, 350);

export default function TabLayout() {
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [activeDrawer, setActiveDrawer] = useState<'radius' | 'filter' | null>(null);
  const menuAnimation = useRef(new Animated.Value(width)).current;
  const { setIsLoading, location } = useBirdsStore();
  
  const showMenu = useCallback((drawer: 'radius' | 'filter') => {
    setActiveDrawer(drawer);
    setIsMenuVisible(true);
    
    // Use different animation approach for web
    if (Platform.OS === 'web') {
      menuAnimation.setValue(width - DRAWER_WIDTH);
    } else {
      Animated.spring(menuAnimation, {
        toValue: width - DRAWER_WIDTH,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  const hideMenu = useCallback(() => {
    if (Platform.OS === 'web') {
      menuAnimation.setValue(width);
      setIsMenuVisible(false);
      setActiveDrawer(null);
    } else {
      Animated.spring(menuAnimation, {
        toValue: width,
        useNativeDriver: true,
      }).start(() => {
        setIsMenuVisible(false);
        setActiveDrawer(null);
      });
    }
  }, []);

  const handleRadiusChange = useCallback(() => {
    hideMenu();
    setIsLoading(true);
  }, []);

  const openMaps = useCallback(() => {
    if (!location) {
      return;
    }

    const { latitude, longitude } = location;
    
    // For web, directly open Google Maps
    if (Platform.OS === 'web') {
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      window.open(googleMapsUrl, '_blank');
      return;
    }
    
    // For native platforms
    const label = "My Current Location";
    let url;
    
    if (Platform.OS === 'ios') {
      url = `maps:?ll=${latitude},${longitude}&q=${label}`;
    } else {
      // Android
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    }

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps as web URL
        const webUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        Linking.openURL(webUrl);
      }
    });
  }, [location]);

  // Create web-specific drawer styles
  const webDrawerStyle = Platform.OS === 'web' 
    ? {
        position: 'fixed' as 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        transform: [{translateX: isMenuVisible ? 0 : DRAWER_WIDTH}],
        transition: 'transform 0.3s ease-out',
        zIndex: 1000,
      }
    : {};

  // Create web-specific overlay styles
  const webOverlayStyle = Platform.OS === 'web'
    ? {
        position: 'fixed' as 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 999,
      }
    : {};

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2D3F1F',
          headerShown: true,
          headerTitle: () => <LogoImage />,
          headerTitleAlign: 'center',
          headerRight: () => (
            <Pressable
              onPress={() => showMenu('filter')}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.headerButtonPressed
              ]}
            >
              <Filter size={24} color="#2D3F1F" />
            </Pressable>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Location',
            tabBarIcon: ({ color }) => <Map size={24} color={color} />,
            tabBarLabel: 'Location',
          }}
          listeners={{
            tabPress: (e) => {
              // Prevent default navigation
              e.preventDefault();
              // Open maps instead
              openMaps();
            },
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
            tabBarLabel: 'Settings',
          }}
          listeners={{
            tabPress: (e) => {
              // Prevent default navigation
              e.preventDefault();
              // Show settings drawer instead
              showMenu('radius');
            },
          }}
        />
      </Tabs>

      {isMenuVisible && (
        Platform.OS === 'web' ? (
          // Web-specific implementation
          <>
            <View style={webOverlayStyle}>
              <Pressable style={{width: '100%', height: '100%'}} onPress={hideMenu} />
            </View>
            <View style={[styles.menu, webDrawerStyle]}>
              <View style={styles.menuContent}>
                {activeDrawer === 'radius' && (
                  <RadiusSettings onSelect={handleRadiusChange} onClose={hideMenu} />
                )}
                {activeDrawer === 'filter' && (
                  <FilterSettings onClose={hideMenu} />
                )}
              </View>
            </View>
          </>
        ) : (
          // Native implementation
          <View style={StyleSheet.absoluteFill}>
            <Pressable style={styles.overlay} onPress={hideMenu}>
              <Animated.View
                style={[
                  styles.menu,
                  {
                    transform: [{ translateX: menuAnimation }],
                    width: DRAWER_WIDTH,
                  },
                ]}
              >
                <View style={styles.menuContent}>
                  {activeDrawer === 'radius' && (
                    <RadiusSettings onSelect={handleRadiusChange} onClose={hideMenu} />
                  )}
                  {activeDrawer === 'filter' && (
                    <FilterSettings onClose={hideMenu} />
                  )}
                </View>
              </Animated.View>
            </Pressable>
          </View>
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
  },
  headerButtonPressed: {
    opacity: 0.7,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menu: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#E1E2DE',
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    paddingTop: Platform.OS === 'ios' ? 50 : Platform.OS === 'web' ? 20 : 0,
  },
  menuContent: {
    flex: 1,
  },
});