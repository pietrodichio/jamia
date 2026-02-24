import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Share2, ExternalLink, Download, Instagram, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { downloadICalFile, generateGoogleCalendarUrl } from '@/lib/calendar-export';
import type { EventWithOrganizer } from '@jamia/types';

interface EventActionsProps {
  event: EventWithOrganizer;
  /** Whether the current user is the owner of this event */
  isOwner?: boolean;
}

/**
 * Helper to get jam management URL for managed jam events.
 * - For events with source_jam_id (created via legacy jam flow), use that ID
 * - For events with manage_participants (created via event flow), use event ID
 *   (JamsService lookup unification handles the resolution)
 */
function getJamManageUrl(event: EventWithOrganizer): string | null {
  if (event.source_jam_id) {
    return `/jam/${event.source_jam_id}`;
  }
  if (event.type === 'jam' && event.manage_participants) {
    return `/jam/${event.id}`;
  }
  return null;
}

export function EventActions({
  event,
  isOwner = false,
}: EventActionsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('events');
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  // Get jam management URL (if this is a managed jam event)
  const jamManageUrl = getJamManageUrl(event);

  // Handle managed jam registration (for non-owners viewing the event)
  const handleRegister = () => {
    if (jamManageUrl) {
      navigate(jamManageUrl);
    }
  };

  // Handle manage participants (for owners)
  const handleManageParticipants = () => {
    if (jamManageUrl) {
      navigate(jamManageUrl);
    }
  };

  // Handle external link
  const handleExternalLink = () => {
    if (event.external_link) {
      window.open(event.external_link, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle add to calendar actions
  const handleDownloadICal = () => {
    downloadICalFile(event);
    toast({
      title: 'Download avviato',
      description: 'Il file del calendario è stato scaricato.',
    });
  };

  const handleAddToGoogleCalendar = () => {
    const gcalUrl = generateGoogleCalendarUrl(event);
    window.open(gcalUrl, '_blank', 'noopener,noreferrer');
  };

  // Handle share
  const handleShare = async () => {
    setIsSharing(true);
    const eventUrl = `${window.location.origin}/events/${event.id}`;

    try {
      // Try Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: event.description || event.title,
          url: eventUrl,
        });
        toast({
          title: t('messages.linkCopied'),
          description: 'Link condiviso con successo',
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(eventUrl);
        toast({
          title: t('messages.linkCopied'),
          description: 'Il link è stato copiato negli appunti',
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast({
          title: 'Errore',
          description: 'Impossibile condividere il link',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Detect external link type for icon
  const getExternalLinkIcon = () => {
    if (!event.external_link) return <ExternalLink className="h-4 w-4" />;

    const url = event.external_link.toLowerCase();
    if (url.includes('instagram.com')) {
      return <Instagram className="h-4 w-4" />;
    }
    if (url.includes('forms.google.com') || url.includes('docs.google.com')) {
      return <ExternalLink className="h-4 w-4" />;
    }
    return <ExternalLink className="h-4 w-4" />;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Manage participants button - only for owners of managed jams */}
      {isOwner && jamManageUrl && (
        <Button onClick={handleManageParticipants} className="rounded-xl">
          <Users className="mr-2 h-4 w-4" />
          {t('fields.manageParticipants')}
        </Button>
      )}

      {/* Register button - only for non-owners viewing managed jams */}
      {!isOwner && jamManageUrl && (
        <Button onClick={handleRegister} className="rounded-xl">
          {t('actions.register')}
        </Button>
      )}

      {/* External registration/link button */}
      {event.external_link && (
        <Button onClick={handleExternalLink} className="rounded-xl">
          {getExternalLinkIcon()}
          <span className="ml-2">{event.cta_text || 'Registrati'}</span>
        </Button>
      )}

      {/* Add to calendar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="rounded-xl">
            <Calendar className="mr-2 h-4 w-4" />
            {t('actions.addToCalendar')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={handleAddToGoogleCalendar}>
            <Calendar className="mr-2 h-4 w-4" />
            Google Calendar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownloadICal}>
            <Download className="mr-2 h-4 w-4" />
            Download iCal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share button */}
      <Button
        variant="outline"
        onClick={handleShare}
        disabled={isSharing}
        className="rounded-xl"
      >
        <Share2 className="mr-2 h-4 w-4" />
        {t('actions.share')}
      </Button>
    </div>
  );
}
