import { Platform } from 'react-native';

// Function to check if filename is a valid image and contains bird name parts
function isRelevantBirdImage(filename: string, scientificName: string, commonName?: string): boolean {
  filename = filename.toLowerCase();
  
  // Filter out non-image files
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const isImageFile = imageExtensions.some(ext => filename.endsWith(ext));
  
  // Filter out audio, video, document files, icons, and thumbnails
  const excludedTerms = ['.ogg', '.mp3', '.wav', '.mp4', '.pdf', '.doc', '.docx', 'icon', 'thumbnail', 'thumb', 'logo'];
  if (excludedTerms.some(term => filename.includes(term)) || !isImageFile) {
    return false;
  }
  
  // Filter out egg images
  if (filename.includes('egg')) {
    return false;
  }
  
  // Split scientific name into genus and species
  const nameParts = scientificName.toLowerCase().split(' ');
  const genus = nameParts[0];
  const species = nameParts.length > 1 ? nameParts[1] : '';
  
  // Check if filename contains genus or species
  if (genus && filename.includes(genus)) {
    return true;
  }
  
  if (species && species.length > 3 && filename.includes(species)) {
    return true;
  }
  
  // Check common name if provided
  if (commonName) {
    const commonNameParts = commonName.toLowerCase().split(' ');
    // Check if any significant part of the common name is in the filename
    for (const part of commonNameParts) {
      // Skip very short words or common words
      if (part.length > 3 && !['the', 'and', 'for', 'with'].includes(part)) {
        if (filename.includes(part)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Function to fetch bird images from Wikimedia Commons
export async function fetchBirdImage(scientificName: string, commonName?: string): Promise<string | null> {
  try {
    // First, search for the page about this bird
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(scientificName)}&pithumbsize=500&origin=*`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    // Extract the page ID
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    
    // If we have a thumbnail, check if it's relevant
    if (pages[pageId].thumbnail && pages[pageId].thumbnail.source) {
      const imageUrl = pages[pageId].thumbnail.source;
      const filename = imageUrl.split('/').pop() || '';
      
      if (isRelevantBirdImage(filename, scientificName, commonName)) {
        return imageUrl;
      }
    }
    
    // If no relevant thumbnail found, try with the Commons API directly
    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=${encodeURIComponent(scientificName + " bird photo")}&srnamespace=6&srlimit=15&origin=*`;
    
    const commonsResponse = await fetch(commonsUrl);
    const commonsData = await commonsResponse.json();
    
    if (commonsData.query.search && commonsData.query.search.length > 0) {
      // Filter results to find relevant images
      const validResults = commonsData.query.search.filter(
        result => isRelevantBirdImage(result.title, scientificName, commonName)
      );
      
      if (validResults.length === 0) {
        return null;
      }
      
      const fileName = validResults[0].title;
      
      // Get the image URL
      const fileInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&titles=${encodeURIComponent(fileName)}&iiprop=url&iiurlwidth=500&origin=*`;
      
      const fileInfoResponse = await fetch(fileInfoUrl);
      const fileInfoData = await fileInfoResponse.json();
      
      const filePages = fileInfoData.query.pages;
      const filePageId = Object.keys(filePages)[0];
      
      if (filePages[filePageId].imageinfo && filePages[filePageId].imageinfo[0]) {
        return filePages[filePageId].imageinfo[0].thumburl;
      }
    }
    
    // If all attempts fail, return null
    return null;
  } catch (error) {
    console.error('Error fetching bird image:', error);
    return null;
  }
}

// Function to fetch multiple bird images in parallel
export async function fetchBirdImages(birds: Array<{ speciesCode: string; sciName: string; comName: string }>) {
  // Create a map to store images by species code
  const imageMap: Record<string, string> = {};
  
  // Limit concurrent requests to avoid overwhelming the API
  const batchSize = Platform.OS === 'web' ? 3 : 5;
  
  // Process birds in batches
  for (let i = 0; i < birds.length; i += batchSize) {
    const batch = birds.slice(i, i + batchSize);
    
    // Process each batch in parallel
    const batchPromises = batch.map(async (bird) => {
      try {
        const imageUrl = await fetchBirdImage(bird.sciName, bird.comName);
        if (imageUrl) {
          imageMap[bird.speciesCode] = imageUrl;
        }
      } catch (error) {
        console.error(`Error fetching image for ${bird.sciName}:`, error);
      }
    });
    
    // Wait for the current batch to complete before moving to the next
    await Promise.all(batchPromises);
  }
  
  return imageMap;
}