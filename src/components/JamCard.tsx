import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock, Copy, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ManageManagersDialog } from "./ManageManagersDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface JamCardProps {
  jam: {
    id: string;
    name: string;
    location_text?: string;
    location?: {
      description?: string;
    };
    starts_at: string;
    ends_at: string;
    status: "draft" | "published" | "archived";
    capacity?: number;
    participant_count?: number;
    waiting_count?: number;
  };
  showStatus?: boolean;
  isOwnerOrManager?: boolean;
  isOwner?: boolean;
  onClone?: () => void;
  onManageManagers?: () => void;
}

const JamCard = ({ 
  jam, 
  showStatus = false, 
  isOwnerOrManager = false, 
  isOwner = false, 
  onClone, 
  onManageManagers 
}: JamCardProps) => {
  const navigate = useNavigate();

  const getStatusBadge = () => {
    switch (jam.status) {
      case "draft":
        return <Badge variant="secondary">Bozza</Badge>;
      case "published":
        return <Badge className="bg-primary">Pubblicata</Badge>;
      case "archived":
        return <Badge variant="outline">Archiviata</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "d MMM yyyy", { locale: it });
  };

  const formatTime = (date: string) => {
    return format(new Date(date), "HH:mm", { locale: it });
  };

  const participantCount = jam.participant_count ?? 0;
  const waitingCount = jam.waiting_count ?? 0;
  const isFull = jam.capacity !== undefined && jam.participant_count !== undefined
    ? jam.participant_count >= jam.capacity
    : false;

  const handleCardClick = () => {
    navigate(`/jam/${jam.id}`);
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const locationLabel = jam.location?.description || jam.location_text;

  return (
    <Card
      className="border-primary/10 rounded-2xl hover:shadow-lg transition-all cursor-pointer group relative"
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-x-2">
          <CardTitle className="text-xl group-hover:text-primary transition-colors">
            {jam.name}
          </CardTitle>
          <div className="flex items-center gap-2 w-fit justify-end">
          {showStatus && getStatusBadge()}


        {isOwnerOrManager && (
          <div className="flex items-center gap-2 justify-end">
            {onClone && (
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => handleActionClick(e, onClone)}
                title="Clona jam"
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {onManageManagers && (
              <ManageManagersDialog
                jamId={jam.id}
                isOwner={isOwner}
                onManagersUpdated={onManageManagers}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  title="Gestisci manager"
                  className="h-8 w-8 p-0"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </ManageManagersDialog>
            )}
          </div>
        )}
        </div>
        </div>
        <CardDescription className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3" />
          {locationLabel && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="truncate max-w-[200px] sm:max-w-[400px]">
                        {locationLabel}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>{locationLabel}</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{formatDate(jam.starts_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-primary" />
            <span>{formatTime(jam.starts_at)} - {formatTime(jam.ends_at)}</span>
          </div>
        </div>

        {(jam.capacity || jam.participant_count !== undefined) && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {participantCount}
                {jam.capacity ? `/${jam.capacity}` : ""} partecipanti
              </span>
              {isFull && <Badge variant="secondary" className="text-xs">Completo</Badge>}
              {waitingCount > 0 && (
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  {waitingCount} in attesa
                </Badge>
              )}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default JamCard;
