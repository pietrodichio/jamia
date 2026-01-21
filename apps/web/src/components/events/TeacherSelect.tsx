import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { teachersApi } from '@/api/teachers.api';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { EventTeacher } from '@jamia/types/event';

interface TeacherSelectProps {
  eventId: string;
  currentTeachers: EventTeacher[];
  isOwner: boolean;
}

export function TeacherSelect({ eventId, currentTeachers, isOwner }: TeacherSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search users for teacher selection
  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, photo_url')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: searchQuery.length >= 2
  });

  const addTeacherMutation = useMutation({
    mutationFn: (userId: string) => teachersApi.addTeacher(eventId, { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'teachers'] });
      toast({ title: 'Teacher added successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add teacher',
        description: error.response?.data?.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const removeTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => teachersApi.removeTeacher(eventId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'teachers'] });
      toast({ title: 'Teacher removed successfully' });
    },
    onError: () => {
      toast({
        title: 'Failed to remove teacher',
        variant: 'destructive'
      });
    }
  });

  const currentTeacherIds = currentTeachers.map(t => t.user_id);

  if (!isOwner) {
    return null;  // Only owners can manage teachers
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="teacher-search">Add Teachers/Instructors</Label>
        <Input
          id="teacher-search"
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mt-2"
        />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Searching...</p>}

      {users && users.length > 0 && (
        <div className="space-y-2">
          {users.map(user => {
            const isTeacher = currentTeacherIds.includes(user.id);
            return (
              <div key={user.id} className="flex items-center gap-2 p-2 border rounded">
                <img
                  src={user.photo_url || '/default-avatar.png'}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="flex-1">{user.name}</span>
                {isTeacher ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const teacher = currentTeachers.find(t => t.user_id === user.id);
                      if (teacher) removeTeacherMutation.mutate(teacher.user_id);
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => addTeacherMutation.mutate(user.id)}
                  >
                    Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
