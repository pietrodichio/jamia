import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { jamsApi, type Jam } from "@/api/jams.api";
import { participantsApi, type Participant } from "@/api/participants.api";
import { profilesApi, type Profile } from "@/api/profiles.api";
import { managersApi } from "@/api/managers.api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JamHeader } from "@/components/JamHeader";
import { BookingSection } from "@/components/BookingSection";
import { ParticipantsList } from "@/components/ParticipantsList";
import { WaitingList } from "@/components/WaitingList";
import { JamEmailComposer } from "@/components/JamEmailComposer";

type ApiError = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
};

type JamParticipant = Participant;

type ParticipantsQueryResult = {
  participants: JamParticipant[];
  waitingList: JamParticipant[];
  hasManagementAccess: boolean;
};

class IncompleteProfileError extends Error {
  constructor() {
    super("INCOMPLETE_PROFILE");
    this.name = "IncompleteProfileError";
  }
}

const mapParticipants = (list: Participant[] = []): JamParticipant[] => list ?? [];

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const apiError = error as ApiError;
    return apiError.response?.data?.message || apiError.message || fallback;
  }

  return fallback;
};

const isForbiddenError = (error: unknown): boolean => {
  if (error && typeof error === "object") {
    const apiError = error as ApiError;
    return apiError.response?.status === 403;
  }
  return false;
};

const isProfileComplete = (profile: Profile | null | undefined): boolean => {
  return Boolean(profile?.first_name?.trim() && profile?.phone?.trim());
};

const JamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const currentUserQuery = useQuery<User | null>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentUser = currentUserQuery.data ?? null;

  const profileQuery = useQuery<Profile | null>({
    queryKey: ["profile", currentUser?.id],
    enabled: Boolean(currentUser?.id),
    queryFn: async () => {
      if (!currentUser?.id) {
        return null;
      }
      return profilesApi.getProfile(currentUser.id);
    },
    staleTime: 5 * 60 * 1000,
  });

  const isSuperAdmin = Boolean(profileQuery.data?.is_super_admin);

  const jamQuery = useQuery<Jam>({
    queryKey: ["jam", id, currentUser?.id],
    enabled: Boolean(id),
    retry: false,
    queryFn: async () => {
      if (!id) {
        throw new Error("Jam id non valido");
      }

      if (currentUser) {
        return jamsApi.getJamById(id);
      }

      return jamsApi.getPublicJamById(id);
    },
  });

  const jam = jamQuery.data ?? null;
  const isOwner = Boolean(
    jam &&
      currentUser &&
      (jam.owner_id === currentUser.id || isSuperAdmin)
  );

  // Check if user is a manager
  const managersQuery = useQuery({
    queryKey: ["jam-managers", id],
    enabled: Boolean(id && currentUser && !currentUserQuery.isLoading && jamQuery.isSuccess),
    retry: false,
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

  const managers = managersQuery.data || [];
  const isManager = Boolean(
    currentUser &&
      managers.some((manager) => manager.user_id === currentUser.id)
  );
  const isOwnerOrManagerAccess = isOwner || isManager || isSuperAdmin;

  // Determine if we should fetch participants
  // Only fetch if jam is public OR user has owner/manager access
  const shouldFetchParticipants = Boolean(
    jam &&
      (jam.public_participants || isOwnerOrManagerAccess)
  );
  
  // If jam is public, we don't need to wait for managers check
  const isPublic = Boolean(jam?.public_participants);

  const participantsQuery = useQuery<ParticipantsQueryResult>({
    queryKey: ["jam-participants", id, currentUser?.id],
    enabled: Boolean(
      id && 
      jamQuery.isSuccess && 
      shouldFetchParticipants &&
      (isPublic || managersQuery.isSuccess || managersQuery.isError)
    ),
    retry: false,
    queryFn: async () => {
      if (!id) {
        throw new Error("Jam id non valido");
      }

      if (!currentUser) {
        try {
          const publicData = await participantsApi.getPublicJamParticipants(id);
          return {
            participants: mapParticipants(publicData.participants ?? []),
            waitingList: [],
            hasManagementAccess: false,
          };
        } catch (error) {
          if (isForbiddenError(error)) {
            return { participants: [], waitingList: [], hasManagementAccess: false };
          }
          throw error as Error;
        }
      }

      try {
        const data = await participantsApi.getJamParticipants(id);
        return {
          participants: mapParticipants(data.participants ?? []),
          waitingList: mapParticipants(data.waitingList ?? []),
          hasManagementAccess: true,
        };
      } catch (error) {
        if (isForbiddenError(error)) {
          const publicData = await participantsApi.getPublicJamParticipants(id);
          return {
            participants: mapParticipants(publicData.participants ?? []),
            waitingList: [],
            hasManagementAccess: false,
          };
        }

        throw error;
      }
    },
  });

  const userParticipationQuery = useQuery<JamParticipant | null>({
    queryKey: ["jam-user-participation", id, currentUser?.id],
    enabled: Boolean(id && currentUser),
    retry: false,
    queryFn: async () => {
      const data = await participantsApi.getUserParticipation(id!);
      return data ? (data as JamParticipant) : null;
    },
  });

  const participantData: ParticipantsQueryResult =
    participantsQuery.data ?? { participants: [], waitingList: [], hasManagementAccess: false };
  const participants: JamParticipant[] = participantData.participants;
  const waitingList: JamParticipant[] = participantData.waitingList;
  const hasManagementAccess = participantData.hasManagementAccess;
  const userParticipation = userParticipationQuery.data ?? null;
  const currentUserId = currentUser?.id ?? null;
  
  // Use owner/manager check from managers query, fallback to hasManagementAccess from participants query
  const isOwnerOrManager = isOwnerOrManagerAccess || hasManagementAccess;

  const invalidateJamQueries = () => {
    if (!id) {
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["jam-participants", id] });
    queryClient.invalidateQueries({ queryKey: ["jam-user-participation", id] });
    queryClient.invalidateQueries({ queryKey: ["jam", id] });
  };

  const bookMutation = useMutation<JamParticipant, unknown, void>({
    mutationFn: async () => {
      if (!currentUser || !jam) {
        throw new Error("Utente o jam non trovati");
      }

      let userProfile = profileQuery.data;
      if (!userProfile) {
        userProfile = await profilesApi.getProfile(currentUser.id);
      }
      if (!isProfileComplete(userProfile)) {
        toast({
          title: "Profilo incompleto",
          description: "Completa il tuo profilo prima di prenotare una jam.",
          variant: "destructive",
        });

        localStorage.setItem("jamia_redirect_url", window.location.pathname);
        navigate("/profile-setup");
        throw new IncompleteProfileError();
      }

      const role = userProfile?.main_role ?? "both";
      const result = await participantsApi.joinJam(jam.id, { role });
      return result as JamParticipant;
    },
    onSuccess: (result) => {
      toast({
        title: result.state === "waiting" ? "Aggiunto alla lista d'attesa" : "Prenotazione confermata!",
        description:
          result.state === "waiting"
            ? "Ti avviseremo se si libera un posto"
            : "Ci vediamo alla jam!",
      });

      invalidateJamQueries();
    },
    onError: (error) => {
      if (error instanceof IncompleteProfileError) {
        return;
      }

      toast({
        title: "Errore",
        description: getApiErrorMessage(error, "Impossibile completare la prenotazione"),
        variant: "destructive",
      });
    },
  });

  const cancelParticipationMutation = useMutation<void>({
    mutationFn: async () => {
      if (!userParticipation) {
        throw new Error("Partecipazione non trovata");
      }

      await participantsApi.cancelParticipation(userParticipation.id);
    },
    onSuccess: () => {
      toast({
        title: "Prenotazione annullata",
        description: "La tua partecipazione è stata cancellata",
      });

      invalidateJamQueries();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: getApiErrorMessage(error, "Impossibile annullare la prenotazione"),
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation<Jam>({
    mutationFn: async () => {
      if (!jam) {
        throw new Error("Jam non trovata");
      }

      return jamsApi.publishJam(jam.id);
    },
    onSuccess: () => {
      toast({
        title: "Jam pubblicato!",
        description: "La tua jam è ora visibile e prenotabile",
      });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["jam", id] });
      }
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: getApiErrorMessage(error, "Impossibile pubblicare la jam"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation<void>({
    mutationFn: async () => {
      if (!jam) {
        throw new Error("Jam non trovata");
      }

      await jamsApi.deleteJam(jam.id);
    },
    onSuccess: () => {
      toast({
        title: "Jam eliminata",
        description: "La jam è stata eliminata con successo",
      });

      navigate("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: getApiErrorMessage(error, "Impossibile eliminare la jam"),
        variant: "destructive",
      });
    },
  });

  const cloneMutation = useMutation<Jam>({
    mutationFn: async () => {
      if (!jam) {
        throw new Error("Jam non trovata");
      }

      return jamsApi.cloneJam(jam.id);
    },
    onSuccess: (clonedJam) => {
      toast({
        title: "Jam clonata!",
        description: "La jam è stata clonata con successo",
      });
      navigate(`/jam/${clonedJam.id}/edit`);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: getApiErrorMessage(error, "Impossibile clonare la jam"),
        variant: "destructive",
      });
    },
  });

  const handleBook = () => {
    bookMutation.mutate();
  };

  const handleCancelParticipation = () => {
    cancelParticipationMutation.mutate();
  };

  const handlePublish = () => {
    publishMutation.mutate();
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsDeleteDialogOpen(false);
    deleteMutation.mutate();
  };

  const handleClone = () => {
    cloneMutation.mutate();
  };

  const handleManageManagers = () => {
    queryClient.invalidateQueries({ queryKey: ["jam-managers", id] });
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
    if (jam) {
      navigate(`/jam/${jam.id}/edit`);
    }
  };

  useEffect(() => {
    if (jamQuery.error) {
      toast({
        title: "Errore",
        description: getApiErrorMessage(jamQuery.error, "Impossibile caricare la jam"),
        variant: "destructive",
      });
    }
  }, [jamQuery.error, toast]);

  useEffect(() => {
    if (participantsQuery.error) {
      toast({
        title: "Errore",
        description: getApiErrorMessage(participantsQuery.error, "Impossibile caricare i partecipanti"),
        variant: "destructive",
      });
    }
  }, [participantsQuery.error, toast]);

  const isLoadingPage = currentUserQuery.isLoading || jamQuery.isLoading;

  if (isLoadingPage) {
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

  const DeleteConfirmDialog = () => (
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Elimina jam
          </DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare questa jam? Questa azione non può essere annullata.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsDeleteDialogOpen(false)}
            className="rounded-xl"
          >
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={deleteMutation.isPending}
            className="rounded-xl"
          >
            {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Elimina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const backDestination = currentUser ? "/dashboard" : "/";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto p-4 max-w-5xl flex flex-col gap-4">
        <Button variant="ghost" onClick={() => navigate(backDestination)} className="mb-6 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentUser ? "Torna alla Dashboard" : "Torna alla Home"}
        </Button>

        <JamHeader
          jam={jam}
          isOwner={isOwner}
          isOwnerOrManager={isOwnerOrManager}
          participants={participants}
          waitingList={isOwnerOrManager ? waitingList : []}
          isPublishing={publishMutation.isPending}
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
          isBooking={bookMutation.isPending}
          isCancelling={cancelParticipationMutation.isPending}
          isAuthenticated={Boolean(currentUser)}
          onBook={handleBook}
          onCancelParticipation={handleCancelParticipation}
        />

        <ParticipantsSection
          jam={jam}
          participants={participants}
          isOwner={isOwner}
          isManager={hasManagementAccess}
          currentUserId={currentUserId}
          canManageParticipants={isOwnerOrManager}
          isAuthenticated={Boolean(currentUser)}
          onParticipantsUpdated={invalidateJamQueries}
        />

        {isOwnerOrManager && (
          <WaitingList
            waitingList={waitingList}
            jamId={jam.id}
            onParticipantsUpdated={invalidateJamQueries}
          />
        )}

        {isOwnerOrManager && (
          <JamEmailComposer
            jamId={jam.id}
            jamName={jam.name}
            senderEmail={currentUser?.email}
          />
        )}
      </div>
      
      <DeleteConfirmDialog />
    </div>
  );
};

interface ParticipantsSectionProps {
  jam: Jam;
  participants: JamParticipant[];
  isOwner: boolean;
  isAuthenticated: boolean;
  isManager: boolean;
  currentUserId: string | null;
  canManageParticipants: boolean;
  onParticipantsUpdated: () => void;
}

const ParticipantsSection = ({
  jam,
  participants,
  isOwner,
  isAuthenticated,
  isManager,
  currentUserId,
  canManageParticipants,
  onParticipantsUpdated,
}: ParticipantsSectionProps) => (
  <ParticipantsList
    participants={participants}
    jam={jam}
    isOwner={isOwner}
    isAuthenticated={isAuthenticated}
    isManager={isManager}
    currentUserId={currentUserId}
    canManageParticipants={canManageParticipants}
    onParticipantsUpdated={onParticipantsUpdated}
  
  />
);

export default JamDetails;
