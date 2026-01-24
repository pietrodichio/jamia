import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EventFormData } from '@/hooks/useEventWizard';
import { EVENT_TAG_LABELS } from '@/lib/event-tags';

interface EventPreviewStepProps {
  form: UseFormReturn<EventFormData>;
}

export function EventPreviewStep({ form }: EventPreviewStepProps) {
  const { t } = useTranslation(['common', 'events']);
  const formValues = form.getValues();

  // Helper to format date and time with null safety
  const formatDateTime = (date?: Date, time?: string): string => {
    if (!date) return 'Non specificata';

    try {
      const dateStr = format(date, 'dd MMMM yyyy', { locale: it });
      if (time) {
        return `${dateStr}, ${time}`;
      }
      return dateStr;
    } catch (error) {
      return 'Data non valida';
    }
  };

  // Helper to format time range with null safety
  const formatTimeRange = (): string => {
    const startDateTime = formatDateTime(formValues.date, formValues.time);

    if (formValues.end_date || formValues.end_time) {
      const endDateTime = formatDateTime(
        formValues.end_date || formValues.date,
        formValues.end_time
      );
      return `${startDateTime} - ${endDateTime}`;
    }

    return startDateTime;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Anteprima Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{t('events:wizard.basicInfoSection')}</h3>

            {/* Event Type Badge */}
            <div>
              <Badge variant="secondary">
                {t(`events:types.${formValues.type}`)}
              </Badge>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold">{formValues.title || 'Titolo non specificato'}</h2>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Descrizione:
              </p>
              {formValues.description ? (
                <div
                  className="text-muted-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(formValues.description, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'img'],
                      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class']
                    })
                  }}
                />
              ) : (
                <p className="text-muted-foreground italic">Nessuna descrizione fornita</p>
              )}
            </div>

            {/* Location */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('events:fields.location')}:
              </p>
              <p>{formValues.location || 'Non specificata'}</p>
            </div>

            {/* Tags */}
            {formValues.tags && formValues.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tag:</p>
                <div className="flex flex-wrap gap-2">
                  {formValues.tags.map((tag) => {
                    const label = EVENT_TAG_LABELS.get(tag) ?? tag;
                    return (
                      <Badge key={tag} variant="secondary">
                        {label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Schedule Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{t('events:wizard.scheduleSection')}</h3>

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Data e ora:
              </p>
              <p className="text-base">{formatTimeRange()}</p>
            </div>
          </div>

          <Separator />

          {/* Additional Info Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{t('events:wizard.detailsSection')}</h3>

            {/* Price */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Prezzo:
              </p>
              <p className="text-base">
                {formValues.price && formValues.price > 0
                  ? `€${formValues.price.toFixed(2)}`
                  : 'Gratuito'}
              </p>
            </div>

            {/* External Link */}
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('events:fields.externalLink')}:
              </p>
              {formValues.externalLink ? (
                <a
                  href={formValues.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {formValues.externalLink}
                </a>
              ) : (
                <p className="text-muted-foreground italic">Non specificato</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Edit Reminder */}
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">
              Usa i pulsanti <strong>Indietro</strong> per modificare le informazioni prima di pubblicare.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
