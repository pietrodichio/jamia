import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, UserX, Loader2 } from "lucide-react";

interface BookingSectionProps {
  jam: any;
  isOwner: boolean;
  userParticipation: any;
  selectedRole: "base" | "flyer" | "both";
  isBooking: boolean;
  onRoleChange: (role: "base" | "flyer" | "both") => void;
  onBook: () => void;
  onCancelParticipation: () => void;
}

export const BookingSection = ({
  jam,
  isOwner,
  userParticipation,
  selectedRole,
  isBooking,
  onRoleChange,
  onBook,
  onCancelParticipation,
}: BookingSectionProps) => {
  if (jam.status !== "published" || isOwner) {
    return null;
  }

  return (
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
              <DialogTitle>Prenota la tua jam</DialogTitle>
              <DialogDescription>
                Seleziona il tuo ruolo per la tua jam
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ruolo</Label>
                <Select value={selectedRole} onValueChange={onRoleChange}>
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
                onClick={onBook}
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
            onClick={onCancelParticipation}
            variant="outline"
            className="w-full rounded-xl"
          >
            <UserX className="mr-2 h-4 w-4" />
            Annulla partecipazione
          </Button>
        </div>
      )}
    </div>
  );
};
