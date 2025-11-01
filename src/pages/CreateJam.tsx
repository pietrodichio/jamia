import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { jamsApi } from "@/api/jams.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MapPin, Calendar as CalendarIcon } from "lucide-react";

interface CreateJamFormData {
  name: string;
  location_text: string;
  gmaps_link: string;
  starts_at: string;
  ends_at: string;
  description: string;
  capacity: number | "";
  desired_bases_min: number | "";
  desired_bases_max: number | "";
  desired_flyers_min: number | "";
  desired_flyers_max: number | "";
  auto_promote: boolean;
  public_participants: boolean;
}

const CreateJam = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<CreateJamFormData>({
    defaultValues: {
      name: "",
      location_text: "",
      gmaps_link: "",
      starts_at: "",
      ends_at: "",
      description: "",
      capacity: "",
      desired_bases_min: "",
      desired_bases_max: "",
      desired_flyers_min: "",
      desired_flyers_max: "",
      auto_promote: true,
      public_participants: true,
    },
  });

  // Watch fields for auto-fill logic
  const startsAt = watch("starts_at");
  const capacity = watch("capacity");

  // Auto-fill end date whenever start date changes
  // Debounced to wait for user to finish selecting both date and time
  useEffect(() => {
    if (startsAt) {
      const timer = setTimeout(() => {
        // Validate that we have a complete datetime (YYYY-MM-DDTHH:MM format)
        if (startsAt.length === 16) {
          const start = new Date(startsAt);
          // Add 1 hour
          start.setHours(start.getHours() + 5);
          // Format to datetime-local input format (YYYY-MM-DDTHH:mm)
          const formattedEnd = start.toISOString().slice(0, 16);
          setValue("ends_at", formattedEnd);
        }
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timer);
    }
  }, [startsAt, setValue]);

  // Auto-fill capacity fields whenever capacity changes
  // Golden rule: 2 flyers for each base (capacity = bases + flyers, flyers = 2 * bases)
  // So: capacity = bases + 2*bases = 3*bases → bases = capacity/3
  // Debounced to wait for user to finish typing
  useEffect(() => {
    if (capacity && capacity > 0) {
      const timer = setTimeout(() => {
        const totalCapacity = Number(capacity);
        const idealBases = Math.floor(totalCapacity / 3);
        const idealFlyers = totalCapacity - idealBases;

        // Bases: add flexibility ±1
        const basesMin = Math.max(0, idealBases - 1);
        const basesMax = idealBases + 1;
        
        // Flyers: add flexibility ±2
        let flyersMin = Math.max(0, idealFlyers - 2);
        const flyersMax = idealFlyers + 2;

        // Ensure that basesMax + flyersMin >= capacity
        // This guarantees we can always reach full capacity
        if (basesMax + flyersMin < totalCapacity) {
          flyersMin = totalCapacity - basesMax;
        }

        setValue("desired_bases_min", basesMin);
        setValue("desired_bases_max", basesMax);
        setValue("desired_flyers_min", flyersMin);
        setValue("desired_flyers_max", flyersMax);
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timer);
    }
  }, [capacity, setValue]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const onSubmit = async (data: CreateJamFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      // Validate dates
      const start = new Date(data.starts_at);
      const end = new Date(data.ends_at);
      if (end <= start) {
        throw new Error("La data di fine deve essere successiva alla data di inizio");
      }

      // Convert datetime-local strings (local time) to UTC ISO strings
      const startsAtUTC = start.toISOString();
      const endsAtUTC = end.toISOString();

      const jam = await jamsApi.createJam({
        name: data.name,
        location_text: data.location_text,
        gmaps_link: data.gmaps_link || undefined,
        starts_at: startsAtUTC,
        ends_at: endsAtUTC,
        description: data.description || undefined,
        capacity: data.capacity || undefined,
        desired_bases_min: data.desired_bases_min || undefined,
        desired_bases_max: data.desired_bases_max || undefined,
        desired_flyers_min: data.desired_flyers_min || undefined,
        desired_flyers_max: data.desired_flyers_max || undefined,
        auto_promote: data.auto_promote,
        public_participants: data.public_participants,
      });

      toast({
        title: "Jam creata!",
        description: "La tua jam è stata salvata come bozza. Pubblicala quando sei pronto.",
      });

      navigate(`/jam/${jam.id}`);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-4 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla Dashboard
        </Button>

        <Card className="border-primary/10 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Crea una nuova Jam</CardTitle>
            <CardDescription>
              Compila i dettagli della tua jam di AcroYoga
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome della Jam *</Label>
                  <Input
                    id="name"
                    placeholder="es. Jam di AcroYoga a Milano"
                    {...register("name", { required: true })}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Luogo *
                  </Label>
                  <Input
                    id="location"
                    placeholder="es. Parco Sempione, Milano"
                    {...register("location_text", { required: true })}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gmaps">Link Google Maps (opzionale)</Label>
                  <Input
                    id="gmaps"
                    type="url"
                    placeholder="https://maps.google.com/..."
                    {...register("gmaps_link")}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starts">
                    <CalendarIcon className="inline h-4 w-4 mr-1" />
                    Inizio *
                  </Label>
                  <Input
                    id="starts"
                    type="datetime-local"
                    {...register("starts_at", { required: true })}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ends">Fine *</Label>
                  <Input
                    id="ends"
                    type="datetime-local"
                    {...register("ends_at", { required: true })}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  placeholder="Descrivi la tua jam, livello, cosa portare..."
                  {...register("description")}
                  disabled={isSubmitting}
                  rows={4}
                  className="rounded-xl resize-none"
                />
              </div>

              {/* Capacity Settings */}
              <div className="space-y-4 p-4 bg-secondary/30 rounded-xl">
                <h3 className="font-semibold text-sm">Impostazioni Capacità</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacità totale (opzionale)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    placeholder="Lascia vuoto per nessun limite"
                    {...register("capacity", { 
                      valueAsNumber: true,
                      validate: value => value === "" || value > 0 || "Deve essere maggiore di 0"
                    })}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se omesso, la jam avrà posti illimitati. I campi sotto si aggiorneranno automaticamente con ratio 2:1 (flyer:base).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bases-min">Base Min</Label>
                    <Input
                      id="bases-min"
                      type="number"
                      min="0"
                      placeholder="0"
                      {...register("desired_bases_min", { valueAsNumber: true })}
                      disabled={isSubmitting}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bases-max">Base Max</Label>
                    <Input
                      id="bases-max"
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
                    <Label htmlFor="flyers-min">Flyer Min</Label>
                    <Input
                      id="flyers-min"
                      type="number"
                      min="0"
                      placeholder="0"
                      {...register("desired_flyers_min", { valueAsNumber: true })}
                      disabled={isSubmitting}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flyers-max">Flyer Max</Label>
                    <Input
                      id="flyers-max"
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

              {/* Auto-promote Setting */}
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                <div className="space-y-1">
                  <Label htmlFor="auto-promote" className="text-base">
                    Promozione automatica
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Promuovi automaticamente dalla lista d'attesa quando si libera un posto
                  </p>
                </div>
                <Switch
                  id="auto-promote"
                  checked={watch("auto_promote")}
                  onCheckedChange={(checked) => setValue("auto_promote", checked)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Public participants visibility */}
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl">
                <div className="space-y-1">
                  <Label htmlFor="public-participants" className="text-base">
                    Mostra partecipanti pubblicamente
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Consenti a chiunque di vedere la lista dei partecipanti
                  </p>
                </div>
                <Switch
                  id="public-participants"
                  checked={watch("public_participants")}
                  onCheckedChange={(checked) => setValue("public_participants", checked)}
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 rounded-xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salva come Bozza
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  disabled={isSubmitting}
                  className="rounded-xl"
                >
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateJam;