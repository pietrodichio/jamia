import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, CalendarDays, Users, History } from 'lucide-react';
import JamCard from '@/components/JamCard';
import type { Jam } from '@/api/jams.api';

interface JamManagementSectionProps {
  draftOwnedJams: Jam[];
  activeOwnedJams: Jam[];
  pastOwnedJams: Jam[];
  isLoading: boolean;
  isOwnerOrManager: (jam: Jam) => boolean;
  isOwner: (jam: Jam) => boolean;
  onClone: (jam: Jam) => void;
  onManageManagers: () => void;
}

/**
 * Legacy jam management section
 * Displays drafts, active jams, and past jams with management actions
 */
export function JamManagementSection({
  draftOwnedJams,
  activeOwnedJams,
  pastOwnedJams,
  isLoading,
  isOwnerOrManager,
  isOwner,
  onClone,
  onManageManagers,
}: JamManagementSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold">Gestisci le tue Jam</h3>
        <p className="text-sm text-muted-foreground">Bozze, jam attive e storico organizzazione</p>
      </div>

      {/* Drafts */}
      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle>Bozze</CardTitle>
          <CardDescription>Jam salvate ma non ancora pubblicate</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : draftOwnedJams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessuna bozza salvata</p>
              <Button
                onClick={() => navigate('/create-jam')}
                className="mt-4 rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crea una nuova Jam
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {draftOwnedJams.map((jam) => (
                <JamCard
                  key={jam.id}
                  jam={jam}
                  showStatus
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

      {/* Active Jams */}
      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle>Jam attive</CardTitle>
          <CardDescription>Jam pubblicate che stai organizzando</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeOwnedJams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessuna jam attiva in questo momento</p>
              <Button
                onClick={() => navigate('/create-jam')}
                className="mt-4 rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crea una Jam
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeOwnedJams.map((jam) => (
                <JamCard
                  key={jam.id}
                  jam={jam}
                  showStatus
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

      {/* Past Jams (History) */}
      <Card className="border-primary/10 rounded-2xl">
        <CardHeader>
          <CardTitle>Storico gestione</CardTitle>
          <CardDescription>Jam che hai organizzato nel passato</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pastOwnedJams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nessuna jam gestita nel passato</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pastOwnedJams.map((jam) => (
                <JamCard
                  key={jam.id}
                  jam={jam}
                  showStatus
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
