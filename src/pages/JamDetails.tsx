import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { jamsApi } from "@/api/jams.api";
import { participantsApi } from "@/api/participants.api";
import { managersApi } from "@/api/managers.api";
import { profilesApi } from "@/api/profiles.api";
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

  const isProfileComplete = (profile: any): boolean => {
    return !!(
      profile?.first_name?.trim() && 
      profile?.phone?.trim()
    );
  };
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
      
      setCurrentUser(user);

      // Load jam - use public API if user is not authenticated
      let jamData;
      if (user) {
        jamData = await jamsApi.getJamById(id!);
      } else {
        jamData = await jamsApi.getPublicJamById(id!);
      }
      
      setJam(jamData);
      const isOwnerCheck = user ? jamData.owner_id === user.id : false;
      setIsOwner(isOwnerCheck);

      // Load managers to check if user is a manager (only if authenticated)
      let managersData: any[] = [];
      if (user) {
        try {
          managersData = await managersApi.getJamManagers(id!);
          setManagers(managersData);
          const isManager = managersData.some((manager) => manager.user_id === user.id);
          setIsOwnerOrManager(isOwnerCheck || isManager);
        } catch (error) {
          // If user can't access managers (403), they're not a manager or owner
          // This is expected for regular participants - don't log as error
          setIsOwnerOrManager(isOwnerCheck);
          setManagers([]);
        }

        // Load participants and waiting list
        const isManagerCheck = managersData.some((m) => m.user_id === user.id);
        if (isOwnerCheck || isManagerCheck) {
          // Owners and managers get full participant data
          try {
            const participantsData = await participantsApi.getJamParticipants(id!);
            setParticipants(participantsData.participants || []);
            setWaitingList(participantsData.waitingList || []);
          } catch (error) {
            // If can't access participants, set empty arrays
            setParticipants([]);
            setWaitingList([]);
          }
        } else {
          // Regular authenticated users get public participant data
          try {
            const publicParticipantsData = await participantsApi.getPublicJamParticipants(id!);
            setParticipants(publicParticipantsData.participants || []);
            setWaitingList([]); // Waiting list not shown to regular users
          } catch (error) {
            // If can't access public participants, set empty arrays
            setParticipants([]);
            setWaitingList([]);
          }
        }

        // Check if current user is participating
        try {
          const userParticipationData = await participantsApi.getUserParticipation(id!);
          setUserParticipation(userParticipationData);
        } catch (error) {
          // User not participating or error fetching participation
          setUserParticipation(null);
        }
      } else {
        // Unauthenticated user - set defaults but still try to get public participant data
        setIsOwnerOrManager(false);
        setManagers([]);
        setWaitingList([]);
        setUserParticipation(null);
        
        // Try to get public participant data for display count
        try {
          const publicParticipantsData = await participantsApi.getPublicJamParticipants(id!);
          setParticipants(publicParticipantsData.participants || []);
        } catch (error) {
          // If can't access public participants, set empty array
          setParticipants([]);
        }
      }

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
      // Check if profile is complete before booking
      const profile = await profilesApi.getProfile(currentUser.id);
      if (!isProfileComplete(profile)) {
        toast({
          title: "Profilo incompleto",
          description: "Completa il tuo profilo prima di prenotare una jam.",
          variant: "destructive",
        });
        
        // Store jam URL and redirect to profile setup
        localStorage.setItem('jamia_redirect_url', window.location.pathname);
        navigate("/profile-setup");
        return;
      }

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
      <div className="container mx-auto p-4 max-w-5xl flex flex-col gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate(currentUser ? "/dashboard" : "/")}
          className="mb-6 rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentUser ? "Torna alla Dashboard" : "Torna alla Home"}
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
          isAuthenticated={!!currentUser}
          onRoleChange={setSelectedRole}
          onBook={handleBook}
          onCancelParticipation={handleCancelParticipation}
        />

        {/* Participants List - Show for all authenticated users */}
        <ParticipantsList 
          participants={participants} 
          jam={jam} 
          isOwner={isOwner}
          isAuthenticated={!!currentUser}
          onParticipantRemoved={loadJamDetails}
        />
        
        {/* Waiting List (Owner or Manager only) */}
        {isOwnerOrManager && (
          <WaitingList 
            waitingList={waitingList} 
            jamId={jam.id}
            onParticipantRemoved={loadJamDetails}
          />
        )}
      </div>
    </div>
  );
};

export default JamDetails;