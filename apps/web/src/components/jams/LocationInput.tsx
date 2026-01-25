import { Input } from "@/components/ui/input";

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
        placeholder="Scrivi il luogo dell'evento"
        value={value}
        onChange={(e) => {
          console.log('[LocationInput] Input onChange', { value: e.target.value });
          onChange(e.target.value);
        }}
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
              onClick={() => {
                console.log('[LocationInput] Prediction clicked', {
                  place_id: prediction.place_id,
                  description: prediction.description,
                });
                onSelectPrediction(prediction);
              }}
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

