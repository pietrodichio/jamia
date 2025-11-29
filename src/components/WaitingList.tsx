import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { participantsApi, type ParticipantUpdatableRole } from "@/api/participants.api";
import { useToast } from "@/hooks/use-toast";
import { ParticipantRow } from "./ParticipantRow";

interface WaitingListProps {
  waitingList: any[];
  jamId: string;
  onParticipantsUpdated?: () => void;
  canPromote?: boolean;
}

export const WaitingList = ({
  waitingList,
  jamId,
  onParticipantsUpdated,
  canPromote = false,
}: WaitingListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingParticipantId, setUpdatingParticipantId] = useState<string | null>(null);

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: string) => participantsApi.removeParticipant(participantId),
    onSuccess: () => {
      toast({
        title: "Partecipante rimosso",
        description: "Il partecipante è stato rimosso dalla lista d'attesa",
      });
      onParticipantsUpdated?.();
      // Invalidate and refetch jam participants
      queryClient.invalidateQueries({ queryKey: ['jam-participants', jamId] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.response?.data?.message || "Impossibile rimuovere il partecipante",
        variant: "destructive",
      });
    },
  });

  const promoteParticipantMutation = useMutation({
    mutationFn: (participantId: string) => participantsApi.promoteParticipant(participantId),
    onSuccess: () => {
      toast({
        title: "Partecipante promosso",
        description: "Il partecipante è stato spostato nella lista dei confermati",
      });
      onParticipantsUpdated?.();
      queryClient.invalidateQueries({ queryKey: ['jam-participants', jamId] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.response?.data?.message || "Impossibile promuovere il partecipante",
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
      queryClient.invalidateQueries({ queryKey: ['jam-participants', jamId] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.response?.data?.message || "Impossibile aggiornare il ruolo del partecipante",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUpdatingParticipantId(null);
    },
  });

  const handleRemoveParticipant = (participant: any) => {
    const name = participant.profiles?.first_name || 'questo partecipante';
    if (confirm(`Sei sicuro di voler rimuovere ${name} dalla lista d'attesa?`)) {
      removeParticipantMutation.mutate(participant.id);
    }
  };

  const handlePromoteParticipant = (participantId: string, participantName: string) => {
    if (confirm(`Vuoi promuovere ${participantName} tra i partecipanti?`)) {
      promoteParticipantMutation.mutate(participantId);
    }
  };

  const handleChangeRole = (
    participant: any,
    role: ParticipantUpdatableRole,
  ) => {
    if (participant.role === role) {
      return;
    }
    updateRoleMutation.mutate({ participantId: participant.id, role });
  };

  if (waitingList.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/10 rounded-2xl">
      <CardHeader>
        <CardTitle>Lista d'attesa ({waitingList.length})</CardTitle>
        <CardDescription>
          {canPromote
            ? "La promozione automatica è disattivata: puoi promuovere manualmente le persone iscritte."
            : "Persone in attesa di un posto"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {waitingList.map((w) => (
            <ParticipantRow
              key={w.id}
              participant={w}
              isOwner={true} // Assuming if they can see this component they have management rights (as per usage in JamParticipantsPage)
              canEditRole={true}
              onRemove={handleRemoveParticipant}
              isRemoving={removeParticipantMutation.isPending}
              onChangeRole={(role) => handleChangeRole(w, role)}
              isUpdatingRole={updatingParticipantId === w.id && updateRoleMutation.isPending}
              extraActions={
                canPromote && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full sm:w-fit"
                    onClick={() => handlePromoteParticipant(w.id, w.profiles?.first_name || 'questo partecipante')}
                    disabled={promoteParticipantMutation.isPending}
                  >
                    Promuovi
                  </Button>
                )
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
