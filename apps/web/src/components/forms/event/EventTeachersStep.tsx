import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
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
  full_name: string | null;
  avatar_url: string | null;
}

export function EventTeachersStep({ form }: EventTeachersStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load selected teachers on mount
  useEffect(() => {
    const loadSelectedTeachers = async () => {
      const teacherIds = form.getValues('teacherIds') || [];
      if (teacherIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', teacherIds);

        if (error) throw error;
        if (data) setSelectedTeachers(data);
      } catch (error) {
        console.error('Failed to load selected teachers:', error);
      }
    };

    loadSelectedTeachers();
  }, []);

  // Search for profiles
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchProfiles = async () => {
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .ilike('full_name', `%${debouncedSearch}%`)
          .limit(10);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchProfiles();
  }, [debouncedSearch]);

  // Add teacher to selection
  const addTeacher = (teacher: Profile) => {
    const current = form.getValues('teacherIds') || [];
    if (!current.includes(teacher.id)) {
      form.setValue('teacherIds', [...current, teacher.id]);
      setSelectedTeachers([...selectedTeachers, teacher]);
    }
    setSearchQuery(''); // Clear search
    setSearchResults([]); // Clear results
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
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => !isAlreadySelected && addTeacher(result)}
                    disabled={isAlreadySelected}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    {result.avatar_url ? (
                      <img
                        src={result.avatar_url}
                        alt={result.full_name || 'Avatar'}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {result.full_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{result.full_name || 'Nome non disponibile'}</p>
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
            {selectedTeachers.map((teacher) => (
              <Badge
                key={teacher.id}
                variant="secondary"
                className="flex items-center gap-2 pr-1 pl-3 py-1.5"
              >
                <span>{teacher.full_name || 'Nome non disponibile'}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 hover:bg-destructive/20"
                  onClick={() => removeTeacher(teacher.id)}
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Rimuovi {teacher.full_name}</span>
                </Button>
              </Badge>
            ))}
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
