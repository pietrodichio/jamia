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
import { DatePicker } from '@/components/ui/date-picker';
import { EventFormData } from '@/hooks/useEventWizard';
import { ExternalRegistrationFields } from './ExternalRegistrationFields';

interface EventScheduleStepProps {
  form: UseFormReturn<EventFormData>;
}

export function EventScheduleStep({ form }: EventScheduleStepProps) {
  const { t } = useTranslation(['common', 'events', 'forms']);

  return (
    <div className="space-y-6">
      {/* Schedule Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t('events:wizard.scheduleSection')}</h3>

        {/* Start Date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('events:fields.date')}</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('forms:placeholders.selectDate')}
                />
              </FormControl>
              <FormDescription>
                La data deve essere futura
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start Time */}
        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('events:fields.time')}</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  placeholder={t('forms:placeholders.selectTime')}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Formato 24 ore (es. 14:30)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* End Date */}
        <FormField
          control={form.control}
          name="end_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                {t('events:fields.endDate')} {t('forms:placeholders.optional')}
              </FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('forms:placeholders.selectDate')}
                />
              </FormControl>
              <FormDescription>
                Deve essere uguale o successiva alla data di inizio
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* End Time */}
        <FormField
          control={form.control}
          name="end_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Ora fine {t('forms:placeholders.optional')}
              </FormLabel>
              <FormControl>
                <Input
                  type="time"
                  placeholder={t('forms:placeholders.selectTime')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
