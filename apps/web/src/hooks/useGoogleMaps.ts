import { useQuery } from '@tanstack/react-query';
import { loadGoogleMaps } from '@/components/jams/utils/google-maps';
import { useRef } from 'react';

type GoogleMapsLoadStatus = 'missing_key' | 'loading' | 'loaded' | 'error';

/**
 * Hook to load Google Maps API using React Query
 * Provides caching, loading states, and error handling
 */
export function useGoogleMaps(apiKey?: string) {
  const mapsLoader = useRef<Promise<void> | null>(null);

  const { data, isLoading, error, isError } = useQuery({
    queryKey: ['google-maps', apiKey, 'places-v2'],
    queryFn: async () => {
      // Check if places library with AutocompleteSuggestion is already loaded
      const existingMaps = (window as any).google?.maps;
      if (existingMaps?.places?.AutocompleteSuggestion) {
        return true;
      }

      // Load the base script if not loaded
      if (!existingMaps) {
        await loadGoogleMaps(apiKey, mapsLoader);
      }

      // Import the places library using the new API
      const googleMaps = (window as any).google?.maps;
      if (!googleMaps) {
        throw new Error('Google Maps not available after script load');
      }

      try {
        // Use importLibrary to load the places library (new API)
        await googleMaps.importLibrary('places');

        // Verify AutocompleteSuggestion is available
        if (!googleMaps.places?.AutocompleteSuggestion) {
          throw new Error('Places library loaded without AutocompleteSuggestion');
        }

        return true;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to import Google Places library');
      }
    },
    enabled: !!apiKey,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const status: GoogleMapsLoadStatus = (() => {
    if (!apiKey) {
      return 'missing_key';
    }
    if (data === true) {
      return 'loaded';
    }
    if (isLoading) {
      return 'loading';
    }
    if (isError) {
      return 'error';
    }
    return 'loading';
  })();

  return {
    isLoaded: data === true,
    isLoading,
    error,
    status,
    errorReason: error instanceof Error ? error.message : undefined,
    googleMaps: (window as any).google?.maps,
  };
}
