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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface JamParticipantFieldsProps {
  form: UseFormReturn<any>;
}

export function JamParticipantFields({ form }: JamParticipantFieldsProps) {
  const { t } = useTranslation(['events', 'forms']);

  const eventType = form.watch('type');
  const manageParticipants = form.watch('manageParticipants');

  // Only render if type is 'jam' AND manageParticipants is true
  if (eventType !== 'jam' || !manageParticipants) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Capacity */}
      <FormField
        control={form.control}
        name="capacity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('events:fields.capacity')}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                placeholder="es. 20"
                {...field}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
            </FormControl>
            <FormDescription>
              Numero massimo di partecipanti che possono registrarsi
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Visibility */}
      <FormField
        control={form.control}
        name="visibility"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>{t('events:fields.visibility')}</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="public" id="public" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="public" className="font-medium cursor-pointer">
                      {t('events:visibilityOptions.public')}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Il jam apparirà nella directory degli eventi pubblici
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="private" id="private" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="private" className="font-medium cursor-pointer">
                      {t('events:visibilityOptions.private')}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Solo chi ha il link può vedere e registrarsi
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Roles (optional) */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Ruoli richiesti (opzionale)</Label>
        <FormDescription className="text-sm">
          Seleziona i ruoli acroyoga disponibili per questo jam
        </FormDescription>
        <div className="space-y-2">
          {['base', 'flyer', 'spotter'].map((role) => (
            <FormField
              key={role}
              control={form.control}
              name={`roles.${role}`}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={role}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <label
                    htmlFor={role}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </label>
                </div>
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
