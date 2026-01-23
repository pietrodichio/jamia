import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['common', 'events']);
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
        title: 'Errore di localizzazione',
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
        <Label className="text-lg font-semibold">Posizione</Label>

        <Button
          onClick={requestLocation}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Rilevamento in corso...' : 'Usa la mia posizione'}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          oppure
        </div>

        {/* City search placeholder */}
        <div className="space-y-1">
          <Input
            placeholder="Ricerca per città in arrivo..."
            disabled
            className="opacity-50"
          />
          <p className="text-xs text-muted-foreground">
            La ricerca per città sarà disponibile in futuro
          </p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          oppure inserisci le coordinate manualmente:
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="latitude">Latitudine</Label>
            <Input
              id="latitude"
              type="number"
              placeholder="es. 45.464"
              value={manualLat}
              onChange={(e) => handleManualLatChange(e.target.value)}
              step="any"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="longitude">Longitudine</Label>
            <Input
              id="longitude"
              type="number"
              placeholder="es. 9.189"
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
            <Label htmlFor="radius">Raggio di ricerca</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearLocation}
            >
              Cancella
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
            Posizione attuale: {parseFloat(filters.lat).toFixed(3)}, {parseFloat(filters.lng).toFixed(3)}
          </p>
        </div>
      )}
    </div>
  );
}
