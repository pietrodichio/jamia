import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CancelParticipationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isCancelling: boolean;
}

export const CancelParticipationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isCancelling,
}: CancelParticipationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Annulla partecipazione
          </DialogTitle>
          <DialogDescription>
            Sei sicuro di voler annullare la tua partecipazione a questa jam? 
            Potresti perdere il tuo posto e non essere in grado di rientrare se la jam è piena.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Mantieni partecipazione
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isCancelling}
            className="rounded-xl"
          >
            {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Annulla partecipazione
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

