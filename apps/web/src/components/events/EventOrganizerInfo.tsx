import { useTranslation } from 'react-i18next';
import { Mail, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface Profile {
  id: string;
  name: string;
  email: string;
  photo_url?: string;
  bio?: string;
}

interface EventOrganizerInfoProps {
  organizer: Profile;
  isSuperAdmin: boolean;
}

export function EventOrganizerInfo({ organizer, isSuperAdmin }: EventOrganizerInfoProps) {
  const { t } = useTranslation('events');

  // Hide organizer details if super admin (per CONTEXT.md)
  if (isSuperAdmin) {
    return null;
  }

  return (
    <Card className="border-primary/10 rounded-2xl">
      <CardHeader>
        <CardTitle>{t('fields.organizer')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar and name */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={organizer.photo_url} alt={organizer.name} />
            <AvatarFallback>
              <User className="h-8 w-8 text-primary" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-lg">{organizer.name}</p>
            <p className="text-sm text-muted-foreground">{organizer.email}</p>
          </div>
        </div>

        {/* Bio if provided */}
        {organizer.bio && (
          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {organizer.bio}
            </p>
          </div>
        )}

        {/* Contact button if email available */}
        {organizer.email && (
          <Button
            variant="outline"
            className="w-full rounded-xl"
            asChild
          >
            <a href={`mailto:${organizer.email}`}>
              <Mail className="mr-2 h-4 w-4" />
              Contatta
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
