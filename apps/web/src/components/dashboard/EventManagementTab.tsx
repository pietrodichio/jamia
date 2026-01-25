import { MyEventsSection } from './MyEventsSection';
import { JamManagementSection } from './JamManagementSection';
import { Separator } from '@/components/ui/separator';
import type { Jam } from '@/api/jams.api';

interface EventManagementTabProps {
  userId?: string;
  // Jam management props passed through
  draftOwnedJams: Jam[];
  activeOwnedJams: Jam[];
  pastOwnedJams: Jam[];
  jamsLoading: boolean;
  isOwnerOrManager: (jam: Jam) => boolean;
  isOwner: (jam: Jam) => boolean;
  onClone: (jam: Jam) => void;
  onManageManagers: () => void;
}

/**
 * Event Management tab content
 * Contains user's events (from events table) and legacy jam management
 */
export function EventManagementTab({
  userId,
  draftOwnedJams,
  activeOwnedJams,
  pastOwnedJams,
  jamsLoading,
  isOwnerOrManager,
  isOwner,
  onClone,
  onManageManagers,
}: EventManagementTabProps) {
  return (
    <div className="space-y-8">
      {/* Events from events table */}
      <MyEventsSection userId={userId} />

      {/* Divider for legacy jam section */}
      <div className="relative">
        <Separator className="my-8" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-sm text-muted-foreground">
          Gestione Jam Legacy
        </span>
      </div>

      {/* Legacy jam management */}
      <JamManagementSection
        draftOwnedJams={draftOwnedJams}
        activeOwnedJams={activeOwnedJams}
        pastOwnedJams={pastOwnedJams}
        isLoading={jamsLoading}
        isOwnerOrManager={isOwnerOrManager}
        isOwner={isOwner}
        onClone={onClone}
        onManageManagers={onManageManagers}
      />
    </div>
  );
}
