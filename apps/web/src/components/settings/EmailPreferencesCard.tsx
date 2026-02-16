import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { emailPreferencesApi } from '@/api/email-preferences.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { UpdateEmailPreferencesDto } from '@jamia/types/email-preferences';

interface EmailPreferencesCardProps {
  isNewUser?: boolean;
}

export function EmailPreferencesCard({ isNewUser = false }: EmailPreferencesCardProps) {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local state to handle the optimistic new user default
  const [localDigestEnabled, setLocalDigestEnabled] = useState(isNewUser);
  const [localDigestFrequency, setLocalDigestFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [localProductUpdatesEnabled, setLocalProductUpdatesEnabled] = useState(true);

  // Fetch current preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['email-preferences'],
    queryFn: emailPreferencesApi.getPreferences,
    enabled: true,
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (preferences) {
      setLocalDigestEnabled(preferences.digest_enabled);
      setLocalDigestFrequency(preferences.digest_frequency);
      setLocalProductUpdatesEnabled(preferences.product_updates_enabled);
    }
  }, [preferences]);

  // Auto-save for new users on mount
  useEffect(() => {
    if (isNewUser && !preferences) {
      // Auto-save default preference for new users
      updateMutation.mutate({
        digest_enabled: true,
        digest_frequency: 'monthly',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewUser]); // Only run once on mount

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (dto: UpdateEmailPreferencesDto) => emailPreferencesApi.updatePreferences(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
      toast({
        title: t('emailPreferences.saved'),
        description: t('emailPreferences.savedDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('emailPreferences.error'),
        description: error.response?.data?.message || t('emailPreferences.errorDescription'),
        variant: 'destructive',
      });
    },
  });

  const handleDigestToggle = (checked: boolean) => {
    setLocalDigestEnabled(checked);
    updateMutation.mutate({
      digest_enabled: checked,
      digest_frequency: localDigestFrequency,
    });
  };

  const handleFrequencyChange = (value: 'weekly' | 'monthly') => {
    setLocalDigestFrequency(value);
    updateMutation.mutate({
      digest_enabled: true,
      digest_frequency: value,
    });
  };

  const handleProductUpdatesToggle = (checked: boolean) => {
    setLocalProductUpdatesEnabled(checked);
    updateMutation.mutate({ product_updates_enabled: checked });
  };

  const isDisabled = isLoading || updateMutation.isPending;

  return (
    <Card className="border-primary/10 shadow-lg">
      <CardHeader>
        <CardTitle>{t('emailPreferences.title')}</CardTitle>
        <CardDescription>{t('emailPreferences.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Digest toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="digest-toggle" className="text-base font-medium">
              {t('emailPreferences.digestLabel')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('emailPreferences.digestDescription')}
            </p>
          </div>
          <Switch
            id="digest-toggle"
            checked={localDigestEnabled}
            onCheckedChange={handleDigestToggle}
            disabled={isDisabled}
          />
        </div>

        {/* Frequency selector - shown only when digest is enabled */}
        <div
          className={`overflow-hidden transition-all duration-200 ${localDigestEnabled ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}
        >
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">{t('emailPreferences.frequencyLabel')}</Label>
            <RadioGroup
              value={localDigestFrequency}
              onValueChange={handleFrequencyChange}
              disabled={isDisabled}
              className="gap-4"
            >
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="weekly" id="weekly" className="mt-1" />
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="weekly" className="text-base font-normal cursor-pointer">
                    {t('emailPreferences.weekly')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('emailPreferences.weeklyDescription')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="monthly" className="text-base font-normal cursor-pointer">
                    {t('emailPreferences.monthly')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('emailPreferences.monthlyDescription')}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border" />

        {/* Product updates toggle */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="product-updates-toggle" className="text-base font-medium">
              {t('emailPreferences.productUpdatesLabel')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('emailPreferences.productUpdatesDescription')}
            </p>
          </div>
          <Switch
            id="product-updates-toggle"
            checked={localProductUpdatesEnabled}
            onCheckedChange={handleProductUpdatesToggle}
            disabled={isDisabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
