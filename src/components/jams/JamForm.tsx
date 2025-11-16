import { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "quill-emoji/dist/quill-emoji.css";
import "quill-emoji";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { JamFormValues, formatDateTimeLocalInput } from "@/lib/jam-form";

const toolbarModules = {
  toolbar: {
    container: [
      [{ header: [1, 2, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["link", "emoji"],
      ["clean"],
    ],
  },
  "emoji-toolbar": true,
  "emoji-textarea": false,
  "emoji-shortname": true,
};

type JamFormProps = {
  form: UseFormReturn<JamFormValues>;
  onSubmit: (values: JamFormValues) => Promise<void> | void;
  submitLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  defaultDurationHours?: number;
};

export const JamForm = ({
  form,
  onSubmit,
  submitLabel,
  cancelLabel,
  onCancel,
  defaultDurationHours = 4,
}: JamFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = form;

  const startsAt = watch("starts_at");
  const capacity = watch("capacity");
  const descriptionValue = watch("description") || "";
  const autoPromote = watch("auto_promote");
  const publicParticipants = watch("public_participants");

  useEffect(() => {
    if (!startsAt || startsAt.length !== 16) {
      return;
    }

    const timer = setTimeout(() => {
      const start = new Date(startsAt);
      const proposedEnd = new Date(start);
      proposedEnd.setHours(proposedEnd.getHours() + defaultDurationHours);

      const endOfDay = new Date(start);
      endOfDay.setHours(23, 59, 0, 0);

      const finalEnd = proposedEnd > endOfDay ? endOfDay : proposedEnd;
      const formattedEnd = formatDateTimeLocalInput(finalEnd);
      setValue("ends_at", formattedEnd);
    }, 500);

    return () => clearTimeout(timer);
  }, [startsAt, setValue, defaultDurationHours]);

  useEffect(() => {
    if (!capacity || capacity <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      const totalCapacity = Number(capacity);
      const idealBases = Math.floor(totalCapacity / 3);
      const idealFlyers = totalCapacity - idealBases;

      const basesMin = Math.max(0, idealBases - 1);
      const basesMax = idealBases + 1;

      let flyersMin = Math.max(0, idealFlyers - 2);
      const flyersMax = idealFlyers + 2;

      if (basesMax + flyersMin < totalCapacity) {
        flyersMin = totalCapacity - basesMax;
      }

      setValue("desired_bases_min", basesMin);
      setValue("desired_bases_max", basesMax);
      setValue("desired_flyers_min", flyersMin);
      setValue("desired_flyers_max", flyersMax);
    }, 500);

    return () => clearTimeout(timer);
  }, [capacity, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jam-name">Nome della Jam *</Label>
          <Input
            id="jam-name"
            placeholder="es. Jam di AcroYoga a Milano"
            {...register("name")}
            disabled={isSubmitting}
            className="rounded-xl"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-1">{String(errors.name.message || "")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="jam-location">
            <MapPin className="inline h-4 w-4 mr-1" />
            Luogo *
          </Label>
          <Input
            id="jam-location"
            placeholder="es. Parco Sempione, Milano"
            {...register("location_text")}
            disabled={isSubmitting}
            className="rounded-xl"
          />
          {errors.location_text && (
            <p className="text-xs text-destructive mt-1">{String(errors.location_text.message || "")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="jam-gmaps">Link Google Maps (opzionale)</Label>
          <Input
            id="jam-gmaps"
            type="url"
            placeholder="https://maps.google.com/..."
            {...register("gmaps_link")}
            disabled={isSubmitting}
            className="rounded-xl"
          />
          {errors.gmaps_link && (
            <p className="text-xs text-destructive mt-1">{String(errors.gmaps_link.message || "")}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jam-starts">
            <CalendarIcon className="inline h-4 w-4 mr-1" />
            Inizio *
          </Label>
          <Input
            id="jam-starts"
            type="datetime-local"
            {...register("starts_at")}
            disabled={isSubmitting}
            className="rounded-xl"
          />
          {errors.starts_at && (
            <p className="text-xs text-destructive mt-1">{String(errors.starts_at.message || "")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="jam-ends">Fine *</Label>
          <Input
            id="jam-ends"
            type="datetime-local"
            {...register("ends_at")}
            disabled={isSubmitting}
            className="rounded-xl"
          />
          {errors.ends_at && (
            <p className="text-xs text-destructive mt-1">{String(errors.ends_at.message || "")}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="jam-description">Descrizione</Label>
        <div className="rounded-xl border border-input focus-within:ring-2 focus-within:ring-ring">
          <ReactQuill
            theme="snow"
            value={descriptionValue}
            onChange={(value) => setValue("description", value, { shouldDirty: true })}
            modules={toolbarModules}
            placeholder="Descrivi la tua jam, livello, cosa portare..."
            readOnly={isSubmitting}
          />
        </div>
      </div>

      <div className="space-y-4 p-4 bg-secondary/30 rounded-xl">
        <h3 className="font-semibold text-sm">Impostazioni Capacità</h3>

        <div className="space-y-2">
          <Label htmlFor="jam-capacity">Capacità totale (opzionale)</Label>
          <Input
            id="jam-capacity"
            type="number"
            min="1"
            placeholder="Lascia vuoto per nessun limite"
            {...register("capacity", { valueAsNumber: true })}
            disabled={isSubmitting}
            className="rounded-xl"
          />
          {errors.capacity && (
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
              {...register("desired_bases_min", { valueAsNumber: true })}
              disabled={isSubmitting}
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
              {...register("desired_bases_max", { valueAsNumber: true })}
              disabled={isSubmitting}
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
              {...register("desired_flyers_min", { valueAsNumber: true })}
              disabled={isSubmitting}
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
              {...register("desired_flyers_max", { valueAsNumber: true })}
              disabled={isSubmitting}
              className="rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
        <div className="space-y-1">
          <Label htmlFor="jam-auto-promote" className="text-base">
            Promozione automatica
          </Label>
          <p className="text-sm text-muted-foreground">
            Promuovi automaticamente dalla lista d'attesa quando si libera un posto
          </p>
        </div>
        <Switch
          id="jam-auto-promote"
          checked={autoPromote}
          onCheckedChange={(checked) => setValue("auto_promote", checked, { shouldDirty: true })}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
        <div className="space-y-1">
          <Label htmlFor="jam-public-participants" className="text-base">
            Mostra partecipanti pubblicamente
          </Label>
          <p className="text-sm text-muted-foreground">
            Consenti a chiunque di vedere la lista dei partecipanti
          </p>
        </div>
        <Switch
          id="jam-public-participants"
          checked={publicParticipants}
          onCheckedChange={(checked) => setValue("public_participants", checked, { shouldDirty: true })}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1 rounded-xl" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-xl"
        >
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
};

export default JamForm;
