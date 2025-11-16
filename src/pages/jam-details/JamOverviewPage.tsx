import { JamHeader } from "@/components/JamHeader";
import { BookingSection } from "@/components/BookingSection";
import { useJamDetailsContext } from "./useJamDetailsContext";

const JamOverviewPage = () => {
  const {
    jam,
    participants,
    waitingList,
    isOwner,
    isOwnerOrManager,
    userParticipation,
    isAuthenticated,
    actions,
    states,
  } = useJamDetailsContext();

  return (
    <div className="flex flex-col gap-6">
      <JamHeader
        jam={jam}
        isOwner={isOwner}
        isOwnerOrManager={isOwnerOrManager}
        participants={participants}
        waitingList={isOwnerOrManager ? waitingList : []}
        isPublishing={states.isPublishing}
        onPublish={actions.onPublish}
        onEdit={actions.onEdit}
        onDelete={actions.onDelete}
        onShare={actions.onShare}
        onClone={actions.onClone}
        onManageManagers={actions.onManageManagers}
      />

      <BookingSection
        jam={jam}
        isOwner={isOwner}
        userParticipation={userParticipation}
        isBooking={states.isBooking}
        isCancelling={states.isCancelling}
        isAuthenticated={isAuthenticated}
        onBook={actions.onBook}
        onCancelParticipation={actions.onCancelParticipation}
      />
    </div>
  );
};

export default JamOverviewPage;
