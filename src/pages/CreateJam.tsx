import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MapPin, Calendar as CalendarIcon } from "lucide-react";

const CreateJam = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [locationText, setLocationText] = useState("");
  const [gmapsLink, setGmapsLink] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");
  const [desiredBasesMin, setDesiredBasesMin] = useState<number | "">("");
  const [desiredBasesMax, setDesiredBasesMax] = useState<number | "">("");
  const [desiredFlyersMin, setDesiredFlyersMin] = useState<number | "">("");
  const [desiredFlyersMax, setDesiredFlyersMax] = useState<number | "">("");
  const [autoPromote, setAutoPromote] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      // Validate dates
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      if (end <= start) {
        throw new Error("La data di fine deve essere successiva alla data di inizio");
      }

      const { data, error } = await supabase
        .from("jams")
        .insert({
          owner_id: user.id,
          name,
          location_text: locationText,
          gmaps_link: gmapsLink || null,
          starts_at: startsAt,
          ends_at: endsAt,
          description: description || null,
          capacity: capacity || null,
          desired_bases_min: desiredBasesMin || null,
          desired_bases_max: desiredBasesMax || null,
          desired_flyers_min: desiredFlyersMin || null,
          desired_flyers_max: desiredFlyersMax || null,
          auto_promote: autoPromote,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await supabase.from("audit_log").insert({
        jam_id: data.id,
        actor_user_id: user.id,
        action: 'created',
        metadata: { jam_name: name },
      });

      toast({
        title: "Jam creato!",
        description: "Il tuo jam è stato salvato come bozza. Pubblicalo quando sei pronto.",
      });

      navigate(`/jam/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
            <CardTitle className="text-2xl">Crea un Nuovo Jam</CardTitle>
            <CardDescription>
              Compila i dettagli del tuo jam di AcroYoga
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome del Jam *</Label>
                  <Input
                    id="name"
                    placeholder="es. Jam AcroYoga Milano"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
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
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gmaps">Link Google Maps (opzionale)</Label>
                  <Input
                    id="gmaps"
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={gmapsLink}
                    onChange={(e) => setGmapsLink(e.target.value)}
                    disabled={isLoading}
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
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ends">Fine *</Label>
                  <Input
                    id="ends"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    required
                    disabled={isLoading}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  placeholder="Descrivi il jam, livello, cosa portare..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
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
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : "")}
                    disabled={isLoading}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se omesso, il jam avrà posti illimitati
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
                      value={desiredBasesMin}
                      onChange={(e) => setDesiredBasesMin(e.target.value ? parseInt(e.target.value) : "")}
                      disabled={isLoading}
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
                      value={desiredBasesMax}
                      onChange={(e) => setDesiredBasesMax(e.target.value ? parseInt(e.target.value) : "")}
                      disabled={isLoading}
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
                      value={desiredFlyersMin}
                      onChange={(e) => setDesiredFlyersMin(e.target.value ? parseInt(e.target.value) : "")}
                      disabled={isLoading}
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
                      value={desiredFlyersMax}
                      onChange={(e) => setDesiredFlyersMax(e.target.value ? parseInt(e.target.value) : "")}
                      disabled={isLoading}
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
                  checked={autoPromote}
                  onCheckedChange={setAutoPromote}
                  disabled={isLoading}
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 rounded-xl"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salva come Bozza
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  disabled={isLoading}
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