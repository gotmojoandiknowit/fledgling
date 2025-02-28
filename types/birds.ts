export interface BirdObservation {
  speciesCode: string;
  comName: string;
  sciName: string;
  locId: string;
  locName: string;
  obsDt: string;
  howMany: number | string;
  lat: number;
  lng: number;
  obsValid: boolean;
  obsReviewed: boolean;
  locationPrivate: boolean;
  likelihood?: number;
}

export interface LocationState {
  latitude: number;
  longitude: number;
}

export interface BirdFieldMarks {
  size?: string;
  shape?: string;
  color?: string[];
  bill?: string;
  wings?: string;
  tail?: string;
  behavior?: string;
  habitat?: string[];
  voice?: string;
}

export interface BirdSizeComparison {
  length?: string;
  wingspan?: string;
  weight?: string;
  comparedTo?: string;
  sizeCategory?: 'tiny' | 'small' | 'medium' | 'large' | 'very large';
}

export interface SimilarSpecies {
  speciesCode: string;
  comName: string;
  differences: string[];
}

export interface SeasonalPlumage {
  breeding?: string;
  nonBreeding?: string;
  juvenile?: string;
  seasonal?: boolean;
}

export interface SexualDimorphism {
  hasDimorphism: boolean;
  malePlumage?: string;
  femalePlumage?: string;
  differences?: string[];
}

export interface BirdIdentificationInfo {
  fieldMarks?: BirdFieldMarks;
  sizeComparison?: BirdSizeComparison;
  similarSpecies?: SimilarSpecies[];
  seasonalPlumage?: SeasonalPlumage;
  sexualDimorphism?: SexualDimorphism;
}

export interface Hotspot {
  locId: string;
  locName: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  subnational1Code: string;
  latestObsDt?: string;
  numSpeciesAllTime?: number;
}