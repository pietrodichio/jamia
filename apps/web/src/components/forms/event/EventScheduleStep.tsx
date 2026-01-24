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
import { Label } from '@/components/ui/label';

interface EventScheduleStepProps {
  form: UseFormReturn<EventFormData>;
}

export function EventScheduleStep({ form }: EventScheduleStepProps) {
  const { t } = useTranslation(['common', 'events', 'forms']);

  // Watch form values for auto-fill logic and conditional rendering
  const dateFrom = form.watch('date');
  const timeFrom = form.watch('time');
  const eventType = form.watch('type');

  const isRecurringType = eventType === 'class';

  // Auto-fill end time when start date/time changes
  useEffect(() => {
    if (!dateFrom || !timeFrom) return;

    const timer = setTimeout(() => {
      const startDateTime = new Date(dateFrom);
      const [hours, minutes] = timeFrom.split(':').map(Number);
      startDateTime.setHours(hours, minutes);

      // For class events, default duration is 1.5 hours
      // For other events, default duration is 4 hours
      const defaultDuration = isRecurringType ? 1.5 : 4;

      const proposedEnd = new Date(startDateTime);
      proposedEnd.setHours(proposedEnd.getHours() + Math.floor(defaultDuration));
      proposedEnd.setMinutes(proposedEnd.getMinutes() + (defaultDuration % 1) * 60);

      // Don't extend past end of day (23:59)
      const endOfDay = new Date(startDateTime);
      endOfDay.setHours(23, 59, 0, 0);

      const finalEnd = proposedEnd > endOfDay ? endOfDay : proposedEnd;

      // For class events, always sync end_date with start date
      if (isRecurringType) {
        form.setValue('end_date', dateFrom, { shouldDirty: false });
      } else if (!form.getValues('end_date')) {
        form.setValue('end_date', finalEnd, { shouldDirty: false });
      }

      if (!form.getValues('end_time')) {
        const endTime = finalEnd.toTimeString().slice(0, 5);
        form.setValue('end_time', endTime, { shouldDirty: false });
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [dateFrom, timeFrom, form, isRecurringType]);

  // For class events, keep end_date synced with start date
  useEffect(() => {
    if (isRecurringType && dateFrom) {
      form.setValue('end_date', dateFrom, { shouldDirty: false });
    }
  }, [dateFrom, isRecurringType, form]);

  return (
    <div className="space-y-6">
      {/* Schedule Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t('events:wizard.scheduleSection')}</h3>

        {/* Info for recurring events */}
        {isRecurringType && (
          <div className="bg-muted/50 border rounded-lg p-4 text-sm space-y-2">
            <p className="font-medium">Come funziona per le lezioni ricorrenti:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Data e ora di inizio</strong> = quando inizia ogni lezione</li>
              <li><strong>Ora di fine</strong> = quando finisce ogni lezione (stesso giorno)</li>
              <li><strong>Ricorrenza</strong> = ogni quanto si ripete e fino a quando</li>
            </ul>
          </div>
        )}

        {/* Start Date and Time */}
        <FormField
          control={form.control}
          name="date"
          render={({ field: dateField }) => (
            <FormField
              control={form.control}
              name="time"
              render={({ field: timeField }) => (
                <FormItem>
                  <FormControl>
                    <DateTimePicker
                      label={isRecurringType ? "Data e ora della prima lezione" : "Data e ora di inizio"}
                      date={dateField.value}
                      time={timeField.value || ''}
                      onDateChange={dateField.onChange}
                      onTimeChange={timeField.onChange}
                      minDate={new Date()}
                      disabled={form.formState.isSubmitting}
                      timeId="start-time"
                      dateButtonId="start-date-button"
                      error={form.formState.errors.date?.message || form.formState.errors.time?.message}
                    />
                  </FormControl>
                  <FormMessage>{form.formState.errors.date?.message}</FormMessage>
                  <FormMessage>{form.formState.errors.time?.message}</FormMessage>
                </FormItem>
              )}
            />
          )}
        />

        {/* End Time Only for Class events */}
        {isRecurringType ? (
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ora di fine lezione</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={field.value || ''}
                      onChange={field.onChange}
                      className="w-32"
                      disabled={form.formState.isSubmitting}
                    />
                    <span className="text-sm text-muted-foreground">
                      (stesso giorno)
                    </span>
                  </div>
                </FormControl>
                <FormDescription>
                  A che ora finisce ogni lezione
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          /* End Date and Time for non-recurring events */
          <FormField
            control={form.control}
            name="end_date"
            render={({ field: dateField }) => (
              <FormField
                control={form.control}
                name="end_time"
                render={({ field: timeField }) => (
                  <FormItem>
                    <FormControl>
                      <DateTimePicker
                        label="Data e ora di fine (opzionale)"
                        date={dateField.value}
                        time={timeField.value || ''}
                        onDateChange={dateField.onChange}
                        onTimeChange={timeField.onChange}
                        minDate={dateFrom || new Date()}
                        disabled={form.formState.isSubmitting}
                        timeId="end-time"
                        dateButtonId="end-date-button"
                        error={form.formState.errors.end_date?.message || form.formState.errors.end_time?.message}
                      />
                    </FormControl>
                    <FormMessage>{form.formState.errors.end_date?.message}</FormMessage>
                    <FormMessage>{form.formState.errors.end_time?.message}</FormMessage>
                  </FormItem>
                )}
              />
            )}
          />
        )}

        {/* Recurrence Editor for Class Events */}
        {isRecurringType && (
          <FormField
            control={form.control}
            name="recurrence"
            render={({ field }) => (
              <FormItem>
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

      </div>

      {/* External Registration Fields */}
      <ExternalRegistrationFields form={form} />
    </div>
  );
}
