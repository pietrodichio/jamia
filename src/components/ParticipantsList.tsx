import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Trash2, UserX } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { participantsApi } from "@/api/participants.api";
import { useToast } from "@/hooks/use-toast";

interface ParticipantsListProps {
  participants: any[];
  jam: any;
  isOwner: boolean;
  onParticipantRemoved?: () => void;
}

export const ParticipantsList = ({ participants, jam, isOwner, onParticipantRemoved }: ParticipantsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: string) => participantsApi.removeParticipant(participantId),
    onSuccess: () => {
      toast({
        title: "Partecipante rimosso",
        description: "Il partecipante è stato rimosso dalla jam",
      });
      onParticipantRemoved?.();
      // Invalidate and refetch jam participants
      queryClient.invalidateQueries({ queryKey: ['jam-participants', jam.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.response?.data?.message || "Impossibile rimuovere il partecipante",
        variant: "destructive",
      });
    },
  });

  const handleRemoveParticipant = (participantId: string, participantName: string) => {
    if (confirm(`Sei sicuro di voler rimuovere ${participantName} dalla jam?`)) {
      removeParticipantMutation.mutate(participantId);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "base": return "bg-blue-500/10 text-blue-600";
      case "flyer": return "bg-pink-500/10 text-pink-600";
      default: return "bg-purple-500/10 text-purple-600";
    }
  };

  const getEmptyStateMessage = () => {
    if (jam.status === "draft") {
      return "Pubblica la jam per permettere le prenotazioni";
    }
    return "Nessun partecipante ancora";
  };

  const formatJoinedDate = (joinedAt: string) => {
    const date = new Date(joinedAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      // If less than 24 hours, show relative time
      return formatDistanceToNow(date, { addSuffix: true, locale: it });
    } else if (diffInHours < 24 * 7) {
      // If less than a week, show day and time
      return format(date, "EEEE 'alle' HH:mm", { locale: it });
    } else {
      // If more than a week, show full date
      return format(date, "d MMMM 'alle' HH:mm", { locale: it });
    }
  };

  return (
    <Card className="border-primary/10 rounded-2xl mb-6">
      <CardHeader>
        <CardTitle>Partecipanti ({participants.length})</CardTitle>
        <CardDescription>
          {jam.status === "draft" 
            ? "Le prenotazioni saranno disponibili dopo la pubblicazione" 
            : "Lista dei partecipanti confermati"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">{getEmptyStateMessage()}</p>
            {jam.status === "draft" && (
              <p className="text-sm text-muted-foreground">
                Una volta pubblicata, i partecipanti potranno prenotare il loro posto
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl "
              >
                <div className="flex flex-col items-center gap-y-2">
                    <div className="flex items-start gap-2">
                      <p className="font-medium text-xl">
                        {p.profiles?.first_name} {p.profiles?.last_name || ''}
                      </p>
                      <Badge className={getRoleBadgeColor(p.role)}>
                      {p.role === "base" ? "Base" : p.role === "flyer" ? "Flyer" : "Both"}
                    </Badge>
                    </div>
                    {p.profiles?.phone && (
                      <p className="text-sm text-muted-foreground">{p.profiles.phone}</p>
                    )}
              
                </div>
                <div className="flex flex-col gap-y-2 items-end justify-end">
                  <div className="flex justify-end w-full">
               
                  <span className="text-xs text-muted-foreground">
                    {formatJoinedDate(p.joined_at)}
                  </span>
                    </div>
                  {isOwner && (
                    <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParticipant(p.id, p.profiles?.first_name || 'questo partecipante')}
                      disabled={removeParticipantMutation.isPending}
                      className="h-10 w-fit px-2 text-destructive hover:text-destructive bg-destructive/10"
                    >
                     <Trash2 className="h-3 w-3" /> Rimuovi
                    </Button>
                      </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
