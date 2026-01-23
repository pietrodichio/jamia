import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface ExternalRegistrationFieldsProps {
  form: UseFormReturn<any>;
}

export function ExternalRegistrationFields({ form }: ExternalRegistrationFieldsProps) {
  const { t } = useTranslation(['events', 'forms']);

  const eventType = form.watch('type');
  const manageParticipants = form.watch('manageParticipants');

  // Show if NOT (type === 'jam' AND manageParticipants === true)
  // This covers: classes, workshops, conventions, and non-managed jams
  if (eventType === 'jam' && manageParticipants) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* External Registration Link */}
      <FormField
        control={form.control}
        name="externalLink"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('events:fields.externalLink')} <span className="text-muted-foreground">(opzionale)</span>
            </FormLabel>
            <FormControl>
              <Input
                type="url"
                placeholder="https://forms.gle/... o https://instagram.com/... o mailto:..."
                {...field}
              />
            </FormControl>
            <FormDescription>
              Collega a Google Forms, Instagram, email, o altri servizi di registrazione
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom CTA Text */}
      <FormField
        control={form.control}
        name="ctaText"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('events:fields.ctaText')} <span className="text-muted-foreground">(opzionale)</span>
            </FormLabel>
            <FormControl>
              <Input
                type="text"
                maxLength={30}
                placeholder="Registrati"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Testo del pulsante di registrazione (es. "Contattaci", "Iscriviti", "Scopri di più")
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
