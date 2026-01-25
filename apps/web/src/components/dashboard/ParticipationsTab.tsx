import { RecommendationsSection } from './RecommendationsSection';
import { MyParticipationsSection } from './MyParticipationsSection';
import type { Jam } from '@/api/jams.api';

interface ParticipationsTabProps {
  userId?: string;
  // Participation data passed through
  activeParticipatedJams: Jam[];
  pastParticipatedJams: Jam[];
  participationsLoading: boolean;
  isOwnerOrManager: (jam: Jam) => boolean;
  isOwner: (jam: Jam) => boolean;
  onClone: (jam: Jam) => void;
  onManageManagers: () => void;
}

/**
 * Participations tab content for the dashboard
 * Combines event recommendations and jam participation sections
 */
export function ParticipationsTab({
  userId,
  activeParticipatedJams,
  pastParticipatedJams,
  participationsLoading,
  isOwnerOrManager,
  isOwner,
  onClone,
  onManageManagers,
}: ParticipationsTabProps) {
  return (
    <div className="space-y-6">
      {/* Event Recommendations based on user location */}
      <RecommendationsSection userId={userId} />

      {/* Jam Participations (as dancer, not organizer) */}
      <MyParticipationsSection
        activeParticipatedJams={activeParticipatedJams}
        pastParticipatedJams={pastParticipatedJams}
        isLoading={participationsLoading}
        isOwnerOrManager={isOwnerOrManager}
        isOwner={isOwner}
        onClone={onClone}
        onManageManagers={onManageManagers}
      />
    </div>
  );
}
