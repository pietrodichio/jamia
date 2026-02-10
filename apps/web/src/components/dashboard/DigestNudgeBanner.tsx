import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Mail, X } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
      } catch {}
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
    } catch {}
    setIsDismissed(true);
  };

  if (isDismissed) return null;
  if (isLoading || !preferences) return null;
  if (preferences.digest_enabled || preferences.has_seen_digest_prompt) return null;

  return (
    <Alert className="relative mb-6 border-primary/20 bg-primary/5">
      <Mail className="h-4 w-4" />
      <AlertTitle className="pr-8">{t('digestNudge.title')}</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="flex-1 text-muted-foreground">
            {t('digestNudge.description')}
          </p>
          <Button
            size="sm"
            className="flex-1 sm:flex-initial"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? t('digestNudge.loading')
              : t('digestNudge.ctaButton')}
          </Button>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};
