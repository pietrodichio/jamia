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

      // Check if already loaded
      if ((window as any).google?.maps?.places) {
        return true;
      }

      // Load the script
      await loadGoogleMaps(apiKey, mapsLoader);

      // Import the places library
      const googleMaps = (window as any).google?.maps;
      if (!googleMaps?.places) {
        return false;
      }

      try {
        await googleMaps.importLibrary('places');
        return true;
      } catch {
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
