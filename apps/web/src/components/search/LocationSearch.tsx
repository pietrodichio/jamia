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

export function LocationSearch() {
  const { t } = useTranslation(['common', 'events']);
  const { filters, updateFilter } = useEventFilters();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isApproximate, setIsApproximate] = useState(false);
  const hasAutoApplied = useRef(false);

  // IP location hook with React Query caching
  const { data: ipLocation, isSuccess: ipLocationReady } = useIpLocation();

  const applyLocation = (
    latitude: number,
    longitude: number,
    approximate = false
  ) => {
    updateFilter('lat', latitude.toString());
    updateFilter('lng', longitude.toString());
    setIsApproximate(approximate);
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
      applyLocation(ipLocation.lat, ipLocation.lng, true);
      toast({
        title: 'Posizione rilevata automaticamente',
        description: ipLocation.city
          ? `Vicino a ${ipLocation.city}`
          : 'Posizione approssimativa basata su IP',
      });
    }
  }, [ipLocationReady, ipLocation, filters.lat, filters.lng]);

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
          false
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
    setIsApproximate(false);
    hasAutoApplied.current = true; // Prevent re-auto-apply after clearing
  };

  const hasLocation = filters.lat && filters.lng;

  // Determine button text based on state
  const getButtonText = () => {
    if (loading) return 'Rilevamento...';
    if (!hasLocation) return 'Posizione';
    if (isApproximate) return 'Posizione precisa';
    return '\u2713 Posizione';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          onClick={requestPreciseLocation}
          disabled={loading}
          size="sm"
          variant={hasLocation && !isApproximate ? 'default' : 'outline'}
          className="h-9"
        >
          {getButtonText()}
        </Button>
        {hasLocation && isApproximate && (
          <span className="text-xs text-muted-foreground">(approssimativa)</span>
        )}
      </div>
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
  );
}
