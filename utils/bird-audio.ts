import { Platform } from 'react-native';

// In-memory cache for bird audio URLs
const birdAudioCache = new Map<string, string[]>();

export async function fetchBirdAudio(scientificName: string): Promise<string[]> {
  // Check cache first
  if (birdAudioCache.has(scientificName)) {
    return birdAudioCache.get(scientificName) || [];
  }
  
  try {
    // Use Xeno-Canto API to search for bird calls
    const encodedName = encodeURIComponent(scientificName);
    const url = `https://xeno-canto.org/api/2/recordings?query=${encodedName}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch bird audio');
    }
    
    const data = await response.json();
    
    // Check if we have valid recordings data
    if (!data.recordings || !Array.isArray(data.recordings)) {
      console.warn('Invalid recordings data format:', data);
      return [];
    }
    
    // Extract audio URLs from the response
    const audioUrls = data.recordings
      .filter((recording: any) => 
        // Filter for high-quality recordings and ensure URL exists
        recording && 
        recording.file && 
        typeof recording.file === 'string' &&
        (recording.q?.toLowerCase() === 'a' || recording.q?.toLowerCase() === 'b')
      )
      .slice(0, 3) // Limit to 3 recordings
      .map((recording: any) => ({
        url: recording.file,
        type: recording.type || 'call',
        recordist: recording.rec || 'Unknown',
        country: recording.cnt || '',
        license: recording.lic || '',
        quality: recording.q || '',
      }));
    
    // Cache the results
    birdAudioCache.set(scientificName, audioUrls);
    
    return audioUrls;
  } catch (error) {
    console.error('Error fetching bird audio:', error);
    return [];
  }
}