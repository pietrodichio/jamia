import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { jamsApi } from "@/api/jams.api";
import { managersApi } from "@/api/managers.api";
import { profilesApi } from "@/api/profiles.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sanitizeHtml } from "@/lib/sanitize";
import JamForm from "@/components/jams/JamForm";
import { useJamForm } from "@/hooks/useJamForm";
import { JamFormValues } from "@/lib/jam-form";

const EditJam = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useJamForm();
  const { reset } = form;

  const jamQuery = useQuery({
    queryKey: ["jam", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error("Jam id non valido");
      return jamsApi.getJamById(id);
    },
  });

  const managersQuery = useQuery({
    queryKey: ["jam-managers", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error("Jam id non valido");
      try {
        return await managersApi.getJamManagers(id);
      } catch {
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

  const currentUser = currentUserQuery.data ?? null;

  const profileQuery = useQuery({
    queryKey: ["profile", currentUser?.id],
    enabled: Boolean(currentUser?.id),
    queryFn: async () => {
      if (!currentUser?.id) {
        return null;
      }
      return profilesApi.getProfile(currentUser.id);
    },
  });

  const jam = jamQuery.data;
  const managers = managersQuery.data || [];
  const isSuperAdmin = Boolean(profileQuery.data?.is_super_admin);
  const isOwner = Boolean(jam && currentUser && (jam.owner_id === currentUser.id || isSuperAdmin));
  const isManager = Boolean(currentUser && managers.some((manager) => manager.user_id === currentUser.id));
  const canEdit = isOwner || isManager || isSuperAdmin;

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

  const onSubmit = async (data: JamFormValues) => {
    try {
      if (!id) throw new Error("Jam id non valido");

      const start = new Date(data.starts_at);
      const end = new Date(data.ends_at);
      const startsAtUTC = start.toISOString();
      const endsAtUTC = end.toISOString();
      const sanitizedDescription = sanitizeHtml(data.description || "");

      await jamsApi.updateJam(id, {
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
        title: "Jam aggiornata!",
        description: "Le modifiche sono state salvate",
      });

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
        <Button variant="ghost" onClick={() => navigate(`/jam/${id}`)} className="mb-6 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla Jam
        </Button>

        <Card className="border-primary/10 shadow-lg rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Modifica Jam</CardTitle>
            <CardDescription>Aggiorna i dettagli della tua jam di AcroYoga</CardDescription>
          </CardHeader>
          <CardContent>
            <JamForm
              form={form}
              onSubmit={onSubmit}
              submitLabel="Salva modifiche"
              cancelLabel="Annulla"
              onCancel={() => navigate(`/jam/${id}`)}
              defaultDurationHours={5}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditJam;
