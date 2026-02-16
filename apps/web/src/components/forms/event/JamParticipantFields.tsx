import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { CapacitySettings } from '@/components/jams/CapacitySettings';
import { FormSwitch } from '@/components/jams/FormSwitch';

interface JamParticipantFieldsProps {
  form: UseFormReturn<any>;
}

export function JamParticipantFields({ form }: JamParticipantFieldsProps) {
  const { t } = useTranslation(['events', 'forms']);

  const eventType = form.watch('type');
  const manageParticipants = form.watch('manageParticipants');
  const capacity = form.watch('capacity');
  const basesMin = form.watch('desired_bases_min');
  const basesMax = form.watch('desired_bases_max');
  const flyersMin = form.watch('desired_flyers_min');
  const flyersMax = form.watch('desired_flyers_max');
  const autoPromote = form.watch('auto_promote');
  const publicParticipants = form.watch('public_participants');

  useEffect(() => {
    if (!capacity || capacity <= 0) {
      return;
    }

    if (
      basesMin !== undefined ||
      basesMax !== undefined ||
      flyersMin !== undefined ||
      flyersMax !== undefined
    ) {
      return;
    }

    const timer = setTimeout(() => {
      const totalCapacity = Number(capacity);
      const idealBases = Math.floor(totalCapacity / 3);
      const idealFlyers = totalCapacity - idealBases;

      const nextBasesMin = Math.max(0, idealBases - 1);
      const nextBasesMax = idealBases + 1;

      let nextFlyersMin = Math.max(0, idealFlyers - 2);
      const nextFlyersMax = idealFlyers + 2;

      if (nextBasesMax + nextFlyersMin < totalCapacity) {
        nextFlyersMin = totalCapacity - nextBasesMax;
      }

      form.setValue('desired_bases_min', nextBasesMin);
      form.setValue('desired_bases_max', nextBasesMax);
      form.setValue('desired_flyers_min', nextFlyersMin);
      form.setValue('desired_flyers_max', nextFlyersMax);
    }, 500);

    return () => clearTimeout(timer);
  }, [capacity, basesMin, basesMax, flyersMin, flyersMax, form]);

  // Only render if type is 'jam' AND manageParticipants is true
  if (eventType !== 'jam' || !manageParticipants) {
    return null;
  }

  return (
    <div className="space-y-6">
      <CapacitySettings
        capacity={capacity}
        basesMin={basesMin}
        basesMax={basesMax}
        flyersMin={flyersMin}
        flyersMax={flyersMax}
        onCapacityChange={(value) => form.setValue('capacity', value, { shouldDirty: true })}
        onBasesMinChange={(value) => form.setValue('desired_bases_min', value, { shouldDirty: true })}
        onBasesMaxChange={(value) => form.setValue('desired_bases_max', value, { shouldDirty: true })}
        onFlyersMinChange={(value) => form.setValue('desired_flyers_min', value, { shouldDirty: true })}
        onFlyersMaxChange={(value) => form.setValue('desired_flyers_max', value, { shouldDirty: true })}
        errors={{
          capacity: form.formState.errors?.capacity,
          desired_bases_min: form.formState.errors?.desired_bases_min,
          desired_bases_max: form.formState.errors?.desired_bases_max,
          desired_flyers_min: form.formState.errors?.desired_flyers_min,
          desired_flyers_max: form.formState.errors?.desired_flyers_max,
        }}
        disabled={form.formState.isSubmitting}
      />

      <FormSwitch
        id="jam-auto-promote"
        label="Promozione automatica"
        description="Promuovi automaticamente dalla lista d'attesa quando si libera un posto"
        checked={autoPromote}
        onChange={(checked) => form.setValue('auto_promote', checked, { shouldDirty: true })}
        disabled={form.formState.isSubmitting}
      />

      <FormSwitch
        id="jam-public-participants"
        label="Mostra partecipanti pubblicamente"
        description="Consenti a chiunque di vedere la lista dei partecipanti"
        checked={publicParticipants}
        onChange={(checked) => form.setValue('public_participants', checked, { shouldDirty: true })}
        disabled={form.formState.isSubmitting}
      />

      {/* Visibility */}
      <FormField
        control={form.control}
        name="visibility"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormControl>
              <FormSwitch
                id="jam-visibility"
                label={t('events:fields.visibility')}
                description={
                  field.value === 'public'
                    ? 'La jam apparirà nella directory degli eventi pubblici'
                    : 'Solo chi ha il link può vedere e registrarsi'
                }
                checked={field.value === 'public'}
                onChange={(checked) => field.onChange(checked ? 'public' : 'private')}
                disabled={form.formState.isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />


    </div>
  );
}
