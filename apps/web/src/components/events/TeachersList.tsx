import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import type { EventType } from '@jamia/types';

interface Teacher {
  id: string;
  user_id: string;
  name: string;
  photo_url?: string;
  role?: string;
}

interface TeachersListProps {
  teachers: Teacher[];
  eventType: EventType;
}

export function TeachersList({ teachers, eventType }: TeachersListProps) {
  console.log('teachers', teachers);
  const { t } = useTranslation('events');

  // Only display for classes, workshops, and conventions
  if (eventType === 'jam') {
    return null;
  }

  // Don't render if no teachers
  if (!teachers || teachers.length === 0) {
    return null;
  }

  // Determine appropriate title based on event type
  const getTitle = () => {
    if (eventType === 'convention') {
      return 'Facilitatori'; // Facilitators
    }
    return t('fields.teachers'); // Teachers (Insegnanti)
  };

  return (
    <Card className="border-primary/10 rounded-2xl">
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher) => (
            <Link
              key={teacher.id}
              to={`/teachers/${teacher.user_id}`}
              className="flex flex-col items-center text-center p-4 rounded-lg border hover:bg-accent hover:shadow-md transition-all duration-200 group"
            >
              {/* Large circular avatar */}
              <Avatar className="h-20 w-20 mb-3 group-hover:scale-105 transition-transform">
                <AvatarImage src={teacher.photo_url} alt={teacher.name} />
                <AvatarFallback>
                  <User className="h-10 w-10 text-primary" />
                </AvatarFallback>
              </Avatar>

              {/* Full name */}
              <p className="font-semibold text-base mb-1">{teacher.name}</p>

              {/* Role if provided */}
              {teacher.role && (
                <p className="text-sm text-muted-foreground">{teacher.role}</p>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
