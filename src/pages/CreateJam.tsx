import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { jamsApi } from "@/api/jams.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sanitizeHtml } from "@/lib/sanitize";
import JamForm from "@/components/jams/JamForm";
import { useJamForm } from "@/hooks/useJamForm";
import { JamFormValues } from "@/lib/jam-form";

const CreateJam = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const form = useJamForm();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };

    checkAuth();
  }, [navigate]);

  const onSubmit = async (data: JamFormValues) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      const start = new Date(data.starts_at);
      const end = new Date(data.ends_at);
      const startsAtUTC = start.toISOString();
      const endsAtUTC = end.toISOString();
      const sanitizedDescription = sanitizeHtml(data.description || "");

      const jam = await jamsApi.createJam({
        name: data.name,
        location_text: data.location_text,
        gmaps_link: data.gmaps_link || undefined,
        starts_at: startsAtUTC,
        ends_at: endsAtUTC,
        description: sanitizedDescription || undefined,
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
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla Dashboard
        </Button>

        <Card className="border-primary/10 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Crea una nuova Jam</CardTitle>
            <CardDescription>Compila i dettagli della tua jam di AcroYoga</CardDescription>
          </CardHeader>
          <CardContent>
            <JamForm
              form={form}
              onSubmit={onSubmit}
              submitLabel="Salva come Bozza"
              cancelLabel="Annulla"
              onCancel={() => navigate("/dashboard")}
              defaultDurationHours={4}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateJam;
