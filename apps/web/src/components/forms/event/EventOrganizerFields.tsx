import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, X } from 'lucide-react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDebounce } from '@/hooks/use-debounce';
import { supabase } from '@/integrations/supabase/client';
import type { EventFormData } from '@/hooks/useEventWizard';

interface EventOrganizerFieldsProps {
  form: UseFormReturn<EventFormData>;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  photo_url: string | null;
}

function getDisplayName(profile: Profile): string {
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : profile.email || 'Nome non disponibile';
}

function getInitials(profile: Profile): string {
  const first = profile.first_name?.charAt(0).toUpperCase() || '';
  const last = profile.last_name?.charAt(0).toUpperCase() || '';
  return first + last || '?';
}

export function EventOrganizerFields({ form }: EventOrganizerFieldsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCoOrganizers, setSelectedCoOrganizers] = useState<Profile[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const coOrganizerIds = form.watch('coOrganizerIds') || [];

  const { data: loadedCoOrganizers } = useQuery({
    queryKey: ['profiles', 'co-organizers', coOrganizerIds],
    queryFn: async () => {
      if (coOrganizerIds.length === 0) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, photo_url')
        .in('id', coOrganizerIds);

      if (error) throw error;
      return data || [];
    },
    enabled: coOrganizerIds.length > 0,
  });

  useEffect(() => {
    if (loadedCoOrganizers) {
      setSelectedCoOrganizers(loadedCoOrganizers);
    }
  }, [loadedCoOrganizers]);

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['profiles', 'search', 'co-organizers', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, photo_url')
        .or(
          `first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`
        )
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: debouncedSearch.length >= 2,
  });

  const addCoOrganizer = (profile: Profile) => {
    const current = form.getValues('coOrganizerIds') || [];
    if (!current.includes(profile.id)) {
      form.setValue('coOrganizerIds', [...current, profile.id], { shouldDirty: true });
      setSelectedCoOrganizers((prev) => [...prev, profile]);
    }
    setSearchQuery('');
  };

  const removeCoOrganizer = (userId: string) => {
    const current = form.getValues('coOrganizerIds') || [];
    form.setValue(
      'coOrganizerIds',
      current.filter((id) => id !== userId),
      { shouldDirty: true }
    );
    setSelectedCoOrganizers((prev) => prev.filter((profile) => profile.id !== userId));
  };

  const filteredResults = searchResults.filter(
    (result) => !selectedCoOrganizers.some((profile) => profile.id === result.id)
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Organizzatori</h3>

      <FormField
        control={form.control}
        name="organizerContact"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contatto organizzatore (opzionale)</FormLabel>
            <FormControl>
              <Input
                type="text"
                placeholder="Email o contatto pubblico"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Questo contatto viene mostrato nel calendario esportato.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <FormLabel>Co-organizzatori (opzionale)</FormLabel>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {filteredResults.length > 0 && (
          <Card className="mt-2 max-h-60 overflow-y-auto">
            <div className="p-2 space-y-1">
              {filteredResults.map((result) => {
                const displayName = getDisplayName(result);
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => addCoOrganizer(result)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left"
                  >
                    {result.photo_url ? (
                      <img
                        src={result.photo_url}
                        alt={displayName}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{getInitials(result)}</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{displayName}</p>
                      {result.email && (
                        <p className="text-xs text-muted-foreground">{result.email}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {debouncedSearch && debouncedSearch.length >= 2 && !isSearching && filteredResults.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nessun profilo trovato per "{debouncedSearch}"
          </p>
        )}

        {selectedCoOrganizers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Co-organizzatori selezionati ({selectedCoOrganizers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedCoOrganizers.map((profile) => {
                const displayName = getDisplayName(profile);
                return (
                  <Badge
                    key={profile.id}
                    variant="secondary"
                    className="flex items-center gap-2 pr-1 pl-3 py-1.5"
                  >
                    <span>{displayName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-destructive/20"
                      onClick={() => removeCoOrganizer(profile.id)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Rimuovi {displayName}</span>
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
