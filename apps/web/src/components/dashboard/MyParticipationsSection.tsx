import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Calendar, History } from 'lucide-react';
import JamCard from '@/components/JamCard';
import type { Jam } from '@/api/jams.api';

interface MyParticipationsSectionProps {
  activeParticipatedJams: Jam[];
  pastParticipatedJams: Jam[];
  isLoading: boolean;
  isOwnerOrManager: (jam: Jam) => boolean;
  isOwner: (jam: Jam) => boolean;
  onClone: (jam: Jam) => void;
  onManageManagers: () => void;
}

/**
 * Displays user's jam participations (as a dancer, not organizer)
 * Shows upcoming jams and past participation history
 */
export function MyParticipationsSection({
  activeParticipatedJams,
  pastParticipatedJams,
  isLoading,
  isOwnerOrManager,
  isOwner,
  onClone,
  onManageManagers,
}: MyParticipationsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Upcoming Participations */}
      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle>Prossime Jam</CardTitle>
          <CardDescription>Jam a cui hai deciso di partecipare</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeParticipatedJams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Non hai ancora prenotato nessuna jam</p>
              <p className="text-sm text-muted-foreground mt-2">Inizia a cercare jam nella tua zona!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeParticipatedJams.map((jam) => (
                <JamCard
                  key={jam.id}
                  jam={jam}
                  isOwnerOrManager={isOwnerOrManager(jam)}
                  isOwner={isOwner(jam)}
                  onClone={() => onClone(jam)}
                  onManageManagers={onManageManagers}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Participations History */}
      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle>Storico partecipazioni</CardTitle>
          <CardDescription>Jam a cui hai partecipato nel passato</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pastParticipatedJams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessuna partecipazione passata</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pastParticipatedJams.map((jam) => (
                <JamCard
                  key={jam.id}
                  jam={jam}
                  isOwnerOrManager={isOwnerOrManager(jam)}
                  isOwner={isOwner(jam)}
                  onClone={() => onClone(jam)}
                  onManageManagers={onManageManagers}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
