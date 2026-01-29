import { useQuery } from '@tanstack/react-query';

export interface IpLocationResult {
  lat: number;
  lng: number;
  city: string;
  isApproximate: true;
}

interface IpApiResponse {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  city?: string;
}

const IP_LOCATION_ENDPOINT = 'https://ipapi.co/json/';

async function fetchIpLocation(): Promise<IpLocationResult> {
  const response = await fetch(IP_LOCATION_ENDPOINT, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('IP location request failed');
  }

  const data: IpApiResponse = await response.json();
  const lat = Number(data.latitude ?? data.lat);
  const lng = Number(data.longitude ?? data.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('IP location response invalid');
  }

  return {
    lat,
    lng,
    city: data.city ?? '',
    isApproximate: true,
  };
}

export function useIpLocation() {
  return useQuery({
    queryKey: ['ip-location'],
    queryFn: fetchIpLocation,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}
