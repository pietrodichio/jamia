import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface JamCardProps {
  jam: {
    id: string;
    name: string;
    location_text: string;
    starts_at: string;
    ends_at: string;
    status: "draft" | "published" | "archived";
    capacity?: number;
    participant_count?: number;
    waiting_count?: number;
  };
  showStatus?: boolean;
}

const JamCard = ({ jam, showStatus = false }: JamCardProps) => {
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

  const isFull = jam.capacity && jam.participant_count ? jam.participant_count >= jam.capacity : false;

  return (
    <Card
      className="border-primary/10 rounded-2xl hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => navigate(`/jam/${jam.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl group-hover:text-primary transition-colors">
            {jam.name}
          </CardTitle>
          {showStatus && getStatusBadge()}
        </div>
        <CardDescription className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3" />
          {jam.location_text}
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
                {jam.participant_count || 0}
                {jam.capacity ? `/${jam.capacity}` : ""} partecipanti
              </span>
              {isFull && <Badge variant="secondary" className="text-xs">Completo</Badge>}
              {jam.waiting_count && jam.waiting_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  {jam.waiting_count} in attesa
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