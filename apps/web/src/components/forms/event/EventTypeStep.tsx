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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EventFormData } from '@/hooks/useEventWizard';

interface EventTypeStepProps {
  form: UseFormReturn<EventFormData>;
}

export function EventTypeStep({ form }: EventTypeStepProps) {
  const { t } = useTranslation(['common', 'events', 'forms']);

  // Watch event type for conditional fields (to be added in future plans)
  const eventType = form.watch('type');

  return (
    <div className="space-y-6">
      {/* Event Type */}
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('events:fields.type')}</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('events:wizard.eventTypeQuestion')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="jam">{t('events:types.jam')}</SelectItem>
                <SelectItem value="class">{t('events:types.class')}</SelectItem>
                <SelectItem value="workshop">{t('events:types.workshop')}</SelectItem>
                <SelectItem value="convention">{t('events:types.convention')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('events:fields.title')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms:placeholders.enterTitle')}
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t('common:validation.minLength', { count: 3 })} - {t('common:validation.maxLength', { count: 100 })}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('events:fields.description')} {t('forms:placeholders.optional')}
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('forms:placeholders.enterDescription')}
                className="min-h-[100px] resize-none"
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t('common:validation.maxLength', { count: 1000 })}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Location */}
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('events:fields.location')}</FormLabel>
            <FormControl>
              <Input
                placeholder={t('forms:placeholders.selectLocation')}
                {...field}
              />
            </FormControl>
            <FormDescription>
              {t('common:validation.minLength', { count: 3 })}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
