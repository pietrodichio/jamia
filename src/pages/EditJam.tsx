import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { jamsApi } from "@/api/jams.api";
import { managersApi } from "@/api/managers.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MapPin, Calendar as CalendarIcon } from "lucide-react";

const editJamSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio."),
  location_text: z.string().trim().min(1, "Il luogo è obbligatorio."),
  gmaps_link: z.string().trim().url("Inserisci un URL valido.").optional().or(z.literal("")),
  starts_at: z.string().min(1, "La data di inizio è obbligatoria."),
  ends_at: z.string().min(1, "La data di fine è obbligatoria."),
  description: z.string().trim().optional(),
  capacity: z.union([
    z.coerce.number().positive("Deve essere maggiore di 0"),
    z.nan().transform(() => undefined),
  ]).optional(),
  desired_bases_min: z.union([
    z.coerce.number().min(0),
    z.nan().transform(() => undefined),
  ]).optional(),
  desired_bases_max: z.union([
    z.coerce.number().min(0),
    z.nan().transform(() => undefined),
  ]).optional(),
  desired_flyers_min: z.union([
    z.coerce.number().min(0),
    z.nan().transform(() => undefined),
  ]).optional(),
  desired_flyers_max: z.union([
    z.coerce.number().min(0),
    z.nan().transform(() => undefined),
  ]).optional(),
  auto_promote: z.boolean(),
  public_participants: z.boolean(),
}).refine((data) => {
  if (!data.starts_at || !data.ends_at) return true;
  const start = new Date(data.starts_at);
  const end = new Date(data.ends_at);
  return end > start;
}, {
  message: "La data di fine deve essere successiva alla data di inizio.",
  path: ["ends_at"],
});

type EditJamFormData = z.infer<typeof editJamSchema>;

const EditJam = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load jam data
  const jamQuery = useQuery({
    queryKey: ["jam", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error("Jam id non valido");
      return jamsApi.getJamById(id);
    },
  });

  const jam = jamQuery.data;

  // Check if user is owner or manager
  const managersQuery = useQuery({
    queryKey: ["jam-managers", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error("Jam id non valido");
      try {
        return await managersApi.getJamManagers(id);
      } catch (error) {
        // If user can't access managers, they're not a manager
        return [];
      }
    },
  });

  const currentUserQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  const isOwner = Boolean(jam && currentUserQuery.data && jam.owner_id === currentUserQuery.data.id);
  const managers = managersQuery.data || [];
  const isManager = Boolean(
    currentUserQuery.data &&
      managers.some((manager) => manager.user_id === currentUserQuery.data.id)
  );
  const canEdit = isOwner || isManager;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<EditJamFormData>({
    resolver: zodResolver(editJamSchema),
    defaultValues: {
      name: "",
      location_text: "",
      gmaps_link: "",
      starts_at: "",
      ends_at: "",
      description: "",
      capacity: undefined,
      desired_bases_min: undefined,
      desired_bases_max: undefined,
      desired_flyers_min: undefined,
      desired_flyers_max: undefined,
      auto_promote: true,
      public_participants: true,
    },
  });

  // Watch fields for auto-fill logic
  const startsAt = watch("starts_at");
  const capacity = watch("capacity");

  // Auto-fill end date whenever start date changes
  useEffect(() => {
    if (startsAt) {
      const timer = setTimeout(() => {
        if (startsAt.length === 16) {
          const start = new Date(startsAt);
          start.setHours(start.getHours() + 5);
          const formattedEnd = start.toISOString().slice(0, 16);
          setValue("ends_at", formattedEnd);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [startsAt, setValue]);

  // Auto-fill capacity fields whenever capacity changes
  useEffect(() => {
    if (capacity && capacity > 0) {
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
    }
  }, [capacity, setValue]);

  // Load jam data into form when it's ready
  useEffect(() => {
    if (jam) {
      reset({
        name: jam.name,
        location_text: jam.location_text,
        gmaps_link: jam.gmaps_link || "",
        starts_at: jam.starts_at ? new Date(jam.starts_at).toISOString().slice(0, 16) : "",
        ends_at: jam.ends_at ? new Date(jam.ends_at).toISOString().slice(0, 16) : "",
        description: jam.description || "",
        capacity: jam.capacity ?? undefined,
        desired_bases_min: jam.desired_bases_min ?? undefined,
        desired_bases_max: jam.desired_bases_max ?? undefined,
        desired_flyers_min: jam.desired_flyers_min ?? undefined,
        desired_flyers_max: jam.desired_flyers_max ?? undefined,
        auto_promote: jam.auto_promote ?? true,
        public_participants: jam.public_participants ?? true,
      });
    }
  }, [jam, reset]);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };
    checkAuth();
  }, [navigate]);

  // Permission check
  useEffect(() => {
    if (jamQuery.isSuccess && !canEdit) {
      toast({
        title: "Accesso negato",
        description: "Non hai i permessi per modificare questa jam",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [jamQuery.isSuccess, canEdit, navigate, toast]);

  const onSubmit = async (data: EditJamFormData) => {
    try {
      if (!id) throw new Error("Jam id non valido");

      // Convert datetime-local strings (local time) to UTC ISO strings
      const start = new Date(data.starts_at);
      const end = new Date(data.ends_at);
      const startsAtUTC = start.toISOString();
      const endsAtUTC = end.toISOString();

      await jamsApi.updateJam(id, {
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
        title: "Jam aggiornata!",
        description: "Le modifiche sono state salvate",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["jam", id] });
      navigate(`/jam/${id}`);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  if (jamQuery.isLoading || currentUserQuery.isLoading || managersQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!jam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Jam non trovata</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-4 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/jam/${id}`)}
          className="mb-6 rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla Jam
        </Button>

        <Card className="border-primary/10 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Modifica Jam</CardTitle>
            <CardDescription>
              Aggiorna i dettagli della tua jam di AcroYoga
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
                    {...register("name")}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive mt-1">{String(errors.name.message || "")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Luogo *
                  </Label>
                  <Input
                    id="location"
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
                  <Label htmlFor="gmaps">Link Google Maps (opzionale)</Label>
                  <Input
                    id="gmaps"
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
                    {...register("starts_at")}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                  {errors.starts_at && (
                    <p className="text-xs text-destructive mt-1">{String(errors.starts_at.message || "")}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ends">Fine *</Label>
                  <Input
                    id="ends"
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
                  Salva modifiche
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/jam/${id}`)}
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

export default EditJam;

