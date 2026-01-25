import { useTranslation } from 'react-i18next';
import { Mail, User, Phone, Instagram, Globe } from 'lucide-react';
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
  organizerContact?: string;
  isSuperAdmin: boolean;
}

type ContactType = 'email' | 'phone' | 'instagram' | 'website' | null;

function detectContactType(contact: string): ContactType {
  if (!contact) return null;

  const trimmed = contact.trim();

  // Check for Instagram (starts with @ or instagram.com)
  if (trimmed.startsWith('@') || trimmed.includes('instagram.com')) {
    return 'instagram';
  }

  // Check for website URL (starts with http://, https://, www., or contains domain pattern)
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('www.') ||
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(trimmed)
  ) {
    return 'website';
  }

  // Check for email (contains @)
  if (trimmed.includes('@')) {
    return 'email';
  }

  // Check for phone (contains digits, may have +, spaces, dashes, parentheses)
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  if (phoneRegex.test(trimmed.replace(/[\s\-\(\)]/g, ''))) {
    return 'phone';
  }

  // Default to email if unclear
  return 'email';
}

function getContactUrl(contact: string, type: ContactType): string {
  if (!contact || !type) return '#';

  const trimmed = contact.trim();

  switch (type) {
    case 'email':
      return `mailto:${trimmed}`;
    case 'phone': {
      // Remove all non-digit characters except +
      const phoneNumber = trimmed.replace(/[^\d+]/g, '');
      return `tel:${phoneNumber}`;
    }
    case 'instagram':
      // Handle @username format or full URL
      if (trimmed.startsWith('@')) {
        return `https://instagram.com/${trimmed.slice(1)}`;
      }
      if (trimmed.includes('instagram.com')) {
        return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      }
      return `https://instagram.com/${trimmed}`;
    case 'website':
      // Handle website URLs - add https:// if missing
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      if (trimmed.startsWith('www.')) {
        return `https://${trimmed}`;
      }
      // Assume domain without protocol
      return `https://${trimmed}`;
    default:
      return '#';
  }
}

export function EventOrganizerInfo({
  organizer,
  organizerContact,
  isSuperAdmin,
}: EventOrganizerInfoProps) {
  const { t } = useTranslation('events');

  // Hide organizer details if super admin (per CONTEXT.md)
  if (isSuperAdmin) {
    return null;
  }

  const contactType = organizerContact ? detectContactType(organizerContact) : null;
  const contactUrl = organizerContact ? getContactUrl(organizerContact, contactType) : null;

  const ContactIcon =
    contactType === 'phone'
      ? Phone
      : contactType === 'instagram'
        ? Instagram
        : contactType === 'website'
          ? Globe
          : Mail;

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
            {organizer.email && (
              <p className="text-sm text-muted-foreground">{organizer.email}</p>
            )}
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

        {/* Contact button if organizer contact available */}
        {organizerContact && contactUrl && (
          <Button
            variant="outline"
            className="w-full rounded-xl"
            asChild
          >
            <a
              href={contactUrl}
              target={contactType === 'instagram' || contactType === 'website' ? '_blank' : undefined}
              rel={contactType === 'instagram' || contactType === 'website' ? 'noopener noreferrer' : undefined}
            >
              <ContactIcon className="mr-2 h-4 w-4" />
              {t('actions.contact', 'Contatta')}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
