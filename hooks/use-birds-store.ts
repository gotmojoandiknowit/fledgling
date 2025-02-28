import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BirdObservation, LocationState, Hotspot } from '@/types/birds';

interface BirdsStore {
  birds: BirdObservation[];
  filteredBirds: BirdObservation[];
  isLoading: boolean;
  error: string | null;
  location: LocationState | null;
  searchRadius: number; // in miles
  resultsLimit: number | null; // null means "all"
  hotspotsLimit: number | null; // null means "all"
  birdImages: Record<string, string[]>; // Map of speciesCode to array of image URLs
  hotspots: Hotspot[];
  isLoadingHotspots: boolean;
  
  setSearchRadius: (radius: number) => void;
  setResultsLimit: (limit: number | null) => void;
  setHotspotsLimit: (limit: number | null) => void;
  setLocation: (location: LocationState) => void;
  setBirds: (birds: BirdObservation[]) => void;
  setFilteredBirds: (birds: BirdObservation[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setBirdImages: (images: Record<string, string[]>) => void;
  addBirdImages: (images: Record<string, string[]>) => void;
  setHotspots: (hotspots: Hotspot[]) => void;
  setIsLoadingHotspots: (isLoading: boolean) => void;
}

export const useBirdsStore = create<BirdsStore>()(
  persist(
    (set, get) => ({
      birds: [],
      filteredBirds: [],
      isLoading: false,
      error: null,
      location: null,
      searchRadius: 5, // Default to 5 miles
      resultsLimit: 25, // Default to 25 results
      hotspotsLimit: 10, // Default to 10 hotspots (changed from 5)
      birdImages: {},
      hotspots: [],
      isLoadingHotspots: false,
      
      setSearchRadius: (radius) => set({ searchRadius: radius }),
      setResultsLimit: (limit) => set({ resultsLimit: limit }),
      setHotspotsLimit: (limit) => set({ hotspotsLimit: limit }),
      setLocation: (location) => set({ location }),
      setBirds: (birds) => set({ birds, filteredBirds: birds }),
      setFilteredBirds: (filteredBirds) => set({ filteredBirds }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setBirdImages: (images) => set({ birdImages: images }),
      addBirdImages: (images) => set((state) => ({ 
        birdImages: { ...state.birdImages, ...images } 
      })),
      setHotspots: (hotspots) => set({ hotspots }),
      setIsLoadingHotspots: (isLoadingHotspots) => set({ isLoadingHotspots }),
    }),
    {
      name: 'birds-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        searchRadius: state.searchRadius,
        resultsLimit: state.resultsLimit,
        hotspotsLimit: state.hotspotsLimit,
        birdImages: state.birdImages, // Persist bird images to avoid refetching
      }),
    }
  )
);