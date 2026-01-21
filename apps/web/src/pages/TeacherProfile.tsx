import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/api/client';
import { EventCard } from '@/components/events/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event } from '@jamia/types/event';

export default function TeacherProfile() {
  const { teacherId } = useParams<{ teacherId: string }>();

  // Fetch teacher profile
  const { data: teacher, isLoading: teacherLoading } = useQuery({
    queryKey: ['teachers', teacherId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, photo_url, bio')
        .eq('id', teacherId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!teacherId
  });

  // Fetch events where this user is a teacher
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'teacher', teacherId],
    queryFn: async () => {
      // Use backend search API with teacher_id filter
      const { data } = await apiClient.get<(Event & { distance_meters: number })[]>('/events/search', {
        params: { teacher_id: teacherId }
      });
      return data;
    },
    enabled: !!teacherId
  });

  if (teacherLoading) {
    return (
      <div className="container mx-auto py-8 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Teacher not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Teacher header */}
      <div className="flex items-center gap-6 border rounded-lg p-6">
        <img
          src={teacher.photo_url || '/default-avatar.png'}
          alt={teacher.name}
          className="w-24 h-24 rounded-full object-cover"
        />
        <div>
          <h1 className="text-3xl font-bold">{teacher.name}</h1>
          {teacher.bio && (
            <p className="text-muted-foreground mt-2">{teacher.bio}</p>
          )}
        </div>
      </div>

      {/* Events by this teacher */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Events & Classes</h2>
        {eventsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No events found for this teacher.
          </p>
        )}
      </div>
    </div>
  );
}
