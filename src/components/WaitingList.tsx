import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { UserX } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { participantsApi } from "@/api/participants.api";
import { useToast } from "@/hooks/use-toast";

interface WaitingListProps {
  waitingList: any[];
  jamId: string;
  onParticipantRemoved?: () => void;
}

export const WaitingList = ({ waitingList, jamId, onParticipantRemoved }: WaitingListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const removeParticipantMutation = useMutation({
    mutationFn: (participantId: string) => participantsApi.removeParticipant(participantId),
    onSuccess: () => {
      toast({
        title: "Partecipante rimosso",
        description: "Il partecipante è stato rimosso dalla lista d'attesa",
      });
      onParticipantRemoved?.();
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

  const handleRemoveParticipant = (participantId: string, participantName: string) => {
    if (confirm(`Sei sicuro di voler rimuovere ${participantName} dalla lista d'attesa?`)) {
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

  if (waitingList.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/10 rounded-2xl">
      <CardHeader>
        <CardTitle>Lista d'attesa ({waitingList.length})</CardTitle>
        <CardDescription>Persone in attesa di un posto</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {waitingList.map((w, index) => (
            <div
              key={w.id}
              className="flex items-center justify-between p-3 bg-accent/20 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                <div>
                  <p className="font-medium">{w.profiles?.name}</p>
                  {w.profiles?.phone && (
                    <p className="text-sm text-muted-foreground">{w.profiles.phone}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getRoleBadgeColor(w.role)}>
                  {w.role === "base" ? "Base" : w.role === "flyer" ? "Flyer" : "Both"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatJoinedDate(w.joined_at)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveParticipant(w.id, w.profiles?.name || 'questo partecipante')}
                  disabled={removeParticipantMutation.isPending}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <UserX className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
