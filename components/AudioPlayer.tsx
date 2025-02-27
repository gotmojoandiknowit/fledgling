import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface AudioPlayerProps {
  audioUrl: string;
  recordist?: string;
  type?: string;
  country?: string;
}

export function AudioPlayer({ audioUrl, recordist, type, country }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  
  // Initialize audio on mount
  useEffect(() => {
    let isMounted = true;
    
    const setupAudio = async () => {
      if (!audioUrl) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        if (Platform.OS === 'web') {
          // Web implementation using HTML5 Audio
          const audioElement = new Audio(audioUrl);
          
          audioElement.addEventListener('loadedmetadata', () => {
            if (isMounted) {
              setDuration(audioElement.duration);
              setIsLoading(false);
            }
          });
          
          audioElement.addEventListener('timeupdate', () => {
            if (isMounted) {
              setPosition(audioElement.currentTime);
            }
          });
          
          audioElement.addEventListener('ended', () => {
            if (isMounted) {
              setIsPlaying(false);
              setPosition(0);
            }
          });
          
          audioElement.addEventListener('error', () => {
            if (isMounted) {
              setError('Failed to load audio');
              setIsLoading(false);
            }
          });
          
          setAudio(audioElement);
        } else {
          // Native implementation using Expo AV
          // This is a placeholder - in a real implementation, we would use Expo AV
          // Since we can't install custom packages, we'll just simulate the behavior
          
          // Simulate loading delay
          setTimeout(() => {
            if (isMounted) {
              setDuration(30); // Simulate 30 second duration
              setIsLoading(false);
            }
          }, 1000);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error setting up audio:', err);
          setError('Failed to load audio');
          setIsLoading(false);
        }
      }
    };
    
    setupAudio();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      if (audio) {
        if (Platform.OS === 'web') {
          audio.pause();
          audio.src = '';
        } else {
          // Cleanup for native implementation would go here
        }
      }
    };
  }, [audioUrl]);
  
  // Handle play/pause
  const togglePlayback = async () => {
    if (!audio) return;
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      
      if (isPlaying) {
        if (Platform.OS === 'web') {
          audio.pause();
        } else {
          // Native pause implementation would go here
        }
        setIsPlaying(false);
      } else {
        if (Platform.OS === 'web') {
          await audio.play();
        } else {
          // Native play implementation would go here
          
          // Simulate playback for demo purposes
          const interval = setInterval(() => {
            setPosition(prev => {
              if (prev >= duration) {
                clearInterval(interval);
                setIsPlaying(false);
                return 0;
              }
              return prev + 0.1;
            });
          }, 100);
        }
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
      setError('Failed to play audio');
    }
  };
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Calculate progress percentage
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <VolumeX size={20} color="#E63946" />
          <Text style={styles.errorText}>Audio unavailable</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.playerContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.playButton,
            pressed && styles.playButtonPressed,
            isLoading && styles.playButtonDisabled,
          ]}
          onPress={togglePlayback}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            isPlaying ? (
              <Pause size={24} color="#FFFFFF" />
            ) : (
              <Play size={24} color="#FFFFFF" />
            )
          )}
        </Pressable>
        
        <View style={styles.infoContainer}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${progress}%` }
                ]} 
              />
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
          
          <View style={styles.detailsContainer}>
            {type && (
              <Text style={styles.typeText}>{type}</Text>
            )}
            {recordist && (
              <Text style={styles.recordistText}>
                Recorded by: {recordist}
                {country ? ` in ${country}` : ''}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    width: '100%',
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6F3',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2D3F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonPressed: {
    opacity: 0.8,
  },
  playButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  infoContainer: {
    flex: 1,
  },
  progressContainer: {
    width: '100%',
  },
  progressBackground: {
    height: 4,
    backgroundColor: '#E1E2DE',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2D3F1F',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  detailsContainer: {
    marginTop: 4,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3F1F',
  },
  recordistText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#E63946',
  },
});