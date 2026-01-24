import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/jams/DateTimePicker';
import { RecurrenceEditor } from '@/components/events/RecurrenceEditor';
import { EventFormData } from '@/hooks/useEventWizard';
import { ExternalRegistrationFields } from './ExternalRegistrationFields';

interface EventScheduleStepProps {
  form: UseFormReturn<EventFormData>;
}

export function EventScheduleStep({ form }: EventScheduleStepProps) {
  const { t } = useTranslation(['common', 'events', 'forms']);

  // Watch form values for auto-fill logic and conditional rendering
  const dateFrom = form.watch('date');
  const timeFrom = form.watch('time');
  const eventType = form.watch('type');

  // Auto-fill end time when start date/time changes
  useEffect(() => {
    if (!dateFrom || !timeFrom) return;

    const timer = setTimeout(() => {
      const startDateTime = new Date(dateFrom);
      const [hours, minutes] = timeFrom.split(':').map(Number);
      startDateTime.setHours(hours, minutes);

      // Propose end time = start + 4 hours (default duration)
      const proposedEnd = new Date(startDateTime);
      proposedEnd.setHours(proposedEnd.getHours() + 4);

      // Don't extend past end of day (23:59)
      const endOfDay = new Date(startDateTime);
      endOfDay.setHours(23, 59, 0, 0);

      const finalEnd = proposedEnd > endOfDay ? endOfDay : proposedEnd;

      // Only auto-fill if end_date/end_time not already set
      if (!form.getValues('end_date')) {
        form.setValue('end_date', finalEnd, { shouldDirty: false });
      }
      if (!form.getValues('end_time')) {
        const endTime = finalEnd.toTimeString().slice(0, 5);
        form.setValue('end_time', endTime, { shouldDirty: false });
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [dateFrom, timeFrom, form]);

  return (
    <div className="space-y-6">
      {/* Schedule Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t('events:wizard.scheduleSection')}</h3>

        {/* Start Date and Time */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <DateTimePicker
                  label="Data e ora di inizio"
                  date={field.value}
                  time={form.watch('time')}
                  onDateChange={field.onChange}
                  onTimeChange={(time) => form.setValue('time', time)}
                  minDate={new Date()}
                  disabled={form.formState.isSubmitting}
                  timeId="start-time"
                  dateButtonId="start-date-button"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* End Date and Time */}
        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <DateTimePicker
                  label="Data e ora di fine (opzionale)"
                  date={field.value}
                  time={form.watch('end_time') || ''}
                  onDateChange={field.onChange}
                  onTimeChange={(time) => form.setValue('end_time', time)}
                  minDate={dateFrom || new Date()}
                  disabled={form.formState.isSubmitting}
                  timeId="end-time"
                  dateButtonId="end-date-button"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Recurrence Editor for Class Events */}
        {eventType === 'class' && (
          <FormField
            control={form.control}
            name="recurrence"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ricorrenza</FormLabel>
                <FormDescription>
                  Configura la ricorrenza per lezioni settimanali
                </FormDescription>
                <FormControl>
                  <RecurrenceEditor
                    value={field.value || { rule: null, dtstart: null, until: null }}
                    onChange={field.onChange}
                    startsAt={dateFrom?.toISOString() || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Additional Details Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t('events:wizard.detailsSection')}</h3>

        {/* Price */}
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Prezzo (€) {t('forms:placeholders.optional')}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === '' ? undefined : parseFloat(value));
                  }}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription>
                Lascia vuoto o 0 per eventi gratuiti
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* External Link */}
        <FormField
          control={form.control}
          name="link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('events:fields.externalLink')} {t('forms:placeholders.optional')}
              </FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://esempio.com"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Link per registrazione esterna o maggiori informazioni
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* External Registration Fields (conditional) */}
      <ExternalRegistrationFields form={form} />
    </div>
  );
}
