import { useQuery } from '@tanstack/react-query';
import { loadGoogleMaps } from '@/components/jams/utils/google-maps';
import { useRef } from 'react';

/**
 * Hook to load Google Maps API using React Query
 * Provides caching, loading states, and error handling
 */
export function useGoogleMaps(apiKey?: string) {
  const mapsLoader = useRef<Promise<void> | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['google-maps', apiKey],
    queryFn: async () => {
      if (!apiKey) {
        return null;
      }

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
        console.error('[useGoogleMaps] Google Maps not available after loading');
        return false;
      }

      try {
        // Use importLibrary to load the places library (new API)
        await googleMaps.importLibrary('places');

        // Verify AutocompleteSuggestion is available
        if (!googleMaps.places?.AutocompleteSuggestion) {
          console.error('[useGoogleMaps] AutocompleteSuggestion not available after import');
          return false;
        }

        return true;
      } catch (err) {
        console.error('[useGoogleMaps] Failed to import places library:', err);
        // Fallback to manual input if library import fails
        return false;
      }
    },
    enabled: !!apiKey,
    staleTime: Infinity, // Never refetch once loaded
    gcTime: Infinity, // Keep in cache forever
    retry: false, // Don't retry on failure, fallback to manual input
  });

  return {
    isLoaded: data === true,
    isLoading,
    error,
    googleMaps: (window as any).google?.maps,
  };
}
