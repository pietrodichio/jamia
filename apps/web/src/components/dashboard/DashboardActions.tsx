import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar } from 'lucide-react';

export function DashboardActions() {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={() => navigate('/events/new')}
        variant="default"
        size="sm"
        className="rounded-xl"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('actions.createEvent')}
      </Button>
      <Button
        onClick={() => navigate('/discover')}
        variant="outline"
        size="sm"
        className="rounded-xl"
      >
        <Search className="mr-2 h-4 w-4" />
        {t('actions.discoverEvents')}
      </Button>
      <Button
        onClick={() => navigate('/discover?view=calendar')}
        variant="outline"
        size="sm"
        className="rounded-xl"
      >
        <Calendar className="mr-2 h-4 w-4" />
        Calendario
      </Button>
    </div>
  );
}
