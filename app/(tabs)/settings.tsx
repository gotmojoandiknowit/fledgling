import { View, Text, StyleSheet } from 'react-native';

// This file exists only to satisfy the router
// The actual settings are shown in a drawer
export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: '#2D3F1F',
  },
});