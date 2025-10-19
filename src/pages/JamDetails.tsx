import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, MapPin, Users, Clock, Share2, Loader2, UserCheck, UserX, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const JamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jam, setJam] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [waitingList, setWaitingList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userParticipation, setUserParticipation] = useState<any>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"base" | "flyer" | "both">("both");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    loadJamDetails();
  }, [id]);

  const loadJamDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setCurrentUser(user);

      // Load jam
      const { data: jamData, error: jamError } = await supabase
        .from("jams")
        .select("*")
        .eq("id", id)
        .single();

      if (jamError) throw jamError;
      setJam(jamData);
      setIsOwner(jamData.owner_id === user.id);

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("jam_participants")
        .select(`
          *,
          profiles:user_id (name, main_role, phone)
        `)
        .eq("jam_id", id)
        .eq("state", "participant")
        .order("joined_at", { ascending: true });

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Load waiting list
      const { data: waitingData, error: waitingError } = await supabase
        .from("jam_participants")
        .select(`
          *,
          profiles:user_id (name, main_role, phone)
        `)
        .eq("jam_id", id)
        .eq("state", "waiting")
        .order("joined_at", { ascending: true });

      if (waitingError) throw waitingError;
      setWaitingList(waitingData || []);

      // Check if current user is participating
      const { data: userParticipationData } = await supabase
        .from("jam_participants")
        .select("*")
        .eq("jam_id", id)
        .eq("user_id", user.id)
        .neq("state", "cancelled")
        .maybeSingle();

      setUserParticipation(userParticipationData);

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

  const handleBook = async () => {
    if (!currentUser || !jam) return;
    
    setIsBooking(true);
    try {
      const isAtCapacity = jam.capacity && participants.length >= jam.capacity;
      const newState = isAtCapacity ? "waiting" : "participant";

      const { error } = await supabase
        .from("jam_participants")
        .insert({
          jam_id: jam.id,
          user_id: currentUser.id,
          role: selectedRole,
          state: newState,
          source: "direct",
        });

      if (error) throw error;

      // Log action
      await supabase.from("audit_log").insert({
        jam_id: jam.id,
        actor_user_id: currentUser.id,
        action: "joined",
        metadata: { role: selectedRole, state: newState },
      });

      toast({
        title: isAtCapacity ? "Aggiunto alla lista d'attesa" : "Prenotazione confermata!",
        description: isAtCapacity 
          ? "Ti avviseremo se si libera un posto"
          : "Ci vediamo al jam!",
      });

      loadJamDetails();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelParticipation = async () => {
    if (!userParticipation) return;

    try {
      const { error } = await supabase
        .from("jam_participants")
        .update({
          state: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", userParticipation.id);

      if (error) throw error;

      // Log cancellation
      await supabase.from("audit_log").insert({
        jam_id: jam.id,
        actor_user_id: currentUser.id,
        action: "cancelled",
        metadata: { previous_state: userParticipation.state },
      });

      toast({
        title: "Prenotazione annullata",
        description: "La tua partecipazione è stata cancellata",
      });

      loadJamDetails();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from("jams")
        .update({ status: "published" })
        .eq("id", jam.id);

      if (error) throw error;

      await supabase.from("audit_log").insert({
        jam_id: jam.id,
        actor_user_id: currentUser.id,
        action: "published",
      });

      toast({
        title: "Jam pubblicato!",
        description: "Il tuo jam è ora visibile e prenotabile",
      });

      loadJamDetails();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sei sicuro di voler eliminare questo jam?")) return;

    try {
      const { error } = await supabase
        .from("jams")
        .delete()
        .eq("id", jam.id);

      if (error) throw error;

      toast({
        title: "Jam eliminato",
        description: "Il jam è stato eliminato con successo",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const copyShareLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiato!",
      description: "Il link del jam è stato copiato negli appunti",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!jam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Jam non trovato</p>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "base": return "bg-blue-500/10 text-blue-600";
      case "flyer": return "bg-pink-500/10 text-pink-600";
      default: return "bg-purple-500/10 text-purple-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-4 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna alla Dashboard
        </Button>

        {/* Jam Header */}
        <Card className="border-primary/10 shadow-lg rounded-2xl mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-3xl">{jam.name}</CardTitle>
                  {jam.status === "draft" && <Badge variant="secondary">Bozza</Badge>}
                  {jam.status === "published" && <Badge className="bg-primary">Pubblicato</Badge>}
                </div>
                <CardDescription className="flex items-center gap-1 text-base">
                  <MapPin className="h-4 w-4" />
                  {jam.location_text}
                  {jam.gmaps_link && (
                    <a href={jam.gmaps_link} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                      (Mappa)
                    </a>
                  )}
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                {isOwner && (
                  <>
                    {jam.status === "draft" && (
                      <Button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="rounded-xl"
                      >
                        {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Pubblica
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/jam/${jam.id}/edit`)}
                      className="rounded-xl"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      className="rounded-xl text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  onClick={copyShareLink}
                  className="rounded-xl"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Condividi
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {format(new Date(jam.starts_at), "d MMMM yyyy", { locale: it })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span>
                  {format(new Date(jam.starts_at), "HH:mm")} - {format(new Date(jam.ends_at), "HH:mm")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>
                  {participants.length}{jam.capacity ? `/${jam.capacity}` : ""} partecipanti
                  {waitingList.length > 0 && ` • ${waitingList.length} in attesa`}
                </span>
              </div>
            </div>

            {jam.description && (
              <div className="pt-4 border-t">
                <p className="text-muted-foreground whitespace-pre-wrap">{jam.description}</p>
              </div>
            )}

            {/* Booking Section */}
            {jam.status === "published" && !isOwner && (
              <div className="pt-4 border-t">
                {!userParticipation ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full rounded-xl" size="lg">
                        <UserCheck className="mr-2 h-5 w-5" />
                        Prenota il tuo posto
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle>Prenota il jam</DialogTitle>
                        <DialogDescription>
                          Seleziona il tuo ruolo per questo jam
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Ruolo</Label>
                          <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="base">Base</SelectItem>
                              <SelectItem value="flyer">Flyer</SelectItem>
                              <SelectItem value="both">Entrambi</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={handleBook}
                          disabled={isBooking}
                          className="w-full rounded-xl"
                        >
                          {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Conferma prenotazione
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                      <UserCheck className="h-5 w-5" />
                      <span className="font-medium">
                        {userParticipation.state === "participant" 
                          ? "Sei iscritto a questo jam" 
                          : "Sei in lista d'attesa"}
                      </span>
                    </div>
                    <Button
                      onClick={handleCancelParticipation}
                      variant="outline"
                      className="w-full rounded-xl"
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Annulla partecipazione
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Participants List (Owner only) */}
        {isOwner && (
          <>
            <Card className="border-primary/10 rounded-2xl mb-6">
              <CardHeader>
                <CardTitle>Partecipanti ({participants.length})</CardTitle>
                <CardDescription>Lista dei partecipanti confermati</CardDescription>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nessun partecipante ancora
                  </p>
                ) : (
                  <div className="space-y-3">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{p.profiles?.name}</p>
                            {p.profiles?.phone && (
                              <p className="text-sm text-muted-foreground">{p.profiles.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(p.role)}>
                            {p.role === "base" ? "Base" : p.role === "flyer" ? "Flyer" : "Both"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(p.joined_at), "d/MM", { locale: it })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Waiting List */}
            {waitingList.length > 0 && (
              <Card className="border-primary/10 rounded-2xl">
                <CardHeader>
                  <CardTitle>Lista d'attesa ({waitingList.length})</CardTitle>
                  <CardDescription>Persone in attesa di un posto</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {waitingList.map((w, index) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between p-3 bg-accent/20 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <div>
                            <p className="font-medium">{w.profiles?.name}</p>
                            {w.profiles?.phone && (
                              <p className="text-sm text-muted-foreground">{w.profiles.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(w.role)}>
                            {w.role === "base" ? "Base" : w.role === "flyer" ? "Flyer" : "Both"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(w.joined_at), "d/MM", { locale: it })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JamDetails;