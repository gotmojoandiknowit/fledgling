import { LocationState, Hotspot } from '@/types/birds';

const API_KEY = '9tjj0hba40ec';

// Convert miles to kilometers for API
// Ensure we never exceed the API's 50km limit
const milesToKm = (miles: number) => {
  const km = miles * 1.60934;
  return Math.min(km, 50); // Cap at 50km (API limit)
};

export async function fetchNearbyBirds(location: LocationState, radiusMiles: number, limit: number | null = null) {
  const { latitude, longitude } = location;
  const back = 30; // 30 days
  const radiusKm = milesToKm(radiusMiles);
  
  // Build the base URL
  let url = `https://api.ebird.org/v2/data/obs/geo/recent?lat=${latitude}&lng=${longitude}&back=${back}&dist=${radiusKm}&hotspot=false`;
  
  // Only add maxResults if a limit is specified
  if (limit !== null) {
    url += `&maxResults=${limit}`;
  }

  try {
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch birds data: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API Error in fetchNearbyBirds:', error);
    throw error;
  }
}

export async function fetchHotspots(location: LocationState, radiusMiles: number) {
  const { latitude, longitude } = location;
  const radiusKm = milesToKm(radiusMiles);
  const back = 30; // 30 days - filter hotspots with observations in the last 30 days
  const url = `https://api.ebird.org/v2/ref/hotspot/geo?lat=${latitude}&lng=${longitude}&dist=${radiusKm}&back=${back}&fmt=json`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hotspots data: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API Error in fetchHotspots:', error);
    throw error;
  }
}

export async function fetchHotspotDetails(hotspotId: string) {
  const url = `https://api.ebird.org/v2/product/lists/${hotspotId}?maxResults=10`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hotspot details: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API Error in fetchHotspotDetails:', error);
    throw error;
  }
}

export async function fetchRegionalSpecies(regionCode: string) {
  const url = `https://api.ebird.org/v2/product/spplist/${regionCode}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch regional species: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('API Error in fetchRegionalSpecies:', error);
    throw error;
  }
}