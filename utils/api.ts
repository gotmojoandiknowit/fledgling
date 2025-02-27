import { LocationState } from '@/types/birds';

const API_KEY = '9tjj0hba40ec';

// Convert miles to kilometers for API
// Ensure we never exceed the API's 50km limit
const milesToKm = (miles: number) => {
  const km = miles * 1.60934;
  return Math.min(km, 50); // Cap at 50km (API limit)
};

export async function fetchNearbyBirds(location: LocationState, radiusMiles: number) {
  const { latitude, longitude } = location;
  const back = 30; // 30 days
  const radiusKm = milesToKm(radiusMiles);
  const maxResults = 25; // Limit results to 25
  const url = `https://api.ebird.org/v2/data/obs/geo/recent?lat=${latitude}&lng=${longitude}&back=${back}&dist=${radiusKm}&hotspot=false&maxResults=${maxResults}`;

  const response = await fetch(url, {
    headers: {
      'X-eBirdApiToken': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch birds data');
  }

  return response.json();
}