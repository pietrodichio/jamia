import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

type GoogleMapsPrediction = {
  place_id: string;
  description: string;
};

type LocationInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placePredictions: GoogleMapsPrediction[];
  isLoadingPlaces: boolean;
  onSelectPrediction: (prediction: GoogleMapsPrediction) => void;
};

export const LocationInput = ({
  value,
  onChange,
  error,
  disabled,
  placePredictions,
  isLoadingPlaces,
  onSelectPrediction,
}: LocationInputProps) => {
  return (
    <div className="space-y-2">
      <Input
        id="jam-location"
        placeholder="Scrivi il luogo della jam"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-xl"
      />
      {placePredictions.length > 0 && (
        <div className="border rounded-xl bg-background shadow-sm divide-y mt-1">
          {placePredictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors"
              onClick={() => onSelectPrediction(prediction)}
              disabled={disabled}
            >
              {prediction.description}
            </button>
          ))}
        </div>
      )}
      {isLoadingPlaces && <p className="text-xs text-muted-foreground mt-1">Caricamento suggerimenti...</p>}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};

