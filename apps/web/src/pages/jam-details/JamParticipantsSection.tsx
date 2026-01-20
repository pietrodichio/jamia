import { Loader2 } from "lucide-react";
import { ParticipantsList } from "@/components/ParticipantsList";
import { WaitingList } from "@/components/WaitingList";
import { CancelledParticipantsList } from "@/components/CancelledParticipantsList";
import { useJamDetailsContext } from "./useJamDetailsContext";

export const JamParticipantsSection = () => {
  const {
    jam,
    participants,
    waitingList,
    cancelledList,
    isOwner,
    isAuthenticated,
    isManager,
    currentUserId,
    canManageParticipants,
    isOwnerOrManager,
    actions,
    states,
  } = useJamDetailsContext();

  const participantsUnavailable = !jam.public_participants && !isOwnerOrManager;
  const canManuallyPromote = Boolean(isOwnerOrManager && jam.auto_promote === false);

  if (states.isParticipantsLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (participantsUnavailable) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        I partecipanti sono visibili solo al team di gestione della jam.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ParticipantsList
        participants={participants}
        jam={jam}
        isOwner={isOwner}
        isAuthenticated={isAuthenticated}
        isManager={isManager}
        currentUserId={currentUserId}
        canManageParticipants={canManageParticipants}
        onParticipantsUpdated={actions.onParticipantsUpdated}
      />

      {isOwnerOrManager && (
        <>
          <WaitingList
            waitingList={waitingList}
            jamId={jam.id}
            onParticipantsUpdated={actions.onParticipantsUpdated}
            canPromote={canManuallyPromote}
          />
          <CancelledParticipantsList cancelledList={cancelledList} />
        </>
      )}
    </div>
  );
};

