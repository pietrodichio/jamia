import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type CapacitySettingsProps = {
  capacity?: number;
  basesMin?: number;
  basesMax?: number;
  flyersMin?: number;
  flyersMax?: number;
  onCapacityChange: (value: number | undefined) => void;
  onBasesMinChange: (value: number | undefined) => void;
  onBasesMaxChange: (value: number | undefined) => void;
  onFlyersMinChange: (value: number | undefined) => void;
  onFlyersMaxChange: (value: number | undefined) => void;
  errors?: {
    capacity?: { message?: string };
    desired_bases_min?: { message?: string };
    desired_bases_max?: { message?: string };
    desired_flyers_min?: { message?: string };
    desired_flyers_max?: { message?: string };
  };
  disabled?: boolean;
};

export const CapacitySettings = ({
  capacity,
  basesMin,
  basesMax,
  flyersMin,
  flyersMax,
  onCapacityChange,
  onBasesMinChange,
  onBasesMaxChange,
  onFlyersMinChange,
  onFlyersMaxChange,
  errors,
  disabled,
}: CapacitySettingsProps) => {
  return (
    <div className="space-y-4 p-4 bg-secondary/30 rounded-xl">
      <h3 className="font-semibold text-sm">Impostazioni Capacità</h3>

      <div className="space-y-2">
        <Label htmlFor="jam-capacity">Capacità totale (opzionale)</Label>
        <Input
          id="jam-capacity"
          type="number"
          min="1"
          placeholder="Lascia vuoto per nessun limite"
          value={capacity ?? ""}
          onChange={(e) => onCapacityChange(e.target.value ? Number(e.target.value) : undefined)}
          disabled={disabled}
          className="rounded-xl"
        />
        {errors?.capacity && (
          <p className="text-xs text-destructive mt-1">{String(errors.capacity.message || "")}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Se omesso, la jam avrà posti illimitati. I campi sotto si aggiorneranno automaticamente con ratio 2:1 (flyer:base).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jam-bases-min">Base Min</Label>
          <Input
            id="jam-bases-min"
            type="number"
            min="0"
            placeholder="0"
            value={basesMin ?? ""}
            onChange={(e) => onBasesMinChange(e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jam-bases-max">Base Max</Label>
          <Input
            id="jam-bases-max"
            type="number"
            min="0"
            placeholder="∞"
            value={basesMax ?? ""}
            onChange={(e) => onBasesMaxChange(e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jam-flyers-min">Flyer Min</Label>
          <Input
            id="jam-flyers-min"
            type="number"
            min="0"
            placeholder="0"
            value={flyersMin ?? ""}
            onChange={(e) => onFlyersMinChange(e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jam-flyers-max">Flyer Max</Label>
          <Input
            id="jam-flyers-max"
            type="number"
            min="0"
            placeholder="∞"
            value={flyersMax ?? ""}
            onChange={(e) => onFlyersMaxChange(e.target.value ? Number(e.target.value) : undefined)}
            disabled={disabled}
            className="rounded-xl"
          />
        </div>
      </div>
    </div>
  );
};

