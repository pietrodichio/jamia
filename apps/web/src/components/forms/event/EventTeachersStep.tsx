import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import type { EventFormData } from '@/hooks/useEventWizard';

interface EventTeachersStepProps {
  form: UseFormReturn<EventFormData>;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
}

// Helper to get display name from profile
function getDisplayName(profile: Profile): string {
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : 'Nome non disponibile';
}

// Helper to get initials from profile
function getInitials(profile: Profile): string {
  const first = profile.first_name?.charAt(0).toUpperCase() || '';
  const last = profile.last_name?.charAt(0).toUpperCase() || '';
  return first + last || '?';
}

export function EventTeachersStep({ form }: EventTeachersStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<Profile[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Get teacherIds from form
  const teacherIds = form.watch('teacherIds') || [];

  // Load selected teachers on mount using useQuery
  const { data: loadedTeachers } = useQuery({
    queryKey: ['profiles', 'teachers', teacherIds],
    queryFn: async () => {
      if (teacherIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo_url')
        .in('id', teacherIds);

      if (error) throw error;
      return data || [];
    },
    enabled: teacherIds.length > 0,
  });

  // Update selectedTeachers when loadedTeachers changes
  useEffect(() => {
    if (loadedTeachers) {
      setSelectedTeachers(loadedTeachers);
    }
  }, [loadedTeachers]);

  // Search for profiles using useQuery
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['profiles', 'search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];

      // Search in both first_name and last_name
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, photo_url')
        .or(`first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: debouncedSearch.length >= 2,
  });

  // Add teacher to selection
  const addTeacher = (teacher: Profile) => {
    const current = form.getValues('teacherIds') || [];
    if (!current.includes(teacher.id)) {
      form.setValue('teacherIds', [...current, teacher.id]);
      setSelectedTeachers([...selectedTeachers, teacher]);
    }
    setSearchQuery(''); // Clear search
  };

  // Remove teacher from selection
  const removeTeacher = (teacherId: string) => {
    const current = form.getValues('teacherIds') || [];
    form.setValue('teacherIds', current.filter(id => id !== teacherId));
    setSelectedTeachers(selectedTeachers.filter(t => t.id !== teacherId));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Insegnanti</h3>
        <p className="text-sm text-muted-foreground">
          Aggiungi insegnanti o istruttori per questo evento (opzionale)
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <Card className="absolute z-10 w-full mt-2 max-h-60 overflow-y-auto">
            <div className="p-2">
              {searchResults.map((result) => {
                const isAlreadySelected = selectedTeachers.some(t => t.id === result.id);
                const displayName = getDisplayName(result);
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => !isAlreadySelected && addTeacher(result)}
                    disabled={isAlreadySelected}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    {result.photo_url ? (
                      <img
                        src={result.photo_url}
                        alt={displayName}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {getInitials(result)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{displayName}</p>
                    </div>
                    {isAlreadySelected && (
                      <Badge variant="secondary" className="text-xs">Selezionato</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Empty state when searching but no results */}
      {debouncedSearch && debouncedSearch.length >= 2 && !isSearching && searchResults.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nessun insegnante trovato per "{debouncedSearch}"
        </p>
      )}

      {/* Selected Teachers */}
      {selectedTeachers.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Insegnanti selezionati ({selectedTeachers.length})</p>
          <div className="flex flex-wrap gap-2">
            {selectedTeachers.map((teacher) => {
              const displayName = getDisplayName(teacher);
              return (
                <Badge
                  key={teacher.id}
                  variant="secondary"
                  className="flex items-center gap-2 pr-1 pl-3 py-1.5"
                >
                  <span>{displayName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-destructive/20"
                    onClick={() => removeTeacher(teacher.id)}
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

      {/* Helper Text */}
      {selectedTeachers.length === 0 && !searchQuery && (
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm text-muted-foreground">
            Puoi saltare questo passaggio se non ci sono insegnanti da aggiungere.
            Gli insegnanti possono essere aggiunti anche dopo la creazione dell'evento.
          </p>
        </div>
      )}
    </div>
  );
}
