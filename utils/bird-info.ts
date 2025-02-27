import { Platform } from 'react-native';

// In-memory cache for bird information
const birdInfoCache = new Map<string, any>();

export async function fetchBirdInfo(scientificName: string, commonName: string) {
  // Generate a cache key
  const cacheKey = `${scientificName}-${commonName}`;
  
  // Check cache first
  if (birdInfoCache.has(cacheKey)) {
    return birdInfoCache.get(cacheKey);
  }
  
  try {
    // First, try to get information from Wikipedia
    const wikipediaInfo = await fetchWikipediaInfo(scientificName, commonName);
    
    // Add audio URL using scientific name
    const audioUrl = `https://xeno-canto.org/explore?query=${encodeURIComponent(scientificName)}`;
    
    // Combine with any additional sources in the future
    const birdInfo = {
      ...wikipediaInfo,
      audioUrl,
      // Add other sources here
    };
    
    // Cache the result
    birdInfoCache.set(cacheKey, birdInfo);
    
    return birdInfo;
  } catch (error) {
    console.error('Error fetching bird info:', error);
    return null;
  }
}

async function fetchWikipediaInfo(scientificName: string, commonName: string) {
  try {
    // Try scientific name first, then common name
    let pageTitle = scientificName;
    let pageData = await searchWikipedia(pageTitle);
    
    // If no results with scientific name, try common name
    if (!pageData.extract && commonName) {
      pageTitle = commonName;
      pageData = await searchWikipedia(pageTitle);
    }
    
    // If still no results, try with "bird" appended
    if (!pageData.extract && commonName) {
      pageTitle = `${commonName} bird`;
      pageData = await searchWikipedia(pageTitle);
    }
    
    // Extract relevant information from the page content
    const info = extractBirdInfo(pageData.extract || '');
    
    return {
      description: pageData.extract || null,
      wikipediaUrl: pageData.url || null,
      ...info,
    };
  } catch (error) {
    console.error('Error fetching Wikipedia info:', error);
    return {};
  }
}

async function searchWikipedia(searchTerm: string) {
  try {
    // First, search for the page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(searchTerm)}&origin=*`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.query.search || searchData.query.search.length === 0) {
      return { extract: null, url: null };
    }
    
    // Get the page title from the first search result
    const pageTitle = searchData.query.search[0].title;
    
    // Then, get the page content
    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(pageTitle)}&origin=*`;
    
    const contentResponse = await fetch(contentUrl);
    const contentData = await contentResponse.json();
    
    // Extract the page ID and content
    const pages = contentData.query.pages;
    const pageId = Object.keys(pages)[0];
    
    if (pageId === '-1') {
      return { extract: null, url: null };
    }
    
    const extract = pages[pageId].extract || null;
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
    
    return { extract, url };
  } catch (error) {
    console.error('Error searching Wikipedia:', error);
    return { extract: null, url: null };
  }
}

function extractBirdInfo(text: string) {
  const info: { habitat?: string; diet?: string; behavior?: string } = {};
  
  // Simple pattern matching to extract information
  // This is a basic implementation - a more sophisticated approach would use NLP
  
  // Look for habitat information
  const habitatPatterns = [
    /habitat[s]?[:\s]+([^\.]+)/i,
    /live[s]? in ([^\.]+)/i,
    /found in ([^\.]+)/i,
    /inhabit[s]? ([^\.]+)/i,
  ];
  
  for (const pattern of habitatPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      info.habitat = match[1].trim();
      break;
    }
  }
  
  // Look for diet information
  const dietPatterns = [
    /diet[:\s]+([^\.]+)/i,
    /feed[s]? on ([^\.]+)/i,
    /eat[s]? ([^\.]+)/i,
  ];
  
  for (const pattern of dietPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      info.diet = match[1].trim();
      break;
    }
  }
  
  // Look for behavior information
  const behaviorPatterns = [
    /behavior[:\s]+([^\.]+)/i,
    /behaviour[:\s]+([^\.]+)/i,
    /known for ([^\.]+)/i,
  ];
  
  for (const pattern of behaviorPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      info.behavior = match[1].trim();
      break;
    }
  }
  
  return info;
}