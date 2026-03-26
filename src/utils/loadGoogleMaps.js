// src/utils/loadGoogleMaps.js
let isScriptLoaded = false;
let loadingPromise = null;

export const loadGoogleMapsScript = (apiKey) => {
  // If already loaded, resolve immediately
  if (isScriptLoaded && window.google && window.google.maps) {
    return Promise.resolve();
  }

  // If already loading, return the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Create new promise to load the script
  loadingPromise = new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector('#google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        isScriptLoaded = true;
        resolve();
      });
      existingScript.addEventListener('error', reject);
      return;
    }

    // Create and load the script
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    // Create a global callback function
    window.initGoogleMaps = () => {
      isScriptLoaded = true;
      delete window.initGoogleMaps;
      resolve();
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Google Maps script', error);
      delete window.initGoogleMaps;
      loadingPromise = null;
      reject(error);
    };
    
    document.head.appendChild(script);
  });

  return loadingPromise;
};

// Helper to check if Google Maps is loaded
export const isGoogleMapsLoaded = () => {
  return isScriptLoaded && window.google && window.google.maps;
};

// Helper to wait for Google Maps to load (with timeout)
export const waitForGoogleMaps = (timeout = 10000) => {
  if (isGoogleMapsLoaded()) {
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isGoogleMapsLoaded()) {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('Google Maps loading timeout'));
      }
    }, 100);
  });
};