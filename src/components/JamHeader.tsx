import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock, Share2, Edit, Trash2, Loader2, Copy, ShieldEllipsis } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ManageManagersDialog } from "./ManageManagersDialog";

interface JamHeaderProps {
  jam: any;
  isOwner: boolean;
  isOwnerOrManager: boolean;
  participants: any[];
  waitingList: any[];
  isPublishing: boolean;
  onPublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onClone: () => void;
  onManageManagers: () => void;
}

export const JamHeader = ({
  jam,
  isOwner,
  isOwnerOrManager,
  participants,
  waitingList,
  isPublishing,
  onPublish,
  onEdit,
  onDelete,
  onShare,
  onClone,
  onManageManagers,
}: JamHeaderProps) => {
  return (
    <Card className="border-primary/10 shadow-lg rounded-2xl mb-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-3xl">{jam.name}</CardTitle>
              {jam.status === "draft" && <Badge variant="secondary">Bozza</Badge>}
              {jam.status === "published" && <Badge className="bg-primary">Pubblicata</Badge>}
            </div>
            <CardDescription className="flex items-center gap-1 text-base">
              <MapPin className="h-4 w-4" />
              {jam.location_text}
              {jam.gmaps_link && (
                <a href={jam.gmaps_link} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                  (Mappa)
                </a>
              )}
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            {isOwnerOrManager && (
              <>
                {jam.status === "draft" && (
                  <Button
                    onClick={onPublish}
                    disabled={isPublishing}
                    className="rounded-xl"
                  >
                    {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Pubblica
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={onEdit}
                  className="rounded-xl"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={onClone}
                  className="rounded-xl"
                  title="Clona jam"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <ManageManagersDialog
                  jamId={jam.id}
                  isOwner={isOwner}
                  onManagersUpdated={onManageManagers}
                >
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    title="Gestisci manager"
                  >
                    <ShieldEllipsis className="h-4 w-4" />
                  </Button>
                </ManageManagersDialog>
                {isOwner && (
                  <Button
                    variant="outline"
                    onClick={onDelete}
                    className="rounded-xl text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
            {jam.status === "published" && (
              <Button
                variant="outline"
                onClick={onShare}
                className="rounded-xl"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Condividi
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {format(new Date(jam.starts_at), "d MMMM yyyy", { locale: it })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>
              {format(new Date(jam.starts_at), "HH:mm")} - {format(new Date(jam.ends_at), "HH:mm")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>
              {participants.length}{jam.capacity ? `/${jam.capacity}` : ""} partecipanti
              {waitingList.length > 0 && ` • ${waitingList.length} in attesa`}
            </span>
          </div>
        </div>

        {jam.description && (
          <div className="pt-4 border-t">
            <p className="text-muted-foreground whitespace-pre-wrap">{jam.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
