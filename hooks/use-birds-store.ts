import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BirdObservation, LocationState } from '@/types/birds';

interface BirdsStore {
  birds: BirdObservation[];
  isLoading: boolean;
  error: string | null;
  location: LocationState | null;
  searchRadius: number; // in miles
  birdImages: Record<string, string>; // Map of speciesCode to image URL
  setSearchRadius: (radius: number) => void;
  setLocation: (location: LocationState) => void;
  setBirds: (birds: BirdObservation[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setBirdImages: (images: Record<string, string>) => void;
  addBirdImages: (images: Record<string, string>) => void;
}

export const useBirdsStore = create<BirdsStore>()(
  persist(
    (set) => ({
      birds: [],
      isLoading: false,
      error: null,
      location: null,
      searchRadius: 5, // Default to 5 miles
      birdImages: {},
      setSearchRadius: (radius) => set({ searchRadius: radius }),
      setLocation: (location) => set({ location }),
      setBirds: (birds) => set({ birds }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setBirdImages: (images) => set({ birdImages: images }),
      addBirdImages: (images) => set((state) => ({ 
        birdImages: { ...state.birdImages, ...images } 
      })),
    }),
    {
      name: 'birds-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        searchRadius: state.searchRadius,
        birdImages: state.birdImages, // Persist bird images to avoid refetching
      }),
    }
  )
);