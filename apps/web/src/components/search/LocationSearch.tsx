import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useEventFilters } from '@/hooks/useEventFilters';
import { useIpLocation } from '@/hooks/useIpLocation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CitySearchInput } from './CitySearchInput';

const RADIUS_OPTIONS = [
  { value: '10', label: '10 km' },
  { value: '25', label: '25 km' },
  { value: '50', label: '50 km' },
  { value: '100', label: '100 km' },
  { value: '200', label: '200 km' },
];

type LocationType = 'ip' | 'gps' | 'city';

export function LocationSearch() {
  const { t } = useTranslation(['common', 'events']);
  const { filters, updateFilter } = useEventFilters();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locationType, setLocationType] = useState<LocationType | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [showCitySearch, setShowCitySearch] = useState(false);
  const hasAutoApplied = useRef(false);

  // IP location hook with React Query caching
  const { data: ipLocation, isSuccess: ipLocationReady } = useIpLocation();

  const applyLocation = (
    latitude: number,
    longitude: number,
    type: LocationType,
    city?: string
  ) => {
    updateFilter('lat', latitude.toString());
    updateFilter('lng', longitude.toString());
    setLocationType(type);
    setCityName(city || null);
  };

  // Auto-apply IP location on mount when no location is set
  useEffect(() => {
    const hasExistingLocation = filters.lat && filters.lng;

    // Only auto-apply once, and only if no location already set
    if (
      !hasAutoApplied.current &&
      !hasExistingLocation &&
      ipLocationReady &&
      ipLocation
    ) {
      hasAutoApplied.current = true;
      applyLocation(ipLocation.lat, ipLocation.lng, 'ip', ipLocation.city);
      toast({
        title: 'Posizione rilevata automaticamente',
        description: ipLocation.city
          ? `Vicino a ${ipLocation.city}`
          : 'Posizione approssimativa basata su IP',
      });
    }
  }, [ipLocationReady, ipLocation, filters.lat, filters.lng]);

  // Handle city selection from CitySearchInput
  const handleCitySelect = (location: { lat: number; lng: number; city: string }) => {
    applyLocation(location.lat, location.lng, 'city', location.city);
    setShowCitySearch(false);
    toast({
      title: `Cercando eventi a ${location.city}`,
      description: 'Filtri aggiornati per la nuova posizione',
    });
  };

  const requestPreciseLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocalizzazione non supportata',
        description: 'Il tuo browser non supporta la geolocalizzazione precisa',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyLocation(
          position.coords.latitude,
          position.coords.longitude,
          'gps'
        );
        setLoading(false);
        toast({
          title: 'Posizione precisa',
          description: 'Posizione GPS rilevata con successo',
        });
      },
      (err) => {
        toast({
          title: 'Errore di localizzazione',
          description:
            err.code === err.PERMISSION_DENIED
              ? 'Permesso di geolocalizzazione negato'
              : err.message,
          variant: 'destructive',
        });
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // 1 minute cache for precise location
      }
    );
  };

  const handleRadiusChange = (value: string) => {
    updateFilter('radius', value);
  };

  const handleClearLocation = () => {
    updateFilter('lat', '');
    updateFilter('lng', '');
    setLocationType(null);
    setCityName(null);
    setShowCitySearch(false);
    hasAutoApplied.current = true; // Prevent re-auto-apply after clearing
  };

  const hasLocation = filters.lat && filters.lng;

  // Determine button text based on state
  const getButtonText = () => {
    if (loading) return 'Rilevamento...';
    if (!hasLocation) return 'Posizione';
    if (locationType === 'ip') return 'Posizione precisa';
    return '\u2713 Posizione';
  };

  // Get location indicator text
  const getLocationIndicator = () => {
    if (!hasLocation) return null;
    if (locationType === 'city' && cityName) return cityName;
    if (locationType === 'ip') return '(rilevata automaticamente)';
    if (locationType === 'gps') return '(precisa)';
    return null;
  };

  const locationIndicator = getLocationIndicator();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            onClick={requestPreciseLocation}
            disabled={loading}
            size="sm"
            variant={hasLocation && locationType === 'gps' ? 'default' : 'outline'}
            className="h-9"
          >
            {getButtonText()}
          </Button>
          {locationIndicator && (
            <span className="text-xs text-muted-foreground">{locationIndicator}</span>
          )}
        </div>

        {/* City search toggle button */}
        <Button
          onClick={() => setShowCitySearch(!showCitySearch)}
          size="sm"
          variant="outline"
          className="h-9 gap-1"
        >
          <MapPin className="h-4 w-4" />
          Cerca citta
          {showCitySearch ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        {hasLocation && (
          <>
            <Select value={filters.radius} onValueChange={handleRadiusChange}>
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

      {/* City search input - collapsible section */}
      {showCitySearch && (
        <div className="pt-1">
          <CitySearchInput
            onCitySelect={handleCitySelect}
            placeholder="Cerca una citta..."
          />
        </div>
      )}
    </div>
  );
}
