import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { jamsApi } from "@/api/jams.api";
import { participantsApi } from "@/api/participants.api";
import { managersApi } from "@/api/managers.api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { JamHeader } from "@/components/JamHeader";
import { BookingSection } from "@/components/BookingSection";
import { ParticipantsList } from "@/components/ParticipantsList";
import { WaitingList } from "@/components/WaitingList";

const JamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jam, setJam] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [waitingList, setWaitingList] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isOwnerOrManager, setIsOwnerOrManager] = useState(false);
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
      const jamData = await jamsApi.getJamById(id!);
      setJam(jamData);
      const isOwnerCheck = jamData.owner_id === user.id;
      setIsOwner(isOwnerCheck);

      // Load managers to check if user is a manager
      try {
        const managersData = await managersApi.getJamManagers(id!);
        setManagers(managersData);
        const isManager = managersData.some((manager) => manager.user_id === user.id);
        setIsOwnerOrManager(isOwnerCheck || isManager);
      } catch (error) {
        // If user can't access managers, they're not a manager
        setIsOwnerOrManager(isOwnerCheck);
      }

      // Load participants and waiting list (only if owner or manager)
      if (isOwnerCheck || (managers.length > 0 && managers.some((m) => m.user_id === user.id))) {
        const participantsData = await participantsApi.getJamParticipants(id!);
        setParticipants(participantsData.participants || []);
        setWaitingList(participantsData.waitingList || []);
      }

      // Check if current user is participating
      const userParticipationData = await participantsApi.getUserParticipation(id!);
      setUserParticipation(userParticipationData);

    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
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
      const result = await participantsApi.joinJam(jam.id, {
        role: selectedRole,
      });

      toast({
        title: result.state === "waiting" ? "Aggiunto alla lista d'attesa" : "Prenotazione confermata!",
        description: result.state === "waiting"
          ? "Ti avviseremo se si libera un posto"
          : "Ci vediamo alla jam!",
      });

      loadJamDetails();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelParticipation = async () => {
    if (!userParticipation) return;

    try {
      await participantsApi.cancelParticipation(userParticipation.id);

      toast({
        title: "Prenotazione annullata",
        description: "La tua partecipazione è stata cancellata",
      });

      loadJamDetails();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await jamsApi.publishJam(jam.id);

      toast({
        title: "Jam pubblicato!",
        description: "La tua jam è ora visibile e prenotabile",
      });

      loadJamDetails();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Sei sicuro di voler eliminare questa jam?")) return;

    try {
      await jamsApi.deleteJam(jam.id);

      toast({
        title: "Jam eliminato",
        description: "La jam è stato eliminato con successo",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const copyShareLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiato!",
      description: "Il link della jam è stato copiato negli appunti",
    });
  };

  const handleEdit = () => {
    navigate(`/jam/${jam.id}/edit`);
  };

  const handleClone = async () => {
    try {
      const clonedJam = await jamsApi.cloneJam(jam.id);
      toast({
        title: "Jam clonata!",
        description: "La jam è stata clonata con successo",
      });
      navigate(`/jam/${clonedJam.id}/edit`);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handleManageManagers = () => {
    // This will be handled by the ManageManagersDialog component
    // We just need to reload the managers when the dialog closes
    loadJamDetails();
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
        <p>Jam non trovata</p>
      </div>
    );
  }

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

        <JamHeader
          jam={jam}
          isOwner={isOwner}
          isOwnerOrManager={isOwnerOrManager}
          participants={participants}
          waitingList={waitingList}
          isPublishing={isPublishing}
          onPublish={handlePublish}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onShare={copyShareLink}
          onClone={handleClone}
          onManageManagers={handleManageManagers}
        />

        <BookingSection
          jam={jam}
          isOwner={isOwner}
          userParticipation={userParticipation}
          selectedRole={selectedRole}
          isBooking={isBooking}
          onRoleChange={setSelectedRole}
          onBook={handleBook}
          onCancelParticipation={handleCancelParticipation}
        />

        {/* Participants List (Owner or Manager only) */}
        {isOwnerOrManager && (
          <>
            <ParticipantsList 
              participants={participants} 
              jam={jam} 
              isOwner={isOwner}
              onParticipantRemoved={loadJamDetails}
            />
            <WaitingList 
              waitingList={waitingList} 
              jamId={jam.id}
              onParticipantRemoved={loadJamDetails}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default JamDetails;