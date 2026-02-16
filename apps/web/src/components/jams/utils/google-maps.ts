import { type MutableRefObject } from "react";

export const parseGoogleMapsUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (!url.hostname.includes("google.")) return null;

    const pathMatch = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (pathMatch) {
      return { lat: Number(pathMatch[1]), lng: Number(pathMatch[2]), url: url.toString() };
    }

    const query = url.searchParams.get("query") || url.searchParams.get("q");
    if (query) {
      const queryMatch = query.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      if (queryMatch) {
        return { lat: Number(queryMatch[1]), lng: Number(queryMatch[2]), url: url.toString() };
      }
    }

    return { lat: undefined, lng: undefined, url: url.toString() };
  } catch {
    return null;
  }
};

export const loadGoogleMaps = (apiKey?: string, loaderRef?: MutableRefObject<Promise<void> | null>) => {
  if (!apiKey) return Promise.resolve();
  // Check if Google Maps core is already loaded
  if ((window as any).google?.maps) return Promise.resolve();
  if (loaderRef?.current) return loaderRef.current;

  loaderRef!.current = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    // Use loading=async for proper async loading pattern (required for importLibrary)
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`;
    script.async = true;
    script.onerror = reject;
    script.onload = () => resolve();
    document.body.appendChild(script);
  });

  return loaderRef.current;
};

