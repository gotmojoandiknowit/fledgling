import { BirdObservation } from '@/types/birds';

interface ScoredBird extends BirdObservation {
  likelihood: number;
}

export function calculateBirdLikelihood(birds: BirdObservation[]): ScoredBird[] {
  const now = new Date();
  
  // Group birds by species
  const speciesMap = new Map<string, BirdObservation[]>();
  birds.forEach(bird => {
    const existing = speciesMap.get(bird.speciesCode) || [];
    speciesMap.set(bird.speciesCode, [...existing, bird]);
  });

  // Score each species
  const scoredBirds = Array.from(speciesMap.entries()).map(([_, observations]) => {
    const firstObs = observations[0]; // Use first observation for species info
    
    // Calculate base score from number of unique sightings
    const sightingsScore = observations.length * 10;
    
    // Calculate recency score
    const recencyScores = observations.map(obs => {
      const daysAgo = (now.getTime() - new Date(obs.obsDt).getTime()) / (1000 * 60 * 60 * 24);
      return Math.max(0.1, 1 - (daysAgo / 30)); // Score from 1.0 to 0.1 based on days ago
    });
    const avgRecency = recencyScores.reduce((a, b) => a + b, 0) / recencyScores.length;
    
    // Calculate volume score
    const volumes = observations.map(obs => 
      typeof obs.howMany === 'number' ? obs.howMany : 
      obs.howMany === 'X' ? 25 : 1
    );
    const totalVolume = volumes.reduce((a, b) => a + b, 0);
    const volumeScore = Math.min(50, totalVolume) / 50; // Normalize to max 1.0
    
    // Combine scores
    const likelihood = (sightingsScore * avgRecency) + (volumeScore * 20);

    return {
      ...firstObs,
      likelihood: Math.round(likelihood * 100) / 100
    };
  });

  // Sort by likelihood
  return scoredBirds.sort((a, b) => b.likelihood - a.likelihood);
}