import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserPlus, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { eventOrganizersApi } from '@/api/event-organizers.api';
import { profilesApi } from '@/api/profiles.api';
import { useDebounce } from '@/hooks/use-debounce';
import type { EventOrganizer } from '@jamia/types/event';

interface ManageCoOrganizersDialogProps {
  eventId: string;
  isOwner: boolean;
  children: React.ReactNode;
}

export function ManageCoOrganizersDialog({
  eventId,
  isOwner,
  children,
}: ManageCoOrganizersDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation(['events', 'common']);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Query for co-organizers
  const coOrganizersQuery = useQuery<EventOrganizer[]>({
    queryKey: ['events', eventId, 'organizers'],
    enabled: open,
    queryFn: () => eventOrganizersApi.getCoOrganizers(eventId),
  });

  const coOrganizers = coOrganizersQuery.data || [];
  const coOrganizerIds = coOrganizers.map((org) => org.user_id);

  // Query for user search
  const searchQueryEnabled = open && coOrganizersQuery.isSuccess;
  const searchUsersQuery = useQuery({
    queryKey: ['search-users', eventId, debouncedSearchQuery, coOrganizerIds.sort().join(',')],
    enabled: searchQueryEnabled && debouncedSearchQuery.length >= 2,
    queryFn: async () => {
      const data = await profilesApi.searchUsers(debouncedSearchQuery, 10);
      // Filter out users who are already co-organizers or the event owner
      return data.filter((user) => !coOrganizerIds.includes(user.id));
    },
  });

  const searchResults = searchUsersQuery.data || [];
  const isSearching = searchUsersQuery.isFetching;

  const addCoOrganizerMutation = useMutation({
    mutationFn: async ({ userId, userName }: { userId: string; userName: string }) => {
      await eventOrganizersApi.addCoOrganizer(eventId, { userId });
      return { userId, userName };
    },
    onSuccess: ({ userName }) => {
      toast({
        title: t('events:admin.coOrganizerAdded'),
        description: `${userName} è ora un co-organizzatore di questo evento`,
      });
      setSearchQuery('');
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'organizers'] });
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:common.error'),
        description: error.response?.data?.message || t('common:common.error'),
        variant: 'destructive',
      });
    },
  });

  const removeCoOrganizerMutation = useMutation({
    mutationFn: async ({ organizerId, organizerName }: { organizerId: string; organizerName: string }) => {
      await eventOrganizersApi.removeCoOrganizer(eventId, organizerId);
      return { organizerId, organizerName };
    },
    onSuccess: ({ organizerName }) => {
      toast({
        title: t('events:admin.coOrganizerRemoved'),
        description: `${organizerName} non è più un co-organizzatore di questo evento`,
      });
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'organizers'] });
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
    },
    onError: (error: any) => {
      toast({
        title: t('common:common.error'),
        description: error.response?.data?.message || t('common:common.error'),
        variant: 'destructive',
      });
    },
  });

  if (!isOwner) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('events:admin.manageCoOrganizers')}
          </DialogTitle>
          <DialogDescription>
            {t('events:admin.manageCoOrganizersDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search for new co-organizers */}
          <div className="space-y-2">
            <label htmlFor="search" className="text-sm font-medium">
              {t('events:admin.addCoOrganizer')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder={t('events:admin.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search results */}
            {isSearching && (
              <p className="text-sm text-muted-foreground">{t('common:common.loading')}</p>
            )}
            {searchResults.length > 0 && !isSearching && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addCoOrganizerMutation.mutate({ userId: user.id, userName: user.name })}
                      disabled={isSearching || addCoOrganizerMutation.isPending}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <p className="text-sm text-muted-foreground">{t('events:admin.noUsersFound')}</p>
            )}
          </div>

          {/* Current co-organizers */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('events:admin.currentCoOrganizers')}</label>
            {coOrganizersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">{t('common:common.loading')}</p>
            ) : coOrganizers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('events:admin.noCoOrganizers')}</p>
            ) : (
              <div className="space-y-2">
                {coOrganizers.map((organizer) => (
                  <div
                    key={organizer.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {organizer.profiles?.first_name} {organizer.profiles?.last_name || ''}
                      </p>
                      <p className="text-sm text-muted-foreground">{organizer.profiles?.email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        removeCoOrganizerMutation.mutate({
                          organizerId: organizer.id,
                          organizerName: `${organizer.profiles?.first_name} ${organizer.profiles?.last_name || ''}`.trim(),
                        })
                      }
                      disabled={removeCoOrganizerMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
