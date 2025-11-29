import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { ParticipantRow } from "./ParticipantRow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CancelledParticipantsListProps {
  cancelledList: any[];
}

export const CancelledParticipantsList = ({ cancelledList }: CancelledParticipantsListProps) => {
  const formatCancelledDate = (cancelledAt: string) => {
    const date = new Date(cancelledAt);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true, locale: it });
    }

    if (diffInHours < 24 * 7) {
      return format(date, "EEEE 'alle' HH:mm", { locale: it });
    }

    return format(date, "d MMMM 'alle' HH:mm", { locale: it });
  };

  if (cancelledList.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive/10 rounded-2xl">
      <CardHeader>
        <CardTitle>Partecipanti Cancellati ({cancelledList.length})</CardTitle>
        <CardDescription>
          Storico delle cancellazioni
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {cancelledList.map((p) => (
            <ParticipantRow
              key={p.id}
              participant={p}
              isOwner={false} // No actions for cancelled participants
              canEditRole={false}
              onRemove={() => {}}
              isRemoving={false}
              showJoinedAt={false}
              customStatus={
                p.cancelled_at ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-destructive/80 truncate cursor-default">
                          Cancellato {formatCancelledDate(p.cancelled_at)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Cancellato il {format(new Date(p.cancelled_at), "d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
