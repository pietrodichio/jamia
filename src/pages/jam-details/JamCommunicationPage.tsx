import { JamEmailComposer } from "@/components/JamEmailComposer";
import { useJamDetailsContext } from "./useJamDetailsContext";

const JamCommunicationPage = () => {
  const { jam, currentUser, isOwnerOrManager } = useJamDetailsContext();

  if (!isOwnerOrManager) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
        Solo i proprietari e i manager possono inviare comunicazioni ai partecipanti.
      </div>
    );
  }

  return (
    <JamEmailComposer
      jamId={jam.id}
      jamName={jam.name}
      senderEmail={currentUser?.email}
    />
  );
};

export default JamCommunicationPage;
