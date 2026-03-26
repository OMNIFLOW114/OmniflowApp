// src/hooks/useGooglePlaces.js
import { useState, useRef, useCallback } from 'react';

export const useGooglePlaces = (apiKey) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [error, setError] = useState(null);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);

  // Check if Google Maps is loaded
  const isGoogleMapsLoaded = useCallback(() => {
    return window.google && window.google.maps && window.google.maps.places;
  }, []);

  // Initialize Google Places services
  const initServices = useCallback(() => {
    if (!isGoogleMapsLoaded()) {
      console.error('Google Maps script not loaded');
      setError('Google Maps not loaded. Please check your API key.');
      return false;
    }
    
    if (!autocompleteService.current) {
      try {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        placesService.current = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
        setError(null);
        return true;
      } catch (error) {
        console.error('Failed to initialize Google Places services:', error);
        setError('Failed to initialize Places services');
        return false;
      }
    }
    return true;
  }, [isGoogleMapsLoaded]);

  // Search addresses
  const searchAddresses = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return [];
    }

    const servicesReady = initServices();
    if (!servicesReady) {
      console.warn('Google Places services not ready');
      return [];
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      autocompleteService.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'ke' },
          types: ['address', 'geocode', 'establishment']
        },
        (predictions, status) => {
          setLoading(false);
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const formattedSuggestions = predictions.map(prediction => ({
              id: prediction.place_id,
              description: prediction.description,
              mainText: prediction.structured_formatting?.main_text || '',
              secondaryText: prediction.structured_formatting?.secondary_text || '',
              place_id: prediction.place_id
            }));
            setSuggestions(formattedSuggestions);
            resolve(formattedSuggestions);
          } else if (status === window.google.maps.places.PlacesServiceStatus.ERROR) {
            console.error('Places service error:', status);
            setError('Failed to fetch address suggestions. Please check your API key.');
            setSuggestions([]);
            resolve([]);
          } else {
            setSuggestions([]);
            resolve([]);
          }
        }
      );
    });
  }, [initServices]);

  // Get place details
  const getPlaceDetails = useCallback((placeId) => {
    return new Promise((resolve, reject) => {
      const servicesReady = initServices();
      if (!servicesReady) {
        reject(new Error('Google Places services not ready'));
        return;
      }
      
      placesService.current.getDetails(
        {
          placeId: placeId,
          fields: ['geometry', 'formatted_address', 'name', 'address_components', 'place_id']
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const location = place.geometry?.location;
            const result = {
              id: place.place_id,
              place_id: place.place_id,
              address: place.formatted_address,
              name: place.name,
              coordinates: location ? {
                lat: location.lat(),
                lng: location.lng()
              } : null,
              address_components: place.address_components
            };
            setSelectedPlace(result);
            resolve(result);
          } else {
            reject(new Error(`Failed to get place details: ${status}`));
          }
        }
      );
    });
  }, [initServices]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const resetSelectedPlace = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  return {
    suggestions,
    loading,
    selectedPlace,
    error,
    searchAddresses,
    getPlaceDetails,
    clearSuggestions,
    resetSelectedPlace,
    isGoogleMapsLoaded
  };
};