import { Grid3x3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewType = 'grid' | 'calendar';

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

/**
 * Toggle button component for switching between grid and calendar views
 * Uses Italian labels: "Griglia" (grid) and "Calendario" (calendar)
 */
export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={currentView === 'grid' ? 'default' : 'outline'}
        size="default"
        onClick={() => onViewChange('grid')}
        className="flex items-center gap-2"
      >
        <Grid3x3 className="h-4 w-4" />
        <span>Griglia</span>
      </Button>

      <Button
        variant={currentView === 'calendar' ? 'default' : 'outline'}
        size="default"
        onClick={() => onViewChange('calendar')}
        className="flex items-center gap-2"
      >
        <Calendar className="h-4 w-4" />
        <span>Calendario</span>
      </Button>
    </div>
  );
}
