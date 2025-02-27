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

  // Find the maximum values for normalization
  let maxSightings = 0;
  let maxVolume = 0;
  
  speciesMap.forEach((observations) => {
    maxSightings = Math.max(maxSightings, observations.length);
    
    const totalVolume = observations.reduce((sum, obs) => {
      const count = typeof obs.howMany === 'number' ? obs.howMany : 
                    obs.howMany === 'X' ? 25 : 1;
      return sum + count;
    }, 0);
    
    maxVolume = Math.max(maxVolume, totalVolume);
  });

  // Score each species
  const scoredBirds = Array.from(speciesMap.entries()).map(([_, observations]) => {
    const firstObs = observations[0]; // Use first observation for species info
    
    // Calculate frequency score (0-50 points)
    // More frequent sightings = higher score
    const frequencyScore = (observations.length / maxSightings) * 50;
    
    // Calculate recency score (0-30 points)
    // More recent sightings = higher score
    const recencyScores = observations.map(obs => {
      const daysAgo = (now.getTime() - new Date(obs.obsDt).getTime()) / (1000 * 60 * 60 * 24);
      // Exponential decay - recent sightings count much more
      return Math.exp(-0.1 * daysAgo); // Score from ~1.0 to ~0.05 based on days ago
    });
    
    // Weight recent sightings more heavily
    recencyScores.sort((a, b) => b - a); // Sort descending
    let weightedRecencySum = 0;
    let weightSum = 0;
    
    recencyScores.forEach((score, index) => {
      const weight = Math.pow(0.8, index); // Decreasing weights: 1, 0.8, 0.64, 0.512...
      weightedRecencySum += score * weight;
      weightSum += weight;
    });
    
    const avgRecency = weightedRecencySum / weightSum;
    const recencyScore = avgRecency * 30;
    
    // Calculate volume score (0-20 points)
    // More birds per sighting = higher score
    const volumes = observations.map(obs => 
      typeof obs.howMany === 'number' ? obs.howMany : 
      obs.howMany === 'X' ? 25 : 1
    );
    const totalVolume = volumes.reduce((a, b) => a + b, 0);
    const volumeScore = Math.min(1, totalVolume / (maxVolume * 0.7)) * 20; // Cap at 70% of max for better distribution
    
    // Calculate consistency bonus (0-10 points)
    // More consistent sightings over time = higher score
    const dates = observations.map(obs => new Date(obs.obsDt).getTime());
    dates.sort();
    
    let consistencyScore = 0;
    if (dates.length > 1) {
      const dateRangeInDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
      if (dateRangeInDays > 0) {
        // Higher score for more evenly distributed sightings
        const avgSightingsPerDay = observations.length / dateRangeInDays;
        consistencyScore = Math.min(10, avgSightingsPerDay * 5);
      }
    }
    
    // Combine scores and round to nearest integer
    const likelihood = Math.round(frequencyScore + recencyScore + volumeScore + consistencyScore);
    
    // Cap at 99% - nothing is 100% certain in birding!
    const cappedLikelihood = Math.min(99, likelihood);

    return {
      ...firstObs,
      likelihood: cappedLikelihood
    };
  });

  // Sort by likelihood
  return scoredBirds.sort((a, b) => b.likelihood - a.likelihood);
}