import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useEventFilters } from '@/hooks/useEventFilters';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const RADIUS_OPTIONS = [
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
  { value: '100', label: '100 km' },
  { value: '200', label: '200 km' },
];

const IP_LOCATION_ENDPOINT = 'https://ipapi.co/json/';

export function LocationSearch() {
  const { t } = useTranslation(['common', 'events']);
  const { filters, updateFilter } = useEventFilters();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const applyLocation = (latitude: number, longitude: number) => {
    updateFilter('lat', latitude.toString());
    updateFilter('lng', longitude.toString());
  };

  const requestIpLocation = async (reason: string) => {
    setLoading(true);
    try {
      const response = await fetch(IP_LOCATION_ENDPOINT, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error('IP location request failed');
      }
      const data = (await response.json()) as {
        latitude?: number;
        longitude?: number;
        lat?: number;
        lon?: number;
      };
      const latitude = Number(data.latitude ?? data.lat);
      const longitude = Number(data.longitude ?? data.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('IP location response invalid');
      }
      applyLocation(latitude, longitude);
      toast({
        title: 'Posizione approssimativa',
        description: reason,
      });
    } catch (err) {
      toast({
        title: 'Errore di localizzazione',
        description: 'Impossibile stimare la posizione via IP',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      void requestIpLocation('Geolocalizzazione non supportata, uso la posizione via IP.');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyLocation(position.coords.latitude, position.coords.longitude);
        setLoading(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          void requestIpLocation('Permesso negato, uso la posizione via IP.');
          return;
        }
        toast({
          title: 'Errore di localizzazione',
          description: err.message,
          variant: 'destructive',
        });
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const handleRadiusChange = (value: string) => {
    updateFilter('radius', value);
  };

  const handleClearLocation = () => {
    updateFilter('lat', '');
    updateFilter('lng', '');
  };

  const hasLocation = filters.lat && filters.lng;

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={requestLocation}
        disabled={loading}
        size="sm"
        variant={hasLocation ? 'default' : 'outline'}
        className="h-9"
      >
        {loading ? 'Rilevamento...' : hasLocation ? '✓ Posizione' : 'Posizione'}
      </Button>
      {hasLocation && (
        <>
          <Select
            value={filters.radius}
            onValueChange={handleRadiusChange}
          >
            <SelectTrigger id="radius" className="h-9 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearLocation}
            className="h-9 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
