import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SortOption = 'likelihood' | 'name' | 'date';
export type SortDirection = 'asc' | 'desc';

interface FilterState {
  sortBy: SortOption;
  sortDirection: SortDirection;
  setSortBy: (option: SortOption) => void;
  setSortDirection: (direction: SortDirection) => void;
  resetFilters: () => void;
}

const DEFAULT_SORT_BY: SortOption = 'likelihood';
const DEFAULT_SORT_DIRECTION: SortDirection = 'desc';

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      sortBy: DEFAULT_SORT_BY,
      sortDirection: DEFAULT_SORT_DIRECTION,
      
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDirection: (sortDirection) => set({ sortDirection }),
      resetFilters: () => set({
        sortBy: DEFAULT_SORT_BY,
        sortDirection: DEFAULT_SORT_DIRECTION,
      }),
    }),
    {
      name: 'filter-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);