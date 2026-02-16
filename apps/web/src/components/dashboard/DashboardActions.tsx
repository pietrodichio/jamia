import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Plus, Search, User, LogOut } from 'lucide-react';

type DashboardMenuProps = {
  onProfileClick: () => void;
  onSignOut: () => void;
};

export function DashboardMobileMenu({ onProfileClick, onSignOut }: DashboardMenuProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl"
          aria-label="Apri menu azioni dashboard"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => navigate('/discover')}>
          <Search className="mr-2 h-4 w-4" />
          {t('actions.discoverEvents')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onProfileClick}>
          <User className="mr-2 h-4 w-4" />
          Profilo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardActions() {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
      <Button
        onClick={() => navigate('/create-event')}
        variant="default"
        size="sm"
        className="flex-1 justify-center rounded-xl sm:w-auto sm:flex-none"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('actions.createEvent')}
      </Button>

      <Button
        onClick={() => navigate('/discover')}
        variant="outline"
        size="sm"
        className="hidden rounded-xl sm:inline-flex"
      >
        <Search className="mr-2 h-4 w-4" />
        {t('actions.discoverEvents')}
      </Button>
    </div>
  );
}
