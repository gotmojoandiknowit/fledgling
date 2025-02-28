import { BirdIdentificationInfo } from '@/types/birds';

// This file contains identification information for common birds
// In a production app, this would be a much larger database or API call

// Map of speciesCode to identification information
export const birdIdentificationData: Record<string, BirdIdentificationInfo> = {
  // American Robin
  'amerob': {
    fieldMarks: {
      size: 'Medium-sized songbird',
      shape: 'Plump body with fairly long legs and tail',
      color: ['orange', 'brown', 'gray', 'white'],
      bill: 'Yellow bill, slightly curved downward',
      wings: 'Brown wings with no distinctive markings',
      tail: 'Dark tail with white corners visible in flight',
      behavior: 'Often seen hopping on lawns, pulling up worms',
      habitat: ['suburban', 'urban', 'woodland', 'forest', 'agricultural'],
      voice: 'Cheerily, cheer-up, cheerio song; sharp "tut-tut-tut" alarm call'
    },
    sizeComparison: {
      length: '9-11 inches (23-28 cm)',
      wingspan: '14-16 inches (36-41 cm)',
      weight: '2.7-3 oz (77-85 g)',
      comparedTo: 'Slightly larger than a bluebird, smaller than a crow',
      sizeCategory: 'medium'
    },
    similarSpecies: [
      {
        speciesCode: 'varier',
        comName: 'Varied Thrush',
        differences: [
          'Varied Thrush has a black breast band',
          'More orange coloration on wings',
          'Less likely in urban areas'
        ]
      }
    ],
    seasonalPlumage: {
      breeding: 'Brighter orange breast, darker head',
      nonBreeding: 'Slightly duller colors, especially in fall',
      seasonal: false
    },
    sexualDimorphism: {
      hasDimorphism: true,
      malePlumage: 'Darker, richer black head and brighter orange breast',
      femalePlumage: 'Paler head (more gray than black) and lighter orange breast',
      differences: [
        'Males have darker head contrasting with orange breast',
        'Females have more gray-brown head with less contrast'
      ]
    }
  },
  
  // Northern Cardinal
  'norcar': {
    fieldMarks: {
      size: 'Medium-sized songbird',
      shape: 'Stocky body with long tail, distinctive crest on head',
      color: ['red', 'black', 'gray', 'tan'],
      bill: 'Thick, conical, bright orange-red bill',
      wings: 'Red with no distinctive markings',
      tail: 'Long, red tail',
      behavior: 'Often seen at feeders, males sing from high perches',
      habitat: ['suburban', 'urban', 'woodland', 'forest edge', 'scrub'],
      voice: 'Clear whistled "what-cheer, what-cheer" or "purty-purty-purty"'
    },
    sizeComparison: {
      length: '8.3-9.1 inches (21-23 cm)',
      wingspan: '10-12 inches (25-31 cm)',
      weight: '1.5-1.7 oz (42-48 g)',
      comparedTo: 'Larger than a sparrow, smaller than a robin',
      sizeCategory: 'medium'
    },
    similarSpecies: [
      {
        speciesCode: 'pyrrul',
        comName: 'Pyrrhuloxia',
        differences: [
          'Pyrrhuloxia is gray with red highlights (not all red)',
          'Crest is more pointed',
          'Found in desert Southwest'
        ]
      }
    ],
    seasonalPlumage: {
      seasonal: false
    },
    sexualDimorphism: {
      hasDimorphism: true,
      malePlumage: 'Bright red all over with black face mask',
      femalePlumage: 'Pale brown-gray with reddish crest, wings, and tail',
      differences: [
        'Males are bright red with black face mask',
        'Females are mostly tan/gray with some red on crest, wings and tail',
        'Both sexes have red-orange bill'
      ]
    }
  },
  
  // Blue Jay
  'blujay': {
    fieldMarks: {
      size: 'Medium-sized songbird',
      shape: 'Stout body with large head, distinctive crest, and long tail',
      color: ['blue', 'white', 'black', 'gray'],
      bill: 'Strong, straight black bill',
      wings: 'Blue with black bars and white patches',
      tail: 'Long blue tail with black bars and white edges',
      behavior: 'Noisy, bold, often mimics hawks, stores food',
      habitat: ['forest', 'woodland', 'suburban', 'urban'],
      voice: 'Harsh "jay-jay" calls, various squeaks, rattles, and whistles'
    },
    sizeComparison: {
      length: '9-12 inches (22-30 cm)',
      wingspan: '13-17 inches (34-43 cm)',
      weight: '2.5-3.5 oz (70-100 g)',
      comparedTo: 'About the size of a robin but with a much longer tail',
      sizeCategory: 'medium'
    },
    similarSpecies: [
      {
        speciesCode: 'stejay',
        comName: "Steller's Jay",
        differences: [
          "Steller's Jay has a dark black/blue head and upper body",
          'No white patches on wings or tail',
          'Found in western mountains'
        ]
      }
    ],
    seasonalPlumage: {
      seasonal: false
    },
    sexualDimorphism: {
      hasDimorphism: false
    }
  },
  
  // Red-tailed Hawk
  'rethaw': {
    fieldMarks: {
      size: 'Large hawk',
      shape: 'Broad, rounded wings and short, wide red tail',
      color: ['brown', 'red', 'white'],
      bill: 'Strong, hooked yellow bill',
      wings: 'Broad with dark leading edge (patagium)',
      tail: 'Distinctive rusty-red tail (adults)',
      behavior: 'Soars on thermals, perches conspicuously on poles and trees',
      habitat: ['open country', 'woodland', 'forest edge', 'urban', 'roadside'],
      voice: 'Raspy, screaming "keeeeeer" (often used as generic hawk sound in movies)'
    },
    sizeComparison: {
      length: '18-26 inches (45-65 cm)',
      wingspan: '45-52 inches (114-133 cm)',
      weight: '1.5-3.5 lbs (690-1600 g)',
      comparedTo: 'Much larger than a crow, about the size of a goose',
      sizeCategory: 'large'
    },
    similarSpecies: [
      {
        speciesCode: 'rshawk',
        comName: 'Red-shouldered Hawk',
        differences: [
          'Red-shouldered is smaller with more slender wings',
          'Has translucent "windows" at base of primaries',
          'More heavily barred tail and underparts'
        ]
      }
    ],
    seasonalPlumage: {
      seasonal: false
    },
    sexualDimorphism: {
      hasDimorphism: true,
      differences: [
        'Females are about 25% larger than males',
        'Otherwise similar in appearance'
      ]
    }
  },
  
  // American Goldfinch
  'amegfi': {
    fieldMarks: {
      size: 'Small finch',
      shape: 'Small body with conical bill, notched tail',
      color: ['yellow', 'black', 'white', 'brown', 'olive'],
      bill: 'Small, conical, pink-orange bill',
      wings: 'Black with white wing bars',
      tail: 'Notched tail, black with white edges',
      behavior: 'Undulating flight, often feeds on seed heads of plants',
      habitat: ['open country', 'suburban', 'gardens', 'fields', 'roadsides'],
      voice: 'Musical "po-ta-to-chip" flight call, warbling song'
    },
    sizeComparison: {
      length: '4.3-5.1 inches (11-13 cm)',
      wingspan: '7.5-8.7 inches (19-22 cm)',
      weight: '0.4-0.7 oz (11-20 g)',
      comparedTo: 'Smaller than a sparrow',
      sizeCategory: 'small'
    },
    similarSpecies: [
      {
        speciesCode: 'lessgo',
        comName: 'Lesser Goldfinch',
        differences: [
          'Lesser Goldfinch is smaller',
          'Males have black or green back (not yellow)',
          'More common in western US'
        ]
      }
    ],
    seasonalPlumage: {
      breeding: 'Males bright yellow with black cap, wings, and tail',
      nonBreeding: 'Dull olive-brown above, pale yellow below, black wings with white bars',
      juvenile: 'Similar to non-breeding adult but more buff-colored',
      seasonal: true
    },
    sexualDimorphism: {
      hasDimorphism: true,
      malePlumage: 'Bright yellow with black cap, wings, and tail in breeding season',
      femalePlumage: 'Duller yellow-olive without black cap',
      differences: [
        'Breeding males are bright yellow with black cap',
        'Females are duller olive-yellow without black cap',
        'Winter males resemble females but with darker wings'
      ]
    }
  },
  
  // Great Blue Heron
  'grbher3': {
    fieldMarks: {
      size: 'Very large wading bird',
      shape: 'Tall with long neck, legs, and bill; S-shaped neck in flight',
      color: ['blue', 'gray', 'white', 'black'],
      bill: 'Long, thick, yellowish bill',
      wings: 'Broad, rounded, grayish-blue wings',
      tail: 'Short tail',
      behavior: 'Stands motionless in water waiting for prey, flies with neck folded',
      habitat: ['wetland', 'marsh', 'lake', 'river', 'coastal'],
      voice: 'Deep, hoarse "frahnk" call, especially when disturbed'
    },
    sizeComparison: {
      length: '38-54 inches (97-137 cm)',
      wingspan: '65-79 inches (165-200 cm)',
      weight: '4.5-8 lbs (2-3.6 kg)',
      comparedTo: 'Much larger than a crow, about the size of a sandhill crane',
      sizeCategory: 'very large'
    },
    similarSpecies: [
      {
        speciesCode: 'grnher',
        comName: 'Green Heron',
        differences: [
          'Green Heron is much smaller',
          'Darker, more compact body',
          'Shorter legs and neck'
        ]
      },
      {
        speciesCode: 'gryheron',
        comName: 'Grey Heron',
        differences: [
          'Grey Heron has white crown and face (not dark cap)',
          'Less rusty thighs',
          'Rare in North America'
        ]
      }
    ],
    seasonalPlumage: {
      seasonal: false
    },
    sexualDimorphism: {
      hasDimorphism: false
    }
  }
};

// Function to get identification info for a bird
export function getBirdIdentificationInfo(speciesCode: string): BirdIdentificationInfo | null {
  return birdIdentificationData[speciesCode] || null;
}