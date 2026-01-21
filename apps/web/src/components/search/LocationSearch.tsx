import { useState, useEffect } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useEventFilters } from '@/hooks/useEventFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export function LocationSearch() {
  const { location, error, loading, requestLocation } = useGeolocation();
  const { filters, updateFilter } = useEventFilters();
  const { toast } = useToast();

  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  // Update manual inputs when filters change from URL
  useEffect(() => {
    if (filters.lat) setManualLat(filters.lat);
    if (filters.lng) setManualLng(filters.lng);
  }, [filters.lat, filters.lng]);

  // Update filters when geolocation succeeds
  useEffect(() => {
    if (location) {
      updateFilter('lat', location.lat.toString());
      updateFilter('lng', location.lng.toString());
      setManualLat(location.lat.toString());
      setManualLng(location.lng.toString());
    }
  }, [location]);

  // Show error toast when geolocation fails
  useEffect(() => {
    if (error) {
      toast({
        title: 'Location Error',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  const handleManualLatChange = (value: string) => {
    setManualLat(value);
    if (value && manualLng) {
      updateFilter('lat', value);
    } else if (!value) {
      updateFilter('lat', '');
    }
  };

  const handleManualLngChange = (value: string) => {
    setManualLng(value);
    if (value && manualLat) {
      updateFilter('lng', value);
    } else if (!value) {
      updateFilter('lng', '');
    }
  };

  const handleRadiusChange = (value: string) => {
    updateFilter('radius', value);
  };

  const handleClearLocation = () => {
    setManualLat('');
    setManualLng('');
    updateFilter('lat', '');
    updateFilter('lng', '');
  };

  const hasLocation = filters.lat && filters.lng;

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="space-y-2">
        <Label className="text-lg font-semibold">Location</Label>

        <Button
          onClick={requestLocation}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Getting location...' : 'Use My Location'}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          or
        </div>

        {/* City search placeholder */}
        <div className="space-y-1">
          <Input
            placeholder="City search coming soon..."
            disabled
            className="opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            City search will be available in Phase 5
          </p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          or enter coordinates manually:
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              placeholder="e.g., 45.464"
              value={manualLat}
              onChange={(e) => handleManualLatChange(e.target.value)}
              step="any"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              placeholder="e.g., 9.189"
              value={manualLng}
              onChange={(e) => handleManualLngChange(e.target.value)}
              step="any"
            />
          </div>
        </div>
      </div>

      {hasLocation && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="radius">Search Radius</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearLocation}
            >
              Clear
            </Button>
          </div>
          <Select
            value={filters.radius}
            onValueChange={handleRadiusChange}
          >
            <SelectTrigger id="radius">
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
          <p className="text-xs text-muted-foreground">
            Current location: {parseFloat(filters.lat).toFixed(3)}, {parseFloat(filters.lng).toFixed(3)}
          </p>
        </div>
      )}
    </div>
  );
}
