import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { emailPreferencesApi } from '@/api/email-preferences.api';

const STORAGE_KEY = 'jamia_digest_prompt_dismissed';

export const DigestNudgeBanner = () => {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['email-preferences'],
    queryFn: () => emailPreferencesApi.getPreferences(),
  });

  const mutation = useMutation({
    mutationFn: () =>
      emailPreferencesApi.updatePreferences({
        digest_enabled: true,
        digest_frequency: 'monthly',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch { }
      setIsDismissed(true);
      toast({
        title: t('digestNudge.successTitle'),
        description: t('digestNudge.successMessage'),
      });
    },
    onError: () => {
      toast({
        description: t('digestNudge.errorMessage'),
        variant: 'destructive',
      });
    },
  });

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch { }
    setIsDismissed(true);
  };

  if (isDismissed) return null;
  if (isLoading || !preferences) return null;
  if (preferences.digest_enabled || preferences.has_seen_digest_prompt) return null;

  return (

    <div className="relative mb-6 rounded-xl border border-primary/20 bg-muted/50 p-4 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground md:top-4 md:right-4"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:pr-12">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-full bg-primary p-2 text-primary-foreground shadow-sm">
            <Mail className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold leading-none tracking-tight">
              {t('digestNudge.title')}
            </h4>
            <p className="text-sm text-muted-foreground max-w-[600px] text-pretty">
              {t('digestNudge.description')}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full sm:w-auto whitespace-nowrap shadow-sm"
        >
          {mutation.isPending
            ? t('digestNudge.loading')
            : t('digestNudge.ctaButton')}
        </Button>
      </div>
    </div>
  );
};
