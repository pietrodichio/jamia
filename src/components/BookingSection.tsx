import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, UserCheck, UserX } from "lucide-react";
import { type Jam } from "@/api/jams.api";
import { type Participant } from "@/api/participants.api";
import { CancelParticipationDialog } from "@/components/CancelParticipationDialog";

const redirectToAuth = (mode: "login" | "signup") => {
  localStorage.setItem("jamia_redirect_url", window.location.pathname);
  window.location.href = `/auth?mode=${mode}`;
};

const redirectToEmailConfirmation = () => {
  localStorage.setItem("jamia_redirect_url", window.location.pathname);
  window.location.href = "/email-confirmation";
};

interface BookingSectionProps {
  jam: Jam;
  isOwner: boolean;
  userParticipation: Participant | null;
  isBooking: boolean;
  isCancelling: boolean;
  isAuthenticated: boolean;
  isEmailConfirmed: boolean;
  onBook: () => void;
  onCancelParticipation: () => void;
}

const SectionContainer = ({ children }: { children: ReactNode }) => (
  <div className="pt-4 border-t">{children}</div>
);

const AuthPrompt = () => (
  <div className="space-y-3">
    <p className="text-center text-muted-foreground">Accedi o registrati per prenotare il tuo posto</p>
    <div className="flex gap-2">
      <Button className="flex-1 rounded-xl" size="lg" onClick={() => redirectToAuth("login")}>
        Accedi
      </Button>
      <Button variant="outline" className="flex-1 rounded-xl" size="lg" onClick={() => redirectToAuth("signup")}>
        Registrati
      </Button>
    </div>
  </div>
);

const BookingButton = ({ isBooking, onBook }: { isBooking: boolean; onBook: () => void }) => (
  <Button className="w-full rounded-xl" size="lg" onClick={onBook} disabled={isBooking}>
    {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    Prenota il tuo posto
  </Button>
);

const EmailConfirmationPrompt = () => (
  <div className="space-y-3">
    <p className="text-center text-muted-foreground">
      Conferma il tuo indirizzo email per poter prenotare un posto in questa jam.
    </p>
    <Button className="w-full rounded-xl" size="lg" onClick={redirectToEmailConfirmation}>
      Vai alla conferma email
    </Button>
  </div>
);

const ParticipationBanner = ({
  userParticipation,
  onCancelParticipation,
  isCancelling,
}: {
  userParticipation: Participant;
  onCancelParticipation: () => void;
  isCancelling: boolean;
}) => {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const handleCancelClick = () => {
    setIsCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    setIsCancelDialogOpen(false);
    onCancelParticipation();
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex items-center gap-2 text-primary w-full justify-center p-8 rounded-xl",
          userParticipation.state === "participant" ? "bg-green-500" : "bg-yellow-500",
        )}
      >
        <UserCheck
          className={cn("h-5 w-5", userParticipation.state === "participant" ? "text-white" : "text-black")}
        />
        <span className={cn("font-medium", userParticipation.state === "participant" ? "text-white" : "text-black")}>
          {userParticipation.state === "participant" ? "Sei iscritto a questa jam" : "Sei in lista d'attesa"}
        </span>
      </div>
      <Button
        onClick={handleCancelClick}
        variant="destructive"
        className="w-full rounded-xl"
        disabled={isCancelling}
      >
        <UserX className="mr-2 h-4 w-4" />
        {isCancelling ? "Annullamento..." : "Annulla partecipazione"}
      </Button>
      
      <CancelParticipationDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onConfirm={handleConfirmCancel}
        isCancelling={isCancelling}
      />
    </div>
  );
};

export const BookingSection = ({
  jam,
  isOwner,
  userParticipation,
  isBooking,
  isCancelling,
  isAuthenticated,
  isEmailConfirmed,
  onBook,
  onCancelParticipation,
}: BookingSectionProps) => {
  if (jam.status !== "published" || isOwner) {
    return null;
  }

  return (
    <SectionContainer>
      {!isAuthenticated && <AuthPrompt />}
      {isAuthenticated && !isEmailConfirmed && <EmailConfirmationPrompt />}
      {isAuthenticated && isEmailConfirmed && !userParticipation && (
        <BookingButton isBooking={isBooking} onBook={onBook} />
      )}
      {isAuthenticated && isEmailConfirmed && userParticipation && (
        <ParticipationBanner
          userParticipation={userParticipation}
          onCancelParticipation={onCancelParticipation}
          isCancelling={isCancelling}
        />
      )}
    </SectionContainer>
  );
};
