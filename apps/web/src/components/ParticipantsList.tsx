import { type ReactNode, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  participantsApi,
  type Participant,
  type ParticipantUpdatableRole,
} from "@/api/participants.api";
import { type Jam } from "@/api/jams.api";
import { useToast } from "@/hooks/use-toast";
import { AddParticipantDialog } from "@/components/AddParticipantDialog";
import { Plus, Copy } from "lucide-react";

type ParticipantWithProfile = Participant;

import { ParticipantRow } from "./ParticipantRow";

interface ParticipantsListProps {
  participants: ParticipantWithProfile[];
  jam: Jam;
  isOwner: boolean;
  isAuthenticated: boolean;
  isManager: boolean;
  currentUserId: string | null;
  canManageParticipants: boolean;
  onParticipantsUpdated?: () => void;
}

interface ParticipantSummary {
  id: string;
  name: string;
}

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const queryKeyForJamParticipants = (jamId: string) => ["jam-participants", jamId];

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

const ParticipantsCard = ({
  title,
  description,
  children,
  headerAction,
}: {
  title: string;
  description: string;
  children: ReactNode;
  headerAction?: ReactNode;
}) => (
  <Card className="border-primary/10 rounded-2xl mb-6">
    <CardHeader>
      <div className="flex items-start justify-between gap-x-2">
        <div className="flex-1 flex flex-col gap-y-2">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const UnauthenticatedParticipantsView = ({ isPublic = false }: { isPublic: boolean }) => (
  <div className="relative">
    <div className="blur-sm pointer-events-none">
      <div className="space-y-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl flex-wrap"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-300" />
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-20 bg-gray-300 rounded" />
                  <div className="h-5 w-12 bg-gray-300 rounded" />
                </div>
                <div className="h-3 w-16 bg-gray-300 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
      <div className="text-center space-y-4">
        <p className="text-lg font-medium">
          {isPublic
            ? "Registrati per vedere i partecipanti"
            : "La lista dei partecipanti di questa jam non è pubblica."}
        </p>
        <Button
          onClick={() => {
            localStorage.setItem("jamia_redirect_url", window.location.pathname);
            window.location.href = "/auth?mode=signup";
          }}
          className="rounded-xl"
        >
          Registrati
        </Button>
      </div>
    </div>
  </div>
);

const ParticipantsEmptyState = ({ jamStatus }: { jamStatus: Jam["status"] }) => (
  <div className="text-center py-8">
    <p className="text-muted-foreground mb-2">
      {jamStatus === "draft"
        ? "Pubblica la jam per permettere le prenotazioni"
        : "Nessun partecipante ancora"}
    </p>
    {jamStatus === "draft" && (
      <p className="text-sm text-muted-foreground">
        Una volta pubblicata, i partecipanti potranno prenotare il loro posto
      </p>
    )}
  </div>
);

const ParticipantRemovalDialog = ({
  open,
  participant,
  onOpenChange,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  participant: ParticipantSummary | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rimuovi partecipante</DialogTitle>
        <DialogDescription>
          Sei sicuro di voler rimuovere {participant?.name ?? "questo partecipante"} dalla jam?
          Questa azione non può essere annullata.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Annulla
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? "Rimozione..." : "Rimuovi"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const ParticipantsList = ({
  participants,
  jam,
  isOwner,
  isAuthenticated,
  isManager,
  currentUserId,
  canManageParticipants,
  onParticipantsUpdated,
}: ParticipantsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addParticipantDialogOpen, setAddParticipantDialogOpen] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<ParticipantSummary | null>(null);
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null);
  const effectiveCanManageParticipants =
    typeof canManageParticipants === "boolean" ? canManageParticipants : isOwner || isManager;

  const removeParticipantMutation = useMutation<void, unknown, string>({
    mutationFn: async (participantId) => {
      await participantsApi.removeParticipant(participantId);
    },
    onSuccess: () => {
      toast({
        title: "Partecipante rimosso",
        description: "Il partecipante è stato rimosso dalla jam",
      });
      onParticipantsUpdated?.();
      queryClient.invalidateQueries({ queryKey: queryKeyForJamParticipants(jam.id) });
      setDialogOpen(false);
      setParticipantToRemove(null);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: getApiErrorMessage(error, "Impossibile rimuovere il partecipante"),
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation<
    void,
    unknown,
    { participantId: string; role: ParticipantUpdatableRole }
  >({
    mutationFn: async ({ participantId, role }) => {
      setUpdatingParticipantId(participantId);
      await participantsApi.updateRole(participantId, role);
    },
    onSuccess: () => {
      toast({
        title: "Ruolo aggiornato",
        description: "Il ruolo del partecipante è stato aggiornato",
      });
      onParticipantsUpdated?.();
      queryClient.invalidateQueries({ queryKey: queryKeyForJamParticipants(jam.id) });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: getApiErrorMessage(error, "Impossibile aggiornare il ruolo del partecipante"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingParticipantId(null);
    },
  });

  const handleRemoveParticipant = (participant: ParticipantWithProfile) => {
    const name = participant.profiles?.first_name
      ? participant.profiles.first_name
      : "questo partecipante";
    setParticipantToRemove({ id: participant.id, name });
    setDialogOpen(true);
  };

  const confirmRemoveParticipant = () => {
    if (participantToRemove) {
      removeParticipantMutation.mutate(participantToRemove.id);
    }
  };

  const handleChangeRole = (
    participant: ParticipantWithProfile,
    role: ParticipantUpdatableRole,
  ) => {
    if (participant.role === role) {
      return;
    }
    updateRoleMutation.mutate({ participantId: participant.id, role });
  };

  const handleCopyNames = async () => {
    try {
      const names = participants
        .map((participant) => {
          const firstName = participant.profiles?.first_name ?? "";
          const lastName = participant.profiles?.last_name ?? "";
          return `${firstName} ${lastName}`.trim();
        })
        .filter((name) => name.length > 0)
        .join("\n");

      if (names.length === 0) {
        toast({
          title: "Nessun nome disponibile",
          description: "Non ci sono nomi da copiare",
          variant: "destructive",
        });
        return;
      }

      await navigator.clipboard.writeText(names);
      toast({
        title: "Nomi copiati",
        description: "I nomi sono stati copiati negli appunti",
      });
    } catch {
      toast({
        title: "Errore",
        description: "Impossibile copiare i nomi negli appunti",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    const participantCount = jam.participant_count ?? participants.length ?? "?";
    return (
      <ParticipantsCard
        title={`Partecipanti (${participantCount})`}
        description="Lista dei partecipanti confermati"
      >
        <UnauthenticatedParticipantsView isPublic={jam.public_participants ?? false} />
      </ParticipantsCard>
    );
  }

  if (!jam.public_participants && !effectiveCanManageParticipants) {
    return (
      <ParticipantsCard title={`Partecipanti`} description="Lista dei partecipanti non pubblica">
        <div className="text-sm text-muted-foreground py-4">
          La lista dei partecipanti di questa jam non è pubblica.
        </div>
      </ParticipantsCard>
    );
  }

  return (
    <>
      <ParticipantsCard
        title={`Partecipanti (${participants.length})`}
        description={
          jam.status === "draft"
            ? "Le prenotazioni saranno disponibili dopo la pubblicazione"
            : "Lista dei partecipanti confermati"
        }
        headerAction={
          effectiveCanManageParticipants && (
            <div className="flex items-right gap-2">
              <Button
                onClick={() => setAddParticipantDialogOpen(true)}
                className="rounded-xl"
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleCopyNames}
                className="rounded-xl"
                size="sm"
                disabled={participants.length === 0}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
      >
        {participants.length === 0 ? (
          <ParticipantsEmptyState jamStatus={jam.status} />
        ) : (
          <div className="space-y-3">
            {participants.map((participant) => (
              <ParticipantRow
                key={participant.id}
                participant={participant}
                isOwner={isOwner}
                canEditRole={
                  effectiveCanManageParticipants || participant.user_id === currentUserId
                }
                onRemove={handleRemoveParticipant}
                isRemoving={removeParticipantMutation.isPending}
                onChangeRole={(role) => handleChangeRole(participant, role)}
                isUpdatingRole={
                  updatingParticipantId === participant.id && updateRoleMutation.isPending
                }
              />
            ))}
          </div>
        )}
      </ParticipantsCard >

      <ParticipantRemovalDialog
        open={dialogOpen}
        participant={participantToRemove}
        onOpenChange={setDialogOpen}
        onConfirm={confirmRemoveParticipant}
        isLoading={removeParticipantMutation.isPending}
      />

      <AddParticipantDialog
        open={addParticipantDialogOpen}
        onOpenChange={setAddParticipantDialogOpen}
        jamId={jam.id}
        onParticipantsUpdated={onParticipantsUpdated}
      />
    </>
  );
};
